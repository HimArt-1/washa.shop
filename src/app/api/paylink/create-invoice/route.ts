// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Create Invoice API Route
//  POST /api/paylink/create-invoice
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createPaylinkInvoice, PAYLINK_ENABLED, type PaylinkProduct } from "@/lib/paylink";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { moneyMatches } from "@/lib/paylink-security";
import { emitPaymentInvoiceCreatedAlert } from "@/lib/operational-event-alerts";

function buildCheckoutUrl(baseUrl: string, params: Record<string, string>) {
    const url = new URL("/checkout", baseUrl);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
    }
    return url.toString();
}

function asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function buildInvoiceProducts(orderNumber: string, total: number, items: any[]): PaylinkProduct[] {
    const titles = items
        .map((item) => {
            const product = Array.isArray(item.product) ? item.product[0] : item.product;
            return product?.title || item.custom_title;
        })
        .filter((title): title is string => typeof title === "string" && title.trim().length > 0)
        .slice(0, 4);

    return [{
        title: `طلب وشّى #${orderNumber}`,
        price: Math.round(total * 100) / 100,
        qty: 1,
        description: titles.length ? titles.join("، ") : undefined,
    }];
}

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
        const { orderId, orderNumber, total, clientName, clientMobile, clientEmail } = body as {
            orderId: string;
            orderNumber?: string;
            total?: number;
            clientName?: string;
            clientMobile: string;
            clientEmail?: string;
        };

        if (!orderId || !clientMobile) {
            return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("clerk_id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "لا يمكن التحقق من حساب العميل" }, { status: 403 });
        }

        const { data: order } = await supabase
            .from("orders")
            .select("id, buyer_id, order_number, total, status, payment_status, metadata")
            .eq("id", orderId)
            .single();

        if (!order) {
            return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
        }

        if (order.buyer_id !== profile.id) {
            return NextResponse.json({ error: "غير مصرح لهذا الطلب" }, { status: 403 });
        }

        if (orderNumber && orderNumber !== order.order_number) {
            return NextResponse.json({ error: "رقم الطلب لا يطابق الطلب المسجل" }, { status: 409 });
        }

        if (typeof total === "number" && !moneyMatches(order.total, total)) {
            return NextResponse.json({ error: "إجمالي الطلب لا يطابق السجل" }, { status: 409 });
        }

        if (order.payment_status === "paid") {
            return NextResponse.json({ error: "هذا الطلب مدفوع مسبقاً" }, { status: 409 });
        }

        if (order.status !== "pending") {
            return NextResponse.json({ error: "لا يمكن إنشاء رابط دفع لهذا الطلب" }, { status: 409 });
        }

        const { data: orderItems } = await supabase
            .from("order_items")
            .select("quantity, unit_price, size, custom_title, product:products(title)")
            .eq("order_id", order.id);

        const amount = Math.round(Number(order.total) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: "إجمالي الطلب غير صالح" }, { status: 409 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
        const callBackUrl = buildCheckoutUrl(baseUrl, {
            success: "1",
            order: order.order_number,
            order_id: order.id,
        });
        const cancelUrl = buildCheckoutUrl(baseUrl, {
            canceled: "1",
            order: order.order_number,
            order_id: order.id,
        });

        const invoice = await createPaylinkInvoice({
            orderNumber: order.order_number,
            amount,
            callBackUrl,
            cancelUrl,
            clientName: clientName || user.firstName || "عميل وشّى",
            clientEmail: clientEmail || user.emailAddresses?.[0]?.emailAddress,
            clientMobile,
            products: buildInvoiceProducts(order.order_number, amount, orderItems || []),
            note: `طلب #${order.order_number} - وشّى للتصاميم`,
        });

        if (!invoice.success || !invoice.url) {
            return NextResponse.json(
                { error: invoice.paymentErrors || "فشل في إنشاء رابط الدفع" },
                { status: 500 }
            );
        }

        const metadata = asRecord(order.metadata);
        const { error: metadataError } = await supabase
            .from("orders")
            .update({
                metadata: {
                    ...metadata,
                    paylink: {
                        transactionNo: invoice.transactionNo,
                        orderNumber: order.order_number,
                        amount,
                        status: "invoice_created",
                        createdAt: new Date().toISOString(),
                    },
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

        if (metadataError) {
            console.warn("[Paylink] failed to persist invoice metadata:", metadataError);
        }

        await emitPaymentInvoiceCreatedAlert({
            orderId: order.id,
            orderNumber: order.order_number,
            amount,
            provider: "paylink",
            transactionNo: invoice.transactionNo,
            customerName: clientName || user.firstName || "عميل وشّى",
        }).catch(console.error);

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
