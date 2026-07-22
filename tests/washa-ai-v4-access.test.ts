import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetPublicVisibility } = vi.hoisted(() => ({
    mockGetPublicVisibility: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    getPublicVisibility: mockGetPublicVisibility,
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: vi.fn(),
    resolveAdminAccess: vi.fn(),
}));

import { canUseWashaAiV4 } from "@/lib/washa-ai-v4-access";

describe("WASHA AI v4 access isolation", () => {
    beforeEach(() => {
        mockGetPublicVisibility.mockReset();
    });

    it.each([
        ["link", false, true],
        ["admin", true, true],
        ["admin", false, false],
        ["disabled", true, false],
    ] as const)("applies the independent %s mode", async (mode, isAdmin, expected) => {
        mockGetPublicVisibility.mockResolvedValue({
            design_piece: false,
            design_piece_dtf_studio_switch: false,
            washa_ai_dev_v3_access: "disabled",
            washa_ai_dev_v4_access: mode,
        });

        await expect(canUseWashaAiV4(isAdmin)).resolves.toBe(expected);
    });
});
