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

function asNullableRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function cleanString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeAmount(value: unknown) {
    const amount = typeof value === "number" ? value : Number(value);
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

type StoredPaylinkInvoice = {
    transactionNo: string;
    url: string | null;
    mobileUrl?: string | null;
    orderNumber: string;
    amount: number;
    status: string;
    createdAt: string;
};

function toStoredPaylinkInvoice(value: unknown): StoredPaylinkInvoice | null {
    const record = asNullableRecord(value);
    if (!record) return null;

    const transactionNo = cleanString(record.transactionNo) || cleanString(record.transaction_no);
    const url = cleanString(record.url) || cleanString(record.paymentUrl);
    const orderNumber = cleanString(record.orderNumber);
    const amount = normalizeAmount(record.amount);

    if (!transactionNo || !orderNumber || amount === null) {
        return null;
    }

    return {
        transactionNo,
        url,
        mobileUrl: cleanString(record.mobileUrl),
        orderNumber,
        amount,
        status: cleanString(record.status) || "invoice_created",
        createdAt: cleanString(record.createdAt) || new Date(0).toISOString(),
    };
}

function readStoredPaylinkInvoices(metadata: unknown) {
    const paylink = asNullableRecord(asNullableRecord(metadata)?.paylink);
    if (!paylink) return [];

    const invoices: StoredPaylinkInvoice[] = [];
    const current = toStoredPaylinkInvoice(paylink);
    if (current) invoices.push(current);

    const transactions = Array.isArray(paylink.transactions)
        ? paylink.transactions
        : Array.isArray(paylink.invoices)
            ? paylink.invoices
            : [];

    for (const transaction of transactions) {
        const stored = toStoredPaylinkInvoice(transaction);
        if (stored) invoices.push(stored);
    }

    const byTransaction = new Map<string, StoredPaylinkInvoice>();
    for (const invoice of invoices) {
        byTransaction.set(invoice.transactionNo, invoice);
    }

    return Array.from(byTransaction.values());
}

function getReusablePaylinkInvoice(metadata: unknown, orderNumber: string, amount: number) {
    return readStoredPaylinkInvoices(metadata)
        .filter((invoice) =>
            invoice.orderNumber === orderNumber &&
            moneyMatches(invoice.amount, amount) &&
            invoice.url
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
}

function buildPaylinkMetadata(params: {
    metadata: unknown;
    invoice: { transactionNo?: string; url?: string; mobileUrl?: string | null };
    orderNumber: string;
    amount: number;
}) {
    const metadata = asRecord(params.metadata);
    const existingPaylink = asRecord(metadata.paylink);
    const transactionNo = cleanString(params.invoice.transactionNo);
    const url = cleanString(params.invoice.url);

    const currentInvoice: StoredPaylinkInvoice | null = transactionNo && url
        ? {
            transactionNo,
            url,
            mobileUrl: cleanString(params.invoice.mobileUrl),
            orderNumber: params.orderNumber,
            amount: params.amount,
            status: "invoice_created",
            createdAt: new Date().toISOString(),
        }
        : null;

    const invoices = currentInvoice
        ? [...readStoredPaylinkInvoices(metadata).filter((invoice) => invoice.transactionNo !== transactionNo), currentInvoice]
        : readStoredPaylinkInvoices(metadata);

    return {
        ...metadata,
        paylink: {
            ...existingPaylink,
            ...(currentInvoice ?? {}),
            transactions: invoices.slice(-25),
        },
    };
}

function buildInvoiceProducts(orderNumber: string, total: number, items: any[]): PaylinkProduct[] {
    const titles = items
        .map((item) => {
            const product = Array.isArray(item.product) ? item.product[0] : item.product;
            const title = product?.title || item.custom_title;
            if (!title) return null;
            const options = [item.size, item.color_code].filter(Boolean).join(" · ");
            return options ? `${title} (${options})` : title;
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
        if (process.env.LEGACY_PAYMENT_CREATION_ENABLED !== "true") {
            return NextResponse.json(
                { error: "إنشاء مدفوعات Paylink الجديدة متوقف. استخدم Tap." },
                { status: 410 }
            );
        }

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
            .select("quantity, unit_price, size, color_code, custom_title, product:products(title)")
            .eq("order_id", order.id);

        const amount = Math.round(Number(order.total) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: "إجمالي الطلب غير صالح" }, { status: 409 });
        }

        const reusableInvoice = getReusablePaylinkInvoice(order.metadata, order.order_number, amount);
        if (reusableInvoice) {
            return NextResponse.json({
                success: true,
                url: reusableInvoice.url,
                mobileUrl: reusableInvoice.mobileUrl,
                transactionNo: reusableInvoice.transactionNo,
                reused: true,
            });
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

        const { error: metadataError } = await supabase
            .from("orders")
            .update({
                metadata: buildPaylinkMetadata({
                    metadata: order.metadata,
                    invoice,
                    orderNumber: order.order_number,
                    amount,
                }),
                updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

        if (metadataError) {
            console.warn("[Paylink] failed to persist invoice metadata:", metadataError);
            return NextResponse.json(
                { error: "تعذر حفظ رابط الدفع على الطلب. حاول مرة أخرى قبل المتابعة للدفع." },
                { status: 500 }
            );
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
