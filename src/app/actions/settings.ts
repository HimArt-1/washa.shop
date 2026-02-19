"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// ─── Admin Supabase Client ──────────────────────────────────

function getAdminSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );
}

async function requireAdmin() {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_id", user.id)
        .single();
    if (profile?.role !== "admin") throw new Error("Forbidden");
    return user;
}

// ═══════════════════════════════════════════════════════════
//  GET ALL SETTINGS
// ═══════════════════════════════════════════════════════════

export async function getSiteSettings() {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

    if (error || !data) {
        // Return defaults if table doesn't exist yet
        return {
            visibility: { gallery: false, store: false, signup: false, join: true, ai_section: true },
            site_info: { name: "وشّى", description: "منصة الفن العربي الأصيل", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
            shipping: { flat_rate: 30, free_above: 500, tax_rate: 15 },
        };
    }

    const settings: Record<string, any> = {};
    for (const row of data) {
        settings[row.key] = row.value;
    }

    return {
        visibility: settings.visibility || { gallery: false, store: false, signup: false, join: true, ai_section: true },
        site_info: settings.site_info || { name: "وشّى", description: "", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
        shipping: settings.shipping || { flat_rate: 30, free_above: 500, tax_rate: 15 },
    };
}

// ═══════════════════════════════════════════════════════════
//  UPDATE A SETTING
// ═══════════════════════════════════════════════════════════

export async function updateSiteSetting(key: string, value: Record<string, any>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("site_settings")
        .upsert(
            { key, value, updated_at: new Date().toISOString() },
            { onConflict: "key" }
        );

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  CATEGORIES CRUD
// ═══════════════════════════════════════════════════════════

export async function getCategories() {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });

    return { data: data || [], error: error?.message };
}

export async function createCategory(formData: {
    name_ar: string;
    name_en: string;
    slug: string;
    description?: string;
    icon?: string;
    sort_order?: number;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase.from("categories").insert(formData);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/categories");
    return { success: true };
}

export async function updateCategory(id: string, formData: Partial<{
    name_ar: string;
    name_en: string;
    slug: string;
    description: string;
    icon: string;
    sort_order: number;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("categories")
        .update(formData)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/categories");
    return { success: true };
}

export async function deleteCategory(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/categories");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  PRODUCTS MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function getAdminProducts(page = 1, type = "all") {
    await requireAdmin();
    const supabase = getAdminSupabase();
    const perPage = 20;

    let query = supabase
        .from("products")
        .select("*, artist:profiles!artist_id(display_name, username)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

    if (type !== "all") {
        query = query.eq("type", type);
    }

    const { data, count, error } = await query;

    return {
        data: data || [],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / perPage),
    };
}

export async function updateProduct(id: string, updates: Partial<{
    price: number;
    in_stock: boolean;
    is_featured: boolean;
    stock_quantity: number;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products");
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  NEWSLETTER MANAGEMENT
// ═══════════════════════════════════════════════════════════

export async function getNewsletterSubscribers() {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

    return { data: data || [], error: error?.message };
}

export async function deleteSubscriber(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/newsletter");
    return { success: true };
}
