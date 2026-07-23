import { after, NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import {
    DtfOrderService,
    WASHA_AI_TERMS_VERSION,
    type WashaAiTermsAcceptance,
} from "../services/dtf-order.service";
import { DesignRevisionService } from "../services/design-revision.service";
import { respondWithError, logDiagnosticWarning } from "../utils/api-error";
import { submitOrderSchema } from "../validators/submit-order.schema";
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
import { resolveWashaAiDevGenerationIdentity } from "@/lib/washa-ai-dev-access";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const traceId = resolveDtfTraceId(request);
    const routeStartedAt = Date.now();
    logDtfTrace("dtf.submit-order", traceId, "request_started", {
        method: "POST",
    });

    const accessStartedAt = Date.now();
    const accessResult = await requireDtfRouteAccess({
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
    const access = accessResult.access;
    const devIdentity = resolveWashaAiDevGenerationIdentity(request);
    if (devIdentity.kind === "invalid") {
        return attachDtfTraceId(
            respondWithError(
                "انتهت صلاحية جلسة النسخة التطويرية. حدّث الصفحة ثم أعد المحاولة.",
                409
            ),
            traceId
        );
    }
    const devSurface = devIdentity.kind === "dev" ? devIdentity.surface : null;

    const rateLimitStartedAt = Date.now();
    const rateLimitResponse = await enforceDtfRouteRateLimit(request, access, {
        keyPrefix: "submit",
        limit: 8,
        windowMs: 10 * 60_000,
        message: "تم تجاوز حد إرسال التصاميم للسلة. يرجى الانتظار قليلاً ثم المحاولة مجدداً.",
    });
    logDtfTrace("dtf.submit-order", traceId, "rate_limit_checked", {
        duration_ms: Date.now() - rateLimitStartedAt,
        blocked: Boolean(rateLimitResponse),
    });
    if (rateLimitResponse) {
        return attachDtfTraceId(rateLimitResponse, traceId);
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
        design_request_id: bodyResult.data.designRequestId ?? null,
        master_asset_id: bodyResult.data.masterAssetId ?? null,
        design_method: bodyResult.data.designMethod,
        print_option_id: bodyResult.data.printOptionId ?? null,
        print_position: bodyResult.data.printPosition ?? null,
        print_size: bodyResult.data.printSize ?? null,
        surface: devSurface,
        terms_accepted: bodyResult.data.termsAccepted === true,
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

    if (!userProfile) {
        return attachDtfTraceId(
            respondWithError("يجب تسجيل الدخول قبل إضافة تصميم WASHA AI إلى السلة.", 401),
            traceId
        );
    }

    let termsAcceptance: WashaAiTermsAcceptance | null = null;
    if (bodyResult.data.designRequestId) {
        if (!access.profileId) {
            return attachDtfTraceId(
                respondWithError("تعذر ربط اعتماد التصميم بحساب المستخدم.", 401),
                traceId
            );
        }

        try {
            const policy = await DesignRevisionService.getSubmissionPolicy({
                profileId: access.profileId,
                designRequestId: bodyResult.data.designRequestId,
            });
            if (policy.termsRequired && bodyResult.data.termsAccepted !== true) {
                logDtfTrace("dtf.submit-order", traceId, "terms_rejected", {
                    surface: devSurface,
                    pipeline: policy.pipeline,
                    terms_accepted: false,
                });
                return attachDtfTraceId(
                    respondWithError(
                        "يجب الموافقة على الشروط والأحكام قبل اعتماد التصميم.",
                        400
                    ),
                    traceId
                );
            }
            if (policy.termsRequired) {
                termsAcceptance = {
                    version: WASHA_AI_TERMS_VERSION,
                    acceptedAt: new Date().toISOString(),
                    surface: "dev-v3",
                };
            }
        } catch (policyError) {
            logDiagnosticWarning("resolve-design-submission-policy", policyError);
            return attachDtfTraceId(
                respondWithError("تعذر التحقق من مسار التصميم قبل اعتماده.", 409),
                traceId
            );
        }
    }

    const serviceStartedAt = Date.now();
    const result = await DtfOrderService.prepareCartItem(bodyResult.data, userProfile, {
        traceId,
        profileId: access.profileId,
        termsAcceptance,
        deferSideEffects: (task) => after(task),
    });
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
