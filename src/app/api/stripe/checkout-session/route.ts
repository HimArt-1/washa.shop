// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Stripe Checkout Session (Custom UI)
//  ينشئ جلسة دفع مدمجة داخل الموقع بدلاً من إعادة التوجيه
// ═══════════════════════════════════════════════════════════

import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    if (!stripe) {
        return NextResponse.json({ error: "Stripe غير مفعّل" }, { status: 500 });
    }

    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    try {
        const { orderId, orderNumber, total } = await req.json();

        if (!orderId || !orderNumber || typeof total !== "number") {
            return NextResponse.json({ error: "بيانات الطلب ناقصة" }, { status: 400 });
        }

        // التحقق من ملكية الطلب ومطابقة المبلغ
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const [{ data: order }, { data: profile }] = await Promise.all([
            supabase.from("orders").select("id, buyer_id, total, order_number, status").eq("id", orderId).single(),
            supabase.from("profiles").select("id").eq("clerk_id", user.id).single(),
        ]);

        if (!order || !profile) {
            return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
        }

        if (order.buyer_id !== profile.id) {
            return NextResponse.json({ error: "هذا الطلب لا يخصك" }, { status: 403 });
        }

        if (order.status !== "pending") {
            return NextResponse.json({ error: "الطلب تم دفعه أو إلغاؤه مسبقاً" }, { status: 400 });
        }

        const orderTotal = Number(order.total);
        if (Math.abs(orderTotal - total) > 0.01) {
            return NextResponse.json({ error: "المبلغ غير مطابق" }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            ui_mode: "custom",
            mode: "payment",
            currency: "sar",
            line_items: [
                {
                    price_data: {
                        currency: "sar",
                        product_data: {
                            name: `طلب وشّى #${orderNumber}`,
                            description: "منتجات فنية من منصة وشّى",
                        },
                        unit_amount: Math.round(orderTotal * 100), // هللات
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                order_id: orderId,
                order_number: orderNumber,
                clerk_user_id: user.id,
            },
            // عند 3D Secure يُعاد التوجيه لهذا الرابط
            return_url: `${baseUrl}/checkout?success=1&order=${encodeURIComponent(orderNumber)}`,
            customer_email: user.emailAddresses?.[0]?.emailAddress || undefined,
        });

        return NextResponse.json({ clientSecret: session.client_secret });
    } catch (err: unknown) {
        console.error("[Stripe Checkout Session]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "فشل في إنشاء جلسة الدفع" },
            { status: 500 }
        );
    }
}
