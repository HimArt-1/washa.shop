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
        if (access.reason === "supabase_error") {
            return NextResponse.json({ error: "خدمة التحقق غير متاحة مؤقتاً، يرجى المحاولة مجدداً." }, { status: 503 });
        }
        if (access.reason === "identity_conflict") {
            return NextResponse.json({ error: "تعذر ربط حسابك تلقائياً. يرجى التواصل مع الدعم." }, { status: 409 });
        }
        return NextResponse.json({ error: "غير مصرح لك باستخدام استوديو DTF" }, { status: 403 });
    }

    // Rate Limiting: 6 requests per 60 seconds (1 minute) per user or IP for ALL users
    if (access.role !== "admin" && access.role !== "wushsha" && access.role !== "dev") {
        const identifier = access.profileId || request.ip || "anonymous";
        const limits = await checkRateLimit(`gen-${identifier}`, 6, 60_000);
        if (!limits.success) {
            return NextResponse.json(
                { error: "تم تجاوز الحد المسموح. يرجى الانتظار دقيقة والمحاولة مجدداً." },
                { status: 429, headers: { "X-RateLimit-Reset": new Date(limits.resetAt).toISOString() } }
            );
        }
    }

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch {
        return NextResponse.json({ error: "طلب غير صالح (JSON غير مقروء)" }, { status: 400 });
    }

    const parsed = generateMockupSchema.safeParse(rawBody);
    if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "بيانات الطلب غير صالحة";
        return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { prompt, referenceImage } = parsed.data;

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

        return NextResponse.json({ imageUrl, remainingPoints: quota.remaining });
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
