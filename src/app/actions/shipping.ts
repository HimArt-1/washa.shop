// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Shipping Actions
//  Server Actions خاصة بصفحة إدارة الشحن
// ═══════════════════════════════════════════════════════════

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { torod } from "@/lib/shipping/torod";
import {
    deriveShippingLifecycle,
    getLatestShippingHistory,
    getShippingHistory,
    getShippingIssues,
    hasCompleteShippingAddress,
    type ShippingHistoryEntry,
    type ShippingIssue,
    type ShippingLifecycle,
} from "@/lib/shipping/ops";
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
    torod_last_status: string | null;
    metadata: Record<string, unknown>;
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
    lifecycle: ShippingLifecycle;
    issues: ShippingIssue[];
    shipping_history: ShippingHistoryEntry[];
    latest_shipping_event: ShippingHistoryEntry | null;
    cod_amount_due: number;
    can_book_shipment: boolean;
    can_cancel_shipment: boolean;
    can_mark_delivered: boolean;
};

export type ShippingStats = {
    readyToShip: number;
    readyToBook: number;
    pendingTorod: number;
    shipped: number;
    inTransit: number;
    delivered: number;
    exceptions: number;
    blocked: number;
    pendingCod: number;
    totalCodAmount: number;
    deliveredRevenue: number;
    totalOrders: number;
    deliveryRate: number;
};

const BULK_SHIPMENT_LIMIT = 25;

function asMetadata(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function appendShippingEvent(
    metadata: unknown,
    entry: Omit<ShippingHistoryEntry, "timestamp"> & { timestamp?: string }
) {
    const current = asMetadata(metadata);
    const rawHistory = Array.isArray(current.shipping_history) ? current.shipping_history : [];
    const event = {
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
    };

    return {
        ...current,
        shipping_history: [...rawHistory, event],
        shipping_last_event: event,
    };
}

function appendShippingError(metadata: unknown, message: string) {
    const current = asMetadata(metadata);
    const errorEvent = {
        status: "booking_failed",
        source: "washa",
        description_ar: message,
        timestamp: new Date().toISOString(),
    };

    return {
        ...current,
        shipping_last_error: errorEvent,
        shipping_history: [
            ...(Array.isArray(current.shipping_history) ? current.shipping_history : []),
            errorEvent,
        ],
        shipping_last_event: errorEvent,
    };
}

function enrichShippingOrder(row: any, itemsCount: number): ShippingOrder {
    const metadata = asMetadata(row.metadata);
    const shipping_address = row.shipping_address as ShippingAddress | null;
    const lifecycle = deriveShippingLifecycle({ ...row, metadata, shipping_address });
    const issues = getShippingIssues({ ...row, metadata, shipping_address });
    const shipping_history = getShippingHistory(metadata);
    const latest_shipping_event = getLatestShippingHistory(metadata);
    const cod_amount_due = row.payment_status === "pending" ? Number(row.total) || 0 : 0;

    return {
        ...row,
        buyer: Array.isArray(row.buyer) ? row.buyer[0] ?? null : (row.buyer as any) ?? null,
        shipping_address,
        metadata,
        items_count: itemsCount,
        lifecycle,
        issues,
        shipping_history,
        latest_shipping_event,
        cod_amount_due,
        can_book_shipment: lifecycle === "ready_to_book" && !row.tracking_number && !row.torod_order_id,
        can_cancel_shipment: lifecycle !== "delivered" && Boolean(row.tracking_number || row.torod_order_id),
        can_mark_delivered: lifecycle === "in_transit" && Boolean(row.tracking_number),
    };
}

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
             tracking_number, courier_name, waybill_url, torod_order_id, torod_last_status, metadata,
             shipping_address, created_at, updated_at,
             buyer:profiles!buyer_id(display_name, avatar_url, username)`,
            { count: "exact" }
        )
        .in("status", shippingStatuses)
        .order("created_at", { ascending: false });

    if (search.trim()) {
        const safeSearch = search.trim().replace(/[,%]/g, "");
        query = query.or(
            `order_number.ilike.%${safeSearch}%,tracking_number.ilike.%${safeSearch}%,torod_order_id.ilike.%${safeSearch}%`
        );
    }

    const { data, error } = await query.range(0, 1999);

    if (error) {
        console.error("[getShippingOrders]", error);
        return { orders: [], total: 0, error: error.message };
    }

    // Fetch item counts separately
    const orderIds = (data || []).map((o) => o.id);
    const countMap: Record<string, number> = {};
    
    if (orderIds.length > 0) {
        const { data: itemCounts } = await supabase
            .from("order_items")
            .select("order_id, quantity")
            .in("order_id", orderIds);

        (itemCounts || []).forEach((item) => {
            countMap[item.order_id] = (countMap[item.order_id] || 0) + item.quantity;
        });
    }

    const allOrders = (data || []).map((o) => enrichShippingOrder(o, countMap[o.id] || 0));
    const filteredOrders = status === "all"
        ? allOrders
        : allOrders.filter((order) => order.lifecycle === status || order.status === status);

    const from = (page - 1) * pageSize;
    const orders = filteredOrders.slice(from, from + pageSize);

    return { orders, total: filteredOrders.length, error: null };
}

// ─── Fetch Stats ───────────────────────────────────────────────

export async function getShippingStats(): Promise<ShippingStats> {
    const { supabase } = await requireAdmin();

    const { data } = await supabase
        .from("orders")
        .select("status, payment_status, total, tracking_number, waybill_url, torod_order_id, torod_last_status, metadata, shipping_address")
        .in("status", ["processing", "shipped", "delivered"]);

    const stats: ShippingStats = {
        readyToShip: 0,
        readyToBook: 0,
        pendingTorod: 0,
        shipped: 0,
        inTransit: 0,
        delivered: 0,
        exceptions: 0,
        blocked: 0,
        pendingCod: 0,
        totalCodAmount: 0,
        deliveredRevenue: 0,
        totalOrders: 0,
        deliveryRate: 0,
    };

    (data || []).forEach((o) => {
        const metadata = asMetadata((o as any).metadata);
        const lifecycle = deriveShippingLifecycle({ ...(o as any), metadata });
        stats.totalOrders++;

        if (lifecycle === "ready_to_book") {
            stats.readyToShip++;
            stats.readyToBook++;
        }
        if (lifecycle === "pending_torod") stats.pendingTorod++;
        if (lifecycle === "in_transit") {
            stats.shipped++;
            stats.inTransit++;
        }
        if (lifecycle === "exception") stats.exceptions++;
        if (lifecycle === "blocked") stats.blocked++;
        if (o.status === "delivered") {
            stats.delivered++;
            stats.deliveredRevenue += Number(o.total) || 0;
        }
        if (o.payment_status === "pending" && (o.status === "processing" || o.status === "shipped")) {
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

    if (order.torod_order_id) {
        return {
            success: false,
            error: "يوجد طلب طرود قائم لهذا الطلب وينتظر رقم التتبع. لن يتم إنشاء حجز جديد لتجنب التكرار.",
            torod_order_id: order.torod_order_id,
            pending_shipment: true,
        };
    }

    if (order.status !== "processing") {
        return { success: false, error: "لا يمكن حجز الشحنة إلا عندما يكون الطلب في مرحلة التجهيز" };
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
    if (!hasCompleteShippingAddress(addr)) {
        return { success: false, error: "بيانات العنوان غير مكتملة (العنوان، المدينة، أو الجوال)" };
    }
    const shippingAddress = addr as ShippingAddress & { line1: string; city: string; phone: string };

    const result = await torod.bookShipment({
        order_number: order.order_number,
        receiver_name: shippingAddress.name || (order.profile as any)?.display_name || "عميل",
        receiver_mobile: shippingAddress.phone,
        receiver_email: (order.profile as any)?.email || undefined,
        address: `${shippingAddress.line1} ${shippingAddress.line2 || ""}`.trim(),
        city: shippingAddress.city,
        weight: estimatedWeight,
        items_count: totalItemsCount,
        cod_amount: order.payment_status === "pending" ? Math.round(order.total) : 0,
    });

    if (!result.success) {
        await supabase
            .from("orders")
            .update({
                torod_last_status: "booking_failed",
                metadata: appendShippingError(order.metadata, result.error || "فشل الحجز مع طرود"),
                updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);

        return { success: false, error: result.error || "فشل الحجز مع طرود" };
    }

    const shippingEventStatus = result.torod_status || (result.pending_shipment ? "Pending" : "Shipped");

    const { error: updateError } = await supabase
        .from("orders")
        .update({
            tracking_number: result.tracking_number,
            courier_name: result.courier_name,
            waybill_url: result.waybill_url,
            torod_order_id: result.torod_order_id,
            torod_last_status: shippingEventStatus,
            metadata: appendShippingEvent(order.metadata, {
                status: shippingEventStatus,
                source: "washa",
                description_ar: result.pending_shipment
                    ? "تم إنشاء طلب طرود وينتظر إصدار رقم التتبع"
                    : "تم حجز الشحنة وإصدار رقم التتبع",
                raw_payload: {
                    tracking_number: result.tracking_number,
                    torod_order_id: result.torod_order_id,
                    waybill_url: result.waybill_url,
                },
            }),
            status: result.tracking_number ? "shipped" : "processing",
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
        torod_order_id: result.torod_order_id,
        pending_shipment: result.pending_shipment,
        is_simulation: result.is_simulation,
    };
}

// ─── Bulk Book Torod Shipments ────────────────────────────────

export async function bulkBookShipmentAction(orderIds: string[]) {
    await requireAdmin();

    const uniqueIds = Array.from(
        new Set(
            (Array.isArray(orderIds) ? orderIds : [])
                .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
                .map((id) => id.trim())
        )
    );

    const idsToProcess = uniqueIds.slice(0, BULK_SHIPMENT_LIMIT);

    if (idsToProcess.length === 0) {
        return {
            success: false,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            limited: false,
            results: [],
            error: "حدد شحنة واحدة على الأقل",
        };
    }

    const results = [];

    for (const orderId of idsToProcess) {
        try {
            const result = await bookShipmentAction(orderId);
            results.push({ orderId, ...result });
        } catch (error) {
            results.push({
                orderId,
                success: false,
                error: error instanceof Error ? error.message : "تعذر حجز الشحنة",
            });
        }
    }

    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/orders");

    return {
        success: succeeded > 0,
        processed: idsToProcess.length,
        succeeded,
        failed,
        skipped: Math.max(0, uniqueIds.length - idsToProcess.length),
        limited: uniqueIds.length > BULK_SHIPMENT_LIMIT,
        results,
        error: succeeded > 0 ? null : results[0]?.error || "لم يتم حجز أي شحنة",
    };
}

// ─── Cancel Shipment ──────────────────────────────────────────

export async function cancelShipmentAction(orderId: string) {
    const { supabase } = await requireAdmin();

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("tracking_number, torod_order_id, status, metadata")
        .eq("id", orderId)
        .single();

    const trackingOrOrderId = order?.tracking_number || order?.torod_order_id;

    if (orderError || !order || !trackingOrOrderId) {
        return { success: false, error: "لا توجد شحنة نشطة" };
    }

    if (order.status === "delivered") {
        return { success: false, error: "لا يمكن إلغاء شحنة تم تسليمها" };
    }

    const result = await torod.cancelOrder(trackingOrOrderId);
    if (!result.success) {
        return { success: false, error: result.error || "فشل إلغاء الشحنة" };
    }

    await supabase
        .from("orders")
        .update({
            status: "processing",
            tracking_number: null,
            courier_name: null,
            waybill_url: null,
            torod_order_id: null,
            torod_last_status: "Cancelled",
            metadata: appendShippingEvent(order.metadata, {
                status: "Cancelled",
                source: "washa",
                description_ar: "تم إلغاء الشحنة من مركز عمليات الشحن",
                raw_payload: {
                    cancelled_tracking_or_order_id: trackingOrOrderId,
                },
            }),
            updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    revalidatePath("/dashboard/shipping");
    revalidatePath("/dashboard/orders");

    return { success: true };
}

// ─── Mark as Delivered ────────────────────────────────────────

export async function markDeliveredAction(orderId: string, options?: { codCollected?: boolean }) {
    const { supabase } = await requireAdmin();

    const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("status, payment_status, tracking_number, metadata")
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
        return { success: false, error: "الطلب غير موجود" };
    }

    if (order.status !== "shipped") {
        return { success: false, error: "لا يمكن تأكيد التسليم قبل خروج الشحنة للتوصيل" };
    }

    if (order.payment_status === "pending" && !options?.codCollected) {
        return { success: false, error: "يجب تأكيد تحصيل مبلغ COD قبل إغلاق الشحنة كتسليم مكتمل" };
    }

    const { error } = await supabase
        .from("orders")
        .update({
            status: "delivered",
            payment_status: "paid",
            torod_last_status: "Delivered",
            metadata: appendShippingEvent(order.metadata, {
                status: "Delivered",
                source: "washa",
                description_ar: order.payment_status === "pending"
                    ? "تم تأكيد التسليم وتحصيل مبلغ COD"
                    : "تم تأكيد التسليم من مركز عمليات الشحن",
                raw_payload: {
                    tracking_number: order.tracking_number,
                    cod_collected: order.payment_status === "pending",
                },
            }),
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
