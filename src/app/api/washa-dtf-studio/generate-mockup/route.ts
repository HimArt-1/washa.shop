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

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    if (accessResult.response) {
        return accessResult.response;
    }
    const access = accessResult.access;

    const rateLimitResponse = await enforceDtfRouteRateLimit(request, access, {
        keyPrefix: "gen",
        limit: 6,
        windowMs: 60_000,
        message: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً.",
    });
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    const bodyResult = await parseAndValidateDtfJson(request, generateMockupSchema, {
        invalidJsonMessage: "طلب غير صالح (JSON غير مقروء)",
        fallbackValidationMessage: "بيانات الطلب غير صالحة",
    });
    if (bodyResult.response) {
        return bodyResult.response;
    }

    const { prompt, referenceImage } = bodyResult.data;

    const quota = await DtfTelemetryService.reserveDailyQuota(access.profileId, access.role);
    if (!quota.allowed) {
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

        return NextResponse.json(
            { error: "انتهت نقاطك للتصميم اليوم. شكراً لإبداعك ونتمنى رؤيتك غداً!" },
            { status: 403 }
        );
    }

    try {
        const imageUrl = await AiStudioService.generateMockup(prompt, referenceImage);

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

        return NextResponse.json({
            imageUrl,
            remainingPoints: quota.tracked ? quota.remaining : null,
        });
    } catch (error) {
        console.error("[washa-dtf-studio.generate-mockup]", error);
        const handled = getWashaDtfErrorDetails(error);

        if (quota.tracked) {
            await DtfTelemetryService.releaseDailyQuota(access.profileId, access.role);
        }

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

        return NextResponse.json(
            { error: handled.message },
            { status: handled.status }
        );
    }
}
