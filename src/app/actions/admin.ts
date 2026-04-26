// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Admin Actions
//  Server Actions لإدارة المنصة بالكامل
//  يستخدم Service Role Key لتجاوز RLS
// ═══════════════════════════════════════════════════════════

"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { sendApplicationAcceptedEmail, sendApplicationRejectedEmail } from "@/lib/email";
import { torod } from "@/lib/shipping/torod";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { ensureIdentityProfile, findProfileForIdentity } from "@/lib/identity-sync";
import { emitOrderRevenueEscalations } from "@/lib/operational-escalations";
import { FULFILLMENT_RATES, calculateUnitFulfillmentCost } from "@/config/fulfillment-rates";
import { createPaylinkInvoice } from "@/lib/paylink";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Database, UserRole, WushshaLevel, OrderStatus, ApplicationStatus, ArtworkStatus } from "@/types/database";

/** توليد كلمة مرور عشوائية آمنة (12 حرف) */
function generateTempPassword(): string {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let p = "";
    const arr = new Uint8Array(12);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(arr);
        for (let i = 0; i < 12; i++) p += chars[arr[i]! % chars.length];
    } else {
        for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    }
    return p;
}

// ─── Auth Guard ─────────────────────────────────────────────

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) throw new Error("Unauthorized");

    const { supabase, profile, isAdmin } = await resolveAdminAccess(user);

    if (!profile || !isAdmin) {
        throw new Error("Forbidden: Admin access required");
    }

    return { user, profile, supabase };
}

async function reportAdminActionAlert(params: {
    dispatchKey: string;
    title: string;
    message: string;
    source: string;
    category?: "applications" | "orders" | "system" | "security" | "design";
    severity?: "warning" | "critical";
    link?: string;
    metadata?: Record<string, unknown>;
    bucketMs?: number;
    resourceType?: string;
    resourceId?: string | null;
    stack?: string | null;
}) {
    await reportAdminOperationalAlert({
        dispatchKey: params.dispatchKey,
        title: params.title,
        message: params.message,
        source: params.source,
        category: params.category ?? "system",
        severity: params.severity ?? "warning",
        link: params.link ?? "/dashboard/notifications",
        metadata: params.metadata,
        bucketMs: params.bucketMs,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        stack: params.stack,
    });
}

// ═══════════════════════════════════════════════════════════
//  1. OVERVIEW — إحصائيات النظرة العامة
// ═══════════════════════════════════════════════════════════

export async function getAdminOverview() {
    noStore(); // Opt out of static caching

    try {
        const { supabase } = await requireAdmin();
        const issues: string[] = [];

        // Run all queries with error handling (allSettled)
        const results = await Promise.allSettled([
            // 0: Total users
            supabase.from("profiles").select("id", { count: "exact", head: true }),
            // 1: Total artists
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "wushsha"),
            // 2: Total subscribers
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "subscriber"),
            // 3: Total orders
            supabase.from("orders").select("id", { count: "exact", head: true }),
            // 4: Total revenue
            supabase.from("orders").select("total").in("payment_status", ["paid"]),
            // 5: Total artworks
            supabase.from("artworks").select("id", { count: "exact", head: true }),
            // 6: Total products
            supabase.from("products").select("id", { count: "exact", head: true }),
            // 7: Pending applications
            supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
            // 8: Newsletter subscribers
            supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
            // 9: Recent 5 orders
            supabase.from("orders")
                .select("id, order_number, total, status, payment_status, created_at, buyer:profiles(display_name)")
                .order("created_at", { ascending: false })
                .limit(5),
            // 10: Pending applications list (latest 5)
            supabase.from("applications")
                .select("id, full_name, email, art_style, created_at")
                .eq("status", "pending")
                .order("created_at", { ascending: false })
                .limit(5),
        ]);

        // Helper to extract data safely
        const getCount = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && result.value.count ? result.value.count : 0;

        const getData = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && result.value.data ? result.value.data : [];

        // Log errors for debugging purposes
        results.forEach((res, idx) => {
            if (res.status === "rejected") {
                console.error(`Query index ${idx} failed:`, res.reason);
                if (!issues.includes("بعض بيانات النظرة العامة غير مكتملة الآن.")) {
                    issues.push("بعض بيانات النظرة العامة غير مكتملة الآن.");
                }
            } else if (res.value.error) {
                console.error(`Query index ${idx} returned DB error:`, res.value.error);
                if (!issues.includes("بعض بيانات النظرة العامة غير مكتملة الآن.")) {
                    issues.push("بعض بيانات النظرة العامة غير مكتملة الآن.");
                }
            }
        });

        // ─── Calculate Revenue ───
        const revenueData = getData(results[4]) as { total: number }[];
        const totalRevenue = revenueData.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        // Month-over-month revenue (Safe Separate Try/Catch)
        let thisMonthRevenue = 0;
        let revenueGrowth = "0";
        try {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

            const [thisMonthResult, lastMonthResult] = await Promise.all([
                supabase.from("orders").select("total").gte("created_at", thisMonthStart).in("payment_status", ["paid"]),
                supabase.from("orders").select("total").gte("created_at", lastMonthStart).lt("created_at", thisMonthStart).in("payment_status", ["paid"]),
            ]);

            thisMonthRevenue = ((thisMonthResult.data || []) as { total: number }[]).reduce((s, o) => s + (Number(o.total) || 0), 0);
            const lastMonthRevenue = ((lastMonthResult.data || []) as { total: number }[]).reduce((s, o) => s + (Number(o.total) || 0), 0);

            revenueGrowth = lastMonthRevenue > 0
                ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
                : thisMonthRevenue > 0 ? "100" : "0";
        } catch (e) {
            console.error("Revenue calculation error:", e);
            issues.push("تعذر احتساب نمو الإيراد الشهري بدقة في هذه اللحظة.");
        }

        return {
            stats: {
                totalUsers: getCount(results[0]),
                totalArtists: getCount(results[1]),
                totalPlatformSubscribers: getCount(results[2]),
                totalOrders: getCount(results[3]),
                totalRevenue,
                thisMonthRevenue,
                revenueGrowth: Number(revenueGrowth),
                totalArtworks: getCount(results[5]),
                totalProducts: getCount(results[6]),
                pendingApplications: getCount(results[7]),
                totalNewsletterSubscribers: getCount(results[8]),
            },
            recentOrders: getData(results[9]),
            pendingApplications: getData(results[10]),
            error: issues.length > 0 ? issues.join(" ") : undefined,
        };

    } catch (err) {
        console.error("FATAL: getAdminOverview crashed completely:", err);
        // Return explicit empty/zero state instead of throwing 500
        return {
            stats: {
                totalUsers: 0, totalArtists: 0, totalPlatformSubscribers: 0, totalOrders: 0,
                totalRevenue: 0, thisMonthRevenue: 0, revenueGrowth: 0,
                totalArtworks: 0, totalProducts: 0, pendingApplications: 0, totalNewsletterSubscribers: 0,
            },
            recentOrders: [],
            pendingApplications: [],
            error: "تعذر تحميل النظرة العامة للداشبورد في هذه اللحظة.",
        };
    }
}

export async function getAdminCommandCenterData() {
    noStore();

    try {
        const { supabase } = await requireAdmin();
        const issues: string[] = [];

        const results = await Promise.allSettled([
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["processing", "shipped"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded"),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("priority", "high").in("status", ["open", "in_progress"]),
            supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "new"),
            supabase.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
            supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
            supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false).eq("severity", "critical"),
            supabase.from("admin_notifications")
                .select("id, title, message, category, severity, created_at, link, is_read")
                .order("created_at", { ascending: false })
                .limit(6),
            supabase.from("support_tickets")
                .select("id, subject, status, priority, name, email, created_at")
                .in("status", ["open", "in_progress"])
                .order("created_at", { ascending: false })
                .limit(5),
            supabase.from("custom_design_orders")
                .select("id, order_number, customer_name, garment_name, status, created_at")
                .in("status", ["new", "in_progress", "awaiting_review"])
                .order("created_at", { ascending: false })
                .limit(5),
        ]);

        const getCount = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && typeof result.value.count === "number" ? result.value.count : 0;

        const getData = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && Array.isArray(result.value.data) ? result.value.data : [];

        results.forEach((res, idx) => {
            if (res.status === "rejected") {
                console.error(`Command center query ${idx} failed:`, res.reason);
                if (!issues.includes("بعض بيانات مركز القيادة غير مكتملة الآن.")) {
                    issues.push("بعض بيانات مركز القيادة غير مكتملة الآن.");
                }
                return;
            }

            if (res.value?.error) {
                console.error(`Command center query ${idx} returned DB error:`, res.value.error);
                if (!issues.includes("بعض بيانات مركز القيادة غير مكتملة الآن.")) {
                    issues.push("بعض بيانات مركز القيادة غير مكتملة الآن.");
                }
            }
        });

        return {
            ops: {
                ordersNeedingReview: getCount(results[0]),
                fulfillmentQueue: getCount(results[1]),
                pendingPayments: getCount(results[2]),
                supportOpen: getCount(results[3]),
                supportUrgent: getCount(results[4]),
                designNew: getCount(results[5]),
                designAwaitingReview: getCount(results[6]),
                alertsUnread: getCount(results[7]),
                alertsCritical: getCount(results[8]),
            },
            recentAlerts: getData(results[9]),
            supportQueue: getData(results[10]),
            designQueue: getData(results[11]),
            error: issues.length > 0 ? issues.join(" ") : undefined,
        };
    } catch (err) {
        console.error("FATAL: getAdminCommandCenterData crashed completely:", err);
        return {
            ops: {
                ordersNeedingReview: 0,
                fulfillmentQueue: 0,
                pendingPayments: 0,
                supportOpen: 0,
                supportUrgent: 0,
                designNew: 0,
                designAwaitingReview: 0,
                alertsUnread: 0,
                alertsCritical: 0,
            },
            recentAlerts: [],
            supportQueue: [],
            designQueue: [],
            error: "تعذر تحميل مركز القيادة التشغيلي في هذه اللحظة.",
        };
    }
}

// ═══════════════════════════════════════════════════════════
//  1b. ANALYTICS — لوحة التحليلات
// ═══════════════════════════════════════════════════════════

export type AnalyticsPeriod = "7d" | "30d" | "90d";

type FinanceWatchOrder = {
    id: string;
    order_number: string;
    total: number;
    status: string;
    payment_status: string;
    created_at: string;
    discount_amount: number;
    buyer: { display_name?: string | null; username?: string | null } | null;
};

export interface AnalyticsData {
    revenueByDay: { date: string; revenue: number; orders: number }[];
    topProducts: { productId: string; title: string; quantity: number; revenue: number }[];
    usersByDay: { date: string; count: number }[];
    summary: { totalRevenue: number; totalOrders: number; totalUsers: number; avgOrderValue: number };
    previousPeriod?: {
        totalRevenue: number;
        totalOrders: number;
        totalUsers: number;
        revenueGrowth: number;
        ordersGrowth: number;
        usersGrowth: number;
    };
    finance: {
        todayRevenue: number;
        todayOrders: number;
        paidOrders: number;
        pendingPayments: number;
        failedPayments: number;
        deliveredOrders: number;
        cancelledOrRefunded: number;
        outstandingRevenue: number;
        atRiskRevenue: number;
        discountGranted: number;
        collectionRate: number;
        activeRevenueQueue: number;
    };
    watchlists: {
        pendingPayments: FinanceWatchOrder[];
        failedPayments: FinanceWatchOrder[];
        recentPaid: FinanceWatchOrder[];
    };
    mixes: {
        orderStatus: Array<{ key: string; label: string; count: number }>;
        paymentStatus: Array<{ key: string; label: string; count: number }>;
    };
}

export async function getAdminAnalytics(period: AnalyticsPeriod = "30d"): Promise<AnalyticsData> {
    noStore();
    try {
        const { supabase } = await requireAdmin();

        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startIso = startDate.toISOString();
        const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

        const [
            { data: ordersData },
            { data: profilesData },
        ] = await Promise.all([
            supabase
                .from("orders")
                .select("id, order_number, total, discount_amount, status, payment_status, created_at, buyer:profiles(display_name, username)")
                .gte("created_at", startIso)
                .order("created_at", { ascending: false }),
            supabase
                .from("profiles")
                .select("created_at")
                .gte("created_at", startIso),
        ]);

        const orders = (ordersData as FinanceWatchOrder[]) || [];
        const paidOrders = orders.filter((order) => order.payment_status === "paid");
        const pendingPaymentOrders = orders.filter(
            (order) => order.payment_status === "pending" && !["cancelled", "refunded"].includes(order.status)
        );
        const failedPaymentOrders = orders.filter(
            (order) => order.payment_status === "failed" && !["cancelled", "refunded"].includes(order.status)
        );
        const deliveredOrders = orders.filter((order) => order.status === "delivered");
        const cancelledOrRefundedOrders = orders.filter(
            (order) => ["cancelled", "refunded"].includes(order.status) || order.payment_status === "refunded"
        );
        const todayOrders = orders.filter((order) => order.created_at >= todayStartIso);
        const todayPaidOrders = paidOrders.filter((order) => order.created_at >= todayStartIso);

        const totalRevenue = paidOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const todayRevenue = todayPaidOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const outstandingRevenue = pendingPaymentOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const atRiskRevenue = failedPaymentOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const discountGranted = orders.reduce((sum, order) => sum + (Number(order.discount_amount) || 0), 0);

        // Group by date
        const revenueByDayMap = new Map<string, { revenue: number; orders: number }>();
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            revenueByDayMap.set(key, { revenue: 0, orders: 0 });
        }
        for (const o of paidOrders) {
            const key = o.created_at.slice(0, 10);
            const curr = revenueByDayMap.get(key) ?? { revenue: 0, orders: 0 };
            curr.revenue += Number(o.total) || 0;
            curr.orders += 1;
            revenueByDayMap.set(key, curr);
        }
        const revenueByDay = Array.from(revenueByDayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }));

        // 2. Top products from order_items
        const orderIds = paidOrders.map((o) => o.id);
        let topProducts: { productId: string; title: string; quantity: number; revenue: number }[] = [];

        if (orderIds.length > 0) {
            const { data: itemsData } = await supabase
                .from("order_items")
                .select("product_id, quantity, total_price, product:products(title)")
                .in("order_id", orderIds);

            const items = (itemsData || []) as { product_id: string | null; quantity: number; total_price: number; product: { title: string } | null }[];
            const byProduct = new Map<string, { title: string; quantity: number; revenue: number }>();

            for (const it of items) {
                const pid = it.product_id || "custom";
                const title = it.product?.title ?? "تصميم مخصص";
                const qty = Number(it.quantity) || 0;
                const rev = Number(it.total_price) || 0;
                const curr = byProduct.get(pid) ?? { title, quantity: 0, revenue: 0 };
                curr.quantity += qty;
                curr.revenue += rev;
                byProduct.set(pid, curr);
            }
            topProducts = Array.from(byProduct.entries())
                .map(([productId, v]) => ({ productId, title: v.title, quantity: v.quantity, revenue: v.revenue }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);
        }

        // 3. Users by day (profiles created_at)
        const profiles = (profilesData as { created_at: string }[]) || [];
        const usersByDayMap = new Map<string, number>();
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            usersByDayMap.set(key, 0);
        }
        for (const p of profiles) {
            const key = p.created_at.slice(0, 10);
            usersByDayMap.set(key, (usersByDayMap.get(key) ?? 0) + 1);
        }
        const usersByDay = Array.from(usersByDayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }));

        // Previous period for comparison
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - days);
        const prevStartIso = prevStartDate.toISOString();

        let previousPeriod: AnalyticsData["previousPeriod"];
        try {
            const [
                { data: prevOrders },
                { data: prevProfiles },
            ] = await Promise.all([
                supabase.from("orders").select("id, total, payment_status").gte("created_at", prevStartIso).lt("created_at", startIso),
                supabase.from("profiles").select("id").gte("created_at", prevStartIso).lt("created_at", startIso),
            ]);
            const prevOrdersList = (prevOrders as { total: number; payment_status: string }[]) || [];
            const prevRev = prevOrdersList
                .filter((order) => order.payment_status === "paid")
                .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
            const prevUsers = (prevProfiles as unknown[])?.length ?? 0;
            previousPeriod = {
                totalRevenue: prevRev,
                totalOrders: prevOrdersList.length,
                totalUsers: prevUsers,
                revenueGrowth: prevRev > 0 ? ((totalRevenue - prevRev) / prevRev) * 100 : totalRevenue > 0 ? 100 : 0,
                ordersGrowth: prevOrdersList.length > 0 ? ((orders.length - prevOrdersList.length) / prevOrdersList.length) * 100 : (orders.length > 0 ? 100 : 0),
                usersGrowth: prevUsers > 0 ? ((profiles.length - prevUsers) / prevUsers) * 100 : (profiles.length > 0 ? 100 : 0),
            };
        } catch {
            previousPeriod = undefined;
        }

        const orderStatusLabel = (status: string) => {
            switch (status) {
                case "pending":
                    return "بانتظار التأكيد";
                case "confirmed":
                    return "مؤكد";
                case "processing":
                    return "قيد التنفيذ";
                case "shipped":
                    return "تم الشحن";
                case "delivered":
                    return "تم التسليم";
                case "cancelled":
                    return "ملغي";
                case "refunded":
                    return "مسترد";
                default:
                    return status;
            }
        };

        const paymentStatusLabel = (status: string) => {
            switch (status) {
                case "pending":
                    return "بانتظار الدفع";
                case "paid":
                    return "مدفوع";
                case "failed":
                    return "متعثر";
                case "refunded":
                    return "مسترد";
                default:
                    return status;
            }
        };

        const toMix = (entries: [string, number][], labelFor: (value: string) => string) =>
            entries
                .filter(([, count]) => count > 0)
                .map(([key, count]) => ({ key, count, label: labelFor(key) }))
                .sort((a, b) => b.count - a.count);

        const orderStatusCounts = new Map<string, number>();
        const paymentStatusCounts = new Map<string, number>();
        for (const order of orders) {
            orderStatusCounts.set(order.status, (orderStatusCounts.get(order.status) ?? 0) + 1);
            paymentStatusCounts.set(order.payment_status, (paymentStatusCounts.get(order.payment_status) ?? 0) + 1);
        }

        const collectionRate = orders.length > 0 ? (paidOrders.length / orders.length) * 100 : 0;

        const analytics = {
            revenueByDay,
            topProducts,
            usersByDay,
            summary: {
                totalRevenue,
                totalOrders: orders.length,
                totalUsers: profiles.length,
                avgOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
            },
            previousPeriod,
            finance: {
                todayRevenue,
                todayOrders: todayOrders.length,
                paidOrders: paidOrders.length,
                pendingPayments: pendingPaymentOrders.length,
                failedPayments: failedPaymentOrders.length,
                deliveredOrders: deliveredOrders.length,
                cancelledOrRefunded: cancelledOrRefundedOrders.length,
                outstandingRevenue,
                atRiskRevenue,
                discountGranted,
                collectionRate,
                activeRevenueQueue: pendingPaymentOrders.length + failedPaymentOrders.length,
            },
            watchlists: {
                pendingPayments: pendingPaymentOrders.slice(0, 6),
                failedPayments: failedPaymentOrders.slice(0, 6),
                recentPaid: paidOrders.slice(0, 6),
            },
            mixes: {
                orderStatus: toMix(Array.from(orderStatusCounts.entries()), orderStatusLabel),
                paymentStatus: toMix(Array.from(paymentStatusCounts.entries()), paymentStatusLabel),
            },
        };

        await emitOrderRevenueEscalations({ finance: analytics.finance });

        return analytics;
    } catch (err) {
        console.error("getAdminAnalytics error:", err);
        return {
            revenueByDay: [],
            topProducts: [],
            usersByDay: [],
            summary: { totalRevenue: 0, totalOrders: 0, totalUsers: 0, avgOrderValue: 0 },
            finance: {
                todayRevenue: 0,
                todayOrders: 0,
                paidOrders: 0,
                pendingPayments: 0,
                failedPayments: 0,
                deliveredOrders: 0,
                cancelledOrRefunded: 0,
                outstandingRevenue: 0,
                atRiskRevenue: 0,
                discountGranted: 0,
                collectionRate: 0,
                activeRevenueQueue: 0,
            },
            watchlists: {
                pendingPayments: [],
                failedPayments: [],
                recentPaid: [],
            },
            mixes: {
                orderStatus: [],
                paymentStatus: [],
            },
        };
    }
}

// ═══════════════════════════════════════════════════════════
//  1c. INVENTORY — إدارة المخزون
// ═══════════════════════════════════════════════════════════

const LOW_STOCK_THRESHOLD = 5;

export async function getAdminInventory(filter: "all" | "low" | "out" = "all") {
    noStore();
    try {
        const { supabase } = await requireAdmin();
        const { data, error } = await supabase
            .from("products")
            .select("id, title, image_url, type, in_stock, stock_quantity, price, artist:profiles(display_name)")
            .order("title");
        if (error) throw error;
        const allProducts = data || [];
        const lowStock = allProducts.filter((p) => p.stock_quantity != null && p.stock_quantity <= LOW_STOCK_THRESHOLD && p.stock_quantity > 0);
        const outOfStock = allProducts.filter((p) => !p.in_stock || (p.stock_quantity != null && p.stock_quantity === 0));
        const products = filter === "out" ? outOfStock : (filter === "low" ? lowStock : allProducts);
        return {
            products,
            lowStockCount: lowStock.length,
            outOfStockCount: outOfStock.length,
        };
    } catch (err) {
        console.error("getAdminInventory error:", err);
        return { products: [], lowStockCount: 0, outOfStockCount: 0 };
    }
}

export async function updateProductStock(productId: string, stockQuantity: number | null, inStock?: boolean) {
    const { supabase } = await requireAdmin();
    const updates: Record<string, unknown> = {
        stock_quantity: stockQuantity,
        updated_at: new Date().toISOString(),
    };
    if (inStock !== undefined) updates.in_stock = inStock;
    else if (stockQuantity !== null) updates.in_stock = stockQuantity > 0;
    const { error } = await supabase.from("products").update(updates).eq("id", productId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/products-inventory");
    revalidatePath("/store");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  1d. SALES — إدارة المبيعات
// ═══════════════════════════════════════════════════════════

export async function getAdminSales(period: "7d" | "30d" | "90d" = "30d") {
    noStore();
    try {
        const { supabase } = await requireAdmin();
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const startIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: orders } = await supabase
            .from("orders")
            .select("id, total, created_at, status, payment_status")
            .gte("created_at", startIso)
            .in("payment_status", ["paid"])
            .in("status", ["confirmed", "processing", "shipped", "delivered"]);

        const orderIds = (orders || []).map((o) => o.id);
        let items: { product_id: string | null; quantity: number; total_price: number; custom_title: string | null; product: { title: string } | null }[] = [];
        if (orderIds.length > 0) {
            const { data: orderItems } = await supabase
                .from("order_items")
                .select("product_id, quantity, total_price, custom_title, product:products(title)")
                .in("order_id", orderIds);
            items = (orderItems || []) as unknown as { product_id: string | null; quantity: number; total_price: number; custom_title: string | null; product: { title: string } | null }[];
        }

        const byProduct = new Map<string, { title: string; quantity: number; revenue: number }>();
        for (const it of items) {
            const key = it.product_id || `custom_${it.custom_title || "مخصص"}`;
            const title = it.product?.title ?? it.custom_title ?? "تصميم مخصص";
            const curr = byProduct.get(key) ?? { title, quantity: 0, revenue: 0 };
            curr.quantity += it.quantity || 0;
            curr.revenue += Number(it.total_price) || 0;
            byProduct.set(key, curr);
        }

        const totalRevenue = (orders || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
        const salesByProduct = Array.from(byProduct.entries())
            .map(([productId, v]) => ({ productId, ...v }))
            .sort((a, b) => b.revenue - a.revenue);

        return {
            totalRevenue,
            totalOrders: (orders || []).length,
            salesByProduct,
            orders: orders || [],
        };
    } catch (err) {
        console.error("getAdminSales error:", err);
        return { totalRevenue: 0, totalOrders: 0, salesByProduct: [], orders: [] };
    }
}

// ═══════════════════════════════════════════════════════════
//  2. USERS — إدارة المستخدمين
// ═══════════════════════════════════════════════════════════

export async function getAdminUsers(
    page = 1,
    role = "all",
    search = ""
) {
    noStore();
    const { supabase } = await requireAdmin();

    const perPage = 15;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
        .from("profiles")
        .select("*, orders(total, payment_status, status)", { count: "exact" });

    if (role !== "all") {
        query = query.eq("role", role as UserRole);
    }

    if (search) {
        query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,clerk_id.ilike.%${search}%`);
    }

    const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Admin users error:", error);
        return { data: [], count: 0, totalPages: 0 };
    }

    let users = data || [];

    // --- Backfill missing emails and phones from Clerk --- //
    try {
        const usersNeedingSync = users.filter((u) => u.email === null);
        if (usersNeedingSync.length > 0) {
            const clerkIds = usersNeedingSync.map((u) => u.clerk_id);
            const client = await clerkClient();
            const { data: clerkUsers } = await client.users.getUserList({
                userId: clerkIds,
                limit: 100,
            });

            const updates: Promise<any>[] = [];

            users = users.map((user) => {
                if (user.email === null) {
                    const clerkData = clerkUsers.find((cu) => cu.id === user.clerk_id);
                    if (clerkData) {
                        const email = clerkData.emailAddresses?.find((e) => e.id === clerkData.primaryEmailAddressId)?.emailAddress || clerkData.emailAddresses?.[0]?.emailAddress || null;
                        const phone = clerkData.phoneNumbers?.find((p) => p.id === clerkData.primaryPhoneNumberId)?.phoneNumber || clerkData.phoneNumbers?.[0]?.phoneNumber || null;
                        
                        user.email = email;
                        user.phone = phone;

                        updates.push(
                            supabase.from("profiles").update({ email, phone }).eq("id", user.id) as unknown as Promise<any>
                        );
                    }
                }
                return user;
            });

            Promise.all(updates).catch((err) => console.error("Backfill update error:", err));
        }
    } catch (err) {
        console.error("Error during Clerk backfill:", err);
    }

    // --- Aggregate orders logic for ALL fetched users --- //
    users = users.map((user) => {
        let ordersCount = 0;
        let totalSpent = 0;
        if (Array.isArray(user.orders)) {
            ordersCount = user.orders.length;
            totalSpent = user.orders
                .filter((o: any) => o.payment_status === "paid" && o.status !== "cancelled" && o.status !== "refunded")
                .reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        }
        
        return {
            ...user,
            orders: [] as any, // remove full array to save payload
            orders_count: ordersCount,
            total_spent: totalSpent,
        };
    });

    return {
        data: users,
        count: count || 0,
        totalPages: count ? Math.ceil(count / perPage) : 0,
    };
}

export async function updateUserRole(userId: string, newRole: string) {
    const { supabase, profile: adminProfile } = await requireAdmin();

    const role = (newRole || "").trim();
    const VALID_ROLES: UserRole[] = ["admin", "wushsha", "subscriber", "dev"];
    if (!role || !VALID_ROLES.includes(role as UserRole)) {
        return { success: false, error: `الدور غير صالح. الأدوار المسموح بها: ${VALID_ROLES.join(", ")}` };
    }

    // جلب الدور الحالي قبل التغيير (للتدقيق)
    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    const { error } = await supabase
        .from("profiles")
        .update({ role: role as UserRole })
        .eq("id", userId);

    if (error) {
        console.error("Update role error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:update_user_role_failed:${userId}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل تحديث دور المستخدم",
            message: `تعذر تحديث دور المستخدم ${userId} إلى ${role}.`,
            source: "admin.users.update_role",
            category: "security",
            severity: "warning",
            link: "/dashboard/users",
            resourceType: "profile",
            resourceId: userId,
            metadata: {
                user_id: userId,
                target_role: role,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    // تحديث سجل التدقيق بالمعلومات الصحيحة (المسؤول + السياق)
    // الـ Trigger يُنشئ السجل تلقائياً، هنا نحدّث changed_by_id و context
    supabase
        .from("role_change_audit_log")
        .update({
            changed_by_id: adminProfile.id,
            context: "admin_action",
            metadata: {
                old_role: currentProfile?.role ?? null,
                new_role: role,
                changed_via: "dashboard",
            },
        })
        .eq("profile_id", userId)
        .eq("new_role", role)
        .eq("context", "system")
        .order("changed_at", { ascending: false })
        .limit(1)
        .then(({ error: auditErr }) => {
            if (auditErr) console.warn("[audit] role_change update:", auditErr.message);
        });

    revalidatePath("/dashboard/users");
    return { success: true };
}

export async function updateUserWushshaLevel(userId: string, level: number) {
    const { supabase } = await requireAdmin();

    const lvl = Math.min(5, Math.max(1, Math.floor(level)));
    if (lvl < 1 || lvl > 5) {
        return { success: false, error: "المستوى يجب أن يكون بين 1 و 5" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ wushsha_level: lvl as WushshaLevel })
        .eq("id", userId);

    if (error) {
        console.error("Update wushsha level error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:update_wushsha_level_failed:${userId}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل تحديث مستوى وشّى",
            message: `تعذر تحديث مستوى المستخدم ${userId} إلى ${lvl}.`,
            source: "admin.users.update_wushsha_level",
            link: "/dashboard/users",
            resourceType: "profile",
            resourceId: userId,
            metadata: {
                user_id: userId,
                level: lvl,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true };
}

export async function deleteUsers(userIds: string[]) {
    const { supabase, profile: adminProfile } = await requireAdmin();

    const filtered = userIds.filter((id) => id !== adminProfile.id);
    if (filtered.length === 0) {
        return { success: false, error: "لا يمكنك حذف حسابك الشخصي" };
    }

    const { error } = await supabase
        .from("profiles")
        .delete()
        .in("id", filtered);

    if (error) {
        console.error("Bulk delete users error:", error);
        await reportAdminActionAlert({
            dispatchKey: "admin:bulk_delete_users_failed",
            bucketMs: 30 * 60 * 1000,
            title: "فشل حذف مجموعة مستخدمين",
            message: `تعذر حذف ${filtered.length} مستخدم دفعة واحدة من لوحة الإدارة.`,
            source: "admin.users.bulk_delete",
            severity: "critical",
            link: "/dashboard/users",
            metadata: {
                user_ids: filtered,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true, deleted: filtered.length };
}

export async function deleteUser(userId: string) {
    const { supabase, profile: adminProfile } = await requireAdmin();

    if (adminProfile.id === userId) {
        return { success: false, error: "لا يمكنك حذف حسابك الشخصي" };
    }

    const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

    if (error) {
        console.error("Delete user error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:delete_user_failed:${userId}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل حذف مستخدم",
            message: `تعذر حذف المستخدم ${userId} من لوحة الإدارة.`,
            source: "admin.users.delete",
            severity: "warning",
            link: "/dashboard/users",
            resourceType: "profile",
            resourceId: userId,
            metadata: {
                user_id: userId,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true };
}

export async function createUser(data: {
    clerk_id: string;
    display_name: string;
    username: string;
    email?: string;
    phone?: string;
    role: UserRole;
    bio?: string;
    wushsha_level?: number;
}) {
    const { supabase } = await requireAdmin();

    const role = (data.role || "").trim();
    if (!role || role.length > 50) {
        return { success: false, error: "الدور يجب أن يكون بين 1 و 50 حرفاً" };
    }

    const username = data.username.trim().toLowerCase().replace(/\s+/g, "_");
    const displayName = data.display_name.trim();
    if (!displayName || !username) {
        return { success: false, error: "الاسم واسم المستخدم مطلوبان" };
    }

    const insertData: Record<string, unknown> = {
        clerk_id: data.clerk_id.trim(),
        display_name: displayName,
        username,
        role,
        bio: data.bio?.trim() || null,
    };
    if (data.email !== undefined) insertData.email = data.email.trim();
    if (data.phone !== undefined) insertData.phone = data.phone.trim();

    if (role === "wushsha" && data.wushsha_level) {
        const lvl = Math.min(5, Math.max(1, Math.floor(data.wushsha_level)));
        insertData.wushsha_level = lvl;
    }

    const { data: created, error } = await supabase
        .from("profiles")
        .insert(insertData as Database['public']['Tables']['profiles']['Insert'])
        .select("id")
        .single();

    if (error) {
        if (error.code === "23505") {
            return { success: false, error: "اسم المستخدم أو clerk_id مستخدم مسبقاً" };
        }
        console.error("Create user error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:create_user_failed:${insertData.clerk_id}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل إنشاء مستخدم إداريًا",
            message: `تعذر إنشاء المستخدم ${displayName} من لوحة الإدارة.`,
            source: "admin.users.create",
            severity: "warning",
            link: "/dashboard/users",
            metadata: {
                clerk_id: insertData.clerk_id,
                username,
                role,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true, userId: created?.id };
}

export async function updateUser(
    userId: string,
    data: {
        display_name?: string;
        username?: string;
        bio?: string;
        role?: UserRole;
        email?: string | null;
        phone?: string | null;
        wushsha_level?: number | null;
        is_verified?: boolean;
        website?: string | null;
    }
) {
    const { supabase } = await requireAdmin();

    let roleValue: string | undefined;
    if (data.role !== undefined) {
        roleValue = (data.role || "").trim();
        if (!roleValue || roleValue.length > 50) {
            return { success: false, error: "الدور يجب أن يكون بين 1 و 50 حرفاً" };
        }
    }

    const updateData: Record<string, unknown> = {};
    if (data.display_name !== undefined) updateData.display_name = data.display_name.trim();
    if (data.username !== undefined) updateData.username = data.username.trim().toLowerCase().replace(/\s+/g, "_");
    if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null;
    if (roleValue !== undefined) updateData.role = roleValue;
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.wushsha_level !== undefined) updateData.wushsha_level = data.wushsha_level;
    if (data.is_verified !== undefined) updateData.is_verified = data.is_verified;
    if (data.website !== undefined) updateData.website = data.website?.trim() || null;

    const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

    if (error) {
        if (error.code === "23505") {
            return { success: false, error: "اسم المستخدم مستخدم مسبقاً" };
        }
        console.error("Update user error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:update_user_failed:${userId}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل تحديث مستخدم",
            message: `تعذر تحديث بيانات المستخدم ${userId} من لوحة الإدارة.`,
            source: "admin.users.update",
            severity: "warning",
            link: "/dashboard/users",
            resourceType: "profile",
            resourceId: userId,
            metadata: {
                user_id: userId,
                fields: Object.keys(updateData),
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true };
}

export async function getAdminUserById(userId: string) {
    noStore();
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error || !data) {
        return null;
    }
    return data as Record<string, unknown>;
}

export async function getCustomerProfile(userId: string) {
    noStore();
    const { supabase } = await requireAdmin();

    const [profileRes, ordersRes, ticketsRes] = await Promise.allSettled([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("orders")
            .select("id, order_number, total, status, payment_status, created_at, order_items(id, quantity, unit_price, total_price, size, product:products(title, image_url), custom_title)")
            .eq("buyer_id", userId)
            .order("created_at", { ascending: false })
            .limit(50),
        supabase.from("support_tickets")
            .select("id, subject, status, priority, created_at, updated_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(20),
    ]);

    const profile = profileRes.status === "fulfilled" && profileRes.value.data ? profileRes.value.data : null;
    if (!profile) return null;

    const orders = (ordersRes.status === "fulfilled" && ordersRes.value.data ? ordersRes.value.data : []);
    const tickets = (ticketsRes.status === "fulfilled" && ticketsRes.value.data ? ticketsRes.value.data : []);
    const applicationQuery = profile.email
        ? supabase
            .from("applications")
            .select("*")
            .or(`profile_id.eq.${userId},email.eq.${profile.email}`)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : supabase
            .from("applications")
            .select("*")
            .eq("profile_id", userId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

    const { data: application } = await applicationQuery;

    const totalSpent = orders
        .filter((o) => o.payment_status === "paid")
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const activeOrders = orders.filter((o) =>
        ["pending", "confirmed", "processing", "shipped"].includes(o.status)
    ).length;
    const isTempProfile = String(profile.clerk_id || "").startsWith("app_");
    const hasContactInfo = Boolean(profile.email) && Boolean(profile.phone);

    return {
        profile: profile as Record<string, unknown>,
        orders,
        tickets,
        application,
        identity: {
            isTempProfile,
            hasContactInfo,
            hasLinkedApplication: Boolean(application),
        },
        stats: {
            totalOrders: orders.length,
            totalSpent,
            paidOrders: orders.filter((o) => o.payment_status === "paid").length,
            activeOrders,
            openTickets: tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
        },
    };
}

export async function getAdminUsersStats() {
    noStore();
    const { supabase } = await requireAdmin();

    const [totalRes, wushshaRes, subscriberRes, adminRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "wushsha"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "subscriber"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin"),
    ]);

    return {
        total: totalRes.count ?? 0,
        wushsha: wushshaRes.count ?? 0,
        subscriber: subscriberRes.count ?? 0,
        admin: adminRes.count ?? 0,
    };
}

export async function getIdentityOperationsSnapshot() {
    noStore();
    const { supabase } = await requireAdmin();

    const [profilesRes, acceptedAppsRes] = await Promise.all([
        supabase
            .from("profiles")
            .select("id, clerk_id, display_name, username, email, phone, role, is_verified, created_at, updated_at")
            .order("created_at", { ascending: false }),
        supabase
            .from("applications")
            .select("*")
            .eq("status", "accepted")
            .order("updated_at", { ascending: false }),
    ]);

    if (profilesRes.error) {
        console.error("Identity operations profiles error:", profilesRes.error);
        return {
            stats: {
                total: 0,
                admin: 0,
                wushsha: 0,
                subscriber: 0,
                verified: 0,
                recent7d: 0,
                tempProfiles: 0,
                missingContact: 0,
                acceptedWithoutProfile: 0,
                acceptedWithoutClerk: 0,
            },
            identityBacklog: [],
            profileHygieneQueue: [],
            recentProfiles: [],
        };
    }

    const profiles = profilesRes.data || [];
    const acceptedApplications = acceptedAppsRes.error ? [] : acceptedAppsRes.data || [];
    const enrichedApplications = await enrichApplicationsWithIdentity(supabase, acceptedApplications);

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const tempProfiles = profiles.filter((profile) => String(profile.clerk_id || "").startsWith("app_"));
    const missingContact = profiles.filter((profile) => !profile.email || !profile.phone);
    const profileHygieneQueue = profiles
        .filter((profile) => String(profile.clerk_id || "").startsWith("app_") || !profile.email || !profile.phone)
        .slice(0, 6);
    const identityBacklog = enrichedApplications
        .filter((application) => !application.hasProfile || !application.hasClerkAccount)
        .slice(0, 6);

    return {
        stats: {
            total: profiles.length,
            admin: profiles.filter((profile) => profile.role === "admin").length,
            wushsha: profiles.filter((profile) => profile.role === "wushsha").length,
            subscriber: profiles.filter((profile) => profile.role === "subscriber").length,
            verified: profiles.filter((profile) => profile.is_verified).length,
            recent7d: profiles.filter((profile) => now - new Date(profile.created_at).getTime() <= sevenDaysMs).length,
            tempProfiles: tempProfiles.length,
            missingContact: missingContact.length,
            acceptedWithoutProfile: enrichedApplications.filter((application) => !application.hasProfile).length,
            acceptedWithoutClerk: enrichedApplications.filter((application) => application.hasProfile && !application.hasClerkAccount).length,
        },
        identityBacklog,
        profileHygieneQueue,
        recentProfiles: profiles.slice(0, 6),
    };
}

export async function acceptApplicationAndCreateUser(
    applicationId: string,
    options: {
        role?: "wushsha" | "subscriber";
        wushsha_level?: number;
        clerk_id?: string;
        /** إنشاء المستخدم في Clerk ليتمكن من تسجيل الدخول */
        createInClerk?: boolean;
    }
) {
    const { supabase, profile: adminProfile } = await requireAdmin();

    const { data: app } = await supabase
        .from("applications")
        .select("*")
        .eq("id", applicationId)
        .single();

    if (!app) return { success: false, error: "الطلب غير موجود" };
    if (!["pending", "reviewing", "accepted"].includes(app.status)) {
        return { success: false, error: "لا يمكن معالجة هذا الطلب" };
    }

    const role = options.role ?? "wushsha";
    const username = `${app.full_name.replace(/\s+/g, "_").slice(0, 20)}_${Date.now().toString(36)}`.toLowerCase();
    let clerkId = options.clerk_id?.trim();
    let tempPassword: string | undefined;
    const appClerkId = `app_${applicationId}`;
    const applicationEmail = app.email ? String(app.email).trim().toLowerCase() : null;
    const normalizedWushshaLevel = (role === "wushsha"
        ? Math.min(5, Math.max(1, options.wushsha_level ?? 1))
        : null) as WushshaLevel | null;

    // ─── حالة: يوجد ملف بـ app_xxx (بدون Clerk) — إنشاء Clerk وتحديث الملف فقط ───
    const existingIdentityProfile = await findProfileForIdentity(supabase, {
        clerkId: clerkId || null,
        email: applicationEmail,
        tempClerkId: appClerkId,
    });
    const existingAppProfile = existingIdentityProfile && String(existingIdentityProfile.clerk_id || "").startsWith("app_")
        ? existingIdentityProfile
        : null;

    if (existingAppProfile && options.createInClerk && app.email) {
        const email = String(app.email).trim();
        if (!email) return { success: false, error: "البريد الإلكتروني مطلوب" };
        tempPassword = generateTempPassword();
        const nameParts = (app.full_name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "مستخدم";
        const lastName = nameParts.slice(1).join(" ") || "";
        try {
            const client = await clerkClient();
            const clerkUser = await client.users.createUser({
                emailAddress: [email],
                password: tempPassword,
                firstName,
                lastName: lastName || undefined,
                username: username.slice(0, 128),
            });
            try {
                const ensured = await ensureIdentityProfile(
                    supabase,
                    {
                        clerkId: clerkUser.id,
                        email,
                        username,
                        firstName,
                        lastName,
                        role,
                    },
                    {
                        tempClerkId: appClerkId,
                        role,
                        additionalUpdate: {
                            bio: app.motivation?.slice(0, 500) || null,
                            ...(role === "wushsha" ? { wushsha_level: normalizedWushshaLevel } : {}),
                        },
                    }
                );

                if (ensured.action === "conflict") {
                    return { success: false, error: "يوجد ملف آخر مرتبط بهذا المستخدم ويحتاج مراجعة يدوية" };
                }

                await supabase.from("applications").update({ profile_id: ensured.profile.id }).eq("id", applicationId);
                revalidatePath("/dashboard/applications");
                revalidatePath("/dashboard/users");
                sendApplicationAcceptedEmail(app.email, app.full_name || "فنان", tempPassword).catch(console.error);
                return { success: true, userId: ensured.profile.id, tempPassword };
            } catch (updateErr) {
                console.error("[acceptApplication] Update profile clerk_id:", updateErr);
                await reportAdminActionAlert({
                    dispatchKey: `admin:accept_application_profile_link_failed:${applicationId}`,
                    bucketMs: 30 * 60 * 1000,
                    title: "فشل ربط حساب الطلب المقبول",
                    message: `تعذر ربط ملف الطلب ${applicationId} بحساب Clerk الجديد بعد القبول.`,
                    source: "admin.applications.accept",
                    category: "applications",
                    severity: "critical",
                    link: "/dashboard/applications",
                    resourceType: "application",
                    resourceId: applicationId,
                    metadata: {
                        application_id: applicationId,
                        profile_id: existingAppProfile.id,
                        error: updateErr instanceof Error ? updateErr.message : String(updateErr),
                    },
                });
                return { success: false, error: updateErr instanceof Error ? updateErr.message : "فشل ربط الملف بالحساب" };
            }
        } catch (err: unknown) {
            console.error("[acceptApplication] Clerk createUser error:", err);
            const clerkErr = err as { errors?: { code: string }[]; message?: string };
            if (clerkErr?.errors?.[0]?.code === "form_identifier_exists") {
                return { success: false, error: "البريد مسجّل مسبقاً في Clerk." };
            }
            await reportAdminActionAlert({
                dispatchKey: `admin:accept_application_clerk_create_failed:${applicationId}`,
                bucketMs: 30 * 60 * 1000,
                title: "فشل إنشاء حساب Clerk للطلب المقبول",
                message: `تعذر إنشاء حساب Clerk للطلب ${applicationId} أثناء القبول.`,
                source: "admin.applications.accept",
                category: "applications",
                severity: "critical",
                link: "/dashboard/applications",
                resourceType: "application",
                resourceId: applicationId,
                metadata: {
                    application_id: applicationId,
                    email,
                    error: clerkErr?.message || "Unknown Clerk error",
                },
                stack: err instanceof Error ? err.stack ?? null : null,
            });
            return { success: false, error: clerkErr?.message || "فشل إنشاء المستخدم في Clerk" };
        }
    }

    // ─── إنشاء المستخدم في Clerk (عند إنشاء ملف جديد) ───
    if (options.createInClerk && app.email) {
        const email = String(app.email).trim();
        if (!email) return { success: false, error: "البريد الإلكتروني مطلوب لإنشاء حساب Clerk" };
        tempPassword = generateTempPassword();
        const nameParts = (app.full_name || "").trim().split(/\s+/);
        const firstName = nameParts[0] || "مستخدم";
        const lastName = nameParts.slice(1).join(" ") || "";
        try {
            const client = await clerkClient();
            const clerkUser = await client.users.createUser({
                emailAddress: [email],
                password: tempPassword,
                firstName,
                lastName: lastName || undefined,
                username: username.slice(0, 128),
            });
            clerkId = clerkUser.id;
        } catch (err: unknown) {
            console.error("[acceptApplication] Clerk createUser error:", err);
            const clerkErr = err as { errors?: { code: string }[]; message?: string };
            if (clerkErr?.errors?.[0]?.code === "form_identifier_exists") {
                return { success: false, error: "البريد الإلكتروني مسجّل مسبقاً في Clerk." };
            }
            await reportAdminActionAlert({
                dispatchKey: `admin:accept_application_new_clerk_failed:${applicationId}`,
                bucketMs: 30 * 60 * 1000,
                title: "فشل إنشاء حساب Clerk أثناء قبول الطلب",
                message: `تعذر إنشاء حساب Clerk جديد للطلب ${applicationId}.`,
                source: "admin.applications.accept",
                category: "applications",
                severity: "critical",
                link: "/dashboard/applications",
                resourceType: "application",
                resourceId: applicationId,
                metadata: {
                    application_id: applicationId,
                    email,
                    error: clerkErr?.message || "Unknown Clerk error",
                },
                stack: err instanceof Error ? err.stack ?? null : null,
            });
            return { success: false, error: clerkErr?.message || "فشل إنشاء المستخدم في Clerk" };
        }
    } else {
        clerkId = clerkId || appClerkId;
    }

    let newProfile: { id: string } | null = null;
    try {
        const ensured = await ensureIdentityProfile(
            supabase,
            {
                clerkId: clerkId!,
                email: applicationEmail,
                username,
                firstName: app.full_name?.split(/\s+/)[0] || null,
                lastName: app.full_name?.split(/\s+/).slice(1).join(" ") || null,
                role,
            },
            {
                tempClerkId: appClerkId,
                role,
                additionalInsert: {
                    display_name: app.full_name,
                    username,
                    bio: app.motivation?.slice(0, 500) || null,
                    ...(role === "wushsha" ? { wushsha_level: normalizedWushshaLevel } : {}),
                },
                additionalUpdate: {
                    bio: app.motivation?.slice(0, 500) || null,
                    ...(role === "wushsha" ? { wushsha_level: normalizedWushshaLevel } : {}),
                },
            }
        );

        if (ensured.action === "conflict") {
            return { success: false, error: "تم العثور على هوية مختلفة لنفس الشخص وتحتاج مراجعة يدوية" };
        }

        newProfile = { id: ensured.profile.id };
    } catch (insertError) {
        console.error("Create user from application:", insertError);
        await reportAdminActionAlert({
            dispatchKey: `admin:accept_application_profile_create_failed:${applicationId}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل إنشاء ملف المستخدم من الطلب",
            message: `تعذر إنشاء ملف المستخدم الناتج عن الطلب ${applicationId}.`,
            source: "admin.applications.accept",
            category: "applications",
            severity: "critical",
            link: "/dashboard/applications",
            resourceType: "application",
            resourceId: applicationId,
            metadata: {
                application_id: applicationId,
                clerk_id: clerkId,
                error: insertError instanceof Error ? insertError.message : String(insertError),
            },
        });
        return { success: false, error: insertError instanceof Error ? insertError.message : "فشل إنشاء ملف المستخدم" };
    }

    await supabase
        .from("applications")
        .update({
            status: "accepted",
            reviewer_id: adminProfile.id,
            profile_id: newProfile?.id,
        })
        .eq("id", applicationId);

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/applications");
    if (app.email) {
        sendApplicationAcceptedEmail(app.email, app.full_name || "فنان", tempPassword).catch(console.error);
    }
    return { success: true, userId: newProfile?.id, tempPassword };
}

// ═══════════════════════════════════════════════════════════
//  3. ORDERS — إدارة الطلبات
// ═══════════════════════════════════════════════════════════

export async function getOrdersOperationsSnapshot() {
    noStore();

    try {
        const { supabase } = await requireAdmin();
        const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

        const results = await Promise.allSettled([
            supabase.from("orders").select("id", { count: "exact", head: true }),
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["processing", "shipped"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "pending").neq("status", "cancelled").neq("status", "refunded"),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
            supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["cancelled", "refunded"]),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "paid"),
            supabase.from("orders").select("total").eq("payment_status", "paid"),
            supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso),
            supabase.from("orders").select("total").eq("payment_status", "paid").gte("created_at", todayStartIso),
            supabase.from("orders")
                .select("id, order_number, total, status, payment_status, created_at, buyer:profiles(display_name, username)")
                .in("status", ["pending", "confirmed"])
                .order("created_at", { ascending: false })
                .limit(5),
            supabase.from("orders")
                .select("id, order_number, total, status, payment_status, created_at, buyer:profiles(display_name, username)")
                .in("status", ["processing", "shipped"])
                .order("created_at", { ascending: false })
                .limit(5),
            supabase.from("orders")
                .select("id, order_number, total, status, payment_status, created_at, buyer:profiles(display_name, username)")
                .eq("payment_status", "pending")
                .neq("status", "cancelled")
                .neq("status", "refunded")
                .order("created_at", { ascending: false })
                .limit(5),
        ]);

        const getCount = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && typeof result.value.count === "number" ? result.value.count : 0;

        const getData = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && Array.isArray(result.value.data) ? result.value.data : [];

        results.forEach((res, idx) => {
            if (res.status === "rejected") {
                console.error(`Orders snapshot query ${idx} failed:`, res.reason);
                return;
            }

            if (res.value?.error) {
                console.error(`Orders snapshot query ${idx} returned DB error:`, res.value.error);
            }
        });

        const paidRevenue = getData(results[7]).reduce((sum: number, row: { total: number }) => sum + (Number(row.total) || 0), 0);
        const todayRevenue = getData(results[9]).reduce((sum: number, row: { total: number }) => sum + (Number(row.total) || 0), 0);

        const snapshot = {
            stats: {
                totalOrders: getCount(results[0]),
                pendingReview: getCount(results[1]),
                fulfillmentQueue: getCount(results[2]),
                paymentPending: getCount(results[3]),
                delivered: getCount(results[4]),
                cancelledOrRefunded: getCount(results[5]),
                paidOrders: getCount(results[6]),
                totalRevenue: paidRevenue,
                todayOrders: getCount(results[8]),
                todayRevenue,
            },
            awaitingConfirmation: getData(results[10]),
            shippingDesk: getData(results[11]),
            paymentWatchlist: getData(results[12]),
        };

        const pendingWatchlist = snapshot.paymentWatchlist as Array<{ total?: number }>;
        const pendingRevenue = pendingWatchlist.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

        await emitOrderRevenueEscalations({
            finance: {
                pendingPayments: snapshot.stats.paymentPending,
                failedPayments: 0,
                outstandingRevenue: pendingRevenue,
                atRiskRevenue: 0,
                activeRevenueQueue: snapshot.stats.paymentPending,
            },
            operations: {
                pendingReview: snapshot.stats.pendingReview,
                fulfillmentQueue: snapshot.stats.fulfillmentQueue,
                paymentPending: snapshot.stats.paymentPending,
                todayOrders: snapshot.stats.todayOrders,
            },
        });

        return snapshot;
    } catch (err) {
        console.error("FATAL: getOrdersOperationsSnapshot crashed completely:", err);
        return {
            stats: {
                totalOrders: 0,
                pendingReview: 0,
                fulfillmentQueue: 0,
                paymentPending: 0,
                delivered: 0,
                cancelledOrRefunded: 0,
                paidOrders: 0,
                totalRevenue: 0,
                todayOrders: 0,
                todayRevenue: 0,
            },
            awaitingConfirmation: [],
            shippingDesk: [],
            paymentWatchlist: [],
        };
    }
}

export async function getFulfillmentHubData() {
    noStore();
    try {
        const { supabase } = await requireAdmin();
        const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

        const selectStr = "id, order_number, subtotal, discount_amount, shipping_cost, total, status, payment_status, created_at, buyer:profiles(display_name, avatar_url, username), order_items(*, product:products(title, image_url)), coupon:discount_coupons(code)";
        
        const [
            { data: paidOrders },
            { data: processingOrders },
            { data: shippedOrders },
            { data: recentPaid },
            { data: warehouseLedger },
        ] = await Promise.all([
            supabase.from("orders").select(selectStr).eq("payment_status", "paid").in("status", ["confirmed", "processing"]),
            supabase.from("orders").select(selectStr).in("status", ["processing"]),
            supabase.from("orders").select(selectStr).in("status", ["shipped"]),
            supabase.from("orders").select("id, order_number, total, status, payment_status, created_at, buyer:profiles(display_name, avatar_url, username)").eq("payment_status", "paid").order("created_at", { ascending: false }).limit(10),
            (supabase as any).from("event_dispatches").select("*").in("channel", ["warehouse_payment"]).order("created_at", { ascending: false }).limit(10),
        ]);

        // حساب دين المستودع — فقط الطلبات التي لم يدفع لها بعد
        let totalDebt = 0;
        (paidOrders || []).forEach(order => {
            if (order.status !== "confirmed") return; // Only 'confirmed' (not processing/shipped) count as debt

            const orderItems = (order.order_items as unknown as any[]) || [];
            orderItems.forEach(item => {
                const garmentSlug = item.custom_garment || "premium-tshirt";
                const base = FULFILLMENT_RATES.garments[garmentSlug as keyof typeof FULFILLMENT_RATES.garments] || 30;
                const positions = item.custom_position ? item.custom_position.split(",").map((p: string) => p.trim()) : [];
                let printTotal = 0;
                positions.forEach((pos: string) => {
                    printTotal += FULFILLMENT_RATES.printing[pos as keyof typeof FULFILLMENT_RATES.printing] || 0;
                });
                totalDebt += (base + printTotal + FULFILLMENT_RATES.packaging_unit) * item.quantity;
            });
            totalDebt += FULFILLMENT_RATES.handling_per_order;
        });

        return {
            queues: {
                confirmed: (paidOrders || []).filter(o => o.status === "confirmed"),
                processing: (processingOrders || []),
                shipped: (shippedOrders || []),
            },
            recentPaid: (recentPaid || []),
            warehouseLedger: (warehouseLedger || []),
            stats: {
                totalPendingFulfillment: (paidOrders?.filter(o => o.status === "confirmed").length || 0) + (processingOrders?.length || 0),
                confirmedCount: paidOrders?.filter(o => o.status === "confirmed").length || 0,
                processingCount: processingOrders?.length || 0,
                shippedCount: shippedOrders?.length || 0,
                warehouseDebt: totalDebt,
            }
        };
    } catch (err) {
        console.error("getFulfillmentHubData error:", err);
        return {
            queues: { confirmed: [], processing: [], shipped: [] },
            recentPaid: [],
            stats: { totalPendingFulfillment: 0, confirmedCount: 0, processingCount: 0, shippedCount: 0, warehouseDebt: 0 }
        };
    }
}

export async function getAdminOrders({ page = 1, status = "all", search = "" }: { page?: number; status?: string; search?: string }) {
    noStore();
    try {
        const { supabase } = await requireAdmin();

        const perPage = 15;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        // استعلام مبسّط — تجنّب فشل الـ join المعقّد
        const selectQuery = `
            *,
            buyer:profiles(id, display_name, username, avatar_url),
            order_items(
                id, product_id, quantity, size, unit_price, total_price,
                custom_design_url, custom_garment, custom_title,
                product:products(id, title, image_url)
            ),
            coupon:discount_coupons(code)
        `;

        let query = supabase
            .from("orders")
            .select(selectQuery, { count: "exact" });

        if (status !== "all") {
            query = query.eq("status", status as OrderStatus);
        }

        if (search.trim() !== "") {
            query = query.ilike("order_number", `%${search.trim()}%`);
        }

        const { data, count, error } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Admin orders error:", error);
            return { data: [], count: 0, totalPages: 0 };
        }

        return {
            data: data || [],
            count: count || 0,
            totalPages: count ? Math.ceil(count / perPage) : 0,
        };
    } catch (err) {
        console.error("getAdminOrders failed:", err);
        return { data: [], count: 0, totalPages: 0 };
    }
}

/** نفس شكل عناصر قائمة getAdminOrders — لإبراز طلب عبر ?focus= من لوحة المؤشرات */
export async function getAdminOrderForFocusList(orderId: string) {
    noStore();
    if (!orderId?.trim()) {
        return null;
    }
    try {
        const { supabase } = await requireAdmin();
        const selectQuery = `
            *,
            buyer:profiles(id, display_name, username, avatar_url),
            order_items(
                id, product_id, quantity, size, unit_price, total_price,
                custom_design_url, custom_garment, custom_title,
                product:products(id, title, image_url)
            ),
            coupon:discount_coupons(code)
        `;
        const { data, error } = await supabase.from("orders").select(selectQuery).eq("id", orderId).maybeSingle();
        if (error || !data) {
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

export async function bookTorodShipment(orderId: string) {
    try {
        const { supabase } = await requireAdmin();

        // 1. Fetch Order Details
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*, profile:profiles(email, display_name)")
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            return { success: false, error: "الطلب غير موجود" };
        }

        // 2. Fetch Order Items with product types for better weight estimation
        const { data: items } = await supabase
            .from("order_items")
            .select("quantity, product:products(type)")
            .eq("order_id", orderId);

        const totalItemsCount = (items || []).reduce((sum, item) => sum + item.quantity, 0);
        
        // Dynamic weight estimation based on item types
        let estimatedWeight = 0;
        (items || []).forEach(item => {
            const type = (item.product as any)?.type || 'print';
            const unitWeight = type === 'apparel' ? 0.4 : 0.15;
            estimatedWeight += item.quantity * unitWeight;
        });
        estimatedWeight = Math.max(0.5, estimatedWeight);

        // 3. Map Shipping Address
        const addr = order.shipping_address as any;
        if (!addr || !addr.city || !addr.phone) {
            return { success: false, error: "بيانات العنوان غير مكتملة (تأكد من وجود المدينة ورقم الجوال)" };
        }

        // 4. Book via Torod
        const orderTotal = Math.round(order.total);
        console.log(`[Torod Booking] Order #${order.order_number} | Items: ${totalItemsCount} | Weight: ${estimatedWeight.toFixed(2)}kg`);

        const result = await torod.bookShipment({
            order_number: order.order_number,
            receiver_name: addr.name || order.profile?.display_name || "عميل",
            receiver_mobile: addr.phone,
            receiver_email: order.profile?.email || undefined,
            address: `${addr.line1} ${addr.line2 || ""}`.trim(),
            city: addr.city,
            weight: estimatedWeight,
            items_count: totalItemsCount,
            cod_amount: (order.payment_status === "pending") ? orderTotal : 0
        });

        if (!result.success) {
            return { success: false, error: result.error || "فشل الحجز مع طرود" };
        }

        // 5. Update Order in DB
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                tracking_number: result.tracking_number,
                courier_name: result.courier_name,
                waybill_url: result.waybill_url,
                torod_order_id: result.torod_order_id,
                status: "shipped",
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);

        if (updateError) {
            return { success: false, error: "تم حجز الشحنة ولكن فشل تحديث قاعدة البيانات" };
        }

        revalidatePath("/dashboard/orders");
        revalidatePath("/dashboard/orders/command-center");

        return { 
            success: true, 
            tracking_number: result.tracking_number,
            is_simulation: result.is_simulation 
        };

    } catch (err) {
        console.error("[bookTorodShipment] error:", err);
        return { success: false, error: String(err) };
    }
}

export async function cancelTorodShipment(orderId: string) {
    try {
        const { supabase } = await requireAdmin();

        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("tracking_number, status")
            .eq("id", orderId)
            .single();

        if (orderError || !order || !order.tracking_number) {
            return { success: false, error: "لا توجد شحنة نشطة لإلغائها" };
        }

        const result = await torod.cancelOrder(order.tracking_number);

        if (!result.success) {
            return { success: false, error: result.error || "فشل إلغاء الشحنة في طرود" };
        }

        // Return order status to processing after cancellation
        await supabase
            .from("orders")
            .update({
                status: "processing",
                tracking_number: null,
                waybill_url: null,
                torod_order_id: null,
                updated_at: new Date().toISOString()
            })
            .eq("id", orderId);

        revalidatePath("/dashboard/orders");
        revalidatePath("/dashboard/orders/command-center");

        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}


export async function updateOrderStatus(orderId: string, newStatus: string) {
    const { supabase } = await requireAdmin();

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
    if (!validStatuses.includes(newStatus)) {
        return { success: false, error: "Invalid status" };
    }

    const { data: currentOrder } = await supabase
        .from("orders")
        .select("status, buyer_id, order_number")
        .eq("id", orderId)
        .single();

    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === "confirmed") updateData.payment_status = "paid";
    if (newStatus === "cancelled") updateData.payment_status = "refunded";
    if (newStatus === "refunded") updateData.payment_status = "refunded";

    const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

    if (error) {
        console.error("Update order status error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:update_order_status_failed:${orderId}:${newStatus}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل تحديث حالة الطلب",
            message: `تعذر تحديث حالة الطلب ${orderId} إلى ${newStatus}.`,
            source: "admin.orders.update_status",
            category: "orders",
            severity: "critical",
            link: "/dashboard/orders",
            resourceType: "order",
            resourceId: orderId,
            metadata: {
                order_id: orderId,
                new_status: newStatus,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    const hadStockDeducted = ["confirmed", "processing", "shipped"].includes(currentOrder?.status || "");
    if ((newStatus === "cancelled" || newStatus === "refunded") && hadStockDeducted) {
        const { restoreStockForOrder } = await import("@/lib/inventory");
        await restoreStockForOrder(orderId);
    }

    if (currentOrder?.buyer_id && newStatus !== currentOrder.status) {
        let statusAr = "";
        switch (newStatus) {
            case "confirmed": statusAr = "تم تأكيد"; break;
            case "processing": statusAr = "جاري تجهيز"; break;
            case "shipped": statusAr = "تم شحن"; break;
            case "delivered": statusAr = "تم توصيل"; break;
            case "cancelled": statusAr = "تم إلغاء"; break;
            case "refunded": statusAr = "تم إرجاع مبلغ"; break;
        }

        if (statusAr) {
            await supabase.from("user_notifications").insert({
                user_id: currentOrder.buyer_id,
                type: "order_update",
                title: "تحديث حالة الطلب",
                message: `${statusAr} طلبك #${currentOrder.order_number}`,
                link: `/account/orders?order=${orderId}`,
                metadata: { order_id: orderId, new_status: newStatus }
            });
        }
    }

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/products-inventory");
    return { success: true };
}

/**
 * ──────────────────────────────────────────────────────────
 *  WAREHOUSE FULFILLMENT ACTIONS
 * ──────────────────────────────────────────────────────────
 */

export async function getFulfillmentCalculation(orderId: string) {
    noStore();
    try {
        const { supabase } = await requireAdmin();
        
        const { data: items, error } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", orderId);

        if (error || !items) throw new Error("Could not fetch items");

        let totalGarmentCost = 0;
        let totalPrintingCost = 0;
        const breakdownItems = [];

        for (const item of items) {
            if (item.custom_design_url) {
                const garmentSlug = item.custom_garment || "premium-tshirt";
                const positions = item.custom_position ? item.custom_position.split(",").map(p => p.trim()) : [];
                
                const garmentBase = FULFILLMENT_RATES.garments[garmentSlug as keyof typeof FULFILLMENT_RATES.garments] || 30;
                let itemPrintingTotal = 0;
                
                positions.forEach(pos => {
                    itemPrintingTotal += FULFILLMENT_RATES.printing[pos as keyof typeof FULFILLMENT_RATES.printing] || 0;
                });

                const itemTotal = (garmentBase + itemPrintingTotal + FULFILLMENT_RATES.packaging_unit) * item.quantity;
                
                totalGarmentCost += garmentBase * item.quantity;
                totalPrintingCost += itemPrintingTotal * item.quantity;

                breakdownItems.push({
                    title: item.custom_title || "Custom Design",
                    qty: item.quantity,
                    garmentBase,
                    printing: itemPrintingTotal,
                    packaging: FULFILLMENT_RATES.packaging_unit,
                    total: itemTotal
                });
            } else {
                // Standard product fulfillment (assumed flat for now)
                const STO_FEE = 15; 
                totalGarmentCost += STO_FEE * item.quantity;
                breakdownItems.push({
                    title: `Inventory Item: ${item.quantity} units`,
                    qty: item.quantity,
                    garmentBase: STO_FEE,
                    printing: 0,
                    packaging: 2,
                    total: (STO_FEE + 2) * item.quantity
                });
            }
        }

        const grandFulfillmentTotal = totalGarmentCost + totalPrintingCost + (breakdownItems.length > 0 ? FULFILLMENT_RATES.handling_per_order : 0) + (breakdownItems.reduce((acc, i) => acc + (i.packaging * i.qty), 0));

        return {
            success: true,
            breakdown: {
                items: breakdownItems,
                summary: {
                    garmentSubtotal: totalGarmentCost,
                    printingSubtotal: totalPrintingCost,
                    handlingFee: FULFILLMENT_RATES.handling_per_order,
                    packagingTotal: breakdownItems.reduce((acc, i) => acc + (i.packaging * i.qty), 0),
                    grandTotal: grandFulfillmentTotal
                }
            }
        };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

export type BulkFulfillmentCalculationResult =
    | { success: true; grandTotal: number; breakdowns: Record<string, any> }
    | { success: false; error: string };

export async function getBulkFulfillmentCalculation(
    orderIds: string[]
): Promise<BulkFulfillmentCalculationResult> {
    try {
        let grandTotal = 0;
        const individualBreakdowns: Record<string, any> = {};

        for (const orderId of orderIds) {
            const result = await getFulfillmentCalculation(orderId);
            if (result.success && result.breakdown) {
                grandTotal += result.breakdown.summary.grandTotal;
                individualBreakdowns[orderId] = result.breakdown;
            }
        }

        if (grandTotal > 0) {
            return { success: true, grandTotal, breakdowns: individualBreakdowns };
        }
        return { success: false, error: "No fulfillment amount for selection" };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

export async function initiateWarehousePayment(orderId: string) {
    try {
        const { supabase, profile: adminProfile } = await requireAdmin();
        const calculation = await getFulfillmentCalculation(orderId);
        
        if (!calculation.success || !calculation.breakdown) {
            return { success: false, error: "Calculation failed" };
        }

        const { data: order } = await supabase
            .from("orders")
            .select("order_number")
            .eq("id", orderId)
            .single();

        if (!order) return { success: false, error: "Order not found" };

        const products = calculation.breakdown.items.map(item => ({
            title: item.title,
            price: (item.garmentBase + item.printing + item.packaging),
            qty: item.qty
        }));

        if (calculation.breakdown.summary.handlingFee > 0) {
            products.push({
                title: "Handling Fee",
                price: calculation.breakdown.summary.handlingFee,
                qty: 1
            });
        }

        const invoice = await createPaylinkInvoice({
            orderNumber: `FUL-${order.order_number}`,
            clientName: "Wusha Operations",
            clientMobile: "0555555555",
            clientEmail: "ops@washa.com",
            callBackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://washa.shop"}/dashboard/orders`,
            amount: calculation.breakdown.summary.grandTotal,
            products,
        });

        if (invoice.url) {
            // Register as initiated in dispatches for tracking (optional but good for logs)
            await (getSupabaseAdminClient() as any).from("event_dispatches").insert({
                dispatch_key: `paylink:initiate:FUL-${order.order_number}`,
                event_type: "fulfillment_initiated",
                channel: "warehouse_payment",
                status: "processing",
                metadata: { order_id: orderId, amount: calculation.breakdown.summary.grandTotal }
            });

            return { success: true, url: invoice.url };
        }

        return { success: false, error: "Paylink URL generation failed" };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

export async function confirmWarehousePayment(paymentIdentifier: string, amount?: number) {
    try {
        const supabase = getSupabaseAdminClient();
        console.log(`[confirmWarehousePayment] Processing: ${paymentIdentifier}`);

        if (paymentIdentifier.startsWith("FUL-")) {
            // Single Order
            const orderNumber = paymentIdentifier.replace("FUL-", "");
            const { data: order } = await supabase
                .from("orders")
                .select("id")
                .eq("order_number", orderNumber)
                .single();

            if (order) {
                await markAsPaidToWarehouse(order.id);
                return { success: true };
            }
        } else if (paymentIdentifier.startsWith("BATCH-FUL-")) {
            // Bulk Batch (event_dispatches not in generated DB types — use loose client)
            const { data: batch } = await (supabase as any)
                .from("event_dispatches")
                .select("metadata")
                .eq("dispatch_key", `paylink:initiate:${paymentIdentifier}`)
                .single();

            if (batch?.metadata?.order_ids) {
                const orderIds = batch.metadata.order_ids as string[];
                await markBatchAsPaidToWarehouse(orderIds);
                return { success: true };
            }
        }

        return { success: false, error: "Identifier not recognized or batch missing" };
    } catch (err) {
        console.error("[confirmWarehousePayment] Error:", err);
        return { success: false, error: String(err) };
    }
}

export async function markAsPaidToWarehouse(orderId: string) {
    try {
        const { supabase } = await requireAdmin();
        
        // 1. Update order status to processing
        const { error: statusError } = await supabase
            .from("orders")
            .update({ 
                status: "processing"
            })
            .eq("id", orderId);

        if (statusError) throw statusError;

        // 2. Trigger inventory logic
        const { decrementStockForOrder } = await import("@/lib/inventory");
        await decrementStockForOrder(orderId);

        revalidatePath("/dashboard/orders");
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

/**
 * ═══════════════════════════════════════════════════════════
 *  BATCH FULFILLMENT ACTIONS
 * ═══════════════════════════════════════════════════════════
 */

export async function initiateBulkWarehousePayment(orderIds: string[]) {
    try {
        const { supabase } = await requireAdmin();
        const calculation = await getBulkFulfillmentCalculation(orderIds);

        if (!calculation.success || !calculation.grandTotal) {
            return { success: false, error: "Bulk calculation failed" };
        }

        const batchId = `BATCH-FUL-${Date.now()}`;
        const allProducts = [];

        for (const [orderId, breakdown] of Object.entries(calculation.breakdowns || {})) {
            const { data: order } = await supabase.from("orders").select("order_number").eq("id", orderId).single();
            if (order) {
                allProducts.push({
                    title: `Fulfillment: #${order.order_number}`,
                    price: (breakdown as any).summary.grandTotal,
                    qty: 1
                });
            }
        }

        const invoice = await createPaylinkInvoice({
            orderNumber: batchId,
            clientName: "Wusha Operations (Batch)",
            clientMobile: "0555555555",
            clientEmail: "ops@washa.com",
            callBackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://washa.shop"}/dashboard/orders`,
            amount: calculation.grandTotal,
            products: allProducts,
        });

        if (invoice.url) {
            // Register the batch for automated webhook confirmation
            await (supabase as any).from("event_dispatches").insert({
                dispatch_key: `paylink:initiate:${batchId}`,
                event_type: "fulfillment_bulk_initiated",
                channel: "warehouse_payment",
                status: "processing",
                metadata: { 
                    order_ids: orderIds, 
                    amount: calculation.grandTotal 
                }
            });

            return { success: true, url: invoice.url };
        }

        return { success: false, error: "Batch URL generation failed" };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

export async function markBatchAsPaidToWarehouse(orderIds: string[]) {
    try {
        const { supabase } = await requireAdmin();
        const { decrementStockForOrder } = await import("@/lib/inventory");

        const updatePromises = orderIds.map(async (id) => {
            const { error } = await supabase
                .from("orders")
                .update({ 
                    status: "processing"
                })
                .eq("id", id);
            
            if (!error) {
                await decrementStockForOrder(id);
            }
        });

        await Promise.all(updatePromises);
        
        revalidatePath("/dashboard/orders");
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

// ═══════════════════════════════════════════════════════════
//  4. APPLICATIONS — طلبات الانضمام
// ═══════════════════════════════════════════════════════════

async function enrichApplicationsWithIdentity(
    supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
    applications: any[]
) {
    const acceptedApps = applications.filter((app) => app.status === "accepted");
    if (acceptedApps.length === 0) {
        return applications.map((app) => ({
            ...app,
            profile: null,
            hasProfile: false,
            hasClerkAccount: false,
        }));
    }

    const profileIds = Array.from(
        new Set(
            acceptedApps
                .map((app) => app.profile_id)
                .filter(Boolean)
        )
    );
    const tempClerkIds = acceptedApps.map((app) => `app_${app.id}`);

    const [{ data: profilesById = [] }, { data: profilesByTempId = [] }] = await Promise.all([
        profileIds.length > 0
            ? supabase.from("profiles").select("id, clerk_id, display_name, avatar_url").in("id", profileIds)
            : Promise.resolve({ data: [] }),
        tempClerkIds.length > 0
            ? supabase.from("profiles").select("id, clerk_id, display_name, avatar_url").in("clerk_id", tempClerkIds)
            : Promise.resolve({ data: [] }),
    ]);

    const safeProfilesById = profilesById ?? [];
    const safeProfilesByTempId = profilesByTempId ?? [];

    const profileById = new Map(safeProfilesById.map((profile) => [profile.id, profile]));
    const profileByTempClerkId = new Map(safeProfilesByTempId.map((profile) => [profile.clerk_id, profile]));

    return applications.map((app) => {
        if (app.status !== "accepted") {
            return { ...app, profile: null, hasProfile: false, hasClerkAccount: false };
        }

        const profile =
            (app.profile_id ? profileById.get(app.profile_id) : null) ??
            profileByTempClerkId.get(`app_${app.id}`) ??
            null;
        const hasProfile = !!profile;
        const hasClerkAccount = hasProfile && !String(profile!.clerk_id).startsWith("app_");

        return {
            ...app,
            profile,
            hasProfile,
            hasClerkAccount,
        };
    });
}

function getApplicationAgeBand(birthDate: string | null | undefined) {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;

    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age -= 1;
    }

    if (age < 18) return "under_18";
    if (age <= 24) return "age_18_24";
    if (age <= 34) return "age_25_34";
    return "age_35_plus";
}

type AdminApplicationFilters = {
    status?: string;
    joinType?: string;
    gender?: string;
    ageBand?: string;
    identityState?: string;
};

function csvCell(value: unknown) {
    const raw = value == null ? "" : String(value).replace(/\s*\n+\s*/g, " ").trim();
    return `"${raw.replace(/"/g, '""')}"`;
}

async function fetchFilteredAdminApplications(
    supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
    filters?: AdminApplicationFilters
) {
    const status = filters?.status || "all";
    const joinType = filters?.joinType || "all";
    const gender = filters?.gender || "all";
    const ageBand = filters?.ageBand || "all";
    const identityState = filters?.identityState || "all";

    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Admin applications error:", error);
        return [];
    }

    const apps = data || [];
    const enriched = enrichApplicationsWithPriority(await enrichApplicationsWithIdentity(supabase, apps));
    const filtered = enriched.filter((app) => {
        if (status !== "all" && app.status !== status) return false;
        if (joinType !== "all" && app.join_type !== joinType) return false;
        if (gender !== "all" && app.gender !== gender) return false;
        if (ageBand !== "all" && getApplicationAgeBand(app.birth_date) !== ageBand) return false;
        if (identityState === "needs_profile" && !(app.status === "accepted" && !app.hasProfile)) return false;
        if (identityState === "needs_clerk" && !(app.status === "accepted" && app.hasProfile && !app.hasClerkAccount)) return false;
        if (identityState === "ready_identity" && !(app.status === "accepted" && app.hasProfile && app.hasClerkAccount)) return false;
        return true;
    });

    return [...filtered].sort((a, b) => b.priorityScore - a.priorityScore);
}

function enrichApplicationsWithPriority(applications: any[]) {
    const now = Date.now();

    return applications.map((app) => {
        let priorityScore = 0;
        const reasons: string[] = [];
        const updatedAt = new Date(app.updated_at || app.created_at).getTime();
        const waitingHours = Number.isFinite(updatedAt) ? Math.max(0, (now - updatedAt) / 36e5) : 0;

        if (app.status === "pending") {
            priorityScore += 34;
            reasons.push("بانتظار قرار أولي");
        } else if (app.status === "reviewing") {
            priorityScore += 28;
            reasons.push("قيد المراجعة");
        } else if (app.status === "accepted" && !app.hasProfile) {
            priorityScore += 30;
            reasons.push("مقبول بلا profile");
        } else if (app.status === "accepted" && app.hasProfile && !app.hasClerkAccount) {
            priorityScore += 26;
            reasons.push("مقبول بلا Clerk");
        }

        if ((app.status === "pending" || app.status === "reviewing") && waitingHours >= 72) {
            priorityScore += 18;
            reasons.push("متأخر أكثر من 72 ساعة");
        } else if ((app.status === "pending" || app.status === "reviewing") && waitingHours >= 24) {
            priorityScore += 10;
            reasons.push("ينتظر منذ أكثر من يوم");
        }

        if (app.join_type === "artist") {
            priorityScore += 10;
            reasons.push("فنان ذو قيمة استراتيجية");
        } else if (app.join_type === "designer") {
            priorityScore += 8;
            reasons.push("مصمم ضمن المسار الإبداعي");
        } else if (app.join_type === "model") {
            priorityScore += 6;
            reasons.push("مفيد لخط المحتوى");
        } else if (app.join_type === "partner") {
            priorityScore += 6;
            reasons.push("قد يفتح مسار شراكة");
        }

        if (app.portfolio_url || app.instagram_url || (app.portfolio_images?.length ?? 0) > 0) {
            priorityScore += 8;
            reasons.push("أصول مرجعية متاحة");
        }

        if (app.phone) {
            priorityScore += 3;
            reasons.push("التواصل المباشر متاح");
        }

        if (app.art_style && app.art_style !== "اهتمامات عامة بالمنصة") {
            priorityScore += 4;
            reasons.push("ذوق أو ستايل واضح");
        }

        if (app.gender) priorityScore += 2;
        if (app.birth_date) priorityScore += 2;

        const priorityTier =
            priorityScore >= 65
                ? "critical"
                : priorityScore >= 45
                  ? "high"
                  : priorityScore >= 25
                    ? "medium"
                    : "low";

        return {
            ...app,
            priorityScore,
            priorityTier,
            priorityReasons: Array.from(new Set(reasons)).slice(0, 3),
        };
    });
}

export async function getAdminApplications(filters?: AdminApplicationFilters) {
    noStore();
    const { supabase } = await requireAdmin();
    const filtered = await fetchFilteredAdminApplications(supabase, filters);

    return {
        data: filtered,
        count: filtered.length,
    };
}

export async function exportAdminApplicationsCsv(filters?: AdminApplicationFilters) {
    noStore();
    const { supabase } = await requireAdmin();
    const filtered = await fetchFilteredAdminApplications(supabase, filters);

    const headers = [
        "id",
        "full_name",
        "email",
        "phone",
        "status",
        "join_type",
        "gender",
        "birth_date",
        "age_band",
        "art_style",
        "experience_years",
        "priority_tier",
        "priority_score",
        "priority_reasons",
        "has_profile",
        "has_clerk_account",
        "portfolio_url",
        "instagram_url",
        "motivation",
        "created_at",
        "updated_at",
    ];

    const rows = filtered.map((app) =>
        [
            app.id,
            app.full_name,
            app.email,
            app.phone,
            app.status,
            app.join_type,
            app.gender,
            app.birth_date,
            getApplicationAgeBand(app.birth_date),
            app.art_style,
            app.experience_years,
            app.priorityTier,
            app.priorityScore,
            Array.isArray(app.priorityReasons) ? app.priorityReasons.join(" | ") : "",
            app.hasProfile ? "yes" : "no",
            app.hasClerkAccount ? "yes" : "no",
            app.portfolio_url,
            app.instagram_url,
            app.motivation,
            app.created_at,
            app.updated_at,
        ]
            .map(csvCell)
            .join(",")
    );

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return {
        success: true,
        count: filtered.length,
        filename: `applications-export-${stamp}.csv`,
        csv: "\uFEFF" + [headers.join(","), ...rows].join("\n"),
    };
}

export async function getAdminApplicationDetails(id: string) {
    noStore();
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Admin application details error:", error);
        return null;
    }

    if (!data) return null;

    const [application] = enrichApplicationsWithPriority(await enrichApplicationsWithIdentity(supabase, [data]));
    return application ?? null;
}

export async function getApplicationWorkspaceContext(id: string) {
    noStore();
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Application workspace context error:", error);
        return {
            navigation: {
                previous: null,
                next: null,
            },
            queue: {
                reviewPosition: null,
                reviewTotal: 0,
                identityPosition: null,
                identityTotal: 0,
                nextDecisionCandidate: null,
                nextProvisionCandidate: null,
            },
            checklist: {
                hasContact: false,
                hasAssets: false,
                hasAudienceProfile: false,
                hasIdentityReady: false,
                hasReviewNotes: false,
            },
        };
    }

    const applications = enrichApplicationsWithPriority(await enrichApplicationsWithIdentity(supabase, data || []));
    const ranked = [...applications].sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const currentIndex = ranked.findIndex((application) => application.id === id);
    const current = currentIndex >= 0 ? ranked[currentIndex] : null;

    const decisionQueue = ranked.filter((application) => application.status === "pending" || application.status === "reviewing");
    const identityQueue = ranked.filter(
        (application) =>
            application.status === "accepted" && (!application.hasProfile || !application.hasClerkAccount)
    );

    return {
        navigation: {
            previous:
                currentIndex > 0
                    ? {
                          id: ranked[currentIndex - 1].id,
                          full_name: ranked[currentIndex - 1].full_name,
                          status: ranked[currentIndex - 1].status,
                      }
                    : null,
            next:
                currentIndex >= 0 && currentIndex < ranked.length - 1
                    ? {
                          id: ranked[currentIndex + 1].id,
                          full_name: ranked[currentIndex + 1].full_name,
                          status: ranked[currentIndex + 1].status,
                      }
                    : null,
        },
        queue: {
            reviewPosition:
                current && (current.status === "pending" || current.status === "reviewing")
                    ? decisionQueue.findIndex((application) => application.id === current.id) + 1
                    : null,
            reviewTotal: decisionQueue.length,
            identityPosition:
                current && current.status === "accepted" && (!current.hasProfile || !current.hasClerkAccount)
                    ? identityQueue.findIndex((application) => application.id === current.id) + 1
                    : null,
            identityTotal: identityQueue.length,
            nextDecisionCandidate:
                decisionQueue.find((application) => application.id !== id) ?? null,
            nextProvisionCandidate:
                identityQueue.find((application) => application.id !== id) ?? null,
        },
        checklist: {
            hasContact: !!(current?.email || current?.phone),
            hasAssets: !!(current?.portfolio_url || current?.instagram_url || (current?.portfolio_images?.length ?? 0) > 0),
            hasAudienceProfile: !!(current?.join_type && current?.gender && current?.birth_date),
            hasIdentityReady: !!(current?.hasProfile && current?.hasClerkAccount),
            hasReviewNotes: !!current?.reviewer_notes,
        },
    };
}

export async function getApplicationsOperationsSnapshot() {
    noStore();
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Applications operations snapshot error:", error);
        return {
            stats: {
                total: 0,
                pending: 0,
                reviewing: 0,
                accepted: 0,
                rejected: 0,
                createdToday: 0,
                waitingDecision: 0,
                acceptedWithoutProfile: 0,
                acceptedWithoutClerk: 0,
                highPriority: 0,
            },
            intakeQueue: [],
            identityBacklog: [],
            recentlyReviewed: [],
            priorityQueue: [],
            segments: {
                joinTypeMix: [],
                genderMix: [],
                ageBands: [],
                styleSignals: [],
            },
        };
    }

    const applications = enrichApplicationsWithPriority(await enrichApplicationsWithIdentity(supabase, data || []));
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    const pending = applications.filter((app) => app.status === "pending");
    const reviewing = applications.filter((app) => app.status === "reviewing");
    const accepted = applications.filter((app) => app.status === "accepted");
    const rejected = applications.filter((app) => app.status === "rejected");

    const prioritySort = (a: any, b: any) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    };

    const createdToday = applications.filter(
        (app) => new Date(app.created_at).toISOString().slice(0, 10) === todayKey
    ).length;
    const identityBacklog = accepted
        .filter((app) => !app.hasProfile || !app.hasClerkAccount)
        .sort(prioritySort)
        .slice(0, 6);
    const priorityQueue = applications
        .filter((app) =>
            app.status === "pending" ||
            app.status === "reviewing" ||
            (app.status === "accepted" && (!app.hasProfile || !app.hasClerkAccount))
        )
        .sort(prioritySort)
        .slice(0, 6);
    const intakeQueue = [...pending, ...reviewing]
        .sort(prioritySort)
        .slice(0, 6);
    const recentlyReviewed = applications
        .filter((app) => app.status === "accepted" || app.status === "rejected")
        .sort(
            (a, b) =>
                new Date(b.updated_at || b.created_at).getTime() -
                new Date(a.updated_at || a.created_at).getTime()
        )
        .slice(0, 6);

    const buildMix = (
        counts: Record<string, number>,
        labels: Record<string, string>,
        total: number
    ) =>
        Object.entries(labels)
            .map(([key, label]) => ({
                key,
                label,
                count: counts[key] ?? 0,
                share: total > 0 ? Math.round(((counts[key] ?? 0) / total) * 100) : 0,
            }))
            .filter((item) => item.count > 0)
            .sort((a, b) => b.count - a.count);

    const joinTypeLabels = {
        artist: "فنان",
        designer: "مصمم",
        model: "مودل",
        customer: "عميل مهتم",
        partner: "شريك أو متعاون",
    } as const;

    const genderLabels = {
        male: "ذكر",
        female: "أنثى",
    } as const;

    const joinTypeCounts = applications.reduce<Record<string, number>>((acc, app) => {
        if (app.join_type) {
            acc[app.join_type] = (acc[app.join_type] ?? 0) + 1;
        }
        return acc;
    }, {});

    const genderCounts = applications.reduce<Record<string, number>>((acc, app) => {
        if (app.gender) {
            acc[app.gender] = (acc[app.gender] ?? 0) + 1;
        }
        return acc;
    }, {});

    const ageBandLabels = {
        under_18: "أقل من 18",
        age_18_24: "18 - 24",
        age_25_34: "25 - 34",
        age_35_plus: "35+",
    } as const;

    const ageBandCounts = applications.reduce<Record<string, number>>((acc, app) => {
        if (!app.birth_date) return acc;

        const birth = new Date(app.birth_date);
        if (Number.isNaN(birth.getTime())) return acc;

        let age = now.getFullYear() - birth.getFullYear();
        const monthDiff = now.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
            age -= 1;
        }

        const band =
            age < 18
                ? "under_18"
                : age <= 24
                  ? "age_18_24"
                  : age <= 34
                    ? "age_25_34"
                    : "age_35_plus";

        acc[band] = (acc[band] ?? 0) + 1;
        return acc;
    }, {});

    const styleSignalCounts = applications.reduce<Record<string, number>>((acc, app) => {
        const signals = String(app.art_style || "")
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean);

        for (const signal of signals) {
            acc[signal] = (acc[signal] ?? 0) + 1;
        }

        return acc;
    }, {});

    const styleSignals = Object.entries(styleSignalCounts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const joinTypeTotal = Object.values(joinTypeCounts).reduce((sum, count) => sum + count, 0);
    const genderTotal = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
    const ageBandTotal = Object.values(ageBandCounts).reduce((sum, count) => sum + count, 0);

    return {
        stats: {
            total: applications.length,
            pending: pending.length,
            reviewing: reviewing.length,
            accepted: accepted.length,
            rejected: rejected.length,
            createdToday,
            waitingDecision: pending.length + reviewing.length,
            acceptedWithoutProfile: accepted.filter((app) => !app.hasProfile).length,
            acceptedWithoutClerk: accepted.filter((app) => app.hasProfile && !app.hasClerkAccount).length,
            highPriority: applications.filter((app) => app.priorityTier === "critical" || app.priorityTier === "high").length,
        },
        intakeQueue,
        identityBacklog,
        recentlyReviewed,
        priorityQueue,
        segments: {
            joinTypeMix: buildMix(joinTypeCounts, joinTypeLabels, joinTypeTotal),
            genderMix: buildMix(genderCounts, genderLabels, genderTotal),
            ageBands: buildMix(ageBandCounts, ageBandLabels, ageBandTotal),
            styleSignals,
        },
    };
}

export async function reviewApplication(
    id: string,
    decision: "accepted" | "rejected",
    notes?: string
) {
    const { supabase, profile: adminProfile } = await requireAdmin();

    // Get the application
    const { data: app } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .single();

    if (!app) return { success: false, error: "Application not found" };

    // Update application status
    const { error } = await supabase
        .from("applications")
        .update({
            status: decision,
            reviewer_id: adminProfile.id,
            reviewer_notes: notes || null,
        })
        .eq("id", id);

    if (error) {
        console.error("Review application error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:review_application_failed:${id}:${decision}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل مراجعة طلب الانضمام",
            message: `تعذر تحديث حالة طلب الانضمام ${id} إلى ${decision}.`,
            source: "admin.applications.review",
            category: "applications",
            severity: "warning",
            link: "/dashboard/applications",
            resourceType: "application",
            resourceId: id,
            metadata: {
                application_id: id,
                decision,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    if (decision === "rejected" && app.email) {
        sendApplicationRejectedEmail(app.email, app.full_name || "مقدم الطلب").catch(console.error);
    }

    // عند القبول: ربط profile_id إذا وُجد مستخدم بنفس البريد في Clerk
    if (decision === "accepted" && app.email) {
        try {
            const client = await clerkClient();
            const clerkUsers = await client.users.getUserList({
                emailAddress: [app.email],
                limit: 1,
            });
            const matched = clerkUsers.data?.[0];
            if (matched) {
                const { data: matchedProfile } = await supabase
                    .from("profiles")
                    .select("id")
                    .eq("clerk_id", matched.id)
                    .maybeSingle();
                if (matchedProfile) {
                    await supabase
                        .from("applications")
                        .update({ profile_id: matchedProfile.id })
                        .eq("id", id);
                }
            }
        } catch (linkErr) {
            console.warn("[reviewApplication] Auto-link profile_id failed (non-critical):", linkErr);
        }
    }

    revalidatePath("/dashboard/applications");
    return { success: true };
}

export async function bulkReviewApplications(
    ids: string[],
    decision: "accepted" | "reviewing" | "rejected",
    notes?: string
) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return { success: false, error: "حدد طلبًا واحدًا على الأقل" };
    }

    const { supabase, profile: adminProfile } = await requireAdmin();

    const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("id, email, full_name")
        .in("id", uniqueIds);

    if (appsError) {
        return { success: false, error: appsError.message };
    }

    const { error } = await supabase
        .from("applications")
        .update({
            status: decision,
            reviewer_id: adminProfile.id,
            reviewer_notes: notes || null,
        })
        .in("id", uniqueIds);

    if (error) {
        await reportAdminActionAlert({
            dispatchKey: `admin:bulk_review_failed:${decision}:${uniqueIds.sort().join(",")}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل إجراء جماعي على طلبات الانضمام",
            message: `تعذر تنفيذ الإجراء الجماعي (${decision}) على ${uniqueIds.length} طلبات.`,
            source: "admin.applications.bulk-review",
            category: "applications",
            severity: "warning",
            link: "/dashboard/applications",
            resourceType: "application",
            metadata: {
                ids: uniqueIds,
                decision,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    if (decision === "rejected") {
        await Promise.all(
            (apps || []).map((app) =>
                app.email
                    ? sendApplicationRejectedEmail(app.email, app.full_name || "مقدم الطلب").catch(console.error)
                    : Promise.resolve()
            )
        );
    }

    if (decision === "accepted") {
        await Promise.all(
            (apps || []).map(async (app) => {
                if (!app.email) return;

                try {
                    const client = await clerkClient();
                    const clerkUsers = await client.users.getUserList({
                        emailAddress: [app.email],
                        limit: 1,
                    });
                    const matched = clerkUsers.data?.[0];
                    if (!matched) return;

                    const { data: matchedProfile } = await supabase
                        .from("profiles")
                        .select("id")
                        .eq("clerk_id", matched.id)
                        .maybeSingle();

                    if (matchedProfile) {
                        await supabase
                            .from("applications")
                            .update({ profile_id: matchedProfile.id })
                            .eq("id", app.id);
                    }
                } catch (linkErr) {
                    console.warn("[bulkReviewApplications] Auto-link profile_id failed (non-critical):", linkErr);
                }
            })
        );
    }

    revalidatePath("/dashboard/applications");
    return { success: true, updated: uniqueIds.length };
}

export async function bulkProvisionAcceptedApplications(
    ids: string[],
    options?: {
        roleStrategy?: "smart" | "wushsha" | "subscriber";
        wushshaLevel?: number;
    }
) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return { success: false, error: "حدد طلبًا واحدًا على الأقل" };
    }

    const { supabase } = await requireAdmin();

    const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("*")
        .in("id", uniqueIds);

    if (appsError) {
        return { success: false, error: appsError.message };
    }

    const enrichedApps = await enrichApplicationsWithIdentity(supabase, apps || []);
    const queue = enrichedApps.filter(
        (app) => app.status === "accepted" && (!app.hasProfile || !app.hasClerkAccount)
    );

    if (queue.length === 0) {
        return { success: false, error: "لا توجد طلبات مقبولة تحتاج تجهيز حسابات." };
    }

    const roleStrategy = options?.roleStrategy ?? "smart";
    const wushshaLevel = Math.min(5, Math.max(1, options?.wushshaLevel ?? 1)) as WushshaLevel;

    const credentials: Array<{
        id: string;
        full_name: string;
        email: string | null;
        tempPassword: string;
    }> = [];
    const failures: Array<{
        id: string;
        full_name: string;
        email: string | null;
        error: string;
    }> = [];

    for (const app of queue) {
        const resolvedRole =
            roleStrategy === "wushsha"
                ? "wushsha"
                : roleStrategy === "subscriber"
                  ? "subscriber"
                  : app.join_type === "customer"
                    ? "subscriber"
                    : "wushsha";

        const result = await acceptApplicationAndCreateUser(app.id, {
            role: resolvedRole,
            wushsha_level: resolvedRole === "wushsha" ? wushshaLevel : undefined,
            createInClerk: true,
        });

        if (result.success) {
            if (result.tempPassword) {
                credentials.push({
                    id: app.id,
                    full_name: app.full_name || "مستخدم",
                    email: app.email || null,
                    tempPassword: result.tempPassword,
                });
            }
            continue;
        }

        failures.push({
            id: app.id,
            full_name: app.full_name || "مستخدم",
            email: app.email || null,
            error: result.error || "فشل غير معروف",
        });
    }

    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users-clerk");

    return {
        success: failures.length < queue.length,
        processed: queue.length,
        succeeded: queue.length - failures.length,
        failed: failures.length,
        credentials,
        failures,
    };
}

// ═══════════════════════════════════════════════════════════
//  5. ARTWORKS — إدارة الأعمال الفنية
// ═══════════════════════════════════════════════════════════

export async function getAdminArtworks(page = 1, status = "all") {
    noStore();
    const { supabase } = await requireAdmin();

    const perPage = 15;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
        .from("artworks")
        .select(`
            *,
            artist:profiles(id, display_name, username, avatar_url, is_verified),
            category:categories(name_ar)
        `, { count: "exact" });

    if (status !== "all") {
        query = query.eq("status", status as ArtworkStatus);
    }

    const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Admin artworks error:", error);
        return { data: [], count: 0, totalPages: 0 };
    }

    return {
        data: data || [],
        count: count || 0,
        totalPages: count ? Math.ceil(count / perPage) : 0,
    };
}

export async function updateArtworkStatus(
    id: string,
    newStatus: "published" | "rejected" | "archived"
) {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
        .from("artworks")
        .update({ status: newStatus })
        .eq("id", id);

    if (error) {
        console.error("Update artwork status error:", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:update_artwork_status_failed:${id}:${newStatus}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل تحديث حالة العمل الفني",
            message: `تعذر تحديث حالة العمل الفني ${id} إلى ${newStatus}.`,
            source: "admin.artworks.update_status",
            category: "design",
            severity: "warning",
            link: "/dashboard/artworks",
            resourceType: "artwork",
            resourceId: id,
            metadata: {
                artwork_id: id,
                new_status: newStatus,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/artworks");
    revalidatePath("/");
    return { success: true };
}

/** رفع صورة عمل فني (للأدمن) */
export async function uploadArtworkImageAdmin(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    const { supabase } = await requireAdmin();

    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) return { success: false, error: "لم يتم اختيار ملف" };
    if (file.size > 5 * 1024 * 1024) return { success: false, error: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت" };
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) return { success: false, error: "نوع الملف غير مدعوم (PNG, JPG, WebP, GIF)" };

    const ext = file.name.split(".").pop() || "jpg";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
        .from("artworks")
        .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
        console.error("[uploadArtworkImageAdmin]", error);
        await reportAdminActionAlert({
            dispatchKey: "admin:upload_artwork_image_failed",
            bucketMs: 30 * 60 * 1000,
            title: "فشل رفع صورة عمل فني",
            message: "تعذر رفع صورة عمل فني من لوحة الإدارة إلى التخزين.",
            source: "admin.artworks.upload_image",
            category: "design",
            severity: "warning",
            link: "/dashboard/artworks",
            metadata: {
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage.from("artworks").getPublicUrl(data.path);
    return { success: true, url: publicUrl };
}

/** إنشاء عمل فني (للأدمن) */
export async function createArtworkAdmin(data: {
    artist_id: string;
    title: string;
    description?: string | null;
    category_id?: string | null;
    image_url: string;
    medium?: string | null;
    dimensions?: string | null;
    year?: number | null;
    tags?: string[];
    price?: number | null;
    currency?: string;
    status?: string;
    is_featured?: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
    const { supabase } = await requireAdmin();

    const insert: Record<string, unknown> = {
        artist_id: data.artist_id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        category_id: data.category_id || null,
        image_url: data.image_url,
        medium: data.medium?.trim() || null,
        dimensions: data.dimensions?.trim() || null,
        year: data.year ?? null,
        tags: data.tags || [],
        price: data.price ?? null,
        currency: data.currency || "SAR",
        status: data.status || "published",
        is_featured: data.is_featured ?? false,
    };

    const { error } = await supabase.from("artworks").insert(insert as Database['public']['Tables']['artworks']['Insert']);

    if (error) {
        console.error("[createArtworkAdmin]", error);
        await reportAdminActionAlert({
            dispatchKey: "admin:create_artwork_failed",
            bucketMs: 30 * 60 * 1000,
            title: "فشل إنشاء عمل فني",
            message: `تعذر إنشاء العمل الفني ${insert.title as string}.`,
            source: "admin.artworks.create",
            category: "design",
            severity: "warning",
            link: "/dashboard/artworks",
            metadata: {
                artist_id: insert.artist_id,
                title: insert.title,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/artworks");
    revalidatePath("/");
    return { success: true };
}

/** تحديث عمل فني (للأدمن) */
export async function updateArtworkAdmin(id: string, data: {
    artist_id?: string;
    title?: string;
    description?: string | null;
    category_id?: string | null;
    image_url?: string;
    medium?: string | null;
    dimensions?: string | null;
    year?: number | null;
    tags?: string[];
    price?: number | null;
    currency?: string;
    status?: string;
    is_featured?: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
    const { supabase } = await requireAdmin();

    const update: Record<string, unknown> = {};
    if (data.artist_id !== undefined) update.artist_id = data.artist_id;
    if (data.title !== undefined) update.title = data.title.trim();
    if (data.description !== undefined) update.description = data.description?.trim() || null;
    if (data.category_id !== undefined) update.category_id = data.category_id || null;
    if (data.image_url !== undefined) update.image_url = data.image_url;
    if (data.medium !== undefined) update.medium = data.medium?.trim() || null;
    if (data.dimensions !== undefined) update.dimensions = data.dimensions?.trim() || null;
    if (data.year !== undefined) update.year = data.year ?? null;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.price !== undefined) update.price = data.price ?? null;
    if (data.currency !== undefined) update.currency = data.currency;
    if (data.status !== undefined) update.status = data.status;
    if (data.is_featured !== undefined) update.is_featured = data.is_featured;

    const { error } = await supabase.from("artworks").update(update).eq("id", id);

    if (error) {
        console.error("[updateArtworkAdmin]", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:update_artwork_failed:${id}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل تحديث عمل فني",
            message: `تعذر تحديث العمل الفني ${id} من لوحة الإدارة.`,
            source: "admin.artworks.update",
            category: "design",
            severity: "warning",
            link: "/dashboard/artworks",
            resourceType: "artwork",
            resourceId: id,
            metadata: {
                artwork_id: id,
                fields: Object.keys(update),
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/artworks");
    revalidatePath("/");
    return { success: true };
}

/** حذف عمل فني (للأدمن) */
export async function deleteArtworkAdmin(id: string, imageUrl?: string | null): Promise<{ success: true } | { success: false; error: string }> {
    const { supabase } = await requireAdmin();

    const { error } = await supabase.from("artworks").delete().eq("id", id);

    if (error) {
        console.error("[deleteArtworkAdmin]", error);
        await reportAdminActionAlert({
            dispatchKey: `admin:delete_artwork_failed:${id}`,
            bucketMs: 30 * 60 * 1000,
            title: "فشل حذف عمل فني",
            message: `تعذر حذف العمل الفني ${id} من لوحة الإدارة.`,
            source: "admin.artworks.delete",
            category: "design",
            severity: "warning",
            link: "/dashboard/artworks",
            resourceType: "artwork",
            resourceId: id,
            metadata: {
                artwork_id: id,
                error: error.message,
            },
        });
        return { success: false, error: error.message };
    }

    if (imageUrl && imageUrl.includes("/artworks/")) {
        const path = imageUrl.split("/artworks/").pop();
        if (path) await supabase.storage.from("artworks").remove([path]);
    }

    revalidatePath("/dashboard/artworks");
    revalidatePath("/");
    return { success: true };
}

// ─── Role Change Audit Log ───────────────────────────────────

export type AuditLogEntry = {
    id: string;
    changed_at: string;
    old_role: string | null;
    new_role: string;
    context: string;
    metadata: Record<string, unknown> | null;
    target: {
        id: string;
        display_name: string;
        username: string;
        email: string | null;
    } | null;
    changed_by: {
        id: string;
        display_name: string;
        username: string;
    } | null;
};

export async function getAuditLog(params: {
    page?: number;
    context?: string;
    search?: string;
} = {}): Promise<{ entries: AuditLogEntry[]; total: number; totalPages: number }> {
    noStore();
    const { supabase } = await requireAdmin();

    const PAGE_SIZE = 30;
    const page = Math.max(1, params.page ?? 1);
    const from = (page - 1) * PAGE_SIZE;

    let query = supabase
        .from("role_change_audit_log")
        .select(
            `id, changed_at, old_role, new_role, context, metadata,
            target:profiles!role_change_audit_log_profile_id_fkey(id, display_name, username, email),
            changed_by:profiles!role_change_audit_log_changed_by_id_fkey(id, display_name, username)`,
            { count: "exact" }
        )
        .order("changed_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

    if (params.context && params.context !== "all") {
        query = query.eq("context", params.context as import("@/types/database").RoleAuditContext);
    }

    const { data, count, error } = await query;

    if (error) {
        console.error("[getAuditLog]", error);
        return { entries: [], total: 0, totalPages: 0 };
    }

    const entries: AuditLogEntry[] = (data ?? []).map((row: any) => ({
        id: row.id,
        changed_at: row.changed_at,
        old_role: row.old_role,
        new_role: row.new_role,
        context: row.context,
        metadata: row.metadata ?? null,
        target: Array.isArray(row.target) ? (row.target[0] ?? null) : (row.target ?? null),
        changed_by: Array.isArray(row.changed_by) ? (row.changed_by[0] ?? null) : (row.changed_by ?? null),
    }));

    const filtered = params.search?.trim()
        ? entries.filter((e) => {
              const q = params.search!.toLowerCase();
              return (
                  e.target?.display_name?.toLowerCase().includes(q) ||
                  e.target?.username?.toLowerCase().includes(q) ||
                  e.target?.email?.toLowerCase().includes(q) ||
                  e.changed_by?.display_name?.toLowerCase().includes(q) ||
                  e.new_role.includes(q) ||
                  (e.old_role ?? "").includes(q)
              );
          })
        : entries;

    const total = params.search?.trim() ? filtered.length : (count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return { entries: filtered, total, totalPages };
}
