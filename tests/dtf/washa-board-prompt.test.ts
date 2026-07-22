import { describe, expect, it } from "vitest";

import {
    DEFAULT_BOARD_PROMPT_TEMPLATE,
    REQUIRED_BOARD_PROMPT_PLACEHOLDERS,
    normalizeBoardPromptTemplate,
    renderBoardPrompt,
} from "@/lib/washa-board-prompt";

const baseContext = {
    garmentType: "oversized t-shirt",
    garmentColor: "Black",
    designMethod: "image" as const,
    printPosition: "chest" as const,
    printSize: "large" as const,
};

describe("WASHA board prompt", () => {
    it("falls back to the approved template when a required placeholder is missing", () => {
        expect(normalizeBoardPromptTemplate("Create a board without the required controls."))
            .toBe(DEFAULT_BOARD_PROMPT_TEMPLATE);
    });

    it("renders every board control from the approved generation context", () => {
        const rendered = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Geometric falcon with gold linework",
            generationContext: {
                garmentType: "oversized t-shirt",
                garmentColor: "Desert Sand",
                designMethod: "image",
                technique: "embroidery",
                calligraphyText: "وشى",
                printPosition: "chest",
                printSize: "large",
                printScale: 80,
            },
        });

        expect(rendered).toContain("in color Desert Sand.");
        expect(rendered).toContain("front chest at an approximate size of 24cm × 32cm");
        expect(rendered).toContain("Geometric falcon with gold linework");
        expect(rendered).toContain("Art style: embroidery");
        expect(rendered).toContain('Include this exact text in the design: "وشى".');
        for (const placeholder of [
            "{{GARMENT_COLOR}}",
            "{{PLACEMENT}}",
            "{{WIDTH}}",
            "{{HEIGHT}}",
            "{{DESIGN_DESCRIPTION}}",
            "{{STYLE}}",
            "{{TEXT_BLOCK}}",
        ]) {
            expect(rendered).not.toContain(placeholder);
        }
    });

    it.each([
        ["chest", "large", 100, "30cm × 40cm"],
        ["back", "small", 100, "18cm × 18cm"],
        ["shoulder_right", "large", 100, "10cm × 10cm"],
        ["shoulder_left", "small", 35, "3.5cm × 3.5cm"],
        ["chest", "small", 83, "14.9cm × 14.9cm"],
    ] as const)(
        "renders the approved indicative dimensions for %s/%s at %s%%",
        (printPosition, printSize, printScale, expectedDimensions) => {
            const rendered = renderBoardPrompt({
                template: DEFAULT_BOARD_PROMPT_TEMPLATE,
                prompt: "Geometric motif",
                generationContext: {
                    ...baseContext,
                    printPosition,
                    printSize,
                    printScale,
                },
            });

            expect(rendered).toContain(expectedDimensions);
        }
    );

    it("uses design method then modern when technique is unavailable", () => {
        const designMethodPrompt = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Geometric motif",
            generationContext: baseContext,
        });
        const modernPrompt = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Geometric motif",
            generationContext: {
                ...baseContext,
                designMethod: undefined,
            },
        });

        expect(designMethodPrompt).toContain("Art style: image");
        expect(modernPrompt).toContain("Art style: modern");
    });

    it("renders exact quoted text or the explicit no-text instruction", () => {
        const withText = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Arabic lettering",
            generationContext: {
                ...baseContext,
                calligraphyText: 'قال "وشى"',
            },
        });
        const withoutText = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Geometric motif",
            generationContext: baseContext,
        });

        expect(withText).toContain('Include this exact text in the design: "قال \\"وشى\\"".');
        expect(withoutText).toContain("No text in the design.");
    });

    it("does not reinterpret placeholders injected through customer text", () => {
        const rendered = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Keep {{STYLE}} literal",
            generationContext: {
                ...baseContext,
                technique: "ink",
            },
        });

        expect(rendered).toContain("Keep {{STYLE}} literal");
        expect(rendered).toContain("Art style: ink");
    });

    it("normalizes line endings and strips unsupported control characters", () => {
        const rendered = renderBoardPrompt({
            template: DEFAULT_BOARD_PROMPT_TEMPLATE,
            prompt: "Line one\r\nLine\u0000 two\u0007",
            generationContext: baseContext,
        });

        expect(rendered).toContain("Line one\nLine two");
        expect(rendered).not.toContain("\u0000");
        expect(rendered).not.toContain("\u0007");
    });

    it("preserves a complete custom template exactly", () => {
        const customTemplate = REQUIRED_BOARD_PROMPT_PLACEHOLDERS.join(" | ");

        expect(normalizeBoardPromptTemplate(customTemplate)).toBe(customTemplate);
    });
});
