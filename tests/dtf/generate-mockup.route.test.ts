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
    mockGetExistingGeneration,
    mockHasPersistedGenerationAttempt,
    mockReserveDailyQuota,
    mockLogActivity,
    mockReleaseDailyQuota,
    mockGetWashaDtfErrorDetails,
    mockGetRequestClientIdentifier,
    mockGetGenerationReadiness,
    mockRecordGenerationFailure,
    mockRecordGenerationSuccess,
    mockGetArtworkProviderReadiness,
    mockLogDtfTrace,
} = vi.hoisted(() => ({
    mockRequireDtfRouteAccess: vi.fn(),
    mockClaimDtfGenerationRequest: vi.fn(),
    mockCompleteDtfGenerationRequest: vi.fn(),
    mockFailDtfGenerationRequest: vi.fn(),
    mockEnforceDtfRouteRateLimit: vi.fn(),
    mockParseAndValidateDtfJson: vi.fn(),
    mockGenerateMockup: vi.fn(),
    mockGetExistingGeneration: vi.fn(),
    mockHasPersistedGenerationAttempt: vi.fn(),
    mockReserveDailyQuota: vi.fn(),
    mockLogActivity: vi.fn(),
    mockReleaseDailyQuota: vi.fn(),
    mockGetWashaDtfErrorDetails: vi.fn(),
    mockGetRequestClientIdentifier: vi.fn(),
    mockGetGenerationReadiness: vi.fn(),
    mockRecordGenerationFailure: vi.fn(),
    mockRecordGenerationSuccess: vi.fn(),
    mockGetArtworkProviderReadiness: vi.fn(),
    mockLogDtfTrace: vi.fn(),
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

vi.mock("@/app/api/washa-dtf-studio/services/design-asset.service", () => ({
    DesignAssetService: {
        generate: mockGenerateMockup,
        getExistingGeneration: mockGetExistingGeneration,
        hasPersistedGenerationAttempt: mockHasPersistedGenerationAttempt,
    },
}));

vi.mock("@/lib/washa-artwork/provider", () => ({
    getIsolatedArtworkProviderReadiness: mockGetArtworkProviderReadiness,
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

vi.mock("@/app/api/washa-dtf-studio/utils/trace", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/app/api/washa-dtf-studio/utils/trace")>(),
    logDtfTrace: mockLogDtfTrace,
}));

import { POST } from "@/app/api/washa-dtf-studio/generate-mockup/route";
import { WashaDtfProviderChainError } from "@/lib/washa-dtf-provider-config";
import { ArtworkPrintValidationError } from "@/lib/washa-artwork/normalization";
import { ArtworkPlacementError } from "@/lib/washa-artwork/placement";

function generationResult(preview = "https://cdn.example/mockup-front.webp") {
    return {
        imageUrl: preview,
        previewUrl: preview,
        frontPreviewUrl: preview,
        backPreviewUrl: null,
        designRequestId: "11111111-1111-4111-8111-111111111111",
        masterAssetId: "22222222-2222-4222-8222-222222222222",
        masterAssetUrl: "https://cdn.example/design-master.png",
        masterChecksum: "a".repeat(64),
        mockupSourceType: "reference",
        placement: {
            side: "front",
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
            printWidthCm: 30,
            printHeightCm: 40,
            anchorX: 0.5,
            anchorY: 0.5,
            referenceMockupId: "33333333-3333-4333-8333-333333333333",
            printAreaId: "front_default",
            transformVersion: 1,
        },
        transparencyVerificationStatus: "verified",
        productionReadinessStatus: "ready",
        provider: "genai",
        model: "gemini-3-pro-image",
    };
}

describe("generate-mockup route", () => {
    beforeEach(() => {
        mockRequireDtfRouteAccess.mockReset();
        mockClaimDtfGenerationRequest.mockReset();
        mockCompleteDtfGenerationRequest.mockReset();
        mockFailDtfGenerationRequest.mockReset();
        mockEnforceDtfRouteRateLimit.mockReset();
        mockParseAndValidateDtfJson.mockReset();
        mockGenerateMockup.mockReset();
        mockGetExistingGeneration.mockReset();
        mockHasPersistedGenerationAttempt.mockReset();
        mockReserveDailyQuota.mockReset();
        mockLogActivity.mockReset();
        mockReleaseDailyQuota.mockReset();
        mockGetWashaDtfErrorDetails.mockReset();
        mockGetRequestClientIdentifier.mockReset();
        mockGetGenerationReadiness.mockReset();
        mockRecordGenerationFailure.mockReset();
        mockRecordGenerationSuccess.mockReset();
        mockGetArtworkProviderReadiness.mockReset();
        mockLogDtfTrace.mockReset();

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
                garmentReferenceImage: null,
                generationContext: {
                    garmentId: "44444444-4444-4444-8444-444444444444",
                    colorId: "55555555-5555-4555-8555-555555555555",
                    sizeId: "66666666-6666-4666-8666-666666666666",
                    garmentType: "تيشيرت",
                    garmentColor: "أسود",
                    colorHex: "#111111",
                    designMethod: "text",
                    style: "هندسي",
                    technique: "رقمي",
                    palette: "ذهبي",
                    printPosition: "chest",
                    printSize: "large",
                    printScale: 100,
                    printOffsetX: 0,
                    printOffsetY: 0,
                },
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
        mockGenerateMockup.mockResolvedValue(generationResult());
        mockGetExistingGeneration.mockResolvedValue(null);
        mockHasPersistedGenerationAttempt.mockResolvedValue(false);
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

    it("resumes a persisted master without provider readiness or a second quota reservation", async () => {
        mockHasPersistedGenerationAttempt.mockResolvedValue(true);
        mockGetGenerationReadiness.mockReturnValue({
            enabled: false,
            code: "temporarily_unavailable",
            message: "provider unavailable",
        });
        mockGetArtworkProviderReadiness.mockReturnValue({
            ready: false,
            message: "transparent provider unavailable",
        });

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);

        expect(response.status).toBe(200);
        expect(mockReserveDailyQuota).not.toHaveBeenCalled();
        expect(mockGenerateMockup).toHaveBeenCalledOnce();
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
            imageUrl: "https://cdn.example/mockup-front.webp",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: "a".repeat(64),
            remainingPoints: 4,
            freeRemaining: 4,
            paidBalance: 0,
            consumedSource: "free",
            guest: false,
        });
        expect(response.headers.get("X-Request-Id")).toBeTruthy();
        expect(mockGenerateMockup).toHaveBeenCalledWith(
            expect.objectContaining({
                profileId: "profile_1",
                generationRequestId: expect.any(String),
                userIdea: "تصميم عربي حديث",
                selection: expect.objectContaining({
                    garmentId: "44444444-4444-4444-8444-444444444444",
                    colorId: "55555555-5555-4555-8555-555555555555",
                    printPosition: "chest",
                }),
            })
        );
        expect(mockReserveDailyQuota).toHaveBeenCalledWith("profile_1", "subscriber", {
            guestIdentifier: null,
            requestId: expect.any(String),
            operation: "generate-mockup",
        });
        expect(mockRecordGenerationSuccess).toHaveBeenCalledTimes(1);
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "/api/washa-dtf-studio/generate-mockup",
            expect.any(String),
            "provider_completed",
            expect.objectContaining({
                resolvedProvider: "genai",
                attemptedProvider: "genai",
                attemptedModel: "gemini-3-pro-image",
            })
        );
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
            .mockResolvedValueOnce(generationResult("https://cdn.example/retry.webp"));
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
            imageUrl: "https://cdn.example/mockup-front.webp",
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

    it("classifies post-provider print validation independently from provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(new ArtworkPrintValidationError({
            message: "Normalized artwork failed print validation: unsafe internal detail.",
            stage: "validation",
            diagnostics: {
                input: {
                    declaredMimeType: "image/jpeg",
                    magicBytesFormat: "jpeg",
                    width: 1024,
                    height: 1024,
                    hasAlphaChannel: false,
                    transparentPixelRatio: 0,
                },
                output: {
                    detectedFormat: "png",
                    hasAlphaChannel: true,
                    transparentPixelRatio: 0.25,
                },
            },
            validationErrors: ["Artwork contains an opaque background panel."],
        }));

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );
        const payload = await response.json();

        expect(response.status).toBe(422);
        expect(payload).toMatchObject({
            ok: false,
            code: "ARTWORK_PRINT_VALIDATION_FAILED",
            retryable: false,
        });
        expect(JSON.stringify(payload)).not.toContain("unsafe internal detail");
        expect(JSON.stringify(payload)).not.toContain("opaque background panel");
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockRecordGenerationSuccess).not.toHaveBeenCalled();
        expect(mockGetWashaDtfErrorDetails).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "provider_failed"
            )
        ).toBe(false);
        const validationLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "artwork_print_validation_failed"
        );
        expect(validationLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            resolvedModel: "gemini-3-pro-image",
            statusCode: 422,
            errorCode: "ARTWORK_PRINT_VALIDATION_FAILED",
            errorStage: "validation",
        });
        expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({
            status: "error",
            errorMessage: expect.not.stringContaining("unsafe internal detail"),
            metadata: expect.objectContaining({
                errorCode: "ARTWORK_PRINT_VALIDATION_FAILED",
            }),
        }));
    });

    it("classifies invalid artwork placement independently from provider failure", async () => {
        mockGenerateMockup.mockRejectedValue(new ArtworkPlacementError({
            message: "Artwork placement is clipped by the printable safe area.",
            diagnostics: {
                reason: "pixel_placement_outside_safe_area",
                printAreaPixels: { left: 369, top: 246, width: 1311, height: 1556 },
                artworkPixels: { left: 370, top: 328, width: 1311, height: 1391 },
            },
        }));

        const response = await POST(
            new Request("http://localhost/api/dtf/generate") as NextRequest
        );
        const payload = await response.json();

        expect(response.status).toBe(422);
        expect(payload).toMatchObject({
            ok: false,
            code: "ARTWORK_PLACEMENT_INVALID",
            retryable: false,
        });
        expect(JSON.stringify(payload)).not.toContain("1311");
        expect(mockRecordGenerationFailure).not.toHaveBeenCalled();
        expect(mockRecordGenerationSuccess).not.toHaveBeenCalled();
        expect(mockGetWashaDtfErrorDetails).not.toHaveBeenCalled();
        expect(mockReleaseDailyQuota).toHaveBeenCalledTimes(1);
        expect(
            mockLogDtfTrace.mock.calls.some(
                (call) => call[2] === "provider_failed"
            )
        ).toBe(false);
        const placementLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "artwork_placement_failed"
        );
        expect(placementLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            resolvedModel: "gemini-3-pro-image",
            statusCode: 422,
            errorCode: "ARTWORK_PLACEMENT_INVALID",
            errorStage: "placement",
            diagnostics: expect.objectContaining({
                reason: "pixel_placement_outside_safe_area",
            }),
        });
    });

    it("keeps the public error safe while server diagnostics retain both provider failures", async () => {
        const secret = "gemini-secret-that-must-never-appear";
        const originalError = new Error(`Gemini failed api_key=${secret}`);
        const providerError = new WashaDtfProviderChainError([
            {
                provider: "genai",
                model: "gemini-3-pro-image",
                attempt: 1,
                durationMs: 100,
                status: "RESOURCE_EXHAUSTED",
                code: 429,
                message: "Gemini quota failed [credential-omitted]",
            },
            {
                provider: "openai",
                model: "gpt-image-1",
                attempt: 2,
                durationMs: 20,
                status: 400,
                code: "billing_hard_limit_reached",
                message: "Billing hard limit has been reached.",
            },
        ], originalError);
        mockGenerateMockup.mockRejectedValue(providerError);

        const response = await POST(new Request("http://localhost/api/dtf/generate") as NextRequest);
        const payload = await response.json();

        expect(payload).toMatchObject({
            ok: false,
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            message: "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.",
        });
        expect(JSON.stringify(payload)).not.toContain("Gemini quota");
        expect(JSON.stringify(payload)).not.toContain("Billing hard limit");

        const failureLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "provider_failed"
        );
        expect(failureLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            attemptedProvider: "openai",
            attemptedModel: "gpt-image-1",
            providerAttempt: 2,
            providerAttempts: [
                expect.objectContaining({ provider: "genai", code: 429 }),
                expect.objectContaining({
                    provider: "openai",
                    code: "billing_hard_limit_reached",
                }),
            ],
        });
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).not.toContain(secret);
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
