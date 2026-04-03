import { confirmOrderPayment } from "@/app/actions/orders";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    if (!stripe) {
        return NextResponse.json({ error: "Stripe غير مفعّل" }, { status: 500 });
    }

    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    try {
        const {
            orderId,
            orderNumber,
            sessionId,
        }: {
            orderId?: string;
            orderNumber?: string;
            sessionId?: string;
        } = await req.json();

        if (!orderId && !orderNumber) {
            return NextResponse.json({ error: "مرجع الطلب مفقود" }, { status: 400 });
        }

        const supabase = getSupabaseAdminClient();
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("clerk_id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: "الملف الشخصي غير موجود" }, { status: 404 });
        }

        let orderQuery = supabase
            .from("orders")
            .select("id, buyer_id, order_number, status, payment_status")
            .eq("buyer_id", profile.id);

        if (orderId) {
            orderQuery = orderQuery.eq("id", orderId);
        } else if (orderNumber) {
            orderQuery = orderQuery.eq("order_number", orderNumber);
        }

        const { data: order, error: orderError } = await orderQuery.single();

        if (orderError || !order) {
            return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
        }

        if (order.payment_status === "paid" && order.status === "confirmed") {
            return NextResponse.json({
                success: true,
                orderId: order.id,
                orderNumber: order.order_number,
                alreadyConfirmed: true,
            });
        }

        if (!sessionId) {
            return NextResponse.json(
                { error: "بانتظار تأكيد الدفع من Stripe. حدّث الصفحة بعد لحظات." },
                { status: 409 }
            );
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.mode !== "payment") {
            return NextResponse.json({ error: "جلسة الدفع غير صالحة" }, { status: 400 });
        }

        if (session.metadata?.order_id !== order.id) {
            return NextResponse.json({ error: "جلسة الدفع لا تطابق الطلب" }, { status: 400 });
        }

        if (session.status !== "complete" || session.payment_status !== "paid") {
            return NextResponse.json({ error: "عملية الدفع لم تكتمل بعد" }, { status: 409 });
        }

        const result = await confirmOrderPayment(order.id, {
            customerEmail: session.customer_email || session.customer_details?.email || undefined,
        });

        if (!result.success) {
            return NextResponse.json({ error: "تعذر تأكيد الطلب بعد الدفع" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            orderId: order.id,
            orderNumber: order.order_number,
        });
    } catch (error) {
        console.error("[Stripe Checkout Verify]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "فشل التحقق من الدفع" },
            { status: 500 }
        );
    }
}
