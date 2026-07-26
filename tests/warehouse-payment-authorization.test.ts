import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSupabaseAdminClient } = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((fn) => fn),
    unstable_noStore: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

import { confirmWarehousePayment } from "@/app/actions/admin";

describe("warehouse payment confirmation authorization", () => {
    beforeEach(() => {
        mockGetSupabaseAdminClient.mockReset();
    });

    it("rejects a forged authorization capability before accessing warehouse data", async () => {
        const result = await Reflect.apply(confirmWarehousePayment, undefined, [
            Symbol("forged"),
            "FUL-W-1001",
            125,
        ]);

        expect(result).toEqual({
            success: false,
            error: "Error: Unauthorized payment confirmation attempt",
        });
        expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled();
    });
});
