import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { validateGeneratedBlankGarment } from "@/lib/washa-artwork/mockup-validation";
import { getDefaultPrintArea } from "@/lib/washa-artwork/placement";

async function solidGarment(color: { r: number; g: number; b: number }) {
    return sharp({
        create: {
            width: 256,
            height: 256,
            channels: 4,
            background: { ...color, alpha: 1 },
        },
    }).png().toBuffer();
}

describe("generated blank garment validation", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("rejects a gross color mismatch before caching the generated garment", async () => {
        vi.stubEnv("WASHA_DTF_MIN_GARMENT_PRINT_AREA_ENTROPY", "0");
        const report = await validateGeneratedBlankGarment({
            buffer: await solidGarment({ r: 230, g: 30, b: 30 }),
            colorHex: "#111111",
            printArea: getDefaultPrintArea("chest"),
            minDimension: 128,
        });

        expect(report.valid).toBe(false);
        expect(report.errors.join(" ")).toContain("selected color");
    });

    it("accepts a sufficiently large blank base close to the selected color", async () => {
        vi.stubEnv("WASHA_DTF_MIN_GARMENT_PRINT_AREA_ENTROPY", "0");
        const report = await validateGeneratedBlankGarment({
            buffer: await solidGarment({ r: 28, g: 30, b: 34 }),
            colorHex: "#111111",
            printArea: getDefaultPrintArea("chest"),
            minDimension: 128,
        });

        expect(report.valid).toBe(true);
    });
});
