import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetPublicVisibility,
    mockResolveDesignPieceAccess,
} = vi.hoisted(() => ({
    mockGetPublicVisibility: vi.fn(),
    mockResolveDesignPieceAccess: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    getPublicVisibility: mockGetPublicVisibility,
}));

vi.mock("@/lib/design-piece-access", () => ({
    resolveDesignPieceAccess: mockResolveDesignPieceAccess,
}));

import { resolveDesignPiecePageState } from "@/lib/design-piece-runtime";

describe("design-piece runtime", () => {
    beforeEach(() => {
        mockGetPublicVisibility.mockReset();
        mockResolveDesignPieceAccess.mockReset();

        mockGetPublicVisibility.mockResolvedValue({
            design_piece: true,
            design_piece_dtf_studio_switch: true,
        });
        mockResolveDesignPieceAccess.mockResolvedValue({
            allowed: false,
            reason: "not_signed_in",
        });
    });

    it("keeps protected consumers strict by default", async () => {
        const result = await resolveDesignPiecePageState();

        expect(mockResolveDesignPieceAccess).toHaveBeenCalledWith({
            allowPublicAccess: false,
        });
        expect(result.publicGenerationEnabled).toBe(false);
        expect(result.showWizard).toBe(false);
    });

    it("allows public consumers to opt in explicitly", async () => {
        mockResolveDesignPieceAccess.mockResolvedValue({
            allowed: true,
            reason: "public_access",
            role: "guest",
        });

        const result = await resolveDesignPiecePageState({ allowPublicAccess: true });

        expect(mockResolveDesignPieceAccess).toHaveBeenCalledWith({
            allowPublicAccess: true,
        });
        expect(result.publicGenerationEnabled).toBe(true);
        expect(result.showWizard).toBe(true);
    });
});
