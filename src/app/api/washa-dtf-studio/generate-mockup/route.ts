import { NextRequest, NextResponse } from "next/server";
import { generateMockupSchema } from "../validators/ai-studio.schema";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";
import { AiStudioService } from "../services/ai-studio.service";
import { DtfTelemetryService } from "../services/dtf-telemetry.service";
import {
    claimDtfGenerationRequest,
    completeDtfGenerationRequest,
    enforceDtfRouteRateLimit,
    failDtfGenerationRequest,
    parseAndValidateDtfJson,
    requireDtfRouteAccess,
} from "../utils/route-runtime";
import {
    attachDtfTraceId,
    logDtfTrace,
    resolveDtfTraceId,
} from "../utils/trace";
import { DTF_PUBLIC_GENERATION_ERROR } from "../utils/public-error";
import {
    getWashaDtfGenerationReadiness,
    recordWashaDtfGenerationFailure,
    recordWashaDtfGenerationSuccess,
} from "@/lib/washa-dtf-generation-readiness";
import type { DesignPieceAccessResult } from "@/lib/design-piece-access";
import { unstable_rethrow } from "next/navigation";

export const runtime = "nodejs";
export const maxDuration = 120;
const GENERATE_MOCKUP_TIMEOUT_MS = (() => {
    const parsed = Number.parseInt(process.env.WASHA_DTF_PROVIDER_TIMEOUT_MS || "90000", 10);
    if (!Number.isFinite(parsed)) return 90_000;
    return Math.min(Math.max(parsed, 15_000), 180_000);
})();

const GENERATE_MOCKUP_ROUTE = "/api/washa-dtf-studio/generate-mockup";
const GENERATE_MOCKUP_OPERATION = "generate-mockup";

function structuredErrorResponse(
    requestId: string,
    status: number,
    code: string,
    message: string,
    options: {
        retryable?: boolean;
        headers?: HeadersInit;
    } = {}
) {
    return attachDtfTraceId(NextResponse.json(
        {
            ok: false,
            code,
            message,
            requestId,
            ...(options.retryable === undefined ? {} : { retryable: options.retryable }),
        },
        {
            status,
            headers: {
                "Cache-Control": "private, no-store",
                "X-Washa-Error-Code": code,
                ...(options.headers || {}),
            },
        }
    ), requestId);
}

function accessErrorResponder(requestId: string) {
    return (
        _message: string,
        _status: number,
        _logContext?: unknown,
        reason?: DesignPieceAccessResult["reason"]
    ) => {
        if (reason === "auth_unavailable") {
            return structuredErrorResponse(
                requestId,
                503,
                "AUTH_TEMPORARILY_UNAVAILABLE",
                "تعذّر التحقق من جلسة الدخول مؤقتاً.",
                { retryable: true }
            );
        }

        if (reason === "supabase_error") {
            return structuredErrorResponse(
                requestId,
                503,
                "USER_SERVICE_UNAVAILABLE",
                "تعذّر التحقق من بيانات المستخدم مؤقتاً.",
                { retryable: true }
            );
        }

        if (reason === "identity_conflict") {
            return structuredErrorResponse(
                requestId,
                409,
                "IDENTITY_CONFLICT",
                "تعذّر ربط حساب المستخدم تلقائياً.",
                { retryable: false }
            );
        }

        if (reason === "guest_needs_approval") {
            return structuredErrorResponse(
                requestId,
                403,
                "AUTH_FORBIDDEN",
                "لا يملك المستخدم صلاحية إكمال العملية.",
                { retryable: false }
            );
        }

        return structuredErrorResponse(
            requestId,
            401,
            "AUTH_REQUIRED",
            "يلزم تسجيل الدخول لإكمال العملية.",
            { retryable: false }
        );
    };
}

export async function POST(request: NextRequest) {
    const traceId = resolveDtfTraceId(request);
    const routeStartedAt = Date.now();
    logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "request_started", {
        method: "POST",
        route: GENERATE_MOCKUP_ROUTE,
    });

    try {
        const validationStartedAt = Date.now();
        const bodyResult = await parseAndValidateDtfJson(request, generateMockupSchema, {
            invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
            fallbackValidationMessage: "بيانات الطلب غير صالحة",
            errorResponder: (message) => structuredErrorResponse(
                traceId,
                400,
                "INVALID_REQUEST",
                message,
                { retryable: false }
            ),
        });
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "payload_validated", {
            durationMs: Date.now() - validationStartedAt,
            valid: Boolean(bodyResult.data),
            statusCode: bodyResult.data ? 200 : 400,
            errorCode: bodyResult.data ? null : "INVALID_REQUEST",
        });
        if (bodyResult.response) {
            return attachDtfTraceId(bodyResult.response, traceId);
        }

        const { prompt, referenceImage, garmentReferenceImage } = bodyResult.data;
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "payload_ready", {
            promptLength: prompt.length,
            hasReferenceImage: Boolean(referenceImage?.base64),
            hasGarmentReferenceImage: Boolean(garmentReferenceImage?.base64),
        });

        const accessStartedAt = Date.now();
        const accessResult = await requireDtfRouteAccess({
            allowPublicGeneration: false,
            errorResponder: accessErrorResponder(traceId),
        });
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "access_resolved", {
            durationMs: Date.now() - accessStartedAt,
            authState: accessResult.access?.allowed ? "authenticated" : "denied",
            userIdPresent: Boolean(accessResult.access?.clerkId),
            role: accessResult.access?.role ?? null,
            reason: accessResult.access?.reason ?? null,
            statusCode: accessResult.response?.status ?? 200,
            errorCode: accessResult.response?.headers.get("X-Washa-Error-Code") ?? null,
        });
        if (accessResult.response) {
            return attachDtfTraceId(accessResult.response, traceId);
        }
        const access = accessResult.access;

        const suppliedRequestId = request.headers.get("x-request-id")?.trim();
        if (suppliedRequestId && suppliedRequestId !== traceId) {
            return structuredErrorResponse(
                traceId,
                400,
                "INVALID_REQUEST",
                "معرّف الطلب غير صالح.",
                { retryable: false }
            );
        }

        const rateLimitStartedAt = Date.now();
        const rateLimitResponse = await enforceDtfRouteRateLimit(request, access, {
            keyPrefix: "gen",
            limit: 6,
            windowMs: 60_000,
            message: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
        });
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "rate_limit_checked", {
            durationMs: Date.now() - rateLimitStartedAt,
            blocked: Boolean(rateLimitResponse),
            statusCode: rateLimitResponse?.status ?? 200,
            errorCode: rateLimitResponse ? "RATE_LIMITED" : null,
        });
        if (rateLimitResponse) {
            return attachDtfTraceId(rateLimitResponse, traceId);
        }

        const generationReadiness = getWashaDtfGenerationReadiness();
        if (!generationReadiness.enabled) {
            logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "generation_unavailable", {
                provider: generationReadiness.provider ?? null,
                statusCode: 503,
                errorCode: "IMAGE_PROVIDER_UNAVAILABLE",
            });
            return structuredErrorResponse(
                traceId,
                503,
                "IMAGE_PROVIDER_UNAVAILABLE",
                generationReadiness.message,
                {
                    retryable: generationReadiness.code === "temporarily_unavailable",
                    headers: generationReadiness.retryAfterSeconds
                        ? { "Retry-After": String(generationReadiness.retryAfterSeconds) }
                        : undefined,
                }
            );
        }

        if (!access.profileId) {
            return structuredErrorResponse(
                traceId,
                500,
                "INTERNAL_ERROR",
                "تعذّر ربط عملية التوليد بحساب المستخدم.",
                { retryable: false }
            );
        }

        const generationClaim = await claimDtfGenerationRequest(
            access.profileId,
            traceId,
            GENERATE_MOCKUP_OPERATION
        );
        if (!generationClaim.claimed) {
            const isUnavailable = generationClaim.state === "unavailable";
            const isProcessing = generationClaim.state === "processing";
            const isSucceeded = generationClaim.state === "succeeded";
            const message = isUnavailable
                ? "تعذّر تثبيت معرّف عملية التوليد مؤقتاً."
                : isProcessing
                    ? "طلب التوليد نفسه ما زال قيد التنفيذ. انتظر اكتماله قبل المحاولة مجدداً."
                    : isSucceeded
                        ? "اكتمل طلب التوليد هذا مسبقاً، لكن نتيجته غير محفوظة في سجل الطلب. ابدأ محاولة جديدة فقط إذا لم تظهر النتيجة لديك."
                        : "تعذّر إعادة محاولة هذا الطلب لأن حالة الحصة غير محسومة. تحقق من رصيدك قبل بدء محاولة جديدة.";
            const statusCode = isUnavailable ? 503 : 409;
            const errorCode = isUnavailable ? "IDEMPOTENCY_UNAVAILABLE" : "DUPLICATE_REQUEST";
            logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "duplicate_request_blocked", {
                authState: "authenticated",
                userIdPresent: true,
                requestState: generationClaim.state,
                statusCode,
                errorCode,
                durationMs: Date.now() - routeStartedAt,
            });
            return structuredErrorResponse(
                traceId,
                statusCode,
                errorCode,
                message,
                {
                    retryable: false,
                    headers: isProcessing && generationClaim.retryAfterSeconds > 0
                        ? { "Retry-After": String(generationClaim.retryAfterSeconds) }
                        : undefined,
                }
            );
        }

        const quotaStartedAt = Date.now();
        const quota = await DtfTelemetryService.reserveDailyQuota(access.profileId, access.role, {
            guestIdentifier: null,
            requestId: traceId,
            operation: GENERATE_MOCKUP_OPERATION,
        });
        const quotaStateAmbiguous =
            quota.reason === "quota_unavailable"
            && quota.reservationState === "ambiguous";
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "quota_checked", {
            durationMs: Date.now() - quotaStartedAt,
            allowed: quota.allowed,
            tracked: quota.tracked,
            remaining: quota.remaining,
            used: quota.used,
            reservationState: quota.reservationState ?? null,
            statusCode: quota.allowed
                ? 200
                : quotaStateAmbiguous
                    ? 500
                    : quota.reason === "quota_unavailable"
                        ? 503
                        : 403,
            errorCode: quota.allowed
                ? null
                : quotaStateAmbiguous
                    ? "QUOTA_STATE_UNCERTAIN"
                    : quota.reason ?? "quota_exceeded",
        });
        if (!quota.allowed) {
            await failDtfGenerationRequest(access.profileId, traceId, {
                operation: GENERATE_MOCKUP_OPERATION,
                blockRetry: quotaStateAmbiguous,
            });
            const telemetryStartedAt = Date.now();
            const quotaUnavailable = quota.reason === "quota_unavailable";
            await DtfTelemetryService.logActivity({
                profileId: access.profileId,
                clerkId: access.clerkId,
                action: "generate-mockup",
                status: quotaUnavailable ? "error" : "quota_exceeded",
                errorMessage: quotaUnavailable ? "تعذّر التحقق من رصيد WASHA AI قبل التوليد." : undefined,
                metadata: {
                    remainingPoints: quota.remaining,
                    usedPoints: quota.used,
                    quotaDate: quota.quotaDate,
                    quotaReason: quota.reason ?? null,
                    reservationState: quota.reservationState ?? null,
                },
            });
            logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "quota_exceeded_logged", {
                duration_ms: Date.now() - telemetryStartedAt,
                total_duration_ms: Date.now() - routeStartedAt,
            });

            if (quotaStateAmbiguous) {
                return structuredErrorResponse(
                    traceId,
                    500,
                    "QUOTA_STATE_UNCERTAIN",
                    "تعذّر تأكيد حالة حجز الحصة. تحقق من رصيدك قبل بدء محاولة جديدة.",
                    { retryable: false }
                );
            }

            if (quota.reason === "audience_disabled") {
                return attachDtfTraceId(NextResponse.json(
                    {
                        error: "توليد وشّى AI غير متاح لحسابك حالياً.",
                        code: "audience_disabled",
                        canPurchase: false,
                        guest: access.role === "guest",
                    },
                    { status: 403 }
                ), traceId);
            }

            if (quota.reason === "quota_unavailable") {
                return attachDtfTraceId(NextResponse.json(
                    {
                        error: "تعذّر التحقق من رصيد WASHA AI حالياً. حاول بعد قليل.",
                        code: "quota_unavailable",
                        canPurchase: false,
                        guest: access.role === "guest",
                    },
                    { status: 503 }
                ), traceId);
            }

            return attachDtfTraceId(NextResponse.json(
                {
                    error: "نفدت حصتك من التوليد في وشّى AI. اشترِ رصيداً إضافياً للمتابعة الآن، أو انتظر تجديد حصتك المجانية غدًا.",
                    code: "quota_exceeded",
                    freeRemaining: quota.freeRemaining,
                    paidBalance: quota.paidBalance,
                    canPurchase: quota.canPurchase === true,
                    guest: access.role === "guest",
                },
                { status: 403 }
            ), traceId);
        }

        let imageUrl: string;
        try {
        const providerStartedAt = Date.now();
        imageUrl = await AiStudioService.generateMockup(prompt, referenceImage, {
            traceId,
            timeoutMs: GENERATE_MOCKUP_TIMEOUT_MS,
            garmentReferenceImage,
        });
        recordWashaDtfGenerationSuccess();
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "provider_completed", {
            provider: generationReadiness.provider ?? "configured",
            durationMs: Date.now() - providerStartedAt,
            statusCode: 200,
            errorCode: null,
        });

        } catch (error) {
        const handled = getWashaDtfErrorDetails(error);
        if (handled.status === 429 || handled.status >= 500) {
            recordWashaDtfGenerationFailure(error);
        }
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "provider_failed", {
            provider: generationReadiness.provider ?? "configured",
            statusCode: handled.status,
            errorCode: "IMAGE_PROVIDER_UNAVAILABLE",
            durationMs: Date.now() - routeStartedAt,
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: handled.message.slice(0, 300),
        });

        let quotaReleased = !quota.tracked;
        if (quota.tracked) {
            const releaseStartedAt = Date.now();
            quotaReleased = await DtfTelemetryService.releaseDailyQuota(access.profileId, access.role, quota.source, {
                guestIdentifier: null,
                requestId: traceId,
                operation: GENERATE_MOCKUP_OPERATION,
                quotaDate: quota.quotaDate ?? null,
            });
            logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "quota_released", {
                durationMs: Date.now() - releaseStartedAt,
                source: quota.source,
                released: quotaReleased,
            });
        }

        const telemetryStartedAt = Date.now();
        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "generate-mockup",
            status: handled.status === 504 ? "timeout" : "error",
            errorMessage: handled.message,
            metadata: {
                quotaReleased,
                quotaDate: quota.quotaDate,
            },
        });
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "failure_logged", {
            durationMs: Date.now() - telemetryStartedAt,
            totalDurationMs: Date.now() - routeStartedAt,
        });

        const quotaReleaseFailed = quota.tracked && !quotaReleased;
        if (quotaReleaseFailed) {
            await failDtfGenerationRequest(access.profileId, traceId, {
                operation: GENERATE_MOCKUP_OPERATION,
                blockRetry: true,
            });
            return structuredErrorResponse(
                traceId,
                500,
                "INTERNAL_ERROR",
                "تعذر إنشاء التصميم ولم نتمكن من تأكيد استرجاع الحصة. راجع رصيدك قبل إعادة المحاولة.",
                { retryable: false }
            );
        }
        if (!quota.tracked) {
            await failDtfGenerationRequest(access.profileId, traceId, {
                operation: GENERATE_MOCKUP_OPERATION,
                blockRetry: false,
            });
        }

        const providerStatus = handled.status === 429 || handled.status >= 500 ? 503 : 502;
        return structuredErrorResponse(
            traceId,
            providerStatus,
            "IMAGE_PROVIDER_UNAVAILABLE",
            DTF_PUBLIC_GENERATION_ERROR,
            { retryable: providerStatus === 503 }
        );
        }

        const telemetryStartedAt = Date.now();
        try {
        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "generate-mockup",
            status: "success",
            prompt,
            referenceImageUrl: referenceImage?.base64 ? "base64_hidden" : undefined,
            resultImageUrl: imageUrl || undefined,
            metadata: {
                hasGarmentReferenceImage: Boolean(garmentReferenceImage?.base64),
                remainingPointsAfterReservation: quota.remaining,
                usedPoints: quota.used,
                quotaDate: quota.quotaDate,
            },
        });
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "success_logged", {
            durationMs: Date.now() - telemetryStartedAt,
            totalDurationMs: Date.now() - routeStartedAt,
        });
        } catch (error) {
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "success_telemetry_failed", {
            durationMs: Date.now() - telemetryStartedAt,
            totalDurationMs: Date.now() - routeStartedAt,
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Unknown telemetry error",
        });
        }

        const requestCompleted = await completeDtfGenerationRequest(
            access.profileId,
            traceId,
            GENERATE_MOCKUP_OPERATION
        );
        if (!requestCompleted) {
            logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "idempotency_completion_failed", {
                statusCode: 200,
                errorCode: "IDEMPOTENCY_COMPLETION_FAILED",
            });
        }

        return attachDtfTraceId(NextResponse.json({
            ok: true,
            requestId: traceId,
            imageUrl,
            remainingPoints: quota.tracked ? quota.remaining : null,
            freeRemaining: quota.tracked ? quota.freeRemaining : null,
            paidBalance: quota.tracked ? quota.paidBalance : null,
            consumedSource: quota.tracked ? quota.source : null,
            guest: false,
        }), traceId);
    } catch (error) {
        unstable_rethrow(error);
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "internal_error", {
            authState: "unknown",
            userIdPresent: false,
            provider: null,
            statusCode: 500,
            errorCode: "INTERNAL_ERROR",
            durationMs: Date.now() - routeStartedAt,
            errorName: error instanceof Error ? error.name : "UnknownError",
            errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Unknown server error",
        });
        return structuredErrorResponse(
            traceId,
            500,
            "INTERNAL_ERROR",
            "حدث خطأ داخلي غير متوقع. حاول مرة أخرى لاحقاً.",
            { retryable: false }
        );
    }
}
