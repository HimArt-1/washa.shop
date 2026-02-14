// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Admin Actions
//  Server Actions لإدارة المنصة بالكامل
//  يستخدم Service Role Key لتجاوز RLS
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";

// ─── Admin Supabase Client ──────────────────────────────────

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
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
    noStore();
    const { supabase } = await requireAdmin();

    // Run all queries in parallel for performance
    const [
        usersResult,
        artistsResult,
        buyersResult,
        ordersResult,
        revenueResult,
        artworksResult,
        productsResult,
        pendingAppsResult,
        subscribersResult,
        recentOrdersResult,
        pendingAppsListResult,
    ] = await Promise.all([
        // Total users
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        // Total artists
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "artist"),
        // Total buyers
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
        // Total orders
        supabase.from("orders").select("id", { count: "exact", head: true }),
        // Total revenue
        supabase.from("orders").select("total").in("payment_status", ["paid"]),
        // Total artworks
        supabase.from("artworks").select("id", { count: "exact", head: true }),
        // Total products
        supabase.from("products").select("id", { count: "exact", head: true }),
        // Pending applications
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        // Newsletter subscribers
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
        // Recent 5 orders
        supabase.from("orders")
            .select("id, order_number, total, status, payment_status, created_at, buyer:profiles(display_name)")
            .order("created_at", { ascending: false })
            .limit(5),
        // Pending applications list (latest 5)
        supabase.from("applications")
            .select("id, full_name, email, art_style, created_at")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    // Calculate total revenue
    const revenueData = revenueResult.data as any[] || [];
    const totalRevenue = revenueData.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Month-over-month revenue comparison
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const [thisMonthResult, lastMonthResult] = await Promise.all([
        supabase.from("orders").select("total")
            .gte("created_at", thisMonthStart)
            .in("payment_status", ["paid"]),
        supabase.from("orders").select("total")
            .gte("created_at", lastMonthStart)
            .lt("created_at", thisMonthStart)
            .in("payment_status", ["paid"]),
    ]);

    const thisMonthRevenue = ((thisMonthResult.data as any[]) || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
    const lastMonthRevenue = ((lastMonthResult.data as any[]) || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
    const revenueGrowth = lastMonthRevenue > 0
        ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : thisMonthRevenue > 0 ? "100" : "0";

    return {
        stats: {
            totalUsers: usersResult.count || 0,
            totalArtists: artistsResult.count || 0,
            totalBuyers: buyersResult.count || 0,
            totalOrders: ordersResult.count || 0,
            totalRevenue,
            thisMonthRevenue,
            revenueGrowth: Number(revenueGrowth),
            totalArtworks: artworksResult.count || 0,
            totalProducts: productsResult.count || 0,
            pendingApplications: pendingAppsResult.count || 0,
            totalSubscribers: subscribersResult.count || 0,
        },
        recentOrders: (recentOrdersResult.data as any[]) || [],
        pendingApplications: (pendingAppsListResult.data as any[]) || [],
    };
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

    const validRoles = ["admin", "artist", "buyer", "guest"];
    if (!validRoles.includes(newRole)) {
        return { success: false, error: "Invalid role" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

    if (error) {
        console.error("Update role error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/users");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  3. ORDERS — إدارة الطلبات
// ═══════════════════════════════════════════════════════════

export async function getAdminOrders(page = 1, status = "all") {
    noStore();
    const { supabase } = await requireAdmin();

    const perPage = 15;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
        .from("orders")
        .select(`
            *,
            buyer:profiles(id, display_name, username, avatar_url),
            order_items(id, product_id, quantity, size, unit_price, total_price, product:products(title, image_url))
        `, { count: "exact" });

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
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
    const { supabase } = await requireAdmin();

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
    if (!validStatuses.includes(newStatus)) {
        return { success: false, error: "Invalid status" };
    }

    const updateData: any = { status: newStatus };

    // Auto-update payment_status based on order status
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

    revalidatePath("/dashboard/orders");
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

    return {
        data: (data as any[]) || [],
        count: count || 0,
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

    // If accepted, find the user by email and upgrade their role to 'artist'
    if (decision === "accepted" && appData.email) {
        // Try to find a profile with Clerk that matches this email
        // For now, we'll log this — in production, you'd use Clerk Admin SDK
        console.log(`Application accepted for ${appData.email}. Manual role upgrade may be needed.`);
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
