import { describe, expect, it } from "vitest";

import { getVisiblePublicSearchTabs, isPublicSearchTabVisible } from "@/lib/public-content-visibility";

describe("public content visibility", () => {
    it("removes gallery content and artists when the gallery is hidden", () => {
        expect(getVisiblePublicSearchTabs({ gallery: false, store: true })).toEqual(["products"]);
        expect(isPublicSearchTabVisible("artworks", { gallery: false, store: true })).toBe(false);
    });

    it("removes products when the store is hidden", () => {
        expect(getVisiblePublicSearchTabs({ gallery: true, store: false })).toEqual(["artworks", "artists"]);
        expect(isPublicSearchTabVisible("products", { gallery: true, store: false })).toBe(false);
    });
});
