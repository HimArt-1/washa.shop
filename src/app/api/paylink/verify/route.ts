// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Verify Payment Route
//  POST /api/paylink/verify
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getPaylinkInvoice } from "@/lib/paylink";
import { confirmOrderPayment } from "@/app/actions/orders";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId, orderNumber, transactionNo } = body as {
            orderId?: string;
            orderNumber: string;
            transactionNo?: string;
        };

        if (!orderNumber) {
            return NextResponse.json({ success: false, error: "رقم الطلب مطلوب" }, { status: 400 });
        }

        if (!transactionNo) {
            return NextResponse.json(
                { success: false, error: "رقم معاملة Paylink مطلوب للتحقق" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdminClient();

        // Fetch order
        const { data: order } = orderId
            ? await supabase
                .from("orders")
                .select("id, order_number, payment_status")
                .eq("id", orderId)
                .single()
            : await supabase
                .from("orders")
                .select("id, order_number, payment_status")
                .eq("order_number", orderNumber)
                .single();

        if (!order) {
            return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
        }

        // Already paid — idempotent
        if (order.payment_status === "paid") {
            return NextResponse.json({ success: true, orderNumber: order.order_number });
        }

        // Verify with Paylink API
        const invoice = await getPaylinkInvoice(transactionNo);

        if (invoice.orderStatus !== "Paid") {
            return NextResponse.json(
                { success: false, error: `حالة الدفع: ${invoice.orderStatus || "غير مكتمل"}` },
                { status: 402 }
            );
        }

        // Confirm order payment in our system
        await confirmOrderPayment(order.id, {
            customerEmail: invoice.gatewayOrderRequest?.clientEmail,
        });

        return NextResponse.json({ success: true, orderNumber: order.order_number });
    } catch (error: any) {
        console.error("[Paylink] verify error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "خطأ في التحقق" },
            { status: 500 }
        );
    }
}
