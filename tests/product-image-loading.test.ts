import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductImageGallery } from "@/components/store/ProductImageGallery";

describe("product hero image loading", () => {
    it("loads the above-the-fold product image eagerly with high fetch priority", () => {
        const html = renderToStaticMarkup(createElement(ProductImageGallery, {
            mainImage: "/product.png",
            images: [],
            title: "منتج تجريبي",
            type: "ملابس",
        }));

        expect(html).toContain('loading="eager"');
        expect(html).toContain('fetchPriority="high"');
    });
});
