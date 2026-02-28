// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Orders Actions
//  Server Actions لإنشاء وإدارة الطلبات
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createAdminNotification } from "@/app/actions/notifications";

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

interface OrderItemInput {
    product_id: string | null;
    quantity: number;
    size: string | null;
    unit_price: number;
    custom_design_url?: string;
    custom_garment?: string;
    custom_title?: string;
}

interface ShippingAddressInput {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
    phone?: string;
}

const SHIPPING_COST = 30;
const TAX_RATE = 0.15;

export async function createOrder(
    items: OrderItemInput[],
    shippingAddress: ShippingAddressInput,
    options?: { paymentMethod?: "cod" | "stripe" }
) {
    // 1. Verify authenticated user
    const user = await currentUser();
    if (!user) {
        return { success: false, error: "يجب تسجيل الدخول لإتمام الطلب" };
    }

    const supabase = getAdminClient();

    // 2. Get or create buyer's profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    let buyerId: string;

    if (profile) {
        buyerId = profile.id;
    } else {
        // Create a profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
            .from("profiles")
            .insert({
                clerk_id: user.id,
                display_name: user.firstName || user.username || "مشترك",
                username: user.username || `user_${user.id.slice(-8)}`,
                role: "subscriber",
            })
            .select("id")
            .single();

        if (profileError || !newProfile) {
            return { success: false, error: "فشل في إنشاء الملف الشخصي" };
        }
        buyerId = newProfile.id;
    }

    // 3. Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + SHIPPING_COST + tax;

    const isCod = options?.paymentMethod !== "stripe";

    // 4. Create order
    // COD: مؤكد — الدفع عند الاستلام
    // Stripe: معلق — ينتظر تأكيد الدفع عبر Webhook
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
            buyer_id: buyerId,
            subtotal,
            shipping_cost: SHIPPING_COST,
            tax,
            total,
            currency: "SAR",
            shipping_address: shippingAddress,
            status: isCod ? "confirmed" : "pending",
            payment_status: isCod ? "pending" : "pending",
        })
        .select("id, order_number")
        .single();

    if (orderError || !order) {
        console.error("Order creation error:", orderError);
        return { success: false, error: "فشل في إنشاء الطلب" };
    }

    // 5. Create order items (منتجات عادية أو تصاميم مخصصة)
    const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id ?? null,
        quantity: item.quantity,
        size: item.size,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        ...(item.product_id == null && item.custom_design_url && {
            custom_design_url: item.custom_design_url,
            custom_garment: item.custom_garment ?? null,
            custom_title: item.custom_title ?? null,
        }),
    }));

    const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

    if (itemsError) {
        console.error("Order items error:", itemsError);
        return {
            success: true,
            order_number: order.order_number,
            order_id: order.id,
            total,
            warning: "تم إنشاء الطلب لكن بعض العناصر لم تُسجل",
        };
    }

    if (isCod) {
        const email = user.emailAddresses?.[0]?.emailAddress;
        const name = shippingAddress.name || user.firstName || "عميل";
        if (email) {
            sendOrderConfirmationEmail(email, name, order.order_number, total).catch(console.error);
        }
    }

    createAdminNotification({
        type: "order_new",
        title: "طلب جديد",
        message: `طلب #${order.order_number} — ${total.toLocaleString()} ر.س`,
        link: `/dashboard/orders`,
        metadata: { order_id: order.id, order_number: order.order_number, total },
    }).catch(() => {});

    return {
        success: true,
        order_number: order.order_number,
        order_id: order.id,
        total,
    };
}

// ─── Confirm Order Payment (Stripe webhook) ──────────────────

export async function confirmOrderPayment(
    orderId: string,
    options?: { customerEmail?: string }
) {
    const supabase = getAdminClient();

    const { data: order } = await supabase
        .from("orders")
        .select("order_number, total, shipping_address")
        .eq("id", orderId)
        .single();

    const { error } = await supabase
        .from("orders")
        .update({
            payment_status: "paid",
            status: "confirmed",
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (error) {
        console.error("[confirmOrderPayment]", error);
        return { success: false };
    }

    const ord = order as { order_number: string; total: number; shipping_address?: { name?: string } } | null;
    if (ord) {
        createAdminNotification({
            type: "payment_received",
            title: "تم استلام الدفع",
            message: `طلب #${ord.order_number} — ${ord.total.toLocaleString()} ر.س`,
            link: "/dashboard/orders",
            metadata: { order_id: orderId },
        }).catch(() => {});
    }
    const email = options?.customerEmail;
    if (ord && email) {
        const name = ord.shipping_address?.name || "عميل";
        sendOrderConfirmationEmail(email, name, ord.order_number, ord.total).catch(console.error);
    }

    return { success: true };
}

// ─── Get User Orders ────────────────────────────────────────

export async function getUserOrders() {
    const user = await currentUser();
    if (!user) return { data: [], count: 0 };

    const supabase = getAdminClient();

    // Get profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    if (!profile) return { data: [], count: 0 };

    // Fetch orders (منتجات عادية + تصاميم مخصصة)
    const { data, error, count } = await supabase
        .from("orders")
        .select(`
            *,
            items:order_items(
                *,
                product:products(id, title, image_url, type)
            )
        `, { count: "exact" })
        .eq("buyer_id", profile.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching user orders:", error);
        return { data: [], count: 0 };
    }

    return { data: (data as any[]) || [], count: count || 0 };
}

