import { NextRequest, NextResponse } from "next/server";
import { confirmOrderPayment } from "@/app/actions/orders";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { assertTapChargeMatchesOrder, getTapOrderId, retrieveTapCharge, type TapCharge, verifyTapWebhookHash } from "@/lib/tap";
import { emitPaymentCollectionIssueAlert } from "@/lib/operational-event-alerts";

export async function GET() {
    return NextResponse.json({ received: true, provider: "tap" });
}

export async function POST(req: NextRequest) {
    let posted: TapCharge | null = null;
    try {
        posted = JSON.parse(await req.text()) as TapCharge;
    } catch {
        return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    try {
        const hash = req.headers.get("hashstring");
        if (!verifyTapWebhookHash(posted, hash)) {
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }
    } catch {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    try {
        const charge = await retrieveTapCharge(posted.id);
        const orderId = getTapOrderId(charge);
        if (!orderId) return NextResponse.json({ error: "Missing order reference" }, { status: 400 });

        const supabase = getSupabaseAdminClient();
        const { data: order } = await supabase.from("orders").select("id, order_number, total, payment_status").eq("id", orderId).single();
        if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        if (order.payment_status === "paid") return NextResponse.json({ received: true });

        const validation = assertTapChargeMatchesOrder(charge, order);
        if (!validation.ok) {
            await emitPaymentCollectionIssueAlert({
                dispatchKey: `tap:validation_failed:${charge.id}`,
                title: "فشل تحقق تحصيل Tap",
                orderId: order.id,
                orderNumber: order.order_number,
                amount: charge.amount,
                provider: "tap",
                reason: validation.error,
                severity: charge.status === "CAPTURED" ? "critical" : "warning",
                metadata: { charge_id: charge.id, status: charge.status },
            }).catch(console.error);
            return NextResponse.json({ received: true });
        }

        const result = await confirmOrderPayment(order.id, {
            customerEmail: validation.customerEmail || undefined,
            webhookEventId: charge.id,
            paidAmount: validation.amount,
            paymentProvider: "tap",
        });
        if (!result.success) throw new Error(result.error || "Failed to confirm order payment");
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("[Tap Webhook] error:", error);
        await emitPaymentCollectionIssueAlert({
            dispatchKey: `tap:webhook_error:${posted?.id || "unknown"}`,
            title: "خطأ في Webhook تحصيل Tap",
            orderNumber: posted?.reference?.order,
            amount: posted?.amount,
            provider: "tap",
            reason: error instanceof Error ? error.message : "خطأ غير متوقع",
            severity: "warning",
            metadata: { charge_id: posted?.id || null },
        }).catch(console.error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
