import { describe, expect, it } from "vitest";

import { createPremiumDesignBriefDefaults } from "@/lib/premium-design-request";
import { washaAiV4GenerateSchema } from "@/lib/washa-ai-v4-schema";

const validRequest = {
    requestId: "v4_request_20260722",
    brief: {
        ...createPremiumDesignBriefDefaults({ printPosition: "front", printSize: "large" }),
        designIdea: "صقر هندسي يعبر سماء هادئة بخطوط حبر دقيقة",
        mainSubject: "صقر هندسي",
        detailOne: "تفاصيل العين والريش",
        detailTwo: "انتقال الخطوط عند الجناح",
    },
    garmentName: "Premium oversized box-fit t-shirt",
    garmentColorName: "Washed Black",
    garmentColorHex: "#1C1C1A",
    printPosition: "front",
    styleName: "Modern Saudi streetwear",
    artStyleName: "Technical ink illustration",
    artworkColors: [{ name: "Bone", hex: "#E7DFC9" }],
};

describe("WASHA AI v4 generation contract", () => {
    it("accepts a complete standalone board request", () => {
        expect(washaAiV4GenerateSchema.safeParse(validRequest).success).toBe(true);
    });

    it("rejects hero placements outside the fixed v4 reference composition", () => {
        expect(washaAiV4GenerateSchema.safeParse({
            ...validRequest,
            brief: { ...validRequest.brief, heroPosition: "right" },
        }).success).toBe(false);
    });

    it("rejects malformed colors and incomplete concepts", () => {
        expect(washaAiV4GenerateSchema.safeParse({
            ...validRequest,
            garmentColorHex: "black",
            brief: { ...validRequest.brief, designIdea: "" },
        }).success).toBe(false);
    });

    it("rejects dimensions or views that conflict with the selected placement", () => {
        expect(washaAiV4GenerateSchema.safeParse({
            ...validRequest,
            printPosition: "left_chest",
            brief: { ...validRequest.brief, designWidth: 40, designHeight: 27 },
        }).success).toBe(false);

        expect(washaAiV4GenerateSchema.safeParse({
            ...validRequest,
            printPosition: "full_back",
            brief: { ...validRequest.brief, garmentView: "front" },
        }).success).toBe(false);
    });

    it("requires a description for a custom print position", () => {
        expect(washaAiV4GenerateSchema.safeParse({
            ...validRequest,
            printPosition: "custom",
            customPrintPosition: "",
        }).success).toBe(false);
    });
});
