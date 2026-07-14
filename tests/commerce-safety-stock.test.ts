import { describe, expect, it } from "vitest";

import { normalizeCartMaxQuantity, sanitizeCartItem, sanitizeCartItems } from "@/lib/commerce-safety";

const item = {
    id: "product-1",
    title: "منتج",
    price: 100,
    image_url: "/icon-512.png",
    artist_name: "وشّى",
    quantity: 7,
    type: "product",
};

describe("cart stock safety", () => {
    it("keeps a legacy item without stock at one instead of fabricating 99 units", () => {
        expect(normalizeCartMaxQuantity(undefined)).toBe(1);
        expect(sanitizeCartItem(item)).toMatchObject({ quantity: 1, maxQuantity: 1 });
    });

    it("drops items with explicitly unavailable or invalid stock", () => {
        expect(normalizeCartMaxQuantity(0)).toBe(0);
        expect(sanitizeCartItem({ ...item, maxQuantity: 0 })).toBeNull();
        expect(sanitizeCartItems([{ ...item, maxQuantity: Number.NaN }])).toEqual([]);
    });
});
