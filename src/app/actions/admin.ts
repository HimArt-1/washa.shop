// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Admin Actions
//  Server Actions لإدارة المنصة بالكامل
//  يستخدم Service Role Key لتجاوز RLS
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { sendApplicationAcceptedEmail, sendApplicationRejectedEmail } from "@/lib/email";

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

// ─── Admin Supabase Client ──────────────────────────────────

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error(
            "[Admin] Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them in Vercel → Project → Settings → Environment Variables."
        );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn("[Admin] SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key. Add it to Vercel env vars for full admin access.");
    }
    return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Auth Guard ─────────────────────────────────────────────

async function requireAdmin() {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden: Admin access required");
    }

    return { user, profile, supabase };
}

// ═══════════════════════════════════════════════════════════
//  1. OVERVIEW — إحصائيات النظرة العامة
// ═══════════════════════════════════════════════════════════

export async function getAdminOverview() {
    noStore(); // Opt out of static caching

    try {
        const { supabase } = await requireAdmin();

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
            } else if (res.value.error) {
                console.error(`Query index ${idx} returned DB error:`, res.value.error);
            }
        });

        // ─── Calculate Revenue ───
        const revenueData = getData(results[4]) as any[];
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

            thisMonthRevenue = ((thisMonthResult.data as any[]) || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
            const lastMonthRevenue = ((lastMonthResult.data as any[]) || []).reduce((s, o) => s + (Number(o.total) || 0), 0);

            revenueGrowth = lastMonthRevenue > 0
                ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
                : thisMonthRevenue > 0 ? "100" : "0";
        } catch (e) {
            console.error("Revenue calculation error:", e);
        }

        return {
            stats: {
                totalUsers: getCount(results[0]),
                totalArtists: getCount(results[1]),
                totalBuyers: getCount(results[2]),
                totalOrders: getCount(results[3]),
                totalRevenue,
                thisMonthRevenue,
                revenueGrowth: Number(revenueGrowth),
                totalArtworks: getCount(results[5]),
                totalProducts: getCount(results[6]),
                pendingApplications: getCount(results[7]),
                totalSubscribers: getCount(results[8]),
            },
            recentOrders: getData(results[9]),
            pendingApplications: getData(results[10]),
        };

    } catch (err) {
        console.error("FATAL: getAdminOverview crashed completely:", err);
        // Return explicit empty/zero state instead of throwing 500
        return {
            stats: {
                totalUsers: 0, totalArtists: 0, totalBuyers: 0, totalOrders: 0,
                totalRevenue: 0, thisMonthRevenue: 0, revenueGrowth: 0,
                totalArtworks: 0, totalProducts: 0, pendingApplications: 0, totalSubscribers: 0,
            },
            recentOrders: [],
            pendingApplications: [],
        };
    }
}

// ═══════════════════════════════════════════════════════════
//  1b. ANALYTICS — لوحة التحليلات
// ═══════════════════════════════════════════════════════════

export type AnalyticsPeriod = "7d" | "30d" | "90d";

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
}

export async function getAdminAnalytics(period: AnalyticsPeriod = "30d"): Promise<AnalyticsData> {
    noStore();
    try {
        const { supabase } = await requireAdmin();

        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startIso = startDate.toISOString();

        // 1. Orders (paid) with created_at for revenue/orders by day
        const { data: ordersData } = await supabase
            .from("orders")
            .select("id, total, created_at")
            .gte("created_at", startIso)
            .in("payment_status", ["paid"]);

        const orders = (ordersData as { id: string; total: number; created_at: string }[]) || [];
        const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);

        // Group by date
        const revenueByDayMap = new Map<string, { revenue: number; orders: number }>();
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            revenueByDayMap.set(key, { revenue: 0, orders: 0 });
        }
        for (const o of orders) {
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
        const orderIds = orders.map((o) => o.id);
        let topProducts: { productId: string; title: string; quantity: number; revenue: number }[] = [];

        if (orderIds.length > 0) {
            const { data: itemsData } = await supabase
                .from("order_items")
                .select("product_id, quantity, total_price, product:products(title)")
                .in("order_id", orderIds);

            const items = (itemsData as any[]) || [];
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
        const { data: profilesData } = await supabase
            .from("profiles")
            .select("created_at")
            .gte("created_at", startIso);

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
                supabase.from("orders").select("id, total").gte("created_at", prevStartIso).lt("created_at", startIso).in("payment_status", ["paid"]),
                supabase.from("profiles").select("id").gte("created_at", prevStartIso).lt("created_at", startIso),
            ]);
            const prevOrdersList = (prevOrders as { total: number }[]) || [];
            const prevRev = prevOrdersList.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const prevUsers = (prevProfiles as unknown[])?.length ?? 0;
            previousPeriod = {
                totalRevenue: prevRev,
                totalOrders: prevOrdersList.length,
                totalUsers: prevUsers,
                revenueGrowth: prevRev > 0 ? ((totalRevenue - prevRev) / prevRev) * 100 : (totalRevenue > 0 ? 100 : 0),
                ordersGrowth: prevOrdersList.length > 0 ? ((orders.length - prevOrdersList.length) / prevOrdersList.length) * 100 : (orders.length > 0 ? 100 : 0),
                usersGrowth: prevUsers > 0 ? ((profiles.length - prevUsers) / prevUsers) * 100 : (profiles.length > 0 ? 100 : 0),
            };
        } catch {
            previousPeriod = undefined;
        }

        return {
            revenueByDay,
            topProducts,
            usersByDay,
            summary: {
                totalRevenue,
                totalOrders: orders.length,
                totalUsers: profiles.length,
                avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            },
            previousPeriod,
        };
    } catch (err) {
        console.error("getAdminAnalytics error:", err);
        return {
            revenueByDay: [],
            topProducts: [],
            usersByDay: [],
            summary: { totalRevenue: 0, totalOrders: 0, totalUsers: 0, avgOrderValue: 0 },
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
        const allProducts = (data || []) as any[];
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
    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/products");
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

        const orderIds = (orders || []).map((o: any) => o.id);
        let items: any[] = [];
        if (orderIds.length > 0) {
            const { data: orderItems } = await supabase
                .from("order_items")
                .select("product_id, quantity, total_price, custom_title, product:products(title)")
                .in("order_id", orderIds);
            items = orderItems || [];
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

        const totalRevenue = (orders || []).reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
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
        .select("*", { count: "exact" });

    if (role !== "all") {
        query = query.eq("role", role);
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

    return {
        data: (data as any[]) || [],
        count: count || 0,
        totalPages: count ? Math.ceil(count / perPage) : 0,
    };
}

export async function updateUserRole(userId: string, newRole: string) {
    const { supabase } = await requireAdmin();

    const role = (newRole || "").trim();
    if (!role || role.length > 50) {
        return { success: false, error: "الدور يجب أن يكون بين 1 و 50 حرفاً" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

    if (error) {
        console.error("Update role error:", error);
        return { success: false, error: error.message };
    }

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
        .update({ wushsha_level: lvl })
        .eq("id", userId);

    if (error) {
        console.error("Update wushsha level error:", error);
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
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true };
}

export async function createUser(data: {
    clerk_id: string;
    display_name: string;
    username: string;
    role: string;
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

    if (role === "wushsha" && data.wushsha_level) {
        const lvl = Math.min(5, Math.max(1, Math.floor(data.wushsha_level)));
        insertData.wushsha_level = lvl;
    }

    const { data: created, error } = await supabase
        .from("profiles")
        .insert(insertData)
        .select("id")
        .single();

    if (error) {
        if (error.code === "23505") {
            return { success: false, error: "اسم المستخدم أو clerk_id مستخدم مسبقاً" };
        }
        console.error("Create user error:", error);
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
        role?: string;
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

    const appData = app as any;
    if (!appData) return { success: false, error: "الطلب غير موجود" };
    if (!["pending", "reviewing", "accepted"].includes(appData.status)) {
        return { success: false, error: "لا يمكن معالجة هذا الطلب" };
    }

    const role = options.role ?? "wushsha";
    const username = `${appData.full_name.replace(/\s+/g, "_").slice(0, 20)}_${Date.now().toString(36)}`.toLowerCase();
    let clerkId = options.clerk_id?.trim();
    let tempPassword: string | undefined;
    const appClerkId = `app_${applicationId}`;

    // ─── حالة: يوجد ملف بـ app_xxx (بدون Clerk) — إنشاء Clerk وتحديث الملف فقط ───
    const { data: existingAppProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", appClerkId)
        .maybeSingle();

    if (existingAppProfile && options.createInClerk && appData.email) {
        const email = String(appData.email).trim();
        if (!email) return { success: false, error: "البريد الإلكتروني مطلوب" };
        tempPassword = generateTempPassword();
        const nameParts = (appData.full_name || "").trim().split(/\s+/);
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
            const { error: updateErr } = await supabase
                .from("profiles")
                .update({ clerk_id: clerkUser.id })
                .eq("id", existingAppProfile.id);
            if (updateErr) {
                console.error("[acceptApplication] Update profile clerk_id:", updateErr);
                return { success: false, error: updateErr.message };
            }
            await supabase.from("applications").update({ profile_id: existingAppProfile.id }).eq("id", applicationId);
            revalidatePath("/dashboard/applications");
            revalidatePath("/dashboard/users");
            sendApplicationAcceptedEmail(appData.email, appData.full_name || "فنان", tempPassword).catch(console.error);
            return { success: true, userId: existingAppProfile.id, tempPassword };
        } catch (err: any) {
            console.error("[acceptApplication] Clerk createUser error:", err);
            if (err?.errors?.[0]?.code === "form_identifier_exists") {
                return { success: false, error: "البريد مسجّل مسبقاً في Clerk." };
            }
            return { success: false, error: err?.message || "فشل إنشاء المستخدم في Clerk" };
        }
    }

    // ─── إنشاء المستخدم في Clerk (عند إنشاء ملف جديد) ───
    if (options.createInClerk && appData.email) {
        const email = String(appData.email).trim();
        if (!email) return { success: false, error: "البريد الإلكتروني مطلوب لإنشاء حساب Clerk" };
        tempPassword = generateTempPassword();
        const nameParts = (appData.full_name || "").trim().split(/\s+/);
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
        } catch (err: any) {
            console.error("[acceptApplication] Clerk createUser error:", err);
            if (err?.errors?.[0]?.code === "form_identifier_exists") {
                return { success: false, error: "البريد الإلكتروني مسجّل مسبقاً في Clerk." };
            }
            return { success: false, error: err?.message || "فشل إنشاء المستخدم في Clerk" };
        }
    } else {
        clerkId = clerkId || appClerkId;
    }

    const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", clerkId)
        .maybeSingle();

    if (existing) {
        return { success: false, error: "يوجد مستخدم بنفس clerk_id مسبقاً" };
    }

    const insertData: Record<string, unknown> = {
        clerk_id: clerkId,
        display_name: appData.full_name,
        username,
        role,
        bio: appData.motivation?.slice(0, 500) || null,
    };

    if (role === "wushsha") {
        insertData.wushsha_level = Math.min(5, Math.max(1, options.wushsha_level ?? 1));
    }

    const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert(insertData)
        .select("id")
        .single();

    if (insertError) {
        console.error("Create user from application:", insertError);
        return { success: false, error: insertError.message };
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
    if (appData.email) {
        sendApplicationAcceptedEmail(appData.email, appData.full_name || "فنان", tempPassword).catch(console.error);
    }
    return { success: true, userId: newProfile?.id, tempPassword };
}

// ═══════════════════════════════════════════════════════════
//  3. ORDERS — إدارة الطلبات
// ═══════════════════════════════════════════════════════════

export async function getAdminOrders(page = 1, status = "all") {
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
            )
        `;

        let query = supabase
            .from("orders")
            .select(selectQuery, { count: "exact" });

        if (status !== "all") {
            query = query.eq("status", status);
        }

        const { data, count, error } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Admin orders error:", error);
            return { data: [], count: 0, totalPages: 0 };
        }

        return {
            data: (data as any[]) || [],
            count: count || 0,
            totalPages: count ? Math.ceil(count / perPage) : 0,
        };
    } catch (err) {
        console.error("getAdminOrders failed:", err);
        return { data: [], count: 0, totalPages: 0 };
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
        .select("status")
        .eq("id", orderId)
        .single();

    const updateData: any = { status: newStatus };

    if (newStatus === "confirmed") updateData.payment_status = "paid";
    if (newStatus === "cancelled") updateData.payment_status = "refunded";
    if (newStatus === "refunded") updateData.payment_status = "refunded";

    const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

    if (error) {
        console.error("Update order status error:", error);
        return { success: false, error: error.message };
    }

    const hadStockDeducted = ["confirmed", "processing", "shipped"].includes(currentOrder?.status || "");
    if ((newStatus === "cancelled" || newStatus === "refunded") && hadStockDeducted) {
        const { restoreStockForOrder } = await import("@/lib/inventory");
        await restoreStockForOrder(orderId);
    }

    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/inventory");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  4. APPLICATIONS — طلبات الانضمام
// ═══════════════════════════════════════════════════════════

export async function getAdminApplications(status = "all") {
    noStore();
    const { supabase } = await requireAdmin();

    let query = supabase
        .from("applications")
        .select("*", { count: "exact" });

    if (status !== "all") {
        query = query.eq("status", status);
    }

    const { data, count, error } = await query
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Admin applications error:", error);
        return { data: [], count: 0 };
    }

    const apps = (data as any[]) || [];
    // للطلبات المقبولة: التحقق من وجود ملف وحساب Clerk
    const enriched = await Promise.all(
        apps.map(async (app) => {
            if (app.status !== "accepted") return { ...app, profile: null, hasProfile: false, hasClerkAccount: false };
            // محاولة عبر profile_id أولاً، ثم عبر clerk_id = app_xxx (للترحيل)
            let profile: { id: string; clerk_id: string } | null = null;
            if (app.profile_id) {
                const { data: p } = await supabase.from("profiles").select("id, clerk_id").eq("id", app.profile_id).maybeSingle();
                profile = p as any;
            }
            if (!profile) {
                const { data: p } = await supabase.from("profiles").select("id, clerk_id").eq("clerk_id", `app_${app.id}`).maybeSingle();
                profile = p as any;
            }
            const hasProfile = !!profile;
            const hasClerkAccount = hasProfile && !String(profile!.clerk_id).startsWith("app_");
            return { ...app, profile, hasProfile, hasClerkAccount };
        })
    );

    return { data: enriched, count: count || 0 };
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

    const appData = app as any;
    if (!appData) return { success: false, error: "Application not found" };

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
        return { success: false, error: error.message };
    }

    if (decision === "rejected" && appData.email) {
        sendApplicationRejectedEmail(appData.email, appData.full_name || "مقدم الطلب").catch(console.error);
    }

    // عند القبول: ربط profile_id إذا وُجد مستخدم بنفس البريد في Clerk
    if (decision === "accepted" && appData.email) {
        try {
            const client = await clerkClient();
            const clerkUsers = await client.users.getUserList({
                emailAddress: [appData.email],
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
        query = query.eq("status", status);
    }

    const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Admin artworks error:", error);
        return { data: [], count: 0, totalPages: 0 };
    }

    return {
        data: (data as any[]) || [],
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

    const { error } = await supabase.from("artworks").insert(insert);

    if (error) {
        console.error("[createArtworkAdmin]", error);
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
