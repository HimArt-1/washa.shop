import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
    compositeArtworkPreview,
    createPrintProductionPng,
} from "@/lib/washa-artwork/compositor";
import { selectSideSpecificCatalogReference } from "@/lib/washa-artwork/mockup-manifest";
import { buildIsolatedArtworkPrompt } from "@/lib/washa-artwork/prompt";
import { buildPlacementTransform, getDefaultPrintArea } from "@/lib/washa-artwork/placement";
import {
    assertMinimumEffectivePrintDpi,
    sha256Hex,
    validateArtworkPng,
} from "@/lib/washa-artwork/validation";

async function transparentArtwork(size = 96) {
    const mark = await sharp({
        create: {
            width: Math.round(size * 0.5),
            height: Math.round(size * 0.5),
            channels: 4,
            background: { r: 196, g: 42, b: 55, alpha: 1 },
        },
    }).png().toBuffer();
    return sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{
            input: mark,
            left: Math.round(size * 0.25),
            top: Math.round(size * 0.25),
        }])
        .png()
        .toBuffer();
}

describe("WASHA AI single-source artwork", () => {
    it("accepts a real transparent PNG with safe padding", async () => {
        const report = await validateArtworkPng(await transparentArtwork(), {
            minDimension: 64,
            minSafePaddingRatio: 0.1,
        });

        expect(report.valid).toBe(true);
        expect(report.hasAlphaChannel).toBe(true);
        expect(report.transparentPixelRatio).toBeGreaterThan(0.5);
        expect(report.safePaddingRatio).toBeGreaterThanOrEqual(0.2);
    });

    it("rejects a flattened opaque background even when the PNG has an alpha channel", async () => {
        const opaque = await sharp({
            create: {
                width: 96,
                height: 96,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
        }).png().toBuffer();
        const report = await validateArtworkPng(opaque, { minDimension: 64 });

        expect(report.valid).toBe(false);
        expect(report.errors.join(" ")).toContain("transparent background pixels");
    });

    it("rejects an opaque background panel surrounded by simulated transparent padding", async () => {
        const panel = await sharp({
            create: {
                width: 80,
                height: 80,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
        }).png().toBuffer();
        const paddedPanel = await sharp({
            create: {
                width: 100,
                height: 100,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        }).composite([{ input: panel, left: 10, top: 10 }]).png().toBuffer();

        const report = await validateArtworkPng(paddedPanel, { minDimension: 64 });
        expect(report.valid).toBe(false);
        expect(report.flattenedBackgroundSuspected).toBe(true);
    });

    it("uses placement scale for physical print dimensions and blocks false print DPI", () => {
        const large = buildPlacementTransform({
            side: "front",
            printPosition: "chest",
            printSize: "large",
            scalePercent: 100,
        });
        const half = buildPlacementTransform({
            side: "front",
            printPosition: "chest",
            printSize: "large",
            scalePercent: 50,
        });

        expect(large.printWidthCm).toBe(30);
        expect(half.printWidthCm).toBe(15);
        expect(half.printHeightCm).toBe(20);
        expect(() => assertMinimumEffectivePrintDpi({
            width: 1024,
            height: 1024,
            printWidthCm: large.printWidthCm,
            printHeightCm: large.printHeightCm,
            minEffectiveDpi: 90,
        })).toThrow("effective print resolution");
        expect(() => assertMinimumEffectivePrintDpi({
            width: 1024,
            height: 1024,
            printWidthCm: half.printWidthCm,
            printHeightCm: half.printHeightCm,
            minEffectiveDpi: 90,
        })).not.toThrow();
        const back = buildPlacementTransform({
            side: "back",
            printPosition: "back",
            printSize: "large",
            scalePercent: 100,
        });
        expect(() => assertMinimumEffectivePrintDpi({
            width: 1024,
            height: 1536,
            printWidthCm: back.printWidthCm,
            printHeightCm: back.printHeightCm,
            minEffectiveDpi: 85,
        })).not.toThrow();
    });

    it("rejects artwork that touches the canvas edge", async () => {
        const touching = await sharp({
            create: {
                width: 96,
                height: 96,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        })
            .composite([{
                input: await sharp({
                    create: {
                        width: 60,
                        height: 60,
                        channels: 4,
                        background: { r: 20, g: 30, b: 40, alpha: 1 },
                    },
                }).png().toBuffer(),
                left: 0,
                top: 18,
            }])
            .png()
            .toBuffer();
        const report = await validateArtworkPng(touching, { minDimension: 64 });

        expect(report.valid).toBe(false);
        expect(report.errors.join(" ")).toContain("touches the canvas edge");
    });

    it("uses the exact master bytes for preview and print derivation without mutating the master checksum", async () => {
        const master = await transparentArtwork(128);
        const originalChecksum = sha256Hex(master);
        const garment = await sharp({
            create: {
                width: 320,
                height: 400,
                channels: 4,
                background: { r: 42, g: 44, b: 48, alpha: 1 },
            },
        }).png().toBuffer();
        const placement = buildPlacementTransform({
            side: "front",
            printPosition: "chest",
            printSize: "large",
            scalePercent: 80,
            offsetXPercent: 0,
            offsetYPercent: 0,
        });

        const preview = await compositeArtworkPreview({
            garmentBase: garment,
            masterArtwork: master,
            printArea: getDefaultPrintArea("chest"),
            placement,
        });
        const printOne = await createPrintProductionPng({
            masterArtwork: master,
            printWidthCm: 10,
            printHeightCm: 10,
            dpi: 72,
        });
        const printTwo = await createPrintProductionPng({
            masterArtwork: master,
            printWidthCm: 10,
            printHeightCm: 10,
            dpi: 72,
        });

        expect(preview.mimeType).toBe("image/webp");
        expect(sha256Hex(master)).toBe(originalChecksum);
        expect(printOne.buffer.equals(printTwo.buffer)).toBe(true);
        expect((await sharp(printOne.buffer).metadata()).hasAlpha).toBe(true);
    });

    it("changing placement changes only the preview transform, not the master or print file", async () => {
        const master = await transparentArtwork(128);
        const garment = await sharp({
            create: {
                width: 320,
                height: 400,
                channels: 4,
                background: { r: 52, g: 54, b: 58, alpha: 1 },
            },
        }).png().toBuffer();
        const centered = buildPlacementTransform({
            side: "front",
            printPosition: "chest",
            printSize: "large",
            scalePercent: 70,
        });
        const shifted = buildPlacementTransform({
            side: "front",
            printPosition: "chest",
            printSize: "large",
            scalePercent: 55,
            offsetXPercent: 10,
        });
        const before = sha256Hex(master);
        const centeredPreview = await compositeArtworkPreview({
            garmentBase: garment,
            masterArtwork: master,
            printArea: getDefaultPrintArea("chest"),
            placement: centered,
        });
        const shiftedPreview = await compositeArtworkPreview({
            garmentBase: garment,
            masterArtwork: master,
            printArea: getDefaultPrintArea("chest"),
            placement: shifted,
        });

        expect(centeredPreview.buffer.equals(shiftedPreview.buffer)).toBe(false);
        expect(sha256Hex(master)).toBe(before);
    });

    it("uses a grayscale garment mask as artwork alpha clipping", async () => {
        const master = await transparentArtwork(128);
        const garment = await sharp({
            create: {
                width: 320,
                height: 400,
                channels: 4,
                background: { r: 20, g: 20, b: 20, alpha: 1 },
            },
        }).png().toBuffer();
        const blackMask = await sharp({
            create: {
                width: 320,
                height: 400,
                channels: 3,
                background: { r: 0, g: 0, b: 0 },
            },
        }).greyscale().png().toBuffer();
        const placement = buildPlacementTransform({
            side: "front",
            printPosition: "chest",
            printSize: "large",
            scalePercent: 70,
        });
        const visible = await compositeArtworkPreview({
            garmentBase: garment,
            masterArtwork: master,
            printArea: getDefaultPrintArea("chest"),
            placement,
        });
        const clipped = await compositeArtworkPreview({
            garmentBase: garment,
            masterArtwork: master,
            printArea: getDefaultPrintArea("chest"),
            placement,
            effects: { garmentMask: blackMask },
        });

        expect(visible.buffer.equals(clipped.buffer)).toBe(false);
    });

    it("checks front and back references independently", () => {
        expect(selectSideSpecificCatalogReference({
            side: "front",
            sizeFrontUrl: "https://cdn.example/front.png",
            sizeBackUrl: null,
        })).toBe("https://cdn.example/front.png");
        expect(selectSideSpecificCatalogReference({
            side: "back",
            sizeFrontUrl: "https://cdn.example/front.png",
            sizeBackUrl: null,
        })).toBeNull();
        expect(selectSideSpecificCatalogReference({
            side: "back",
            sizeFrontUrl: null,
            sizeBackUrl: "https://cdn.example/back.png",
        })).toBe("https://cdn.example/back.png");
    });

    it("preserves supplied Arabic text in the artwork request and never asks for a garment mockup", () => {
        const prompt = buildIsolatedArtworkPrompt("خط عربي", {
            designMethod: "calligraphy",
            calligraphyText: "وشّى كما هي",
            style: "ديواني",
            technique: "حبر",
            palette: "ذهبي",
        });

        expect(prompt).toContain("وشّى كما هي");
        expect(prompt).toContain("Preserve all Arabic text exactly as supplied");
        expect(prompt).not.toContain("place that artwork on the selected garment");
        expect(prompt).not.toContain("Studio mockup");
    });

    it("keeps customer reference guidance inside isolated-artwork generation", () => {
        const prompt = buildIsolatedArtworkPrompt("حوّل الصورة إلى رسم", {
            referenceImageMode: "preserve_subject",
            style: "هندسي",
        });

        expect(prompt).toContain("preserve the identity and recognizable structure");
        expect(prompt).toContain("clean isolated print artwork");
        expect(prompt).not.toContain("garment mockup");
    });
});
