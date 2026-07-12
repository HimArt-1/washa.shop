import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { confirmOrderPayment } from "@/app/actions/orders";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { assertTapChargeMatchesOrder, retrieveTapCharge } from "@/lib/tap";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
        const { orderId, chargeId } = await req.json() as { orderId?: string; chargeId?: string };
        if (!orderId || !chargeId) return NextResponse.json({ success: false, error: "بيانات التحقق ناقصة" }, { status: 400 });

        const supabase = getSupabaseAdminClient();
        const [{ data: profile }, { data: order }] = await Promise.all([
            supabase.from("profiles").select("id").eq("clerk_id", user.id).single(),
            supabase.from("orders").select("id, buyer_id, order_number, total, payment_status").eq("id", orderId).single(),
        ]);
        if (!profile || !order) return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
        if (order.buyer_id !== profile.id) return NextResponse.json({ success: false, error: "غير مصرح لهذا الطلب" }, { status: 403 });
        if (order.payment_status === "paid") return NextResponse.json({ success: true, orderNumber: order.order_number });

        const charge = await retrieveTapCharge(chargeId);
        const validation = assertTapChargeMatchesOrder(charge, order);
        if (!validation.ok) return NextResponse.json({ success: false, error: validation.error }, { status: validation.status });

        const result = await confirmOrderPayment(order.id, {
            customerEmail: validation.customerEmail || undefined,
            webhookEventId: charge.id,
            paidAmount: validation.amount,
            paymentProvider: "tap",
        });
        if (!result.success) return NextResponse.json({ success: false, error: result.error || "تعذر تأكيد الدفع" }, { status: 500 });
        return NextResponse.json({ success: true, orderNumber: order.order_number });
    } catch (error) {
        console.error("[Tap] verify error:", error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر التحقق من الدفع" }, { status: 500 });
    }
}
