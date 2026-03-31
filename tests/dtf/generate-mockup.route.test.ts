import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockEnforceDtfRouteRateLimit,
    mockParseAndValidateDtfJson,
    mockGenerateMockup,
    mockReserveDailyQuota,
    mockLogActivity,
    mockReleaseDailyQuota,
    mockGetWashaDtfErrorDetails,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockGenerateMockup: vi.fn(),
    mockReserveDailyQuota: vi.fn(),
    mockLogActivity: vi.fn(),
    mockReleaseDailyQuota: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", () => ({
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
    enforceDtfRouteRateLimit: mockEnforceDtfRouteRateLimit,
    parseAndValidateDtfJson: mockParseAndValidateDtfJson,
}));

vi.mock("@/app/api/washa-dtf-studio/services/ai-studio.service", () => ({
    AiStudioService: {
        generateMockup: mockGenerateMockup,
    },
}));

vi.mock("@/app/api/washa-dtf-studio/services/dtf-telemetry.service", () => ({
    DtfTelemetryService: {
        reserveDailyQuota: mockReserveDailyQuota,
        logActivity: mockLogActivity,
        releaseDailyQuota: mockReleaseDailyQuota,
    },
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfErrorDetails: mockGetWashaDtfErrorDetails,
}));

import { POST } from "@/app/api/washa-dtf-studio/generate-mockup/route";

describe("generate-mockup route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockGenerateMockup.mockReset();
        mockReserveDailyQuota.mockReset();
        mockLogActivity.mockReset();
        mockReleaseDailyQuota.mockReset();
        mockGetWashaDtfErrorDetails.mockReset();

        mockRequireDtfRouteAccess.mockResolvedValue({
            access: {
                allowed: true,
                profileId: "profile_1",
                clerkId: "clerk_1",
                role: "subscriber",
            },
        });
        mockEnforceDtfRouteRateLimit.mockResolvedValue(null);
        mockParseAndValidateDtfJson.mockResolvedValue({
            data: {
                prompt: "تصميم عربي حديث",
                referenceImage: null,
            },
        });
        mockReserveDailyQuota.mockResolvedValue({
            allowed: true,
            remaining: 4,
            used: 1,
            quotaDate: "2026-03-30",
            tracked: true,
        });
        mockGenerateMockup.mockResolvedValue("data:image/png;base64,MOCKUP");
        mockLogActivity.mockResolvedValue(true);
        mockReleaseDailyQuota.mockResolvedValue(true);
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "خدمة توليد الصور من Gemini تحت ضغط مؤقت الآن. أعد المحاولة بعد قليل.",
            status: 503,
        });
    });

    it("returns the access response unchanged when access is denied", async () => {
        mockRequireDtfRouteAccess.mockResolvedValue({
            response: NextResponse.json(
                { error: "غير مصرح لك باستخدام استوديو DTF" },
                { status: 403 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "غير مصرح لك باستخدام استوديو DTF",
        });
    });

    it("returns the rate-limit response unchanged when the threshold is hit", async () => {
        mockEnforceDtfRouteRateLimit.mockResolvedValue(
            NextResponse.json(
                { error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً." },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Reset": "2026-03-30T10:00:00.000Z",
                    },
                }
            )
        );

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(429);
        expect(response.headers.get("X-RateLimit-Reset")).toBe("2026-03-30T10:00:00.000Z");
        await expect(response.json()).resolves.toEqual({
            error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
        });
    });

    it("returns validation failures unchanged", async () => {
        mockParseAndValidateDtfJson.mockResolvedValue({
            response: NextResponse.json(
                { error: "الوصف مطلوب" },
                { status: 400 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "الوصف مطلوب",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
    });

    it("returns the current quota-exceeded response and logs the failure", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 5,
            quotaDate: "2026-03-30",
            tracked: false,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "انتهت نقاطك للتصميم اليوم. شكراً لإبداعك ونتمنى رؤيتك غداً!",
        });
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "quota_exceeded",
            })
        );
    });

    it("returns the current success payload shape", async () => {
        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            imageUrl: "data:image/png;base64,MOCKUP",
            remainingPoints: 4,
        });
        expect(mockGenerateMockup).toHaveBeenCalledWith(
            "تصميم عربي حديث",
            null,
            expect.objectContaining({
                traceId: expect.any(String),
                timeoutMs: 45_000,
            })
        );
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "success",
            })
        );
    });

    it("releases tracked quota and preserves normalized provider failures", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("provider timeout"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(504);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "انتهت مهلة التوليد من المزود الخارجي.",
        });
        expect(mockReleaseDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber");
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "timeout",
                errorMessage: "انتهت مهلة التوليد من المزود الخارجي.",
            })
        );
    });
});
