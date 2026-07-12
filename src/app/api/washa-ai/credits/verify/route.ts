// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — التحقق من دفع رصيد WASHA AI وشحن المحفظة
//  POST /api/washa-ai/credits/verify  { orderNumber, transactionNo? }
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { resolveCreditPurchaseProfile, verifyCreditPurchase } from "../service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    let body: { orderNumber?: unknown; transactionNo?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
    if (!orderNumber) {
        return NextResponse.json({ error: "رقم الطلب مطلوب" }, { status: 400 });
    }

    const profile = await resolveCreditPurchaseProfile(user.id);
    if (!profile) {
        return NextResponse.json({ error: "لا يمكن التحقق من حساب العميل" }, { status: 403 });
    }

    const result = await verifyCreditPurchase({
        profile,
        orderNumber,
        transactionNo: typeof body.transactionNo === "string" ? body.transactionNo : null,
    });

    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, ...result.data });
}
