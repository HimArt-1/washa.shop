import { describe, expect, it } from "vitest";

import {
    isArabicTextMatch,
    levenshtein,
    normalizeArabicForCompare,
} from "@/lib/washa-artwork/arabic-normalize";

describe("Arabic text comparison helpers", () => {
    it("normalizes Arabic glyph variants, marks, tatweel, and whitespace", () => {
        expect(normalizeArabicForCompare(
            "  إِنَّـهَا\nآيَةٌ  فِي ٱلرُّؤْيَا  "
        )).toBe("انها ايه في الرويا");
    });

    it("normalizes Arabic Presentation Forms via NFKC", () => {
        expect(normalizeArabicForCompare("\uFEE1حمد"))
            .toBe(normalizeArabicForCompare("محمد"));
    });

    it("strips zero-width joiners and BiDi marks", () => {
        const withMarks = "الحمد \u200Dلله\u200F";
        const clean = "الحمد لله";
        expect(normalizeArabicForCompare(withMarks))
            .toBe(normalizeArabicForCompare(clean));
    });

    it("folds hamzated yaa for comparison", () => {
        expect(normalizeArabicForCompare("بيئة")).toBe("بييه");
    });

    it("folds alef maqsura to yaa for comparison", () => {
        expect(normalizeArabicForCompare("هدى")).toBe("هدي");
    });

    it("calculates insertion, deletion, and substitution distance", () => {
        expect(levenshtein("كتب", "كتاب")).toBe(1);
        expect(levenshtein("كتاب", "كتب")).toBe(1);
        expect(levenshtein("كتب", "كتب")).toBe(0);
        expect(levenshtein("كتب", "كتل")).toBe(1);
    });

    it("accepts Arabic text that differs only by diacritics", () => {
        expect(isArabicTextMatch(
            "الْحَمْدُ لِلّٰهِ",
            "الحمد لله"
        )).toEqual({
            matches: true,
            distance: 0,
            tolerance: 1,
        });
    });

    it("accepts an exact Arabic text match", () => {
        expect(isArabicTextMatch("الحمد لله", "الحمد لله")).toMatchObject({
            matches: true,
            distance: 0,
        });
    });

    it("accepts one changed character within the minimum tolerance", () => {
        expect(isArabicTextMatch("الحمد للز", "الحمد لله")).toEqual({
            matches: true,
            distance: 1,
            tolerance: 1,
        });
    });

    it("rejects a whole-word change outside tolerance", () => {
        expect(isArabicTextMatch("الحمد للناس", "الحمد لله")).toMatchObject({
            matches: false,
        });
    });
});
