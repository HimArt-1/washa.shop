import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockCreateClient,
    mockFrom,
    mockGetCurrentUserOrDevAdmin,
} = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockFrom: vi.fn(),
    mockGetCurrentUserOrDevAdmin: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: mockGetCurrentUserOrDevAdmin,
}));

import { getAllDiscountCoupons } from "@/app/actions/discount-coupons";

describe("discount coupon administration authorization", () => {
    beforeEach(() => {
        mockCreateClient.mockReset();
        mockFrom.mockReset();
        mockGetCurrentUserOrDevAdmin.mockReset();

        mockCreateClient.mockReturnValue({
            from: mockFrom,
        });
        mockFrom.mockImplementation((table: string) => {
            if (table === "profiles") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: { role: "artist" },
                                error: null,
                            })),
                        })),
                    })),
                };
            }

            return {
                select: vi.fn(() => ({
                    order: vi.fn(async () => ({ data: [], error: null })),
                })),
            };
        });
    });

    it("rejects unauthenticated coupon-list requests before creating a service-role client", async () => {
        mockGetCurrentUserOrDevAdmin.mockResolvedValue(null);

        await expect(getAllDiscountCoupons()).rejects.toThrow("Unauthorized");
        expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it("rejects an authenticated non-admin before reading coupon codes", async () => {
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "user-1" });

        await expect(getAllDiscountCoupons()).rejects.toThrow("Forbidden");
        expect(mockFrom).toHaveBeenCalledWith("profiles");
        expect(mockFrom).not.toHaveBeenCalledWith("discount_coupons");
    });
});
