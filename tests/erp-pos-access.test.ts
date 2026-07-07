import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockGetCurrentUserOrDevAdmin, state } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockGetCurrentUserOrDevAdmin: vi.fn(),
    state: {
        role: "booth",
        skus: [
            {
                id: "sku_1",
                product_id: "product_1",
                sku: "WASHA-TEE-M",
                size: "M",
                color_code: "#111111",
                color_image_url: null,
                is_active: true,
                product: { id: "product_1", title: "تيشيرت وشّى", image_url: null, price: 120 },
            },
        ],
        warehouses: [
            {
                id: "warehouse_1",
                name: "بوث الرياض",
                location: "Riyadh",
                is_active: true,
            },
        ],
    },
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/product-identifiers", () => ({
    generateNextSKU: vi.fn(),
    getUnitSerialsForPrint: vi.fn(),
}));

vi.mock("@/lib/admin-operational-alerts", () => ({
    reportAdminOperationalAlert: vi.fn(),
}));

vi.mock("@/lib/operational-event-alerts", () => ({
    emitInventoryStockAlert: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: mockGetCurrentUserOrDevAdmin,
}));

import { getSKUs, getSKUsForSales, getWarehousesForSales } from "@/app/actions/erp/inventory";

function makeSupabaseClient() {
    return {
        from: vi.fn((table: string) => {
            if (table === "profiles") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: { id: "profile_1", role: state.role },
                                error: null,
                            })),
                        })),
                    })),
                };
            }

            if (table === "product_skus") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(async () => ({
                                data: state.skus,
                                error: null,
                            })),
                        })),
                    })),
                };
            }

            if (table === "warehouses") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            order: vi.fn(async () => ({
                                data: state.warehouses,
                                error: null,
                            })),
                        })),
                    })),
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        }),
    };
}

describe("POS inventory lookup access", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.role = "booth";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "user_1" });
        mockCreateClient.mockReturnValue(makeSupabaseClient());
    });

    it("lets booth users load the active SKU and warehouse lookups needed for POS", async () => {
        const [skusResult, warehousesResult] = await Promise.all([
            getSKUsForSales(),
            getWarehousesForSales(),
        ]);

        expect("error" in skusResult).toBe(false);
        expect("error" in warehousesResult).toBe(false);
        expect(skusResult.skus).toEqual(state.skus);
        expect(warehousesResult.warehouses).toEqual(state.warehouses);
    });

    it("does not let booth users use the full inventory SKU manager endpoint", async () => {
        const result = await getSKUs();

        expect(result).toEqual({ error: "غير مصرح" });
    });
});
