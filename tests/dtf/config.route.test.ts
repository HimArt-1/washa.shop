import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockGetWashaDtfStudioConfig,
    mockGetGenerationReadiness,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockGetWashaDtfStudioConfig: vi.fn(),
    mockGetGenerationReadiness: vi.fn(),
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

import { GET } from "@/app/api/washa-dtf-studio/config/route";

describe("dtf config route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockGetWashaDtfStudioConfig.mockReset();
        mockGetGenerationReadiness.mockReset();

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

    it("normalizes unexpected config failures to the current 500 response", async () => {
        mockGetWashaDtfStudioConfig.mockRejectedValue(new Error("boom"));

        const response = await GET();

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: "تعذر تحميل إعدادات استوديو DTF",
        });
    });
});
