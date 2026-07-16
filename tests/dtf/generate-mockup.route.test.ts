import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const {
    mockRequireDtfRouteAccess,
    mockClaimDtfGenerationRequest,
    mockCompleteDtfGenerationRequest,
    mockFailDtfGenerationRequest,
    mockEnforceDtfRouteRateLimit,
    mockParseAndValidateDtfJson,
    mockGenerateMockup,
    mockReserveDailyQuota,
    mockLogActivity,
    mockReleaseDailyQuota,
    mockGetWashaDtfErrorDetails,
    mockGetRequestClientIdentifier,
    mockGetGenerationReadiness,
    mockRecordGenerationFailure,
    mockRecordGenerationSuccess,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockClaimDtfGenerationRequest: vi.fn(),
    mockCompleteDtfGenerationRequest: vi.fn(),
    mockFailDtfGenerationRequest: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockGenerateMockup: vi.fn(),
    mockReserveDailyQuota: vi.fn(),
    mockLogActivity: vi.fn(),
    mockReleaseDailyQuota: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
    mockGetRequestClientIdentifier: vi.fn(),
    mockGetGenerationReadiness: vi.fn(),
    mockRecordGenerationFailure: vi.fn(),
    mockRecordGenerationSuccess: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/route-runtime", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/app/api/washa-dtf-studio/utils/route-runtime")>(),
    requireDtfRouteAccess: mockRequireDtfRouteAccess,
    claimDtfGenerationRequest: mockClaimDtfGenerationRequest,
    completeDtfGenerationRequest: mockCompleteDtfGenerationRequest,
    failDtfGenerationRequest: mockFailDtfGenerationRequest,
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

vi.mock("@/lib/washa-dtf-generation-readiness", () => ({
    getWashaDtfGenerationReadiness: mockGetGenerationReadiness,
    recordWashaDtfGenerationFailure: mockRecordGenerationFailure,
    recordWashaDtfGenerationSuccess: mockRecordGenerationSuccess,
}));

import { POST } from "@/app/api/washa-dtf-studio/generate-mockup/route";

describe("generate-mockup route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockClaimDtfGenerationRequest.mockReset();
        mockCompleteDtfGenerationRequest.mockReset();
        mockFailDtfGenerationRequest.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockGenerateMockup.mockReset();
        mockReserveDailyQuota.mockReset();
        mockLogActivity.mockReset();
        mockReleaseDailyQuota.mockReset();
        mockGetWashaDtfErrorDetails.mockReset();
        mockGetRequestClientIdentifier.mockReset();
        mockGetGenerationReadiness.mockReset();
        mockRecordGenerationFailure.mockReset();
        mockRecordGenerationSuccess.mockReset();

        mockRequireDtfRouteAccess.mockResolvedValue({
            access: {
                allowed: true,
                profileId: "profile_1",
                clerkId: "clerk_1",
                role: "subscriber",
            },
        });
        mockClaimDtfGenerationRequest.mockResolvedValue({
            claimed: true,
            state: "claimed",
            retryAfterSeconds: 0,
        });
        mockCompleteDtfGenerationRequest.mockResolvedValue(true);
        mockFailDtfGenerationRequest.mockResolvedValue(true);
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
        mockGetGenerationReadiness.mockReturnValue({
            enabled: true,
            code: "ready",
            message: "خدمة التوليد جاهزة.",
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

    it("validates the request before authentication and quota", async () => {
        mockParseAndValidateDtfJson.mockResolvedValue({
            response: NextResponse.json(
                {
                    ok: false,
                    code: "INVALID_REQUEST",
                    message: "الوصف مطلوب",
                    requestId: "request-invalid",
                    retryable: false,
                },
                { status: 400 }
            ),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-invalid" },
        }) as NextRequest);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            ok: false,
            code: "INVALID_REQUEST",
            message: "الوصف مطلوب",
            requestId: "request-invalid",
            retryable: false,
        });
        expect(mockRequireDtfRouteAccess).not.toHaveBeenCalled();
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
    });

    it("rejects generation before reserving quota when the provider is not ready", async () => {
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "disabled",
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            retryable: false,
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("requires authenticated access for generation", async () => {
        await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(mockRequireDtfRouteAccess).toHaveBeenCalledWith(
            expect.objectContaining({ allowPublicGeneration: false })
        );
    });

    it("returns AUTH_REQUIRED without reserving quota for a signed-out user", async () => {
        mockRequireDtfRouteAccess.mockResolvedValueOnce({
            response: NextResponse.json({
                ok: false,
                code: "AUTH_REQUIRED",
                message: "يلزم تسجيل الدخول لإكمال العملية.",
                requestId: "request-auth",
                retryable: false,
            }, { status: 401 }),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-auth" },
        }) as NextRequest);

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "AUTH_REQUIRED",
            message: "يلزم تسجيل الدخول لإكمال العملية.",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns AUTH_TEMPORARILY_UNAVAILABLE only for an auth runtime failure", async () => {
        mockRequireDtfRouteAccess.mockResolvedValueOnce({
            response: NextResponse.json({
                ok: false,
                code: "AUTH_TEMPORARILY_UNAVAILABLE",
                message: "تعذّر التحقق من جلسة الدخول مؤقتاً.",
                requestId: "request-auth-temp",
                retryable: true,
            }, { status: 503 }),
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "request-auth-temp" },
        }) as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "AUTH_TEMPORARILY_UNAVAILABLE",
            message: "تعذّر التحقق من جلسة الدخول مؤقتاً.",
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
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

    it("blocks retry when the quota reservation outcome cannot be reconciled", async () => {
        mockReserveDailyQuota.mockResolvedValue({
            allowed: false,
            remaining: 0,
            used: 0,
            tracked: false,
            source: "none",
            freeRemaining: 0,
            paidBalance: 0,
            reason: "quota_unavailable",
            reservationState: "ambiguous",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "generation-request-quota-ambiguous" },
        }) as NextRequest);

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "QUOTA_STATE_UNCERTAIN",
            retryable: false,
        });
        expect(mockFailDtfGenerationRequest).toHaveBeenCalledWith(
            "profile_1",
            "generation-request-quota-ambiguous",
            {
                operation: "generate-mockup",
                blockRetry: true,
            }
        );
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns the current success payload shape", async () => {
        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(200);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({
            ok: true,
            imageUrl: "data:image/png;base64,MOCKUP",
            remainingPoints: 4,
            freeRemaining: 4,
            paidBalance: 0,
            consumedSource: "free",
            guest: false,
        });
        expect(response.headers.get("X-Request-Id")).toBeTruthy();
        expect(mockGenerateMockup).toHaveBeenCalledWith(
            "تصميم عربي حديث",
            null,
            expect.objectContaining({
                traceId: expect.any(String),
                timeoutMs: 90_000,
            })
        );
        expect(mockReserveDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber", {
            guestIdentifier: null,
            requestId: expect.any(String),
            operation: "generate-mockup",
        });
        expect(mockRecordGenerationSuccess).toHaveBeenCalledTimes(1);
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "success",
            })
        );
    });

    it("reserves one point once per successful generation request", async () => {
        mockReserveDailyQuota
            .mockResolvedValueOnce({
                allowed: true,
                remaining: 4,
                used: 1,
                quotaDate: "2026-07-12",
                tracked: true,
                source: "free",
                freeRemaining: 4,
                paidBalance: 0,
            })
            .mockResolvedValueOnce({
                allowed: true,
                remaining: 3,
                used: 2,
                quotaDate: "2026-07-12",
                tracked: true,
                source: "free",
                freeRemaining: 3,
                paidBalance: 0,
            });

        const first = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);
        const second = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        await expect(first.json()).resolves.toMatchObject({ freeRemaining: 4 });
        await expect(second.json()).resolves.toMatchObject({ freeRemaining: 3 });
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(2);
        expect(mockGenerateMockup).toHaveBeenCalledTimes(2);
    });

    it("blocks a repeated idempotency key before a second quota reservation", async () => {
        mockClaimDtfGenerationRequest
            .mockResolvedValueOnce({
                claimed: true,
                state: "claimed",
                retryAfterSeconds: 0,
            })
            .mockResolvedValueOnce({
                claimed: false,
                state: "processing",
                retryAfterSeconds: 120,
            });
        const request = () => new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "generation-request-duplicate" },
        }) as NextRequest;

        const first = await POST(request());
        const repeated = await POST(request());

        expect(first.status).toBe(200);
        expect(repeated.status).toBe(409);
        await expect(repeated.json()).resolves.toMatchObject({
            ok: false,
            code: "DUPLICATE_REQUEST",
            message: "طلب التوليد نفسه ما زال قيد التنفيذ. انتظر اكتماله قبل المحاولة مجدداً.",
            retryable: false,
        });
        expect(repeated.headers.get("Retry-After")).toBe("120");
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(1);
        expect(mockGenerateMockup).toHaveBeenCalledTimes(1);
    });

    it("allows the same idempotency key to retry after a failed attempt was released", async () => {
        mockClaimDtfGenerationRequest
            .mockResolvedValueOnce({
                claimed: true,
                state: "claimed",
                retryAfterSeconds: 0,
            })
            .mockResolvedValueOnce({
                claimed: true,
                state: "claimed",
                retryAfterSeconds: 0,
            });
        mockGenerateMockup
            .mockRejectedValueOnce(new Error("provider timeout"))
            .mockResolvedValueOnce("data:image/png;base64,RETRY");
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });
        const request = () => new Request("http://localhost/api/dtf/generate", {
            headers: { "x-request-id": "generation-request-retryable" },
        }) as NextRequest;

        const first = await POST(request());
        const retried = await POST(request());

        expect(first.status).toBe(503);
        expect(retried.status).toBe(200);
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(mockReserveDailyQuota).toHaveBeenCalledTimes(2);
        expect(mockGenerateMockup).toHaveBeenCalledTimes(2);
    });

    it("fails closed when distributed idempotency is unavailable", async () => {
        mockClaimDtfGenerationRequest.mockResolvedValueOnce({
            claimed: false,
            state: "unavailable",
            retryAfterSeconds: 0,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IDEMPOTENCY_UNAVAILABLE",
            retryable: false,
        });
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });

    it("returns a successful generation even when success telemetry fails", async () => {
        mockLogActivity.mockRejectedValueOnce(new Error("telemetry unavailable"));

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            imageUrl: "data:image/png;base64,MOCKUP",
            remainingPoints: 4,
        });
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).not.toHaveBeenCalled();
    });

    it("does not open the provider circuit for a non-retryable 4xx rejection", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("invalid image input"));
        mockGetWashaDtfErrorDetails.mockReturnValue({ message: "الصورة غير صالحة", status: 400 });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            retryable: false,
        });
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
    });

    it("releases tracked quota and returns a public provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("provider timeout"));
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(503);
        expect(response.headers.get("X-Trace-Id")).toBeTruthy();
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            message: "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.",
            retryable: true,
        });
        expect(mockReleaseDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber", "free", {
            guestIdentifier: null,
            requestId: expect.any(String),
            operation: "generate-mockup",
            quotaDate: "2026-03-30",
        });
        expect(mockRecordGenerationFailure).toHaveBeenCalledWith(expect.any(Error));
        expect(mockLogActivity).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "generate-mockup",
                status: "timeout",
                errorMessage: "انتهت مهلة التوليد من المزود الخارجي.",
            })
        );
    });

    it("blocks an automatic retry when a failed generation quota could not be restored", async () => {
        mockGenerateMockup.mockRejectedValue(new Error("provider timeout"));
        mockReleaseDailyQuota.mockResolvedValue(false);
        mockGetWashaDtfErrorDetails.mockReturnValue({
            message: "انتهت مهلة التوليد من المزود الخارجي.",
            status: 504,
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toMatchObject({
            ok: false,
            code: "INTERNAL_ERROR",
            retryable: false,
        });
        expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({
            metadata: expect.objectContaining({ quotaReleased: false }),
        }));
    });
});
