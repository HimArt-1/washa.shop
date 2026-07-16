import sharp from "sharp";
import type {
    NormalizedPrintArea,
    PlacementTransform,
} from "@/lib/washa-artwork/types";
import { placementFitsPrintArea } from "@/lib/washa-artwork/placement";

type PreviewEffects = {
    garmentMask?: Buffer | null;
    shadingMap?: Buffer | null;
    displacementMap?: Buffer | null;
    displacementStrength?: number;
    perspectiveTransform?: {
        matrix?: [number, number, number, number];
        idx?: number;
        idy?: number;
        odx?: number;
        ody?: number;
    } | null;
};

async function applyDisplacementMap(
    overlay: Buffer,
    map: Buffer,
    width: number,
    height: number,
    strength: number
) {
    const overlayRaw = await sharp(overlay)
        .resize(width, height, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer();
    const mapRaw = await sharp(map)
        .resize(width, height, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer();
    const output = Buffer.alloc(overlayRaw.length);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const dx = Math.round(((mapRaw[index] - 128) / 128) * strength);
            const dy = Math.round(((mapRaw[index + 1] - 128) / 128) * strength);
            const sourceX = Math.min(width - 1, Math.max(0, x - dx));
            const sourceY = Math.min(height - 1, Math.max(0, y - dy));
            const sourceIndex = (sourceY * width + sourceX) * 4;
            overlayRaw.copy(output, index, sourceIndex, sourceIndex + 4);
        }
    }

    return sharp(output, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function createAlphaMask(mask: Buffer, width: number, height: number) {
    const alpha = await sharp(mask)
        .resize(width, height, { fit: "fill" })
        .greyscale()
        .raw()
        .toBuffer();
    const rgba = Buffer.alloc(width * height * 4, 255);
    for (let index = 0; index < width * height; index += 1) {
        rgba[index * 4 + 3] = alpha[index];
    }
    return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export async function compositeArtworkPreview(params: {
    garmentBase: Buffer;
    masterArtwork: Buffer;
    printArea: NormalizedPrintArea;
    placement: PlacementTransform;
    effects?: PreviewEffects;
}) {
    const baseMetadata = await sharp(params.garmentBase).metadata();
    const artMetadata = await sharp(params.masterArtwork).metadata();
    const width = baseMetadata.width ?? 0;
    const height = baseMetadata.height ?? 0;
    const artworkWidth = artMetadata.width ?? 0;
    const artworkHeight = artMetadata.height ?? 0;
    if (!width || !height || !artworkWidth || !artworkHeight) {
        throw new Error("Cannot composite invalid garment or artwork dimensions.");
    }

    const artworkAspectRatio = artworkWidth / artworkHeight;
    if (!placementFitsPrintArea(params.placement, artworkAspectRatio)) {
        throw new Error("Artwork placement extends outside the printable safe area.");
    }

    const areaLeft = Math.round(params.printArea.x * width);
    const areaTop = Math.round(params.printArea.y * height);
    const areaWidth = Math.max(1, Math.round(params.printArea.width * width));
    const areaHeight = Math.max(1, Math.round(params.printArea.height * height));
    const maxWidth = Math.max(1, Math.round(areaWidth * params.placement.scale));
    const maxHeight = Math.max(1, Math.round(areaHeight * params.placement.scale));

    let artwork = await sharp(params.masterArtwork)
        .resize(maxWidth, maxHeight, {
            fit: "inside",
            withoutEnlargement: false,
            kernel: sharp.kernel.lanczos3,
        })
        .rotate(params.placement.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
    const affineMatrix = params.effects?.perspectiveTransform?.matrix;
    if (
        Array.isArray(affineMatrix)
        && affineMatrix.length === 4
        && affineMatrix.every(Number.isFinite)
    ) {
        artwork = await sharp(artwork)
            .affine(affineMatrix, {
                idx: params.effects?.perspectiveTransform?.idx ?? 0,
                idy: params.effects?.perspectiveTransform?.idy ?? 0,
                odx: params.effects?.perspectiveTransform?.odx ?? 0,
                ody: params.effects?.perspectiveTransform?.ody ?? 0,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
                interpolator: sharp.interpolators.bicubic,
            })
            .png()
            .toBuffer();
    }
    const placedMetadata = await sharp(artwork).metadata();
    const placedWidth = placedMetadata.width ?? maxWidth;
    const placedHeight = placedMetadata.height ?? maxHeight;
    const centerX = areaLeft + Math.round(params.placement.x * areaWidth);
    const centerY = areaTop + Math.round(params.placement.y * areaHeight);
    const left = Math.round(centerX - placedWidth * params.placement.anchorX);
    const top = Math.round(centerY - placedHeight * params.placement.anchorY);
    if (
        left < areaLeft
        || top < areaTop
        || left + placedWidth > areaLeft + areaWidth
        || top + placedHeight > areaTop + areaHeight
    ) {
        throw new Error("Artwork placement is clipped by the printable safe area.");
    }

    let overlay = await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: artwork, left, top, blend: "over" }])
        .png()
        .toBuffer();

    if (params.effects?.garmentMask) {
        const mask = await createAlphaMask(params.effects.garmentMask, width, height);
        overlay = await sharp(overlay)
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();
    }

    if (params.effects?.displacementMap) {
        artwork = overlay;
        overlay = await applyDisplacementMap(
            artwork,
            params.effects.displacementMap,
            width,
            height,
            params.effects.displacementStrength ?? 3
        );
    }

    const composites: any[] = [{ input: overlay, blend: "over" }];
    if (params.effects?.shadingMap) {
        const shading = await sharp(params.effects.shadingMap)
            .resize(width, height, { fit: "fill" })
            .ensureAlpha()
            .png()
            .toBuffer();
        composites.push({ input: shading, blend: "multiply" });
    }

    const output = await sharp(params.garmentBase)
        .resize(width, height, { fit: "fill" })
        .ensureAlpha()
        .composite(composites)
        .webp({ quality: 92, alphaQuality: 100, smartSubsample: true })
        .toBuffer();

    return {
        buffer: output,
        mimeType: "image/webp" as const,
        width,
        height,
        transformationMetadata: {
            printArea: params.printArea,
            placement: params.placement,
            pixelPlacement: { left, top, width: placedWidth, height: placedHeight },
            effects: {
                garmentMask: Boolean(params.effects?.garmentMask),
                shadingMap: Boolean(params.effects?.shadingMap),
                displacementMap: Boolean(params.effects?.displacementMap),
                perspectiveTransform: Boolean(affineMatrix),
            },
        },
    };
}

export async function createPrintProductionPng(params: {
    masterArtwork: Buffer;
    printWidthCm: number;
    printHeightCm: number;
    dpi?: number;
}) {
    const dpi = Math.min(600, Math.max(72, Math.round(params.dpi ?? 300)));
    const width = Math.max(1, Math.round((params.printWidthCm / 2.54) * dpi));
    const height = Math.max(1, Math.round((params.printHeightCm / 2.54) * dpi));
    const buffer = await sharp(params.masterArtwork)
        .resize(width, height, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            kernel: sharp.kernel.lanczos3,
        })
        .withMetadata({ density: dpi })
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
    return { buffer, width, height, dpi, mimeType: "image/png" as const };
}
