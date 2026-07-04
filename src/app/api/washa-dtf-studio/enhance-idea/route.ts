import { NextRequest, NextResponse } from "next/server";
import { enhanceIdeaSchema } from "../validators/ai-studio.schema";
import { AiStudioService } from "../services/ai-studio.service";
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
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    const traceId = resolveDtfTraceId(request);
    const startedAt = Date.now();

    logDtfTrace("dtf.enhance-idea", traceId, "request_started", {
        method: "POST",
    });

    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    if (accessResult.response) {
        return attachDtfTraceId(accessResult.response, traceId);
    }

    const rateLimitResponse = await enforceDtfRouteRateLimit(request, accessResult.access, {
        keyPrefix: "enhance-idea",
        limit: 12,
        windowMs: 60_000,
        message: "تم استخدام تحسين الفكرة بشكل متكرر. انتظر دقيقة ثم حاول مرة أخرى.",
    });
    if (rateLimitResponse) {
        return attachDtfTraceId(rateLimitResponse, traceId);
    }

    const bodyResult = await parseAndValidateDtfJson(request, enhanceIdeaSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات تحسين الفكرة غير صالحة",
    });
    if (bodyResult.response) {
        return attachDtfTraceId(bodyResult.response, traceId);
    }

    try {
        const result = await AiStudioService.enhanceIdea(bodyResult.data, {
            traceId,
            timeoutMs: 12_000,
        });

        logDtfTrace("dtf.enhance-idea", traceId, "request_succeeded", {
            duration_ms: Date.now() - startedAt,
            provider: result.provider,
            input_length: bodyResult.data.idea.length,
            output_length: result.enhancedIdea.length,
        });

        return attachDtfTraceId(NextResponse.json({
            enhancedIdea: result.enhancedIdea,
            source: "ai",
            provider: result.provider,
        }), traceId);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "");

        logDtfTrace("dtf.enhance-idea", traceId, "request_failed", {
            duration_ms: Date.now() - startedAt,
            error_message: message.slice(0, 240),
        });

        return attachDtfTraceId(NextResponse.json(
            { error: "تعذر الاتصال بمحسن الفكرة الآن." },
            { status: 503 }
        ), traceId);
    }
}
