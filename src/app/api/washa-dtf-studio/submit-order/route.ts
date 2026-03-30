import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { DtfOrderService } from "../services/dtf-order.service";
import { respondWithError, logDiagnosticWarning } from "../utils/api-error";
import { submitOrderSchema } from "../validators/submit-order.schema";
import { parseAndValidateDtfJson, requireDtfRouteAccess } from "../utils/route-runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const accessResult = await requireDtfRouteAccess({
        errorResponder: respondWithError,
    });
    if (accessResult.response) {
        return accessResult.response;
    }

    const bodyResult = await parseAndValidateDtfJson(request, submitOrderSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات الطلب غير صالحة",
        errorResponder: respondWithError,
    });
    if (bodyResult.response) {
        return bodyResult.response;
    }

    let userProfile = null;
    try {
        userProfile = await currentUser();
    } catch (error) {
        logDiagnosticWarning("fetch-user-profile-clerk", error);
    }

    const result = await DtfOrderService.createOrder(bodyResult.data, userProfile);
    if (result.error) {
        return respondWithError(result.error, result.status || 500);
    }

    return NextResponse.json(result.data);
}
