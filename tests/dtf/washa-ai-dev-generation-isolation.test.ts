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

import {
    canUseWashaAiDevSurfaceForGeneration,
    resolveWashaAiDevGenerationSurface,
} from "@/lib/washa-ai-dev-access";

function visibility(overrides: Record<string, unknown> = {}) {
    return {
        design_piece: true,
        design_piece_dtf_studio_switch: true,
        washa_ai_dev_access: "admin",
        washa_ai_dev_v2_access: "admin",
        ...overrides,
    };
}

describe("WASHA AI dev generation isolation", () => {
    beforeEach(() => {
        mockGetPublicVisibility.mockReset();
        mockGetPublicVisibility.mockResolvedValue(visibility());
    });

    it.each([
        ["http://localhost/design/washa-ai/dev", "dev"],
        ["http://localhost/design/washa-ai/dev/results/1", "dev"],
        ["http://localhost/design/washa-ai/dev-v2", "dev-v2"],
        ["http://localhost/design/washa-ai/dev-v2/results/1", "dev-v2"],
    ] as const)("recognizes the same-origin surface from %s", (referer, expected) => {
        const request = new Request("http://localhost/api/washa-dtf-studio/generate-mockup", {
            headers: { referer },
        });

        expect(resolveWashaAiDevGenerationSurface(request)).toBe(expected);
    });

    it.each([
        [null],
        ["http://localhost/design/washa-ai/app"],
        ["http://localhost/design/washa-ai/developer"],
        ["https://example.test/design/washa-ai/dev"],
        ["not a url"],
    ])("does not classify an unrelated or untrusted Referer: %s", (referer) => {
        const headers = referer ? { referer } : undefined;
        const request = new Request("http://localhost/api/washa-dtf-studio/generate-mockup", {
            headers,
        });

        expect(resolveWashaAiDevGenerationSurface(request)).toBeNull();
    });

    it.each([
        ["admin", "admin", true],
        ["admin", "dev", true],
        ["admin", "subscriber", false],
        ["link", "subscriber", true],
        ["disabled", "admin", false],
    ] as const)(
        "applies the existing %s access setting to role %s",
        async (accessMode, role, expected) => {
            mockGetPublicVisibility.mockResolvedValue(visibility({
                washa_ai_dev_access: accessMode,
            }));

            await expect(canUseWashaAiDevSurfaceForGeneration("dev", role))
                .resolves.toBe(expected);
        }
    );

    it("denies generation when the studio itself is hidden", async () => {
        mockGetPublicVisibility.mockResolvedValue(visibility({ design_piece: false }));

        await expect(canUseWashaAiDevSurfaceForGeneration("dev-v2", "admin"))
            .resolves.toBe(false);
    });
});
