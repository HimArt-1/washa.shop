import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { generateMockupSchema } from "../validators/ai-studio.schema";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";
import { AiStudioService } from "../services/ai-studio.service";
import { checkRateLimit } from "@/lib/rate-limit";
import { DtfTelemetryService } from "../services/dtf-telemetry.service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return NextResponse.json({ error: "غير مصرح لك باستخدام استوديو DTF" }, { status: 403 });
    }

    // Rate Limiting: 6 requests per 60 seconds (1 minute) per user or IP for ALL users
    const identifier = access.profileId || request.ip || "anonymous";
    const limits = checkRateLimit(`gen-${identifier}`, 6, 60_000);
    // Admins bypass rate limiter
    if (!limits.success && access.role !== "admin" && access.role !== "wushsha" && access.role !== "dev") {
        return NextResponse.json(
            { error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً." },
            { status: 429, headers: { "X-RateLimit-Reset": new Date(limits.resetAt).toISOString() } }
        );
    }

    // Daily Quota Check
    const quota = await DtfTelemetryService.checkDailyQuota(access.profileId, access.role);
    if (!quota.allowed) {
        return NextResponse.json(
            { error: "انتهت نقاطك للتصميم اليوم. شكراً لإبداعك ونتمنى رؤيتك غداً!" },
            { status: 403 }
        );
    }

    try {
        const rawBody = await request.json();
        const parsed = generateMockupSchema.safeParse(rawBody);

        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "بيانات الطلب غير صالحة";
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        const { prompt, referenceImage } = parsed.data;

        const imageUrl = await AiStudioService.generateMockup(prompt, referenceImage);

        // Async logging without blocking response
        DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "generate-mockup",
            status: "success",
            prompt,
            referenceImageUrl: referenceImage?.base64 ? "base64_hidden" : undefined,
            resultImageUrl: imageUrl || undefined,
        });

        return NextResponse.json({ imageUrl, remainingPoints: quota.remaining - 1 });
    } catch (error) {
        console.error("[washa-dtf-studio.generate-mockup]", error);
        const handled = getWashaDtfErrorDetails(error);
        
        // Log the failure
        DtfTelemetryService.logActivity({
            profileId: access.profileId,
            clerkId: access.clerkId,
            action: "generate-mockup",
            status: handled.status === 504 ? "timeout" : "error",
            errorMessage: handled.message,
        });

        return NextResponse.json(
            { error: handled.message },
            { status: handled.status }
        );
    }
}
