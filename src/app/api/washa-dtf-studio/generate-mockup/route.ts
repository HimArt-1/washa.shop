import { NextRequest, NextResponse } from "next/server";
import { generateMockupSchema } from "../validators/ai-studio.schema";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";
import { AiStudioService } from "../services/ai-studio.service";
import { DtfTelemetryService } from "../services/dtf-telemetry.service";
import {
    enforceDtfRouteRateLimit,
    parseAndValidateDtfJson,
    requireDtfRouteAccess,
} from "../utils/route-runtime";
import {
    attachDtfTraceId,
    logDtfTrace,
    resolveDtfTraceId,
} from "../utils/trace";

export const runtime = "nodejs";
export const maxDuration = 120;
const GENERATE_MOCKUP_TIMEOUT_MS = (() => {
    const parsed = Number.parseInt(process.env.WASHA_DTF_PROVIDER_TIMEOUT_MS || "90000", 10);
    if (!Number.isFinite(parsed)) return 90_000;
    return Math.min(Math.max(parsed, 15_000), 180_000);
})();

export async function POST(request: NextRequest) {
    const traceId = resolveDtfTraceId(request);
    const routeStartedAt = Date.now();
    logDtfTrace("dtf.generate-mockup", traceId, "request_started", {
        method: "POST",
    });

    const accessStartedAt = Date.now();
    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    logDtfTrace("dtf.generate-mockup", traceId, "access_resolved", {
        duration_ms: Date.now() - accessStartedAt,
        allowed: Boolean(accessResult.access?.allowed),
        role: accessResult.access?.role ?? null,
        reason: accessResult.access?.reason ?? null,
    });
    if (accessResult.response) {
        return attachDtfTraceId(accessResult.response, traceId);
    }
    const access = accessResult.access;

    const rateLimitStartedAt = Date.now();
    const rateLimitResponse = await enforceDtfRouteRateLimit(request, access, {
        keyPrefix: "gen",
        limit: 6,
        windowMs: 60_000,
        message: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
    });
    logDtfTrace("dtf.generate-mockup", traceId, "rate_limit_checked", {
        duration_ms: Date.now() - rateLimitStartedAt,
        blocked: Boolean(rateLimitResponse),
    });
    if (rateLimitResponse) {
        return attachDtfTraceId(rateLimitResponse, traceId);
    }

    const validationStartedAt = Date.now();
    const bodyResult = await parseAndValidateDtfJson(request, generateMockupSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات الطلب غير صالحة",
    });
    logDtfTrace("dtf.generate-mockup", traceId, "payload_validated", {
        duration_ms: Date.now() - validationStartedAt,
        valid: Boolean(bodyResult.data),
    });
    if (bodyResult.response) {
        return attachDtfTraceId(bodyResult.response, traceId);
    }

    const { prompt, referenceImage } = bodyResult.data;
    logDtfTrace("dtf.generate-mockup", traceId, "payload_ready", {
        prompt_length: prompt.length,
        has_reference_image: Boolean(referenceImage?.base64),
        reference_mime_type: referenceImage?.mimeType ?? null,
    });

    const quotaStartedAt = Date.now();
    const quota = await DtfTelemetryService.reserveDailyQuota(access.profileId, access.role);
    logDtfTrace("dtf.generate-mockup", traceId, "quota_checked", {
        duration_ms: Date.now() - quotaStartedAt,
        allowed: quota.allowed,
        tracked: quota.tracked,
        remaining: quota.remaining,
        used: quota.used,
    });
    if (!quota.allowed) {
        const telemetryStartedAt = Date.now();
        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "generate-mockup",
            status: "quota_exceeded",
            metadata: {
                remainingPoints: quota.remaining,
                usedPoints: quota.used,
                quotaDate: quota.quotaDate,
            },
        });
        logDtfTrace("dtf.generate-mockup", traceId, "quota_exceeded_logged", {
            duration_ms: Date.now() - telemetryStartedAt,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        return attachDtfTraceId(NextResponse.json(
            { error: "بلغت حصتك اليومية في Washa AI لهذا اليوم. ننتظرك مجددًا غدًا." },
            { status: 403 }
        ), traceId);
    }

    try {
        const providerStartedAt = Date.now();
        const imageUrl = await AiStudioService.generateMockup(prompt, referenceImage, {
            traceId,
            timeoutMs: GENERATE_MOCKUP_TIMEOUT_MS,
        });
        logDtfTrace("dtf.generate-mockup", traceId, "provider_completed", {
            duration_ms: Date.now() - providerStartedAt,
        });

        const telemetryStartedAt = Date.now();
        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "generate-mockup",
            status: "success",
            prompt,
            referenceImageUrl: referenceImage?.base64 ? "base64_hidden" : undefined,
            resultImageUrl: imageUrl || undefined,
            metadata: {
                remainingPointsAfterReservation: quota.remaining,
                usedPoints: quota.used,
                quotaDate: quota.quotaDate,
            },
        });
        logDtfTrace("dtf.generate-mockup", traceId, "success_logged", {
            duration_ms: Date.now() - telemetryStartedAt,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        return attachDtfTraceId(NextResponse.json({
            imageUrl,
            remainingPoints: quota.tracked ? quota.remaining : null,
        }), traceId);
    } catch (error) {
        console.error("[washa-dtf-studio.generate-mockup]", { traceId, error });
        const handled = getWashaDtfErrorDetails(error);
        logDtfTrace("dtf.generate-mockup", traceId, "provider_or_route_failed", {
            handled_status: handled.status,
            handled_message: handled.message,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        if (quota.tracked) {
            const releaseStartedAt = Date.now();
            await DtfTelemetryService.releaseDailyQuota(access.profileId, access.role);
            logDtfTrace("dtf.generate-mockup", traceId, "quota_released", {
                duration_ms: Date.now() - releaseStartedAt,
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
                quotaReleased: quota.tracked,
                quotaDate: quota.quotaDate,
            },
        });
        logDtfTrace("dtf.generate-mockup", traceId, "failure_logged", {
            duration_ms: Date.now() - telemetryStartedAt,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        return attachDtfTraceId(NextResponse.json(
            { error: handled.message },
            { status: handled.status }
        ), traceId);
    }
}
