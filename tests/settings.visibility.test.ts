import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockGetInventoryWithSales } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockGetInventoryWithSales: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
}));

vi.mock("@/lib/product-identifiers", () => ({
    generateNextSKU: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: vi.fn(),
}));

vi.mock("@/lib/operational-rules", () => ({
    DEFAULT_OPERATIONAL_RULES: {
        support: {},
        inventory: {},
        payments: {},
        orders: {},
    },
    getOperationalRules: vi.fn(),
    normalizeOperationalRules: vi.fn((value) => value ?? {
        support: {},
        inventory: {},
        payments: {},
        orders: {},
    }),
}));

vi.mock("@/app/actions/erp/inventory", () => ({
    getInventoryWithSales: mockGetInventoryWithSales,
}));

import { getPublicVisibility, getSiteSettings } from "@/app/actions/settings";

describe("settings visibility normalization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    });

    it("coerces public visibility flags from string values", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => ({
                            data: {
                                value: {
                                    gallery: "false",
                                    join: "1",
                                    design_piece_generation_public: "true",
                                },
                            },
                        })),
                    })),
                })),
            })),
        });

        const visibility = await getPublicVisibility();

        expect(visibility.gallery).toBe(false);
        expect(visibility.join).toBe(true);
        expect(visibility.design_piece_generation_public).toBe(true);
    });

    it("normalizes visibility values in getSiteSettings too", async () => {
        mockCreateClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(async () => ({
                    data: [
                        {
                            key: "visibility",
                            value: {
                                gallery: "true",
                                store: "0",
                                design_piece_generation_public: "true",
                            },
                        },
                    ],
                    error: null,
                })),
            })),
        });

        const settings = await getSiteSettings();

        expect(settings.visibility.gallery).toBe(true);
        expect(settings.visibility.store).toBe(false);
        expect(settings.visibility.design_piece_generation_public).toBe(true);
    });
});
