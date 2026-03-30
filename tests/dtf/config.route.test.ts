import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockGetWashaDtfStudioConfig,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockGetWashaDtfStudioConfig: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", () => ({
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
}));

vi.mock("@/lib/washa-dtf-config", () => ({
    getWashaDtfStudioConfig: mockGetWashaDtfStudioConfig,
}));

import { GET } from "@/app/api/washa-dtf-studio/config/route";

describe("dtf config route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockGetWashaDtfStudioConfig.mockReset();

        mockRequireDtfRouteAccess.mockResolvedValue({
            access: { allowed: true },
        });
        mockGetWashaDtfStudioConfig.mockResolvedValue({
            garments: [],
            styles: [],
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
