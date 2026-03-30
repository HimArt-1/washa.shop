import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { extractDesignSchema } from "../validators/ai-studio.schema";
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

    // Rate Limiting: 6 requests per 60 seconds (1 minute) per user or IP
    if (access.role !== "admin" && access.role !== "wushsha" && access.role !== "dev") {
        const identifier = access.profileId || request.ip || "anonymous";
        const limits = await checkRateLimit(`ext-${identifier}`, 6, 60_000);
        if (!limits.success) {
            return NextResponse.json(
                { error: "تم تجاوز الحد المسموح للاستخراج. يرجى الانتظار دقيقة والمحاولة مجدداً." },
                { status: 429, headers: { "X-RateLimit-Reset": new Date(limits.resetAt).toISOString() } }
            );
        }
    }

    try {
        const rawBody = await request.json();
        const parsed = extractDesignSchema.safeParse(rawBody);

        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "بيانات الاستخراج غير مكتملة";
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        const { prompt, mockupImage, mimeType } = parsed.data;

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
