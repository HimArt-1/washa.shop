import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockArtworkEq,
    mockGetSupabaseAdminClient,
} = vi.hoisted(() => ({
    mockArtworkEq: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

import { getArtworkById } from "@/app/actions/artworks";

describe("public artwork access", () => {
    beforeEach(() => {
        mockArtworkEq.mockReset();

        const query = {
            eq: mockArtworkEq,
            maybeSingle: vi.fn(async () => ({
                data: { id: "artwork-1", status: "published" },
                error: null,
            })),
        };
        mockArtworkEq.mockReturnValue(query);
        mockGetSupabaseAdminClient.mockReturnValue({
            from: vi.fn(() => ({
                select: vi.fn(() => query),
            })),
        });
    });

    it("always restricts a public lookup to published artwork", async () => {
        await Reflect.apply(getArtworkById, undefined, ["artwork-1", true]);

        expect(mockArtworkEq).toHaveBeenCalledWith("id", "artwork-1");
        expect(mockArtworkEq).toHaveBeenCalledWith("status", "published");
    });
});
