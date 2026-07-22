import { createHash } from "node:crypto";
import sharp from "sharp";
import type { ArtworkValidationReport } from "@/lib/washa-artwork/types";

const DEFAULT_MIN_DIMENSION = 1024;
const DEFAULT_MAX_DIMENSION = 8192;
const DEFAULT_MIN_TRANSPARENT_RATIO = 0.03;
const DEFAULT_MIN_SAFE_PADDING_RATIO = 0.0125;
const DEFAULT_MIN_EFFECTIVE_DPI = 85;

function readIntegerEnv(name: string, fallback: number) {
    const parsed = Number.parseInt(process.env[name] || "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function sha256Hex(buffer: Buffer) {
    return createHash("sha256").update(buffer).digest("hex");
}

export async function validateArtworkPng(
    buffer: Buffer,
    options: {
        minDimension?: number;
        maxDimension?: number;
        minTransparentPixelRatio?: number;
        minSafePaddingRatio?: number;
    } = {}
): Promise<ArtworkValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const minDimension = options.minDimension
        ?? readIntegerEnv("WASHA_DTF_MIN_ARTWORK_DIMENSION", DEFAULT_MIN_DIMENSION);
    const maxDimension = options.maxDimension
        ?? readIntegerEnv("WASHA_DTF_MAX_ARTWORK_DIMENSION", DEFAULT_MAX_DIMENSION);
    const minTransparentPixelRatio = options.minTransparentPixelRatio
        ?? DEFAULT_MIN_TRANSPARENT_RATIO;
    const minSafePaddingRatio = options.minSafePaddingRatio
        ?? DEFAULT_MIN_SAFE_PADDING_RATIO;

    if (!buffer.length) {
        return {
            valid: false,
            errors: ["Artwork file is empty."],
            warnings,
            width: 0,
            height: 0,
            mimeType: "image/png",
            hasAlphaChannel: false,
            transparentPixelRatio: 0,
            opaquePixelRatio: 0,
            edgeOpaquePixelRatio: 0,
            safePaddingRatio: 0,
            flattenedBackgroundSuspected: false,
            contentBounds: null,
        };
    }

    let metadata: any;
    let raw: Buffer;
    let info: any;
    try {
        const image = sharp(buffer, { failOn: "error", animated: false });
        metadata = await image.metadata();
        const rawResult = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        raw = rawResult.data;
        info = rawResult.info;
    } catch {
        return {
            valid: false,
            errors: ["Artwork is not a valid readable PNG image."],
            warnings,
            width: 0,
            height: 0,
            mimeType: "image/png",
            hasAlphaChannel: false,
            transparentPixelRatio: 0,
            opaquePixelRatio: 0,
            edgeOpaquePixelRatio: 0,
            safePaddingRatio: 0,
            flattenedBackgroundSuspected: false,
            contentBounds: null,
        };
    }

    const width = metadata.width ?? info.width ?? 0;
    const height = metadata.height ?? info.height ?? 0;
    const hasAlphaChannel = metadata.hasAlpha === true || metadata.channels === 4;
    if (metadata.format !== "png") errors.push("Artwork must be a PNG file.");
    if (!hasAlphaChannel) errors.push("Artwork PNG does not contain a real alpha channel.");
    if (width < minDimension || height < minDimension) {
        errors.push(`Artwork resolution must be at least ${minDimension}×${minDimension}px.`);
    }
    if (width > maxDimension || height > maxDimension) {
        errors.push(`Artwork dimensions exceed the supported ${maxDimension}px limit.`);
    }

    const pixelCount = width * height;
    let transparentPixels = 0;
    let opaquePixels = 0;
    let visiblePixels = 0;
    let edgeOpaquePixels = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    const channels = info.channels;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const alpha = raw[(y * width + x) * channels + 3];
            if (alpha === 0) transparentPixels += 1;
            if (alpha === 255) opaquePixels += 1;
            if (alpha > 8) {
                visiblePixels += 1;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    edgeOpaquePixels += 1;
                }
            }
        }
    }

    const transparentPixelRatio = pixelCount ? transparentPixels / pixelCount : 0;
    const opaquePixelRatio = pixelCount ? opaquePixels / pixelCount : 0;
    const edgePixelCount = Math.max(1, width * 2 + Math.max(0, height - 2) * 2);
    const edgeOpaquePixelRatio = edgeOpaquePixels / edgePixelCount;
    const contentBounds = visiblePixels > 0
        ? { left: minX, top: minY, right: maxX, bottom: maxY }
        : null;
    const safePaddingRatio = contentBounds
        ? Math.min(
            contentBounds.left / width,
            contentBounds.top / height,
            (width - 1 - contentBounds.right) / width,
            (height - 1 - contentBounds.bottom) / height
        )
        : 0;
    let contentPerimeterVisiblePixels = 0;
    let contentPerimeterPixels = 0;
    if (contentBounds) {
        for (let x = contentBounds.left; x <= contentBounds.right; x += 1) {
            for (const y of [contentBounds.top, contentBounds.bottom]) {
                const alpha = raw[(y * width + x) * channels + 3];
                if (alpha > 8) contentPerimeterVisiblePixels += 1;
                contentPerimeterPixels += 1;
            }
        }
        for (let y = contentBounds.top + 1; y < contentBounds.bottom; y += 1) {
            for (const x of [contentBounds.left, contentBounds.right]) {
                const alpha = raw[(y * width + x) * channels + 3];
                if (alpha > 8) contentPerimeterVisiblePixels += 1;
                contentPerimeterPixels += 1;
            }
        }
    }
    const contentBoundsArea = contentBounds
        ? (contentBounds.right - contentBounds.left + 1)
            * (contentBounds.bottom - contentBounds.top + 1)
        : 0;
    const contentFillRatio = contentBoundsArea ? visiblePixels / contentBoundsArea : 0;
    const contentPerimeterVisibleRatio = contentPerimeterPixels
        ? contentPerimeterVisiblePixels / contentPerimeterPixels
        : 0;
    const flattenedBackgroundSuspected = Boolean(
        contentBounds
        && contentBoundsArea / Math.max(1, pixelCount) > 0.35
        && contentFillRatio > 0.92
        && contentPerimeterVisibleRatio > 0.85
    );

    if (!visiblePixels || visiblePixels / Math.max(1, pixelCount) < 0.0005) {
        errors.push("Artwork is empty or contains no meaningful visible pixels.");
    }
    if (transparentPixelRatio < minTransparentPixelRatio) {
        errors.push("Artwork has no meaningful transparent background pixels.");
    }
    if (edgeOpaquePixelRatio > 0) {
        errors.push("Artwork touches the canvas edge and may be cropped.");
    }
    if (safePaddingRatio < minSafePaddingRatio) {
        errors.push("Artwork does not have enough transparent safe padding.");
    }
    if (opaquePixelRatio > 0.97) {
        errors.push("Artwork appears to contain a flattened opaque background.");
    }
    if (flattenedBackgroundSuspected) {
        errors.push("Artwork appears to contain an opaque background panel or simulated transparency.");
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        width,
        height,
        mimeType: "image/png",
        hasAlphaChannel,
        transparentPixelRatio,
        opaquePixelRatio,
        edgeOpaquePixelRatio,
        safePaddingRatio,
        flattenedBackgroundSuspected,
        contentBounds,
    };
}

export function getEffectivePrintDpi(params: {
    width: number;
    height: number;
    printWidthCm: number;
    printHeightCm: number;
}) {
    const widthInches = params.printWidthCm / 2.54;
    const heightInches = params.printHeightCm / 2.54;
    // Production output uses `fit: contain`: the artwork keeps its aspect ratio
    // inside the requested print box instead of stretching to both edges. The
    // limiting edge is therefore the one with the larger pixels-per-inch ratio.
    return Math.max(
        params.width / Math.max(widthInches, Number.EPSILON),
        params.height / Math.max(heightInches, Number.EPSILON)
    );
}

export function assertMinimumEffectivePrintDpi(params: {
    width: number;
    height: number;
    printWidthCm: number;
    printHeightCm: number;
    minEffectiveDpi?: number;
}) {
    const configured = readIntegerEnv(
        "WASHA_DTF_MIN_EFFECTIVE_DPI",
        DEFAULT_MIN_EFFECTIVE_DPI
    );
    const minEffectiveDpi = params.minEffectiveDpi ?? configured;
    const effectiveDpi = getEffectivePrintDpi(params);
    if (effectiveDpi < minEffectiveDpi) {
        throw new Error(
            `Artwork effective print resolution is ${effectiveDpi.toFixed(1)} DPI; minimum is ${minEffectiveDpi} DPI.`
        );
    }
    return effectiveDpi;
}

export async function assertStoredAssetIntegrity(expected: Buffer, stored: Buffer) {
    const expectedChecksum = sha256Hex(expected);
    const storedChecksum = sha256Hex(stored);
    if (expectedChecksum !== storedChecksum) {
        throw new Error("Stored master asset checksum does not match the generated PNG.");
    }

    const report = await validateArtworkPng(stored);
    if (!report.valid) {
        throw new Error(`Stored master asset failed PNG/alpha validation: ${report.errors.join(" ")}`);
    }
    return report;
}
