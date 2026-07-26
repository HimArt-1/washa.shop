import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

import { StoreFilters } from "@/app/(public)/store/StoreFilters";
import { Footer } from "@/components/layout/Footer";

describe("public form control accessibility", () => {
    it("associates the newsletter email field with a visible-to-assistive-technology label", () => {
        const html = renderToStaticMarkup(createElement(Footer));

        expect(html).toContain('for="footer-newsletter-email"');
        expect(html).toContain('id="footer-newsletter-email"');
        expect(html).toContain(">البريد الإلكتروني للنشرة</label>");
    });

    it("associates the store sort control with a label", () => {
        const html = renderToStaticMarkup(createElement(StoreFilters, {
            currentType: "all",
        }));

        expect(html).toContain('for="store-product-sort"');
        expect(html).toContain('id="store-product-sort"');
        expect(html).toContain(">ترتيب المنتجات</label>");
    });
});
