// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Orders Actions
//  Server Actions لإنشاء وإدارة الطلبات
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { sendOrderConfirmationEmail, sendAdminOrderNotificationEmail, type OrderEmailItem } from "@/lib/email";
import { sendPushToAll } from "@/lib/push";
import { checkStockAvailability, decrementStockForOrder } from "@/lib/inventory";
import { createAdminNotification } from "@/app/actions/notifications";
import { createUserNotification } from "@/app/actions/user-notifications";

import { getSupabaseAdminClient } from "@/lib/supabase";

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
    options?: {
        paymentMethod?: "cod" | "stripe";
        couponId?: string | null;
        discountAmount?: number;
    }
) {
    // 1. Verify authenticated user
    const user = await currentUser();
    if (!user) {
        return { success: false, error: "يجب تسجيل الدخول لإتمام الطلب" };
    }

    const supabase = getSupabaseAdminClient();

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
                bio: null,
                avatar_url: null,
                cover_url: null,
                website: null,
                wushsha_level: null,
            })
            .select("id")
            .single();

        if (profileError || !newProfile) {
            return { success: false, error: "فشل في إنشاء الملف الشخصي" };
        }
        buyerId = newProfile.id;
    }

    // 3. Check stock availability
    const stockCheck = await checkStockAvailability(items);
    if (!stockCheck.ok) {
        return { success: false, error: stockCheck.error || "المخزون غير كافٍ" };
    }

    // 4. Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const discount = options?.discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * TAX_RATE;
    const total = taxableAmount + SHIPPING_COST + tax;

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
            coupon_id: options?.couponId || null,
            discount_amount: options?.discountAmount || 0,
            notes: null,
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

    // الكوبون: يُحتسب فقط عند COD (مؤكد مباشرة)
    // Stripe: يُحتسب في confirmOrderPayment عند اكتمال الدفع
    if (isCod && options?.couponId) {
        await supabase.rpc("increment_coupon_uses_by_id" as never, { p_coupon_id: options.couponId } as never);
    }

    // المخزون: يُنقص فقط عند COD (مؤكد مباشرة)
    // Stripe: يُنقص في confirmOrderPayment عند اكتمال الدفع
    if (isCod) {
        await decrementStockForOrder(order.id);
    }

    if (isCod) {
        const email = user.emailAddresses?.[0]?.emailAddress;
        const name = shippingAddress.name || user.firstName || "عميل";
        if (email) {
            const emailItems: OrderEmailItem[] = items.map(i => ({
                title: i.custom_title || `منتج`,
                quantity: i.quantity,
                size: i.size,
                unit_price: i.unit_price,
            }));
            sendOrderConfirmationEmail(email, name, order.order_number, total, emailItems).catch(console.error);
        }
    }

    createAdminNotification({
        type: "order_new",
        title: "طلب جديد",
        message: `طلب #${order.order_number} — ${total.toLocaleString()} ر.س`,
        link: `/dashboard/orders`,
        metadata: { order_id: order.id, order_number: order.order_number, total },
    }).catch(() => { });

    // إشعار للمشتري بتأكيد الطلب
    createUserNotification({
        userId: buyerId,
        type: "order_update",
        title: "تم استلام طلبك ✓",
        message: `طلبك #${order.order_number} تم تسجيله بنجاح — ${total.toLocaleString()} ر.س`,
        link: `/account/orders?order=${order.id}`,
        metadata: { order_id: order.id, order_number: order.order_number, total },
    }).catch(() => { });

    sendAdminOrderNotificationEmail(order.order_number, total, "new_order").catch(console.error);

    sendPushToAll("طلب جديد", `طلب #${order.order_number} — ${total.toLocaleString()} ر.س`, "/dashboard/orders").catch(() => { });

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
    try {
        const supabase = getSupabaseAdminClient();

        const { data: order } = await supabase
            .from("orders")
            .select("order_number, total, shipping_address, payment_status, buyer_id, coupon_id, status")
            .eq("id", orderId)
            .single();

        if (!order) {
            console.error("[confirmOrderPayment] Order not found:", orderId);
            return { success: false };
        }

        if (order.payment_status === "paid") {
            console.log("[confirmOrderPayment] Order already paid:", orderId);
            return { success: true };
        }

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

        // المخزون: يُنقص فقط إذا كان الطلب Stripe (pending → confirmed)
        // COD: المخزون نُقص مسبقاً عند إنشاء الطلب
        const wasStripePending = (order as { status?: string }).status === "pending";
        if (wasStripePending) {
            await decrementStockForOrder(orderId);
        }

        // الكوبون: يُحتسب فقط إذا كان الطلب Stripe (COD يحتسبه عند إنشاء الطلب)
        if (wasStripePending && order.coupon_id) {
            await supabase.rpc("increment_coupon_uses_by_id" as never, { p_coupon_id: order.coupon_id } as never);
        }

        const ord = order as { order_number: string; total: number; buyer_id?: string; shipping_address?: { name?: string }; coupon_id?: string | null } | null;
        if (ord) {
            createAdminNotification({
                type: "payment_received",
                title: "تم استلام الدفع",
                message: `طلب #${ord.order_number} — ${ord.total.toLocaleString()} ر.س`,
                link: "/dashboard/orders",
                metadata: { order_id: orderId },
            }).catch(() => { });
            if (ord.buyer_id) {
                createUserNotification({
                    userId: ord.buyer_id,
                    type: "order_update",
                    title: "تم استلام الدفع ✓",
                    message: `تم تأكيد الدفع لطلبك #${ord.order_number} — ${ord.total.toLocaleString()} ر.س`,
                    link: `/account/orders?order=${orderId}`,
                }).catch(() => { });
            }
            sendAdminOrderNotificationEmail(ord.order_number, ord.total, "payment_received").catch(console.error);
            sendPushToAll("تم استلام الدفع", `طلب #${ord.order_number} — ${ord.total.toLocaleString()} ر.س`, "/dashboard/orders").catch(() => { });
        }
        const email = options?.customerEmail;
        if (ord && email) {
            const name = ord.shipping_address?.name || "عميل";
            // Fetch order items to include in email
            const { data: orderItems } = await supabase
                .from("order_items")
                .select("quantity, size, unit_price, custom_title, product:products(title)")
                .eq("order_id", orderId);
            const emailItems: OrderEmailItem[] = (orderItems || []).map((i: any) => ({
                title: i.product?.title || i.custom_title || "منتج",
                quantity: i.quantity,
                size: i.size,
                unit_price: i.unit_price,
            }));
            sendOrderConfirmationEmail(email, name, ord.order_number, ord.total, emailItems).catch(console.error);
        }

        return { success: true };
    } catch (error) {
        console.error("[confirmOrderPayment] Error:", error);
        return { success: false };
    }
}

// ─── Get User Orders ────────────────────────────────────────

export async function getUserOrders() {
    const user = await currentUser();
    if (!user) return { data: [], count: 0 };

    const supabase = getSupabaseAdminClient();

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

    return { data: data || [], count: count || 0 };
}

