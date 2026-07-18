import { NextRequest, NextResponse } from "next/server";
import { generateMockupSchema } from "../validators/ai-studio.schema";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";
import { DesignAssetService } from "../services/design-asset.service";
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
import { getIsolatedArtworkProviderReadiness } from "@/lib/washa-artwork/provider";
import {
    getWashaDtfProviderAttempts,
    sanitizeWashaDtfProviderMessage,
} from "@/lib/washa-dtf-provider-config";
import { isArtworkTextPolicyError } from "@/lib/washa-artwork/arabic-text-verification";
import { isArtworkPrintValidationError } from "@/lib/washa-artwork/normalization";
import { isArtworkPlacementError } from "@/lib/washa-artwork/placement";
import { unstable_rethrow } from "next/navigation";

export const runtime = "nodejs";
// gpt-image-2 عند 2048×2048 أبطأ من النماذج الأصغر. الميزانية الزمنية للطلب يجب أن تتّسع
// للمحاولة الأساسية + تطبيع الخلفية (RGBA) + محاولة Gemini fallback عند الحاجة.
// مهلة المزوّد الافتراضية 120s لكل محاولة (provider.ts) ⇒ 2×120 + تطبيع < 300s.
export const maxDuration = 300;
const GENERATE_MOCKUP_ROUTE = "/api/washa-dtf-studio/generate-mockup";
const GENERATE_MOCKUP_OPERATION = "generate-mockup";
const ARTWORK_PRINT_VALIDATION_PUBLIC_ERROR =
    "تعذر تجهيز التصميم كملف طباعة شفاف وآمن. عدّل الوصف وجرّب مرة أخرى.";
const ARTWORK_PLACEMENT_PUBLIC_ERROR =
    "تعذر وضع التصميم داخل مساحة الطباعة الآمنة. صغّر الحجم أو أعد تمركزه ثم جرّب مرة أخرى.";
const ARTWORK_TEXT_POLICY_PUBLIC_ERROR =
    "تم اكتشاف كتابة غير مطلوبة في التصميم، لذلك رُفضت النتيجة حفاظاً على طلبك. أعد المحاولة وسيُنشأ التصميم دون نص.";

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

        const { prompt, referenceImage, garmentReferenceImage, generationContext } = bodyResult.data;
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "payload_ready", {
            promptLength: prompt.length,
            hasReferenceImage: Boolean(referenceImage?.base64),
            hasGarmentReferenceImage: Boolean(garmentReferenceImage?.base64),
            hasStructuredGenerationContext: Boolean(generationContext),
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
        if (!access.profileId) {
            return structuredErrorResponse(
                traceId,
                500,
                "INTERNAL_ERROR",
                "تعذّر ربط عملية التوليد بحساب المستخدم.",
                { retryable: false }
            );
        }

        const existingGeneration = await DesignAssetService.getExistingGeneration(
            access.profileId,
            traceId
        );
        if (existingGeneration) {
            return attachDtfTraceId(NextResponse.json({
                ok: true,
                requestId: traceId,
                ...existingGeneration,
                remainingPoints: null,
                freeRemaining: null,
                paidBalance: null,
                consumedSource: null,
                guest: false,
                reused: true,
            }), traceId);
        }
        const hasPersistedAttempt = await DesignAssetService.hasPersistedGenerationAttempt(
            access.profileId,
            traceId
        );
        if (!hasPersistedAttempt && !generationReadiness.enabled) {
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
        const artworkProviderReadiness = getIsolatedArtworkProviderReadiness();
        if (!hasPersistedAttempt && !artworkProviderReadiness.ready) {
            return structuredErrorResponse(
                traceId,
                503,
                "TRANSPARENT_ARTWORK_PROVIDER_UNAVAILABLE",
                artworkProviderReadiness.message,
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
        const quota = hasPersistedAttempt
            ? {
                allowed: true,
                remaining: 0,
                used: 0,
                tracked: false,
                source: "bypass" as const,
                freeRemaining: 0,
                paidBalance: 0,
            }
            : await DtfTelemetryService.reserveDailyQuota(access.profileId, access.role, {
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

        let generationResult: Awaited<ReturnType<typeof DesignAssetService.generate>>;
        try {
        const providerStartedAt = Date.now();
        generationResult = await DesignAssetService.generate({
            profileId: access.profileId,
            generationRequestId: traceId,
            userIdea: prompt,
            referenceImage,
            legacyGarmentReference: garmentReferenceImage,
            context: {
                designMethod: generationContext?.designMethod,
                style: generationContext?.style,
                technique: generationContext?.technique,
                palette: generationContext?.palette,
                calligraphyText: generationContext?.calligraphyText,
                referenceImageMode: generationContext?.referenceImageMode,
            },
            selection: {
                garmentId: generationContext?.garmentId ?? null,
                colorId: generationContext?.colorId ?? null,
                sizeId: generationContext?.sizeId ?? null,
                garmentType: generationContext?.garmentType || "قطعة ملابس",
                garmentColor: generationContext?.garmentColor || "اللون المختار",
                colorHex: generationContext?.colorHex ?? null,
                printPosition: generationContext?.printPosition ?? "chest",
                printSize: generationContext?.printSize ?? "large",
                printScale: generationContext?.printScale,
                printOffsetX: generationContext?.printOffsetX,
                printOffsetY: generationContext?.printOffsetY,
            },
        });
        recordWashaDtfGenerationSuccess();
        logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "provider_completed", {
            resolvedProvider: generationReadiness.provider ?? "configured",
            attemptedProvider: generationResult.provider,
            attemptedModel: generationResult.model,
            durationMs: Date.now() - providerStartedAt,
            statusCode: 200,
            errorCode: null,
        });

        } catch (error) {
        const textPolicyError = isArtworkTextPolicyError(error) ? error : null;
        const artworkError =
            isArtworkPrintValidationError(error) || isArtworkPlacementError(error)
                ? error
                : null;
        const artworkPlacementFailure = artworkError
            ? isArtworkPlacementError(artworkError)
            : false;
        const handled = textPolicyError
            ? {
                message: ARTWORK_TEXT_POLICY_PUBLIC_ERROR,
                status: 422,
            }
            : artworkError
            ? {
                message: artworkPlacementFailure
                    ? ARTWORK_PLACEMENT_PUBLIC_ERROR
                    : ARTWORK_PRINT_VALIDATION_PUBLIC_ERROR,
                status: 422,
            }
            : getWashaDtfErrorDetails(error);
        if (textPolicyError) {
            logDtfTrace(
                GENERATE_MOCKUP_ROUTE,
                traceId,
                "artwork_text_policy_failed",
                {
                    resolvedProvider: generationReadiness.provider ?? "configured",
                    resolvedModel: generationReadiness.model ?? null,
                    statusCode: 422,
                    errorCode: textPolicyError.code,
                    durationMs: Date.now() - routeStartedAt,
                }
            );
        } else if (artworkError) {
            logDtfTrace(
                GENERATE_MOCKUP_ROUTE,
                traceId,
                artworkPlacementFailure
                    ? "artwork_placement_failed"
                    : "artwork_print_validation_failed",
                {
                    resolvedProvider: generationReadiness.provider ?? "configured",
                    resolvedModel: generationReadiness.model ?? null,
                    fallbackEnabled: generationReadiness.fallbackEnabled ?? null,
                    statusCode: 422,
                    errorCode: artworkError.code,
                    errorStage: artworkError.stage,
                    durationMs: Date.now() - routeStartedAt,
                    diagnostics: artworkError.diagnostics,
                    validationErrors: artworkError.validationErrors,
                }
            );
        } else {
            if (handled.status === 429 || handled.status >= 500) {
                recordWashaDtfGenerationFailure(error);
            }
            const providerAttempts = getWashaDtfProviderAttempts(error);
            const lastProviderAttempt = providerAttempts.at(-1);
            logDtfTrace(GENERATE_MOCKUP_ROUTE, traceId, "provider_failed", {
                resolvedProvider: generationReadiness.provider ?? "configured",
                resolvedModel: generationReadiness.model ?? null,
                fallbackEnabled: generationReadiness.fallbackEnabled ?? null,
                attemptedProvider: lastProviderAttempt?.provider
                    ?? generationReadiness.provider
                    ?? "configured",
                attemptedModel: lastProviderAttempt?.model
                    ?? generationReadiness.model
                    ?? null,
                providerAttempt: lastProviderAttempt?.attempt ?? 1,
                providerAttempts,
                statusCode: handled.status,
                errorCode: "IMAGE_PROVIDER_UNAVAILABLE",
                durationMs: Date.now() - routeStartedAt,
                errorName: error instanceof Error ? error.name : "UnknownError",
                errorMessage: sanitizeWashaDtfProviderMessage(error),
            });
        }

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
                ...(textPolicyError
                    ? {
                        errorCode: textPolicyError.code,
                        errorStage: "text_policy_verification",
                    }
                    : {}),
                ...(artworkError
                    ? {
                        errorCode: artworkError.code,
                        errorStage: artworkError.stage,
                    }
                    : {}),
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

        if (textPolicyError) {
            return structuredErrorResponse(
                traceId,
                422,
                textPolicyError.code,
                ARTWORK_TEXT_POLICY_PUBLIC_ERROR,
                { retryable: true }
            );
        }
        if (artworkError) {
            return structuredErrorResponse(
                traceId,
                422,
                artworkError.code,
                artworkPlacementFailure
                    ? ARTWORK_PLACEMENT_PUBLIC_ERROR
                    : ARTWORK_PRINT_VALIDATION_PUBLIC_ERROR,
                { retryable: false }
            );
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
            resultImageUrl: generationResult.previewUrl,
            metadata: {
                masterAssetId: generationResult.masterAssetId,
                masterChecksum: generationResult.masterChecksum,
                designRequestId: generationResult.designRequestId,
                mockupSourceType: generationResult.mockupSourceType,
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
            ...generationResult,
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
            errorMessage: sanitizeWashaDtfProviderMessage(error),
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
