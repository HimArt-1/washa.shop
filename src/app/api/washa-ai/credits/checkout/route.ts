// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — إنشاء رابط دفع لشراء رصيد WASHA AI
//  POST /api/washa-ai/credits/checkout  { packageId, clientMobile? }
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createCreditCheckout, resolveCreditPurchaseProfile } from "../service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const rate = await checkRateLimit(`washa-credit-checkout-${user.id}`, 8, 60_000);
    if (!rate.success) {
        return NextResponse.json({ error: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." }, { status: 429 });
    }

    let body: { packageId?: unknown; clientMobile?: unknown; clientName?: unknown; clientEmail?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const packageId = typeof body.packageId === "string" ? body.packageId.trim() : "";
    if (!packageId) {
        return NextResponse.json({ error: "يجب اختيار باقة" }, { status: 400 });
    }

    const profile = await resolveCreditPurchaseProfile(user.id);
    if (!profile) {
        return NextResponse.json({ error: "لا يمكن التحقق من حساب العميل" }, { status: 403 });
    }

    const result = await createCreditCheckout({
        profile,
        packageId,
        clientMobile: typeof body.clientMobile === "string" ? body.clientMobile : null,
        clientName: typeof body.clientName === "string" ? body.clientName : null,
        clientEmail: typeof body.clientEmail === "string" ? body.clientEmail : null,
    });

    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, ...result.data });
}
