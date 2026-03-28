import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { DtfOrderService } from "../services/dtf-order.service";
import { respondWithError, logDiagnosticWarning } from "../utils/api-error";
import { submitOrderSchema } from "../validators/submit-order.schema";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return respondWithError("غير مصرح لك باستخدام استوديو DTF", 403);
    }

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch (error) {
        return respondWithError("طلب غير صالح (JSON غير مقروء)", 400, error);
    }

    const parsed = submitOrderSchema.safeParse(rawBody);
    if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "بيانات الطلب غير صالحة";
        return respondWithError(errorMsg, 400, parsed.error);
    }

    let userProfile = null;
    try {
        userProfile = await currentUser();
    } catch (error) {
        logDiagnosticWarning("fetch-user-profile-clerk", error);
    }

    const result = await DtfOrderService.createOrder(parsed.data, userProfile);
    if (result.error) {
        return respondWithError(result.error, result.status || 500);
    }

    return NextResponse.json(result.data);
}
