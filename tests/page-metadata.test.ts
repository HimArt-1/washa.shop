import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetProductById,
    mockGetPublicVisibility,
} = vi.hoisted(() => ({
    mockGetProductById: vi.fn(),
    mockGetPublicVisibility: vi.fn(),
}));

vi.mock("@/app/actions/products", () => ({
    getProductById: mockGetProductById,
    getProducts: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    getPublicVisibility: mockGetPublicVisibility,
}));

import { generateMetadata } from "@/app/(public)/products/[id]/page";
import { metadata as storeMetadata } from "@/app/(public)/store/page";

describe("page metadata titles", () => {
    beforeEach(() => {
        mockGetProductById.mockReset();
        mockGetPublicVisibility.mockResolvedValue({ store: true });
    });

    it("lets the root template append the brand to the store title once", () => {
        expect(storeMetadata.title).toBe("المتجر");
    });

    it("lets the root template append the brand to a product title once", async () => {
        mockGetProductById.mockResolvedValue({
            id: "product-1",
            title: "خريجون ٢٠٢٦",
            description: "منتج تجريبي",
            image_url: "/product.png",
        });

        const metadata = await generateMetadata({
            params: Promise.resolve({ id: "product-1" }),
        });

        expect(metadata.title).toBe("خريجون ٢٠٢٦");
    });
});
