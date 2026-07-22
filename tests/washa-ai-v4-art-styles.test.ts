import { describe, expect, it } from "vitest";

import {
    getWashaAiV4ArtStyle,
    WASHA_AI_V4_ART_STYLE_IDS,
    WASHA_AI_V4_ART_STYLES,
} from "@/lib/washa-ai-v4-art-styles";
import { getWashaAiV4ArtStylePrompt } from "@/lib/washa-ai-v4-art-style-prompts";

describe("WASHA AI v4 curated art styles", () => {
    it("provides a distinctive production-ready prompt for every selectable style", () => {
        expect(WASHA_AI_V4_ART_STYLES).toHaveLength(12);
        expect(new Set(WASHA_AI_V4_ART_STYLES.map((style) => style.id)).size).toBe(12);
        expect(WASHA_AI_V4_ART_STYLES.map((style) => style.id))
            .toEqual([...WASHA_AI_V4_ART_STYLE_IDS]);

        for (const style of WASHA_AI_V4_ART_STYLES) {
            expect(style.labelAr.length).toBeGreaterThan(8);
            expect(style.labelEn.length).toBeGreaterThan(8);
            expect(style.descriptionAr.length).toBeGreaterThan(30);
            expect(style).not.toHaveProperty("prompt");
            expect(getWashaAiV4ArtStyle(style.id)).toEqual(style);
            expect(getWashaAiV4ArtStylePrompt(style.id).length).toBeGreaterThan(120);
        }

        expect(getWashaAiV4ArtStylePrompt("archival_editorial_ink"))
            .toContain("Archival editorial ink illustration");
    });
});
