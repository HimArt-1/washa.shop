// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Verify Payment Route
//  POST /api/paylink/verify
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getPaylinkInvoice } from "@/lib/paylink";
import { confirmOrderPayment } from "@/app/actions/orders";
import { authorizeInternalPaymentConfirmation } from "@/lib/internal-payment-authorization";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { assertPaylinkInvoiceMatchesOrder, getStoredPaylinkTransactionNo } from "@/lib/paylink-security";

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

        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: "يجب تسجيل الدخول" }, { status: 401 });
        }

        const supabase = getSupabaseAdminClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("clerk_id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ success: false, error: "لا يمكن التحقق من حساب العميل" }, { status: 403 });
        }

        // Fetch order
        const { data: order } = orderId
            ? await supabase
                .from("orders")
                .select("id, buyer_id, order_number, total, payment_status, metadata")
                .eq("id", orderId)
                .single()
            : await supabase
                .from("orders")
                .select("id, buyer_id, order_number, total, payment_status, metadata")
                .eq("order_number", orderNumber)
                .single();

        if (!order) {
            return NextResponse.json({ success: false, error: "الطلب غير موجود" }, { status: 404 });
        }

        if (order.buyer_id !== profile.id) {
            return NextResponse.json({ success: false, error: "غير مصرح لهذا الطلب" }, { status: 403 });
        }

        if (order.order_number !== orderNumber) {
            return NextResponse.json({ success: false, error: "رقم الطلب لا يطابق الطلب المسجل" }, { status: 409 });
        }

        // Already paid — idempotent
        if (order.payment_status === "paid") {
            return NextResponse.json({ success: true, orderNumber: order.order_number });
        }

        const effectiveTransactionNo = transactionNo?.trim() || getStoredPaylinkTransactionNo(order.metadata);
        if (!effectiveTransactionNo) {
            return NextResponse.json(
                { success: false, error: "رقم معاملة Paylink غير متاح. افتح الطلب من صفحة الطلبات أو أعد محاولة الدفع." },
                { status: 400 }
            );
        }

        // Verify with Paylink API
        const invoice = await getPaylinkInvoice(effectiveTransactionNo);
        const validation = assertPaylinkInvoiceMatchesOrder(invoice, order, {
            expectedTransactionNo: effectiveTransactionNo,
        });

        if (!validation.ok) {
            return NextResponse.json(
                { success: false, error: validation.error },
                { status: validation.status }
            );
        }

        // Confirm order payment in our system
        const result = await confirmOrderPayment(authorizeInternalPaymentConfirmation(), order.id, {
            customerEmail: validation.clientEmail || undefined,
            webhookEventId: validation.transactionNo || effectiveTransactionNo,
            paidAmount: validation.amount,
            paymentProvider: "paylink",
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error || "تعذر تأكيد الدفع" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, orderNumber: order.order_number });
    } catch (error: any) {
        console.error("[Paylink] verify error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "خطأ في التحقق" },
            { status: 500 }
        );
    }
}
