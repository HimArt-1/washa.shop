// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Payment Webhook
//  POST /api/webhooks/paylink
//  Paylink يرسل الـ payment confirmation هنا عند اكتمال الدفع
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getPaylinkInvoice } from "@/lib/paylink";
import { confirmOrderPayment } from "@/app/actions/orders";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        // Paylink sends form-encoded or JSON body with transactionNo & orderNumber
        let transactionNo: string | undefined;
        let orderNumber: string | undefined;

        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const body = await req.json();
            transactionNo = body.transactionNo || body.transaction_no;
            orderNumber = body.orderNumber || body.order_number;
        } else {
            const text = await req.text();
            const params = new URLSearchParams(text);
            transactionNo = params.get("transactionNo") || params.get("transaction_no") || undefined;
            orderNumber = params.get("orderNumber") || params.get("order_number") || undefined;
        }

        if (!transactionNo && !orderNumber) {
            console.warn("[Paylink Webhook] No transactionNo or orderNumber found in payload");
            return NextResponse.json({ received: true }); // Don't fail — let Paylink retry
        }

        // Verify with Paylink API
        const invoice = transactionNo
            ? await getPaylinkInvoice(transactionNo)
            : null;

        if (!invoice || invoice.orderStatus !== "Paid") {
            console.log(`[Paylink Webhook] Order not paid yet: ${transactionNo} status=${invoice?.orderStatus}`);
            return NextResponse.json({ received: true });
        }

        const resolvedOrderNumber = orderNumber || invoice.gatewayOrderRequest?.orderNumber;

        if (!resolvedOrderNumber) {
            console.error("[Paylink Webhook] Cannot resolve orderNumber");
            return NextResponse.json({ received: true });
        }

        // Look up the order from Supabase
        const supabase = getSupabaseAdminClient();
        const { data: order } = await supabase
            .from("orders")
            .select("id, payment_status")
            .eq("order_number", resolvedOrderNumber)
            .single();

        if (!order) {
            console.error(`[Paylink Webhook] Order not found: ${resolvedOrderNumber}`);
            return NextResponse.json({ received: true });
        }

        if (order.payment_status === "paid") {
            return NextResponse.json({ received: true }); // Already processed (idempotent)
        }

        await confirmOrderPayment(order.id, {
            customerEmail: invoice.gatewayOrderRequest?.clientEmail,
            webhookEventId: transactionNo,
        });

        console.log(`[Paylink Webhook] ✓ Order confirmed: ${resolvedOrderNumber}`);
        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[Paylink Webhook] Error:", error);
        // Return 200 to prevent Paylink from retrying on server errors
        return NextResponse.json({ received: true });
    }
}
