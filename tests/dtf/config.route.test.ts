import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockGetWashaDtfStudioConfig,
    mockGetGenerationReadiness,
    mockGetArtworkProviderReadiness,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockGetWashaDtfStudioConfig: vi.fn(),
    mockGetGenerationReadiness: vi.fn(),
    mockGetArtworkProviderReadiness: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", () => ({
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
}));

vi.mock("@/lib/washa-dtf-config", () => ({
    getWashaDtfStudioConfig: mockGetWashaDtfStudioConfig,
}));

vi.mock("@/lib/washa-dtf-generation-readiness", () => ({
    getWashaDtfGenerationReadiness: mockGetGenerationReadiness,
}));

vi.mock("@/lib/washa-artwork/provider", () => ({
    getIsolatedArtworkProviderReadiness: mockGetArtworkProviderReadiness,
}));

import { GET } from "@/app/api/washa-dtf-studio/config/route";

describe("dtf config route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockGetWashaDtfStudioConfig.mockReset();
        mockGetGenerationReadiness.mockReset();
        mockGetArtworkProviderReadiness.mockReset();

        mockRequireDtfRouteAccess.mockResolvedValue({
            access: { allowed: true },
        });
        mockGetWashaDtfStudioConfig.mockResolvedValue({
            garments: [],
            styles: [],
        });
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "disabled",
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
        });
        mockGetArtworkProviderReadiness.mockReturnValue({
            ready: true,
            provider: "openai",
            model: "gpt-image-1",
            fallbackEnabled: true,
        });
    });

    it("returns the access response unchanged when access is denied", async () => {
        mockRequireDtfRouteAccess.mockResolvedValue({
            response: NextResponse.json(
                { error: "غير مصرح لك باستخدام استوديو DTF" },
                { status: 403 }
            ),
        });

        const response = await GET();

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "غير مصرح لك باستخدام استوديو DTF",
        });
    });

    it("returns the config payload with no-store caching", async () => {
        const response = await GET();

        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({
            garments: [],
            styles: [],
            generation: {
                enabled: false,
                code: "disabled",
                message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
            },
        });
    });

    it("reports the same resolved provider and model used by artwork generation", async () => {
        mockGetGenerationReadiness.mockReturnValue({
            enabled: true,
            code: "ready",
            message: "خدمة التوليد جاهزة.",
            provider: "genai",
            model: "gemini-3-pro-image",
            fallbackEnabled: false,
        });
        mockGetArtworkProviderReadiness.mockReturnValue({
            ready: true,
            provider: "genai",
            model: "gemini-3-pro-image",
            fallbackEnabled: false,
        });

        const response = await GET();

        await expect(response.json()).resolves.toMatchObject({
            generation: {
                enabled: true,
                provider: "genai",
                model: "gemini-3-pro-image",
                fallbackEnabled: false,
            },
        });
    });

    it("normalizes unexpected config failures to the current 500 response", async () => {
        mockGetWashaDtfStudioConfig.mockRejectedValue(new Error("boom"));

        const response = await GET();

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: "تعذر تحميل إعدادات استوديو DTF",
        });
    });
});
