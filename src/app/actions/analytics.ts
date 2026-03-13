// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Analytics Actions
//  Server Actions الخاصة بلوحة تحكم المبيعات الإحصائية
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { Database } from "@/types/database";

// نحتاج حساب المسؤول فقط للاطلاع على هذه البيانات
function getAdminSb() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

// دالة مساعدة للتحقق من صلاحية الإدارة
async function verifyAdmin() {
    const user = await currentUser();
    if (!user) return false;

    const supabase = getAdminSb();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_id", user.id)
        .single();

    return profile?.role === "admin";
}

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

export async function getDashboardMetrics(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    averageOrderValue: number;
    thisMonthRevenue: number;
    revenueGrowth: number;
    error?: string;
}> {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح لك بعرض هذه البيانات", totalRevenue: 0, totalOrders: 0, totalUsers: 0, averageOrderValue: 0, thisMonthRevenue: 0, revenueGrowth: 0 };

    try {
        const supabase = getAdminSb();

        // 1. Fetch valid orders
        const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select("total, created_at")
            .not("status", "eq", "cancelled")
            .not("status", "eq", "refunded");

        if (ordersError) throw ordersError;

        // 2. Fetch users count
        const { count: usersCount } = await supabase
            .from("profiles")
            .select("*", { count: 'exact', head: true });

        const validOrders = orders || [];
        const totalOrders = validOrders.length;
        const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Real month-over-month growth calculation
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const thisMonthOrders = validOrders.filter(o => new Date(o.created_at) >= thisMonthStart);
        const lastMonthOrders = validOrders.filter(o => {
            const d = new Date(o.created_at);
            return d >= lastMonthStart && d < thisMonthStart;
        });

        const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + Number(o.total), 0);
        const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + Number(o.total), 0);

        const revenueGrowth = lastMonthRevenue > 0
            ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : thisMonthRevenue > 0 ? 100 : 0;

        return {
            totalRevenue,
            totalOrders,
            totalUsers: usersCount || 0,
            averageOrderValue,
            thisMonthRevenue,
            revenueGrowth
        };
    } catch (err: unknown) {
        console.error("[getDashboardMetrics]", err);
        return { error: "فشل في جلب بيانات الإحصائيات", totalRevenue: 0, totalOrders: 0, totalUsers: 0, averageOrderValue: 0, thisMonthRevenue: 0, revenueGrowth: 0 };
    }
}

/**
 * Fetches revenue grouped by month for the given year
 */
export async function getRevenueByMonth(year: number) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return [];

    try {
        const arabicMonths = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];
        
        const monthlyData = arabicMonths.map(m => ({ date: m, revenue: 0, orders: 0 }));

        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();

        const supabase = getAdminSb();
        const { data: orders, error } = await supabase
            .from("orders")
            .select("total, created_at")
            .not("status", "eq", "cancelled")
            .not("status", "eq", "refunded")
            .gte("created_at", startDate)
            .lte("created_at", endDate);

        if (error) throw error;

        orders.forEach(order => {
            const date = new Date(order.created_at);
            const monthIndex = date.getMonth(); 
            
            monthlyData[monthIndex].revenue += Number(order.total) || 0;
            monthlyData[monthIndex].orders += 1;
        });

        return monthlyData;
    } catch (error) {
        console.error("Error fetching monthly revenue:", error);
        return [];
    }
}

/**
 * Fetches top selling products by aggregating order_items
 */
export async function getTopSellingProducts(limit: number = 5) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح لك بعرض هذه البيانات" };

    try {
        const supabase = getAdminSb();

        // Fetch order items to aggregate top sellers
        const { data: orderItems, error } = await supabase
            .from("order_items")
            .select(`
                quantity,
                total_price,
                product_id,
                orders!inner ( status ),
                products ( id, title, image_url )
            `)
            .not("orders.status", "eq", "cancelled")
            .not("orders.status", "eq", "refunded")
            .not("product_id", "is", null);

        if (error) throw error;

        // Aggregate by product_id
        const productMap = new Map<string, any>();

        (orderItems || []).forEach((item: any) => {
            if (!item.products) return;

            const pid = item.product_id;
            if (!productMap.has(pid)) {
                productMap.set(pid, {
                    id: item.products.id,
                    title: item.products.title,
                    image_url: item.products.image_url,
                    total_sold: 0,
                    revenue: 0
                });
            }

            const p = productMap.get(pid)!;
            p.total_sold += Number(item.quantity) || 0;
            p.revenue += Number(item.total_price) || 0;
        });

        // Convert to array, sort by total_sold descending
        const sortedArray = Array.from(productMap.values())
            .sort((a, b) => b.total_sold - a.total_sold)
            .slice(0, limit);

        return { data: sortedArray };
    } catch (error) {
        console.error("Error fetching top selling products:", error);
        return { error: "فشل في جلب قائمة المنتجات الأكثر مبيعاً" };
    }
}

/**
 * Fetches items that are critically low on stock
 */
export async function getLowStockAlerts(threshold: number = 5) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح لك بعرض هذه البيانات" };

    try {
        const supabase = getAdminSb();

        const { data, error } = await supabase
            .from("inventory_levels")
            .select(`
                id,
                quantity,
                warehouse:warehouses(name),
                sku:skus!inner (
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

        const alerts = (data || []).map((inv: any) => ({
            id: inv.sku.id,
            sku: inv.sku.sku,
            size: inv.sku.size,
            quantity: inv.quantity,
            product: {
                id: inv.sku.product.id,
                title: inv.sku.product.title,
                image_url: inv.sku.product.image_url
            },
            warehouse: {
                name: inv.warehouse?.name || 'مستودع غير معروف'
            }
        }));

        return { data: alerts };
    } catch (error) {
        console.error("Error fetching low stock alerts:", error);
        return { error: "فشل في جلب السلع منخفضة المخزون" };
    }
}
