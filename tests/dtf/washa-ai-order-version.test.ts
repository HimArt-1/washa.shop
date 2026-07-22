import { describe, expect, it } from "vitest";
import { getWashaAiOrderBadgeLabel, getWashaAiOrderVersion } from "@/lib/washa-ai-order-version";

describe("WASHA AI order version badge", () => {
    it("recognizes a server-stamped V3 studio order", () => {
        const order = {
            design_method: "studio" as const,
            pricing_snapshot: {
                base_price: 79,
                design_price: 40,
                final_price: 119,
                dtf: true as const,
                washa_ai_version: "v3" as const,
            },
        };

        expect(getWashaAiOrderVersion(order)).toBe("v3");
        expect(getWashaAiOrderBadgeLabel(order)).toBe("WASHA AI V3");
    });

    it("keeps classic and non-studio orders unmarked", () => {
        const classic = {
            design_method: "studio" as const,
            pricing_snapshot: {
                base_price: 79,
                design_price: 40,
                final_price: 119,
                dtf: true as const,
            },
        };
        const manual = {
            design_method: "from_text" as const,
            pricing_snapshot: null,
        };

        expect(getWashaAiOrderVersion(classic)).toBeNull();
        expect(getWashaAiOrderBadgeLabel(classic)).toBe("WASHA AI");
        expect(getWashaAiOrderVersion(manual)).toBeNull();
    });
});
