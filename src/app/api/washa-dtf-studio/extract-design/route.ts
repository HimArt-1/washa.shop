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

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    if (accessResult.response) {
        return accessResult.response;
    }
    const access = accessResult.access;

    const rateLimitResponse = await enforceDtfRouteRateLimit(request, access, {
        keyPrefix: "ext",
        limit: 6,
        windowMs: 60_000,
        message: "تم تجاوز الحد المسموح للاستخراج. يرجى الانتظار دقيقة والمحاولة مجدداً.",
    });
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    const bodyResult = await parseAndValidateDtfJson(request, extractDesignSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات الاستخراج غير مكتملة",
    });
    if (bodyResult.response) {
        return bodyResult.response;
    }

    try {
        const { prompt, mockupImage, mimeType } = bodyResult.data;

        const imageUrl = await AiStudioService.extractDesign(prompt, mockupImage, mimeType);

        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "extract-design",
            status: "success",
            prompt,
            referenceImageUrl: "base64_hidden",
            resultImageUrl: imageUrl || undefined,
        });

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error("[washa-dtf-studio.extract-design]", error);
        const handled = getWashaDtfErrorDetails(error);

        await DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "extract-design",
            status: handled.status === 504 ? "timeout" : "error",
            errorMessage: handled.message,
        });

        return NextResponse.json(
            { error: handled.message },
            { status: handled.status }
        );
    }
}
