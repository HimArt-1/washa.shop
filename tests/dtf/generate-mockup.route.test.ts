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
    mockGetRequestClientIdentifier,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockGenerateMockup: vi.fn(),
    mockReserveDailyQuota: vi.fn(),
    mockLogActivity: vi.fn(),
    mockReleaseDailyQuota: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
    mockGetRequestClientIdentifier: vi.fn(),
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

vi.mock("@/lib/request-client", () => ({
    getRequestClientIdentifier: mockGetRequestClientIdentifier,
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
        mockGetRequestClientIdentifier.mockReset();

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
            source: "free",
            freeRemaining: 4,
            paidBalance: 0,
        });
        mockGenerateMockup.mockResolvedValue("data:image/png;base64,MOCKUP");
        mockLogActivity.mockResolvedValue(true);
        mockReleaseDailyQuota.mockResolvedValue(true);
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "خدمة Washa AI تحت ضغط مؤقت الآن. أعد المحاولة بعد قليل.",
            status: 503,
        });
        mockGetRequestClientIdentifier.mockReturnValue("guest:127.0.0.1");
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

    it("allows the access resolver to admit public guest generation", async () => {
        await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(mockRequireDtfRouteAccess).toHaveBeenCalledWith({ allowPublicGeneration: true });
    });

    it("tracks guest generation against the request identifier", async () => {
        mockRequireDtfRouteAccess.mockResolvedValueOnce({
            access: { allowed: true, profileId: null, clerkId: null, role: "guest" },
        });

        await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(mockReserveDailyQuota).toHaveBeenCalledWith(null, "guest", {
            guestIdentifier: "guest:127.0.0.1",
        });
    });

    it("returns the current quota-exceeded response and logs the failure", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 5,
            quotaDate: "2026-03-30",
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: false,
            guest: false,
            reason: "quota_exceeded",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: "نفدت حصتك من التوليد في وشّى AI. اشترِ رصيداً إضافياً للمتابعة الآن، أو انتظر تجديد حصتك المجانية غدًا.",
            code: "quota_exceeded",
            freeRemaining: 0,
            paidBalance: 0,
            canPurchase: false,
            guest: false,
        });
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "quota_exceeded",
            })
        );
    });

    it("returns a service-unavailable response when quota verification is unavailable", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 0,
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            reason: "quota_unavailable",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: "تعذّر التحقق من رصيد WASHA AI حالياً. حاول بعد قليل.",
            code: "quota_unavailable",
            canPurchase: false,
            guest: false,
        });
        expect(mockGenerateMockup).not.toHaveBeenCalled();
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "error",
                errorMessage: "تعذّر التحقق من رصيد WASHA AI قبل التوليد.",
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
            freeRemaining: 4,
            paidBalance: 0,
            consumedSource: "free",
            guest: false,
        });
        expect(mockGenerateMockup).toHaveBeenCalledWith(
            "تصميم عربي حديث",
            null,
            expect.objectContaining({
                traceId: expect.any(String),
                timeoutMs: 90_000,
            })
        );
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "success",
            })
        );
    });

    it("releases tracked quota and returns a public provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("provider timeout"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(504);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toEqual({
            error: "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.",
        });
        expect(mockReleaseDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber", "free", {
            guestIdentifier: null,
        });
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "timeout",
                errorMessage: "انتهت مهلة التوليد من المزود الخارجي.",
            })
        );
    });
});
