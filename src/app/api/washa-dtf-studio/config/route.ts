import { NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { getWashaDtfStudioConfig } from "@/lib/washa-dtf-config";

export const runtime = "nodejs";

export async function GET() {
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

    try {
        const config = await getWashaDtfStudioConfig();
        return NextResponse.json(config, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[washa-dtf-studio.config]", error);
        return NextResponse.json(
            { error: "تعذر تحميل إعدادات استوديو DTF" },
            { status: 500 }
        );
    }
}
