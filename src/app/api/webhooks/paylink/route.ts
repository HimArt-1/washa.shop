// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Payment Webhook
//  POST /api/webhooks/paylink
//  Paylink يرسل الـ payment confirmation هنا عند اكتمال الدفع
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getPaylinkInvoice } from "@/lib/paylink";
import { confirmOrderPayment } from "@/app/actions/orders";
import { confirmWarehousePayment } from "@/app/actions/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    assertPaylinkInvoiceMatchesOrder,
    getPaylinkInvoiceAmount,
    getPaylinkInvoiceOrderNumber,
    isPaylinkInvoicePaid,
} from "@/lib/paylink-security";

/** Paylink يرسل GET لاختبار الرابط — نرد بـ JSON صالح */
export async function GET() {
    return NextResponse.json({ received: true, status: "ok" });
}

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

        if (!transactionNo) {
            console.warn("[Paylink Webhook] Missing transactionNo; cannot verify payment");
            return NextResponse.json({ received: true });
        }

        // Verify with Paylink API
        const invoice = await getPaylinkInvoice(transactionNo);

        if (!isPaylinkInvoicePaid(invoice)) {
            console.log(`[Paylink Webhook] Order not paid yet: ${transactionNo} status=${invoice?.orderStatus}`);
            return NextResponse.json({ received: true });
        }

        const invoiceOrderNumber = getPaylinkInvoiceOrderNumber(invoice);

        if (orderNumber && invoiceOrderNumber && orderNumber !== invoiceOrderNumber) {
            console.error(`[Paylink Webhook] Payload orderNumber mismatch: payload=${orderNumber} invoice=${invoiceOrderNumber}`);
            return NextResponse.json({ received: true });
        }

        const resolvedOrderNumber = invoiceOrderNumber || orderNumber;

        if (!resolvedOrderNumber) {
            console.error("[Paylink Webhook] Cannot resolve orderNumber");
            return NextResponse.json({ received: true });
        }

        // --- NEW: Warehouse Fulfillment Payment handling ---
        if (resolvedOrderNumber.startsWith("FUL-") || resolvedOrderNumber.startsWith("BATCH-FUL-")) {
            console.log(`[Paylink Webhook] Fulfillment payment detected: ${resolvedOrderNumber}`);
            const amount = getPaylinkInvoiceAmount(invoice);
            if (amount === null) {
                console.error(`[Paylink Webhook] Missing invoice amount for fulfillment payment: ${resolvedOrderNumber}`);
                return NextResponse.json({ received: true });
            }
            await confirmWarehousePayment(resolvedOrderNumber, amount);
            return NextResponse.json({ received: true });
        }

        // Look up the standard customer order from Supabase
        const supabase = getSupabaseAdminClient();
        const { data: order } = await supabase
            .from("orders")
            .select("id, order_number, total, payment_status, metadata")
            .eq("order_number", resolvedOrderNumber)
            .single();

        if (!order) {
            console.error(`[Paylink Webhook] Standard order not found: ${resolvedOrderNumber}`);
            return NextResponse.json({ received: true });
        }

        if (order.payment_status === "paid") {
            return NextResponse.json({ received: true }); // Already processed (idempotent)
        }

        const validation = assertPaylinkInvoiceMatchesOrder(invoice, order, {
            expectedTransactionNo: transactionNo,
        });

        if (!validation.ok) {
            console.error(`[Paylink Webhook] Invoice validation failed for ${resolvedOrderNumber}: ${validation.error}`);
            return NextResponse.json({ received: true });
        }

        const result = await confirmOrderPayment(order.id, {
            customerEmail: validation.clientEmail || undefined,
            webhookEventId: validation.transactionNo || transactionNo,
            paidAmount: validation.amount,
            paymentProvider: "paylink",
        });

        if (!result.success) {
            console.error(`[Paylink Webhook] Order confirmation failed for ${resolvedOrderNumber}: ${result.error || "unknown error"}`);
            return NextResponse.json({ received: true });
        }

        console.log(`[Paylink Webhook] ✓ Customer Order confirmed: ${resolvedOrderNumber}`);
        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error("[Paylink Webhook] Error:", error);
        // Return 200 to prevent Paylink from retrying on server errors
        return NextResponse.json({ received: true });
    }
}
