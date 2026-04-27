// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Shipping Actions
//  Server Actions خاصة بصفحة إدارة الشحن
// ═══════════════════════════════════════════════════════════

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { torod } from "@/lib/shipping/torod";
import type { ShippingAddress, OrderStatus } from "@/types/database";

// ─── Auth Guard ───────────────────────────────────────────────

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");
    const { supabase, profile, isAdmin } = await resolveAdminAccess(user);
    if (!profile || !isAdmin) throw new Error("Forbidden: Admin access required");
    return { user, profile, supabase };
}

// ─── Types ───────────────────────────────────────────────────

export type ShippingOrder = {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total: number;
    shipping_cost: number;
    tracking_number: string | null;
    courier_name: string | null;
    waybill_url: string | null;
    torod_order_id: string | null;
    shipping_address: ShippingAddress | null;
    created_at: string;
    updated_at: string;
    buyer: {
        display_name: string | null;
        avatar_url: string | null;
        username: string | null;
        email?: string | null;
    } | null;
    items_count: number;
};

export type ShippingStats = {
    readyToShip: number;
    shipped: number;
    delivered: number;
    pendingCod: number;
    totalCodAmount: number;
    deliveredRevenue: number;
    totalOrders: number;
    deliveryRate: number;
};

// ─── Fetch Shipping Orders ────────────────────────────────────

export async function getShippingOrders(params: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}) {
    const { supabase } = await requireAdmin();

    const { status = "all", search = "", page = 1, pageSize = 20 } = params;

    const shippingStatuses: OrderStatus[] = ["processing", "shipped", "delivered"];

    let query = supabase
        .from("orders")
        .select(
            `id, order_number, status, payment_status, total, shipping_cost,
             tracking_number, courier_name, waybill_url, torod_order_id,
             shipping_address, created_at, updated_at,
             buyer:profiles!buyer_id(display_name, avatar_url, username)`,
            { count: "exact" }
        )
        .in("status", status === "all" ? shippingStatuses : [status as OrderStatus])
        .order("created_at", { ascending: false });

    if (search.trim()) {
        query = query.or(
            `order_number.ilike.%${search}%,tracking_number.ilike.%${search}%`
        );
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
        console.error("[getShippingOrders]", error);
        return { orders: [], total: 0, error: error.message };
    }

    // Fetch item counts separately
    const orderIds = (data || []).map((o) => o.id);
    const { data: itemCounts } = await supabase
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", orderIds);

    const countMap: Record<string, number> = {};
    (itemCounts || []).forEach((item) => {
        countMap[item.order_id] = (countMap[item.order_id] || 0) + item.quantity;
    });

    const orders: ShippingOrder[] = (data || []).map((o) => ({
        ...o,
        buyer: Array.isArray(o.buyer) ? o.buyer[0] ?? null : (o.buyer as any) ?? null,
        shipping_address: o.shipping_address as ShippingAddress | null,
        items_count: countMap[o.id] || 0,
    }));

    return { orders, total: count || 0, error: null };
}

// ─── Fetch Stats ───────────────────────────────────────────────

export async function getShippingStats(): Promise<ShippingStats> {
    const { supabase } = await requireAdmin();

    const { data } = await supabase
        .from("orders")
        .select("status, payment_status, total")
        .in("status", ["processing", "shipped", "delivered"]);

    const stats: ShippingStats = {
        readyToShip: 0,
        shipped: 0,
        delivered: 0,
        pendingCod: 0,
        totalCodAmount: 0,
        deliveredRevenue: 0,
        totalOrders: 0,
        deliveryRate: 0,
    };

    (data || []).forEach((o) => {
        stats.totalOrders++;
        if (o.status === "processing") stats.readyToShip++;
        if (o.status === "shipped") stats.shipped++;
        if (o.status === "delivered") {
            stats.delivered++;
            stats.deliveredRevenue += Number(o.total) || 0;
        }
        if (o.payment_status === "pending" && o.status === "shipped") {
            stats.pendingCod++;
            stats.totalCodAmount += Number(o.total) || 0;
        }
    });

    const outForDelivery = stats.shipped + stats.delivered;
    if (outForDelivery > 0) {
        stats.deliveryRate = Math.round((stats.delivered / outForDelivery) * 100);
    }

    return stats;
}

// ─── Book Torod Shipment ───────────────────────────────────────

export async function bookShipmentAction(orderId: string) {
    const { supabase } = await requireAdmin();

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*, profile:profiles!buyer_id(email, display_name)")
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
        return { success: false, error: "الطلب غير موجود" };
    }

    if (order.tracking_number) {
        return { success: false, error: "هذا الطلب لديه شحنة محجوزة بالفعل" };
    }

    const { data: items } = await supabase
        .from("order_items")
        .select("quantity, product:products(type)")
        .eq("order_id", orderId);

    const totalItemsCount = (items || []).reduce((s, i) => s + i.quantity, 0);

    let estimatedWeight = 0;
    (items || []).forEach((item) => {
        const type = (item.product as any)?.type || "print";
        estimatedWeight += item.quantity * (type === "apparel" ? 0.4 : 0.15);
    });
    estimatedWeight = Math.max(0.5, estimatedWeight);

    const addr = order.shipping_address as ShippingAddress | null;
    if (!addr?.city || !addr?.phone) {
        return { success: false, error: "بيانات العنوان غير مكتملة (المدينة أو الجوال)" };
    }

    const result = await torod.bookShipment({
        order_number: order.order_number,
        receiver_name: addr.name || (order.profile as any)?.display_name || "عميل",
        receiver_mobile: addr.phone,
        receiver_email: (order.profile as any)?.email || undefined,
        address: `${addr.line1} ${addr.line2 || ""}`.trim(),
        city: addr.city,
        weight: estimatedWeight,
        items_count: totalItemsCount,
        cod_amount: order.payment_status === "pending" ? Math.round(order.total) : 0,
    });

    if (!result.success) {
        return { success: false, error: result.error || "فشل الحجز مع طرود" };
    }

    const { error: updateError } = await supabase
        .from("orders")
        .update({
            tracking_number: result.tracking_number,
            courier_name: result.courier_name,
            waybill_url: result.waybill_url,
            torod_order_id: result.torod_order_id,
            status: "shipped",
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (updateError) {
        return { success: false, error: "تم الحجز لكن فشل تحديث قاعدة البيانات" };
    }

    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/orders");

    return {
        success: true,
        tracking_number: result.tracking_number,
        is_simulation: result.is_simulation,
    };
}

// ─── Cancel Shipment ──────────────────────────────────────────

export async function cancelShipmentAction(orderId: string) {
    const { supabase } = await requireAdmin();

    const { data: order } = await supabase
        .from("orders")
        .select("tracking_number, status")
        .eq("id", orderId)
        .single();

    if (!order?.tracking_number) {
        return { success: false, error: "لا توجد شحنة نشطة" };
    }

    const result = await torod.cancelOrder(order.tracking_number);
    if (!result.success) {
        return { success: false, error: result.error || "فشل إلغاء الشحنة" };
    }

    await supabase
        .from("orders")
        .update({
            status: "processing",
            tracking_number: null,
            waybill_url: null,
            torod_order_id: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/orders");

    return { success: true };
}

// ─── Mark as Delivered ────────────────────────────────────────

export async function markDeliveredAction(orderId: string) {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
        .from("orders")
        .update({
            status: "delivered",
            payment_status: "paid",
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/orders");

    return { success: true };
}

// ─── Track Shipment ───────────────────────────────────────────

export async function trackShipmentAction(trackingNumber: string) {
    await requireAdmin();
    const result = await torod.trackShipment(trackingNumber);
    return result;
}
