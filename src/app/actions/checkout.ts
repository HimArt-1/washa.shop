// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Checkout Actions
//  إنشاء جلسة Stripe للدفع الإلكتروني
// ═══════════════════════════════════════════════════════════

"use server";

import { stripe, STRIPE_ENABLED } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { currentUser } from "@clerk/nextjs/server";


function buildInternalUrl(path: string, baseUrl: string): string | null {
    if (!path.startsWith("/") || path.startsWith("//")) {
        return null;
    }

    try {
        const base = new URL(baseUrl);
        const url = new URL(path, base);
        return url.origin === base.origin ? url.toString() : null;
    } catch {
        return null;
    }
}

export async function createStripeCheckoutUrl(params: {
    orderId: string;
    orderNumber: string;
    total: number;
    successUrl: string;
    cancelUrl: string;
}) {
    if (!STRIPE_ENABLED || !stripe) {
        return { success: false, error: "الدفع الإلكتروني غير متاح حالياً" };
    }

    const user = await currentUser();
    if (!user) {
        return { success: false, error: "يجب تسجيل الدخول" };
    }

    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const safeSuccessUrl = buildInternalUrl(params.successUrl, baseUrl);
        const safeCancelUrl = buildInternalUrl(params.cancelUrl, baseUrl);

        if (!safeSuccessUrl || !safeCancelUrl) {
            return { success: false, error: "روابط إعادة التوجيه غير صالحة" };
        }

        const supabase = getSupabaseAdminClient();
        const [
            { data: order, error: orderError },
            { data: profile, error: profileError },
        ] = await Promise.all([
            supabase
                .from("orders")
                .select("id, buyer_id, total, order_number, status")
                .eq("id", params.orderId)
                .single(),
            supabase
                .from("profiles")
                .select("id")
                .eq("clerk_id", user.id)
                .single(),
        ]);

        if (orderError || profileError || !order || !profile) {
            return { success: false, error: "الطلب أو الملف الشخصي غير موجود" };
        }

        if (order.buyer_id !== profile.id) {
            return { success: false, error: "هذا الطلب لا يخصك" };
        }

        if (order.status !== "pending") {
            return { success: false, error: "الطلب تم دفعه أو إلغاؤه مسبقاً" };
        }

        const orderTotal = Number(order.total);
        if (Math.abs(orderTotal - params.total) > 0.01) {
            return { success: false, error: "المبلغ غير مطابق" };
        }

        if (order.order_number !== params.orderNumber) {
            return { success: false, error: "رقم الطلب غير مطابق" };
        }

        const successUrl = new URL(safeSuccessUrl);
        successUrl.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
        successUrl.searchParams.set("order_id", order.id);

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "sar",
                        product_data: {
                            name: `طلب وشّى #${order.order_number}`,
                            description: "منتجات فنية من منصة وشّى",
                            images: [],
                        },
                        unit_amount: Math.round(orderTotal * 100), // هللات
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                order_id: order.id,
                order_number: order.order_number,
                clerk_user_id: user.id,
            },
            success_url: successUrl.toString(),
            cancel_url: safeCancelUrl,
            customer_email: user.emailAddresses?.[0]?.emailAddress || undefined,
        });

        return {
            success: true,
            url: session.url,
        };
    } catch (err: unknown) {
        console.error("[createStripeCheckoutUrl]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "فشل في إنشاء جلسة الدفع",
        };
    }
}

export { STRIPE_ENABLED };
