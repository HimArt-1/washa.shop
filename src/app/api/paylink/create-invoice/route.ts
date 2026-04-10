// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Create Invoice API Route
//  POST /api/paylink/create-invoice
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createPaylinkInvoice, PAYLINK_ENABLED } from "@/lib/paylink";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        if (!PAYLINK_ENABLED) {
            return NextResponse.json(
                { error: "بوابة الدفع غير مفعّلة حالياً" },
                { status: 503 }
            );
        }

        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
        }

        const body = await req.json();
        const { orderId, orderNumber, total, clientName, clientMobile, clientEmail, products } = body as {
            orderId: string;
            orderNumber: string;
            total: number;
            clientName: string;
            clientMobile: string;
            clientEmail?: string;
            products: Array<{ title: string; price: number; qty: number; description?: string }>;
        };

        if (!orderId || !orderNumber || !total || !clientMobile) {
            return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
        const callBackUrl = `${baseUrl}/checkout?success=1&order=${orderNumber}&order_id=${orderId}`;
        const cancelUrl = `${baseUrl}/checkout?canceled=1&order=${orderNumber}&order_id=${orderId}`;

        const invoice = await createPaylinkInvoice({
            orderNumber,
            amount: Math.round(total * 100) / 100,
            callBackUrl,
            cancelUrl,
            clientName: clientName || user.firstName || "عميل وشّى",
            clientEmail: clientEmail || user.emailAddresses?.[0]?.emailAddress,
            clientMobile,
            products: products || [{ title: "طلب وشّى", price: total, qty: 1 }],
            note: `طلب #${orderNumber} - وشّى للتصاميم`,
        });

        if (!invoice.success || !invoice.url) {
            return NextResponse.json(
                { error: invoice.paymentErrors || "فشل في إنشاء رابط الدفع" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url: invoice.url,
            mobileUrl: invoice.mobileUrl,
            transactionNo: invoice.transactionNo,
        });
    } catch (error: any) {
        console.error("[Paylink] create-invoice error:", error);
        return NextResponse.json(
            { error: error.message || "خطأ غير متوقع" },
            { status: 500 }
        );
    }
}
