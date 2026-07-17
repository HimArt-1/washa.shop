import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
    ArtworkPrintValidationError,
    inspectGeneratedArtworkBytes,
    normalizeGeneratedArtworkForPrint,
} from "@/lib/washa-artwork/normalization";
import { validateArtworkPng } from "@/lib/washa-artwork/validation";

const TEST_VALIDATION_OPTIONS = {
    minDimension: 64,
    minSafePaddingRatio: 0.08,
};

function artworkSvg(options: {
    background?: string;
    touchingLeft?: boolean;
    includeWhiteInterior?: boolean;
} = {}) {
    const background = options.background ?? "#fafafa";
    const centerX = options.touchingLeft ? 45 : 96;
    return Buffer.from(`
        <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
            <rect width="192" height="192" fill="${background}"/>
            <circle cx="${centerX}" cy="96" r="45" fill="#be1830"/>
            ${options.includeWhiteInterior
                ? `<circle cx="${centerX}" cy="96" r="12" fill="#ffffff"/>`
                : ""}
        </svg>
    `);
}

async function opaqueFixture(
    format: "jpeg" | "webp" | "png",
    options: Parameters<typeof artworkSvg>[0] = {}
) {
    const image = sharp(artworkSvg(options)).removeAlpha();
    if (format === "jpeg") return image.jpeg({ quality: 94 }).toBuffer();
    if (format === "webp") return image.webp({ quality: 94 }).toBuffer();
    return image.png().toBuffer();
}

async function normalizeFixture(
    buffer: Buffer,
    declaredMimeType: string
) {
    return normalizeGeneratedArtworkForPrint({
        buffer,
        declaredMimeType,
        safePaddingRatio: 0.1,
        validationOptions: TEST_VALIDATION_OPTIONS,
    });
}

describe("generated artwork print normalization", () => {
    it.each([
        ["jpeg", "image/jpeg"],
        ["webp", "image/webp"],
    ] as const)(
        "converts an opaque %s response to a real padded RGBA PNG",
        async (format, mimeType) => {
            const input = await opaqueFixture(format);
            const normalized = await normalizeFixture(input, mimeType);

            expect(normalized.input.detectedFormat).toBe(format);
            expect(normalized.input.magicBytesFormat).toBe(format);
            expect(normalized.output.format).toBe("png");
            expect(normalized.output.hasAlphaChannel).toBe(true);
            expect(normalized.output.transparentPixelRatio).toBeGreaterThan(0.2);
            expect(normalized.validation.valid).toBe(true);
        }
    );

    it("converts a PNG without an alpha channel to a validated RGBA PNG", async () => {
        const input = await opaqueFixture("png");
        const before = await inspectGeneratedArtworkBytes(input, "image/png");
        const normalized = await normalizeFixture(input, "image/png");

        expect(before.hasAlphaChannel).toBe(false);
        expect(normalized.output.hasAlphaChannel).toBe(true);
        expect(normalized.validation.valid).toBe(true);
    });

    it("keeps the final canvas above the production minimum after trimming", async () => {
        const normalized = await normalizeGeneratedArtworkForPrint({
            buffer: await opaqueFixture("webp"),
            declaredMimeType: "image/webp",
            safePaddingRatio: 0.1,
            validationOptions: {
                minDimension: 1024,
                minSafePaddingRatio: 0.08,
            },
        });

        expect(normalized.output.width).toBeGreaterThanOrEqual(1024);
        expect(normalized.output.height).toBeGreaterThanOrEqual(1024);
        expect(normalized.normalization.outputScaleFactor).toBeGreaterThan(1);
        expect(normalized.validation.valid).toBe(true);
    });

    it("trusts real bytes instead of a misleading declared MIME type", async () => {
        const jpeg = await opaqueFixture("jpeg");
        const normalized = await normalizeFixture(jpeg, "image/png");

        expect(normalized.input.declaredMimeType).toBe("image/png");
        expect(normalized.input.magicBytesFormat).toBe("jpeg");
        expect(normalized.input.detectedFormat).toBe("jpeg");
        expect(normalized.output.format).toBe("png");
    });

    it("removes only the white background connected to the canvas edges", async () => {
        const input = await opaqueFixture("png", {
            includeWhiteInterior: true,
        });
        const normalized = await normalizeFixture(input, "image/png");
        const raw = await sharp(normalized.buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const centerOffset = (
            Math.floor(raw.info.height / 2) * raw.info.width
            + Math.floor(raw.info.width / 2)
        ) * 4;

        expect(normalized.normalization.backgroundRemovalApplied).toBe(true);
        expect(raw.data[centerOffset]).toBeGreaterThan(240);
        expect(raw.data[centerOffset + 1]).toBeGreaterThan(240);
        expect(raw.data[centerOffset + 2]).toBeGreaterThan(240);
        expect(raw.data[centerOffset + 3]).toBeGreaterThan(245);
    });

    it("crops content that touched the source edge and adds transparent safe padding", async () => {
        const input = await opaqueFixture("jpeg", { touchingLeft: true });
        const normalized = await normalizeFixture(input, "image/jpeg");
        const report = await validateArtworkPng(
            normalized.buffer,
            TEST_VALIDATION_OPTIONS
        );

        expect(report.valid).toBe(true);
        expect(report.edgeOpaquePixelRatio).toBe(0);
        expect(report.contentBounds?.left).toBeGreaterThan(0);
        expect(report.safePaddingRatio).toBeGreaterThanOrEqual(0.08);
        expect(report.safePaddingRatio).toBeLessThanOrEqual(0.12);
    });

    it("suppresses white matte halos on antialiased artwork edges", async () => {
        const jpeg = await opaqueFixture("jpeg");
        const normalized = await normalizeFixture(jpeg, "image/jpeg");
        const raw = await sharp(normalized.buffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const partialPixels: Array<{ g: number; b: number }> = [];
        for (let offset = 0; offset < raw.data.length; offset += 4) {
            const alpha = raw.data[offset + 3];
            if (alpha > 8 && alpha < 247) {
                partialPixels.push({
                    g: raw.data[offset + 1],
                    b: raw.data[offset + 2],
                });
            }
        }
        const worstResidualMatte = Math.max(
            0,
            ...partialPixels.map((pixel) => Math.max(pixel.g, pixel.b))
        );

        expect(partialPixels.length).toBeGreaterThan(0);
        expect(worstResidualMatte).toBeLessThan(150);
    });

    it("emits only safe diagnostics and never embeds image payloads", async () => {
        const normalized = await normalizeFixture(
            await opaqueFixture("webp"),
            "image/webp"
        );
        const serialized = JSON.stringify({
            input: normalized.input,
            output: normalized.output,
            normalization: normalized.normalization,
        });

        expect(serialized).not.toContain("base64");
        expect(serialized).not.toContain("data:image");
        expect(serialized).not.toContain("buffer");
    });

    it("fails safely when the edge-connected background cannot be identified confidently", async () => {
        const ambiguous = await sharp(Buffer.from(`
            <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="96" height="96" fill="#ff0000"/>
                <rect x="96" y="0" width="96" height="96" fill="#00ff00"/>
                <rect x="0" y="96" width="96" height="96" fill="#0000ff"/>
                <rect x="96" y="96" width="96" height="96" fill="#ffff00"/>
                <circle cx="96" cy="96" r="34" fill="#111111"/>
            </svg>
        `))
            .removeAlpha()
            .png()
            .toBuffer();

        await expect(
            normalizeFixture(ambiguous, "image/png")
        ).rejects.toMatchObject({
            code: "ARTWORK_PRINT_VALIDATION_FAILED",
            stage: "normalization",
        } satisfies Partial<ArtworkPrintValidationError>);
    });
});
