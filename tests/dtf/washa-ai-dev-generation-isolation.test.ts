import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    createWashaAiDevGenerationHeaders,
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
        vi.stubEnv("WASHA_AI_DEV_SURFACE_SECRET", "test-dev-surface-secret");
        mockGetPublicVisibility.mockReset();
        mockGetPublicVisibility.mockResolvedValue(visibility());
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it.each(["dev", "dev-v2", "dev-v3"] as const)("recognizes a signed %s surface", (surface) => {
        const request = new Request("http://localhost/api/washa-dtf-studio/generate-mockup", {
            headers: createWashaAiDevGenerationHeaders(surface),
        });

        expect(resolveWashaAiDevGenerationSurface(request)).toBe(surface);
    });

    it.each([
        [{}, "missing headers"],
        [{ "x-washa-ai-dev-surface": "dev", "x-washa-ai-dev-signature": "forged" }, "forged signature"],
        [{ "x-washa-ai-dev-surface": "app", "x-washa-ai-dev-signature": "forged" }, "public app surface"],
    ])("does not classify an untrusted request: %s", (headers, _description) => {
        const request = new Request("http://localhost/api/washa-dtf-studio/generate-mockup", {
            headers,
        });

        expect(resolveWashaAiDevGenerationSurface(request)).toBeNull();
    });

    it("binds the signature to its exact surface", () => {
        const headers = createWashaAiDevGenerationHeaders("dev");
        headers["x-washa-ai-dev-surface"] = "dev-v2";
        const request = new Request("http://localhost/api/washa-dtf-studio/generate-mockup", {
            headers,
        });

        expect(resolveWashaAiDevGenerationSurface(request)).toBeNull();
    });

    it.each([
        ["admin", true, true],
        ["admin", false, false],
        ["link", false, true],
        ["disabled", true, false],
    ] as const)(
        "applies the existing %s access setting when platform-admin access is %s",
        async (accessMode, hasPlatformAdminAccess, expected) => {
            mockGetPublicVisibility.mockResolvedValue(visibility({
                washa_ai_dev_access: accessMode,
            }));

            await expect(canUseWashaAiDevSurfaceForGeneration("dev", hasPlatformAdminAccess))
                .resolves.toBe(expected);
        }
    );

    it("denies generation when the studio itself is hidden", async () => {
        mockGetPublicVisibility.mockResolvedValue(visibility({ design_piece: false }));

        await expect(canUseWashaAiDevSurfaceForGeneration("dev-v2", true))
            .resolves.toBe(false);
    });

    it("uses the V2 visibility gate for the prompt-native V3 surface", async () => {
        mockGetPublicVisibility.mockResolvedValue(visibility({ washa_ai_dev_v2_access: "link" }));

        await expect(canUseWashaAiDevSurfaceForGeneration("dev-v3", false))
            .resolves.toBe(true);
    });

});
