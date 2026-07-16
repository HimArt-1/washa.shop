import { NextRequest, NextResponse } from "next/server";
import { extractDesignSchema } from "../validators/ai-studio.schema";
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
import { DTF_PUBLIC_EXTRACTION_ERROR } from "../utils/public-error";
import { DesignAssetService } from "../services/design-asset.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
    const traceId = resolveDtfTraceId(request);
    const routeStartedAt = Date.now();
    logDtfTrace("dtf.extract-design", traceId, "request_started", {
        method: "POST",
    });

    const accessStartedAt = Date.now();
    const accessResult = await requireDtfRouteAccess();
    logDtfTrace("dtf.extract-design", traceId, "access_resolved", {
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
        keyPrefix: "ext",
        limit: 6,
        windowMs: 60_000,
        message: "تم تجاوز الحد المسموح للاستخراج. يرجى الانتظار دقيقة والمحاولة مجدداً.",
    });
    logDtfTrace("dtf.extract-design", traceId, "rate_limit_checked", {
        duration_ms: Date.now() - rateLimitStartedAt,
        blocked: Boolean(rateLimitResponse),
    });
    if (rateLimitResponse) {
        return attachDtfTraceId(rateLimitResponse, traceId);
    }

    const validationStartedAt = Date.now();
    const bodyResult = await parseAndValidateDtfJson(request, extractDesignSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات الاستخراج غير مكتملة",
    });
    logDtfTrace("dtf.extract-design", traceId, "payload_validated", {
        duration_ms: Date.now() - validationStartedAt,
        valid: Boolean(bodyResult.data),
    });
    if (bodyResult.response) {
        return attachDtfTraceId(bodyResult.response, traceId);
    }

    try {
        const { masterAssetId, prompt, mockupImage, mimeType } = bodyResult.data;
        logDtfTrace("dtf.extract-design", traceId, "payload_ready", {
            prompt_length: prompt.length,
            mime_type: mimeType,
            mockup_image_length: mockupImage.length,
            master_asset_id: masterAssetId ?? null,
        });

        if (masterAssetId) {
            if (!access.profileId) {
                return attachDtfTraceId(NextResponse.json(
                    { error: "تعذر ربط أصل التصميم بحساب المستخدم." },
                    { status: 401 }
                ), traceId);
            }
            const master = await DesignAssetService.getMasterAsset(access.profileId, masterAssetId);
            return attachDtfTraceId(NextResponse.json(master), traceId);
        }

        if (process.env.WASHA_DTF_LEGACY_EXTRACTION_ENABLED !== "true") {
            return attachDtfTraceId(NextResponse.json(
                {
                    error: "مسار استخراج التصميم من الموكب متوقف. أعد توليد التصميم ليُحفظ كأصل شفاف مباشر.",
                    code: "LEGACY_EXTRACTION_DISABLED",
                },
                { status: 410 }
            ), traceId);
        }

        const providerStartedAt = Date.now();
        const imageUrl = await AiStudioService.extractDesign(prompt, mockupImage, mimeType, {
            traceId,
            timeoutMs: 45_000,
        });
        logDtfTrace("dtf.extract-design", traceId, "provider_completed", {
            duration_ms: Date.now() - providerStartedAt,
        });

        const telemetryStartedAt = Date.now();
        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "extract-design",
            status: "success",
            prompt,
            referenceImageUrl: "base64_hidden",
            resultImageUrl: imageUrl || undefined,
        });
        logDtfTrace("dtf.extract-design", traceId, "success_logged", {
            duration_ms: Date.now() - telemetryStartedAt,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        return attachDtfTraceId(NextResponse.json({ imageUrl }), traceId);
    } catch (error) {
        console.error("[washa-dtf-studio.extract-design]", { traceId, error });
        const handled = getWashaDtfErrorDetails(error);
        logDtfTrace("dtf.extract-design", traceId, "provider_or_route_failed", {
            handled_status: handled.status,
            handled_message: handled.message,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        const telemetryStartedAt = Date.now();
        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "extract-design",
            status: handled.status === 504 ? "timeout" : "error",
            errorMessage: handled.message,
        });
        logDtfTrace("dtf.extract-design", traceId, "failure_logged", {
            duration_ms: Date.now() - telemetryStartedAt,
            total_duration_ms: Date.now() - routeStartedAt,
        });

        return attachDtfTraceId(NextResponse.json(
            { error: DTF_PUBLIC_EXTRACTION_ERROR },
            { status: handled.status }
        ), traceId);
    }
}
