// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Analytics Actions
//  Server Actions الخاصة بلوحة تحكم المبيعات الإحصائية
// ═══════════════════════════════════════════════════════════

"use server";

import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase";

type AnalyticsSupabase = ReturnType<typeof getSupabaseAdminClient>;
type AnalyticsOrderRow = {
    total: number | string | null;
    created_at: string;
    payment_status?: string | null;
};

export interface TopProduct {
    id: string;
    title: string;
    image_url: string;
    total_sold: number;
    revenue: number;
}

export interface LowStockItem {
    id: string; // SKU ID
    sku: string;
    size: string;
    quantity: number;
    product: {
        id: string;
        title: string;
        image_url: string;
    };
    warehouse: {
        name: string;
    };
}

async function resolveAnalyticsAdminSupabase(): Promise<AnalyticsSupabase | null> {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return null;

    const access = await resolveAdminAccess(user);
    if (!access.isAdmin) return null;

    return access.supabase;
}

function buildZeroDashboardMetrics(error?: string) {
    return {
        totalRevenue: 0,
        totalOrders: 0,
        totalUsers: 0,
        averageOrderValue: 0,
        thisMonthRevenue: 0,
        revenueGrowth: 0,
        error,
    };
}

function buildMonthlyRevenueSeries(
    orders: AnalyticsOrderRow[],
    year: number
): Array<{ date: string; revenue: number; orders: number }> {
    const arabicMonths = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
    ];

    const monthlyData = arabicMonths.map((month) => ({ date: month, revenue: 0, orders: 0 }));

    orders
        .filter((order) => {
            const createdAt = new Date(order.created_at);
            return createdAt.getFullYear() === year && order.payment_status === "paid";
        })
        .forEach((order) => {
            const monthIndex = new Date(order.created_at).getMonth();
            monthlyData[monthIndex].revenue += Number(order.total) || 0;
            monthlyData[monthIndex].orders += 1;
        });

    return monthlyData;
}

function buildDashboardMetricsFromOrders(
    orders: AnalyticsOrderRow[],
    usersCount: number
): {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    averageOrderValue: number;
    thisMonthRevenue: number;
    revenueGrowth: number;
    error?: string;
} {
    const paidOrders = orders.filter((order) => order.payment_status === "paid");
    const totalOrders = paidOrders.length;
    const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthOrders = paidOrders.filter((order) => new Date(order.created_at) >= thisMonthStart);
    const lastMonthOrders = paidOrders.filter((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= lastMonthStart && createdAt < thisMonthStart;
    });

    const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + Number(order.total), 0);

    return {
        totalRevenue,
        totalOrders,
        totalUsers: usersCount || 0,
        averageOrderValue,
        thisMonthRevenue,
        revenueGrowth: lastMonthRevenue > 0
            ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : thisMonthRevenue > 0 ? 100 : 0,
    };
}

async function fetchDashboardOrders(supabase: AnalyticsSupabase) {
    return supabase
        .from("orders")
        .select("total, created_at, payment_status")
        .not("status", "eq", "cancelled")
        .not("status", "eq", "refunded");
}

async function fetchUsersCount(supabase: AnalyticsSupabase) {
    return supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
}

async function fetchTopSellingProductsWithClient(supabase: AnalyticsSupabase, limit: number) {
    const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(`
            quantity,
            total_price,
            product_id,
            orders!inner ( status, payment_status ),
            products ( id, title, image_url )
        `)
        .not("orders.status", "eq", "cancelled")
        .not("orders.status", "eq", "refunded")
        .eq("orders.payment_status", "paid")
        .not("product_id", "is", null);

    if (error) throw error;

    const productMap = new Map<string, TopProduct>();

    (orderItems || []).forEach((item: any) => {
        if (!item.products) return;

        const pid = item.product_id;
        if (!productMap.has(pid)) {
            productMap.set(pid, {
                id: item.products.id,
                title: item.products.title,
                image_url: item.products.image_url,
                total_sold: 0,
                revenue: 0,
            });
        }

        const product = productMap.get(pid)!;
        product.total_sold += Number(item.quantity) || 0;
        product.revenue += Number(item.total_price) || 0;
    });

    return Array.from(productMap.values())
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, limit);
}

async function fetchLowStockAlertsWithClient(supabase: AnalyticsSupabase, threshold: number) {
    const { data, error } = await supabase
        .from("inventory_levels")
        .select(`
            id,
            quantity,
            warehouse:warehouses(name),
            sku:product_skus!inner (
                id,
                sku,
                size,
                product:products ( id, title, image_url )
            )
        `)
        .lte("quantity", threshold)
        .order("quantity", { ascending: true })
        .limit(10);

    if (error) throw error;

    return (data || []).map((inv: any) => ({
        id: inv.sku.id,
        sku: inv.sku.sku,
        size: inv.sku.size,
        quantity: inv.quantity,
        product: {
            id: inv.sku.product.id,
            title: inv.sku.product.title,
            image_url: inv.sku.product.image_url,
        },
        warehouse: {
            name: inv.warehouse?.name || "مستودع غير معروف",
        },
    }));
}

export async function getDashboardMetrics(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    averageOrderValue: number;
    thisMonthRevenue: number;
    revenueGrowth: number;
    error?: string;
}> {
    const supabase = await resolveAnalyticsAdminSupabase();
    if (!supabase) {
        return buildZeroDashboardMetrics("غير مصرح لك بعرض هذه البيانات");
    }

    try {
        const [{ data: orders, error: ordersError }, { count: usersCount, error: usersError }] = await Promise.all([
            fetchDashboardOrders(supabase),
            fetchUsersCount(supabase),
        ]);

        if (ordersError) throw ordersError;
        if (usersError) throw usersError;

        return buildDashboardMetricsFromOrders(orders || [], usersCount || 0);
    } catch (err: unknown) {
        console.error("[getDashboardMetrics]", err);
        return buildZeroDashboardMetrics("فشل في جلب بيانات الإحصائيات");
    }
}

/**
 * Fetches revenue grouped by month for the given year
 */
export async function getRevenueByMonth(year: number): Promise<{
    data: Array<{ date: string; revenue: number; orders: number }>;
    error?: string;
}> {
    const supabase = await resolveAnalyticsAdminSupabase();
    if (!supabase) {
        return {
            data: [],
            error: "غير مصرح لك بعرض منحنى الإيراد الشهري",
        };
    }

    try {
        const { data: orders, error } = await fetchDashboardOrders(supabase);

        if (error) throw error;

        return { data: buildMonthlyRevenueSeries(orders || [], year) };
    } catch (error) {
        console.error("Error fetching monthly revenue:", error);
        return {
            data: [],
            error: "تعذر تحميل منحنى الإيراد الشهري.",
        };
    }
}

/**
 * Fetches top selling products by aggregating order_items
 */
export async function getTopSellingProducts(limit: number = 5) {
    const supabase = await resolveAnalyticsAdminSupabase();
    if (!supabase) return { data: [], error: "غير مصرح لك بعرض هذه البيانات" };

    try {
        return { data: await fetchTopSellingProductsWithClient(supabase, limit) };
    } catch (error) {
        console.error("Error fetching top selling products:", error);
        return { data: [], error: "فشل في جلب قائمة المنتجات الأكثر مبيعاً" };
    }
}

/**
 * Fetches items that are critically low on stock
 */
export async function getLowStockAlerts(threshold: number = 5) {
    const supabase = await resolveAnalyticsAdminSupabase();
    if (!supabase) return { data: [], error: "غير مصرح لك بعرض هذه البيانات" };

    try {
        return { data: await fetchLowStockAlertsWithClient(supabase, threshold) };
    } catch (error) {
        console.error("Error fetching low stock alerts:", error);
        return { data: [], error: "فشل في جلب السلع منخفضة المخزون" };
    }
}

export async function getDashboardAnalyticsBundle(
    year: number,
    options: { topProductsLimit?: number; lowStockThreshold?: number } = {}
) {
    const supabase = await resolveAnalyticsAdminSupabase();
    if (!supabase) {
        return {
            metrics: buildZeroDashboardMetrics("غير مصرح لك بعرض بيانات الداشبورد التحليلية"),
            monthlyRevenue: {
                data: [],
                error: "غير مصرح لك بعرض منحنى الإيراد الشهري",
            },
            topProducts: {
                data: [],
                error: "غير مصرح لك بعرض المنتجات الأكثر مبيعاً",
            },
            lowStock: {
                data: [],
                error: "غير مصرح لك بعرض تنبيهات المخزون",
            },
        };
    }

    const topProductsLimit = options.topProductsLimit ?? 5;
    const lowStockThreshold = options.lowStockThreshold ?? 5;

    const [ordersResult, usersResult, topProductsResult, lowStockResult] = await Promise.allSettled([
        fetchDashboardOrders(supabase),
        fetchUsersCount(supabase),
        fetchTopSellingProductsWithClient(supabase, topProductsLimit),
        fetchLowStockAlertsWithClient(supabase, lowStockThreshold),
    ]);

    const metrics =
        ordersResult.status === "fulfilled" && !ordersResult.value.error &&
        usersResult.status === "fulfilled" && !usersResult.value.error
            ? buildDashboardMetricsFromOrders(
                ordersResult.value.data || [],
                usersResult.value.count || 0
            )
            : buildZeroDashboardMetrics("تعذر تحميل مقاييس الداشبورد التحليلية.");

    const monthlyRevenue =
        ordersResult.status === "fulfilled" && !ordersResult.value.error
            ? {
                data: buildMonthlyRevenueSeries(ordersResult.value.data || [], year),
            }
            : {
                data: [],
                error: "تعذر تحميل منحنى الإيراد الشهري.",
            };

    const topProducts =
        topProductsResult.status === "fulfilled"
            ? { data: topProductsResult.value }
            : {
                data: [],
                error: "فشل في جلب قائمة المنتجات الأكثر مبيعاً",
            };

    const lowStock =
        lowStockResult.status === "fulfilled"
            ? { data: lowStockResult.value }
            : {
                data: [],
                error: "فشل في جلب السلع منخفضة المخزون",
            };

    return {
        metrics,
        monthlyRevenue,
        topProducts,
        lowStock,
    };
}
