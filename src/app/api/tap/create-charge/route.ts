import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createTapCharge, retrieveTapCharge, TAP_CHECKOUT_ENABLED } from "@/lib/tap";
import { emitPaymentInvoiceCreatedAlert } from "@/lib/operational-event-alerts";

function appUrl(path: string) {
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
    if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    return new URL(path, base).toString();
}

function asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(req: NextRequest) {
    try {
        if (!TAP_CHECKOUT_ENABLED) return NextResponse.json({ error: "الدفع الإلكتروني عبر Tap قيد التطوير حالياً" }, { status: 503 });
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

        const body = await req.json() as { orderId?: string; clientName?: string; clientMobile?: string; clientEmail?: string };
        if (!body.orderId) return NextResponse.json({ error: "بيانات الدفع ناقصة" }, { status: 400 });

        const supabase = getSupabaseAdminClient();
        const [{ data: profile }, { data: order }] = await Promise.all([
            supabase.from("profiles").select("id").eq("clerk_id", user.id).single(),
            supabase.from("orders").select("id, buyer_id, order_number, total, status, payment_status, metadata, shipping_address").eq("id", body.orderId).single(),
        ]);

        if (!profile || !order) return NextResponse.json({ error: "تعذر العثور على الطلب" }, { status: 404 });
        if (order.buyer_id !== profile.id) return NextResponse.json({ error: "غير مصرح لهذا الطلب" }, { status: 403 });
        if (order.payment_status === "paid") return NextResponse.json({ error: "هذا الطلب مدفوع مسبقاً" }, { status: 409 });
        if (order.status !== "pending") return NextResponse.json({ error: "لا يمكن إنشاء عملية دفع لهذا الطلب" }, { status: 409 });

        const amount = Math.round(Number(order.total) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "إجمالي الطلب غير صالح" }, { status: 409 });

        const shippingAddress = asRecord(order.shipping_address);
        const storedPhone = typeof shippingAddress.phone === "string" ? shippingAddress.phone.trim() : "";
        const clientMobile = body.clientMobile?.trim() || storedPhone;
        if (!clientMobile) return NextResponse.json({ error: "رقم جوال العميل غير متاح لإتمام الدفع" }, { status: 409 });

        const metadata = asRecord(order.metadata);
        const previousTap = asRecord(metadata.tap);
        const attempts = Array.isArray(previousTap.attempts) ? previousTap.attempts : [];
        const currentChargeId = typeof previousTap.charge_id === "string" ? previousTap.charge_id : null;

        if (currentChargeId) {
            const currentCharge = await retrieveTapCharge(currentChargeId).catch(() => null);
            if (
                currentCharge?.transaction?.url &&
                ["INITIATED", "PENDING", "IN_PROGRESS"].includes(currentCharge.status)
            ) {
                return NextResponse.json({
                    success: true,
                    url: currentCharge.transaction.url,
                    chargeId: currentCharge.id,
                    reused: true,
                });
            }
        }

        // Return to the same origin that initiated checkout. This keeps local
        // Sandbox testing on localhost while production returns to production.
        const redirect = new URL("/checkout", req.nextUrl.origin);
        redirect.searchParams.set("tap_return", "1");
        redirect.searchParams.set("order", order.order_number);
        redirect.searchParams.set("order_id", order.id);

        const charge = await createTapCharge({
            amount,
            orderId: order.id,
            orderNumber: order.order_number,
            customer: {
                name: body.clientName || (typeof shippingAddress.name === "string" ? shippingAddress.name : null) || user.firstName || "عميل وشّى",
                email: body.clientEmail || user.emailAddresses?.[0]?.emailAddress || null,
                phone: clientMobile,
            },
            redirectUrl: redirect.toString(),
            postUrl: appUrl("/api/webhooks/tap"),
            attempt: attempts.length + 1,
        });

        if (!charge.id || !charge.transaction?.url) {
            return NextResponse.json({ error: charge.response?.message || "لم تُرجع Tap رابط دفع صالحًا" }, { status: 502 });
        }

        const tapAttempt = { charge_id: charge.id, status: charge.status, amount, currency: "SAR", created_at: new Date().toISOString() };
        const { error: updateError } = await supabase.from("orders").update({
            metadata: {
                ...metadata,
                tap: { ...previousTap, ...tapAttempt, attempts: [...attempts, tapAttempt].slice(-25) },
                payment_provider: "tap",
            },
            updated_at: new Date().toISOString(),
        }).eq("id", order.id).eq("payment_status", "pending");

        if (updateError) return NextResponse.json({ error: "تعذر حفظ عملية الدفع على الطلب" }, { status: 500 });

        await emitPaymentInvoiceCreatedAlert({
            orderId: order.id,
            orderNumber: order.order_number,
            amount,
            provider: "tap",
            transactionNo: charge.id,
            customerName: body.clientName || user.firstName || "عميل وشّى",
        }).catch(console.error);

        return NextResponse.json({ success: true, url: charge.transaction.url, chargeId: charge.id });
    } catch (error) {
        console.error("[Tap] create charge error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "فشل إنشاء عملية الدفع" }, { status: 500 });
    }
}
