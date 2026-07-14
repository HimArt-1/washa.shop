import { describe, expect, it } from "vitest";

import { resolveCartMaxQuantity, resolveLegacyProductStock } from "@/lib/product-stock";

describe("legacy product stock", () => {
    it("fails closed when stock is unknown instead of fabricating availability", () => {
        expect(resolveLegacyProductStock(true, null)).toBe(0);
        expect(resolveLegacyProductStock(true, undefined)).toBe(0);
        expect(resolveLegacyProductStock(false, 12)).toBe(0);
    });

    it("uses the selected variant stock without falling back when that variant is empty", () => {
        expect(resolveCartMaxQuantity(0, 20)).toBe(0);
        expect(resolveCartMaxQuantity(3, 20)).toBe(3);
        expect(resolveCartMaxQuantity(undefined, 8)).toBe(8);
    });
});
