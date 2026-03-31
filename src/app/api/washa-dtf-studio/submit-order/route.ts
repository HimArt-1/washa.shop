import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { DtfOrderService } from "../services/dtf-order.service";
import { respondWithError, logDiagnosticWarning } from "../utils/api-error";
import { submitOrderSchema } from "../validators/submit-order.schema";
import { parseAndValidateDtfJson, requireDtfRouteAccess } from "../utils/route-runtime";
import {
    attachDtfTraceId,
    logDtfTrace,
    resolveDtfTraceId,
} from "../utils/trace";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const traceId = resolveDtfTraceId(request);
    const routeStartedAt = Date.now();
    logDtfTrace("dtf.submit-order", traceId, "request_started", {
        method: "POST",
    });

    const accessStartedAt = Date.now();
    const accessResult = await requireDtfRouteAccess({
        allowPublicGeneration: true,
        errorResponder: respondWithError,
    });
    logDtfTrace("dtf.submit-order", traceId, "access_resolved", {
        duration_ms: Date.now() - accessStartedAt,
        allowed: Boolean(accessResult.access?.allowed),
        role: accessResult.access?.role ?? null,
        reason: accessResult.access?.reason ?? null,
    });
    if (accessResult.response) {
        return attachDtfTraceId(accessResult.response, traceId);
    }

    const validationStartedAt = Date.now();
    const bodyResult = await parseAndValidateDtfJson(request, submitOrderSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات الطلب غير صالحة",
        errorResponder: respondWithError,
    });
    logDtfTrace("dtf.submit-order", traceId, "payload_validated", {
        duration_ms: Date.now() - validationStartedAt,
        valid: Boolean(bodyResult.data),
    });
    if (bodyResult.response) {
        return attachDtfTraceId(bodyResult.response, traceId);
    }

    logDtfTrace("dtf.submit-order", traceId, "payload_ready", {
        garment_id: bodyResult.data.garmentId ?? null,
        color_id: bodyResult.data.colorId ?? null,
        size_id: bodyResult.data.sizeId ?? null,
        style_id: bodyResult.data.styleId ?? null,
        technique_id: bodyResult.data.techniqueId ?? null,
        palette_id: bodyResult.data.paletteId ?? null,
        has_mockup_data_url: Boolean(bodyResult.data.mockupDataUrl),
        has_extracted_data_url: Boolean(bodyResult.data.extractedDataUrl),
        design_method: bodyResult.data.designMethod,
    });

    let userProfile = null;
    const currentUserStartedAt = Date.now();
    try {
        userProfile = await currentUser();
    } catch (error) {
        logDiagnosticWarning("fetch-user-profile-clerk", error);
    }
    logDtfTrace("dtf.submit-order", traceId, "current_user_resolved", {
        duration_ms: Date.now() - currentUserStartedAt,
        authenticated: Boolean(userProfile),
    });

    const serviceStartedAt = Date.now();
    const result = await DtfOrderService.prepareCartItem(bodyResult.data, userProfile, { traceId });
    logDtfTrace("dtf.submit-order", traceId, "service_resolved", {
        duration_ms: Date.now() - serviceStartedAt,
        success: !result.error,
        status: result.status ?? 200,
        total_duration_ms: Date.now() - routeStartedAt,
    });
    if (result.error) {
        return attachDtfTraceId(
            respondWithError(result.error, result.status || 500),
            traceId
        );
    }

    return attachDtfTraceId(NextResponse.json(result.data), traceId);
}
