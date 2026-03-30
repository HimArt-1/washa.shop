import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockAuth,
    mockMaybeSingle,
    mockEq,
    mockSelect,
    mockFrom,
    mockGetSupabaseAdminClient,
    mockEnsureProfileWithStatus,
} = vi.hoisted(() => {
    const mockMaybeSingle = vi.fn();
    const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));

    return {
        mockAuth: vi.fn(),
        mockMaybeSingle,
        mockEq,
        mockSelect,
        mockFrom,
        mockGetSupabaseAdminClient: vi.fn(() => ({ from: mockFrom })),
        mockEnsureProfileWithStatus: vi.fn(),
    };
});

vi.mock("@clerk/nextjs/server", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/lib/ensure-profile", () => ({
    ensureProfileWithStatus: mockEnsureProfileWithStatus,
}));

import {
    getDesignPieceAccessFailure,
    resolveDesignPieceAccess,
} from "@/lib/design-piece-access";

describe("design-piece access", () => {
    beforeEach(() => {
        mockAuth.mockReset();
        mockMaybeSingle.mockReset();
        mockEq.mockClear();
        mockSelect.mockClear();
        mockFrom.mockClear();
        mockGetSupabaseAdminClient.mockClear();
        mockEnsureProfileWithStatus.mockReset();

        mockAuth.mockResolvedValue({ userId: null });
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });
        mockEnsureProfileWithStatus.mockResolvedValue({ status: "guest_needs_approval" });
    });

    it("locks denied access failure mappings", () => {
        expect(getDesignPieceAccessFailure("guest_needs_approval")).toEqual({
            message: "غير مصرح لك باستخدام استوديو DTF",
            status: 403,
        });

        expect(getDesignPieceAccessFailure("supabase_error")).toEqual({
            message: "خدمة التحقق غير متاحة مؤقتاً، يرجى المحاولة مجدداً.",
            status: 503,
        });

        expect(getDesignPieceAccessFailure("identity_conflict")).toEqual({
            message: "تعذر ربط حسابك تلقائياً. يرجى التواصل مع الدعم.",
            status: 409,
        });
    });

    it("denies signed-out users when public access is disabled", async () => {
        const result = await resolveDesignPieceAccess();

        expect(result).toEqual({
            allowed: false,
            reason: "not_signed_in",
        });
    });

    it("allows signed-out users when public access is enabled", async () => {
        const result = await resolveDesignPieceAccess({ allowPublicAccess: true });

        expect(result).toEqual({
            allowed: true,
            reason: "public_access",
            role: "guest",
        });
    });

    it("allows approved existing profiles", async () => {
        mockAuth.mockResolvedValue({ userId: "clerk_user_1" });
        mockMaybeSingle.mockResolvedValue({
            data: { id: "profile_1", role: "subscriber" },
            error: null,
        });

        const result = await resolveDesignPieceAccess();

        expect(result).toEqual({
            allowed: true,
            reason: "approved",
            profileId: "profile_1",
            clerkId: "clerk_user_1",
            role: "subscriber",
        });
    });

    it("returns a service error when Supabase lookup fails in strict mode", async () => {
        mockAuth.mockResolvedValue({ userId: "clerk_user_1" });
        mockMaybeSingle.mockResolvedValue({
            data: null,
            error: { message: "lookup failed" },
        });

        const result = await resolveDesignPieceAccess();

        expect(result).toEqual({
            allowed: false,
            reason: "supabase_error",
        });
    });

    it("returns identity_conflict when profile creation detects a mismatch", async () => {
        mockAuth.mockResolvedValue({ userId: "clerk_user_2" });
        mockEnsureProfileWithStatus.mockResolvedValue({
            status: "identity_conflict",
        });

        const result = await resolveDesignPieceAccess();

        expect(result).toEqual({
            allowed: false,
            reason: "identity_conflict",
        });
    });
});
