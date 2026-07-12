// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Stripe Webhook
//  معالجة أحداث الدفع — checkout.session.completed
// ═══════════════════════════════════════════════════════════

import { stripe } from "@/lib/stripe";
import { confirmOrderPayment } from "@/app/actions/orders";
import { authorizeInternalPaymentConfirmation } from "@/lib/internal-payment-authorization";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    // التحقق من المتغيرات البيئية في runtime فقط
    if (typeof window === "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // أثناء البناء، تجاهل هذا الـ route
        return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
    }
    
    if (!stripe || !webhookSecret) {
        console.warn("[Stripe Webhook] Stripe أو STRIPE_WEBHOOK_SECRET غير معرّف");
        await reportAdminOperationalAlert({
            dispatchKey: "stripe_webhook:config_missing",
            bucketMs: 6 * 60 * 60 * 1000,
            type: "system_alert",
            category: "payments",
            severity: "critical",
            title: "Stripe webhook غير مهيأ",
            message: "بيئة Stripe webhook غير مكتملة، ولن يتم تأكيد المدفوعات تلقائياً حتى تصحيح الإعدادات.",
            link: "/dashboard/settings",
            source: "stripe.webhook.config",
            metadata: {
                has_stripe_client: !!stripe,
                has_webhook_secret: !!webhookSecret,
            },
        });
        return NextResponse.json({ error: "Webhook غير مفعّل" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        await reportAdminOperationalAlert({
            dispatchKey: "stripe_webhook:missing_signature",
            bucketMs: 30 * 60 * 1000,
            type: "system_alert",
            category: "security",
            severity: "warning",
            title: "طلب Stripe webhook بلا توقيع",
            message: "تم استلام طلب webhook بلا ترويسة توقيع صالحة. راجع مصدر الطلبات غير الموثقة.",
            link: "/dashboard/notifications",
            source: "stripe.webhook.signature",
        });
        return NextResponse.json({ error: "توقيع مفقود" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : "خطأ غير معروف";
        console.error("[Stripe Webhook] فشل التحقق:", message);
        await reportAdminOperationalAlert({
            dispatchKey: "stripe_webhook:invalid_signature",
            bucketMs: 30 * 60 * 1000,
            type: "system_alert",
            category: "security",
            severity: "warning",
            title: "فشل التحقق من Stripe webhook",
            message: "تم رفض Webhook من Stripe بسبب توقيع غير صالح أو payload غير مطابق.",
            link: "/dashboard/notifications",
            source: "stripe.webhook.signature",
            metadata: { error: message },
        });
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment" && session.payment_status === "paid") {
            const orderId = session.metadata?.order_id;
            const customerEmail = session.customer_email || session.customer_details?.email;

            if (orderId) {
                try {
                    const result = await confirmOrderPayment(authorizeInternalPaymentConfirmation(), orderId, {
                        customerEmail: customerEmail || undefined,
                        webhookEventId: event.id,
                        paymentProvider: "stripe",
                    });
                    if (result.success) {
                        console.log("[Stripe Webhook] تم تأكيد الطلب:", orderId);
                    } else {
                        console.error("[Stripe Webhook] فشل تأكيد الطلب:", orderId);
                        await reportAdminOperationalAlert({
                            dispatchKey: `stripe_webhook:confirm_failed:${event.id}`,
                            type: "order_alert",
                            category: "payments",
                            severity: "critical",
                            title: "فشل تأكيد دفع الطلب",
                            message: `فشل تأكيد الدفع تلقائياً للطلب ${orderId} بعد استلام checkout.session.completed.`,
                            link: "/dashboard/orders",
                            source: "stripe.webhook.confirm_order",
                            resourceType: "order",
                            resourceId: orderId,
                            metadata: {
                                order_id: orderId,
                                event_id: event.id,
                            },
                        });
                        return NextResponse.json({ error: "Payment confirmation failed" }, { status: 500 });
                    }
                } catch (error) {
                    console.error("[Stripe Webhook] خطأ في confirmOrderPayment:", error);
                    await reportAdminOperationalAlert({
                        dispatchKey: `stripe_webhook:confirm_error:${event.id}`,
                        type: "order_alert",
                        category: "payments",
                        severity: "critical",
                        title: "خطأ أثناء تأكيد دفع الطلب",
                        message: `حدث خطأ أثناء معالجة حدث الدفع ${event.id} للطلب ${orderId}.`,
                        link: "/dashboard/orders",
                        source: "stripe.webhook.confirm_order",
                        resourceType: "order",
                        resourceId: orderId,
                        metadata: {
                            order_id: orderId,
                            event_id: event.id,
                            error: error instanceof Error ? error.message : String(error),
                        },
                        stack: error instanceof Error ? error.stack ?? null : null,
                    });
                    return NextResponse.json({ error: "Payment confirmation failed" }, { status: 500 });
                }
            } else {
                console.warn("[Stripe Webhook] لا يوجد order_id في metadata");
                await reportAdminOperationalAlert({
                    dispatchKey: `stripe_webhook:missing_order_id:${event.id}`,
                    type: "order_alert",
                    category: "payments",
                    severity: "critical",
                    title: "جلسة دفع بلا order_id",
                    message: "استلم النظام حدث دفع مكتمل من Stripe لكن metadata لا تحتوي على order_id صالح.",
                    link: "/dashboard/orders",
                    source: "stripe.webhook.metadata",
                    metadata: {
                        event_id: event.id,
                        session_id: session.id,
                    },
                });
                return NextResponse.json({ error: "Missing order metadata" }, { status: 400 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
