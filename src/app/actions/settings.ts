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
            visibility: { gallery: false, store: false, signup: false, join: true, join_artist: true, ai_section: true, hero_auth_buttons: true },
            site_info: { name: "وشّى", description: "منصة الفن العربي الأصيل", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
            shipping: { flat_rate: 30, free_above: 500, tax_rate: 15 },
            creation_prices: { tshirt: 89, hoodie: 149, pullover: 129 },
        };
    }

    const settings: Record<string, any> = {};
    for (const row of data) {
        settings[row.key] = row.value;
    }

    const v = settings.visibility || {};
    const cp = settings.creation_prices || {};
    return {
        visibility: {
            gallery: v.gallery ?? false,
            store: v.store ?? false,
            signup: v.signup ?? false,
            join: v.join ?? true,
            join_artist: v.join_artist ?? true,
            ai_section: v.ai_section ?? true,
            hero_auth_buttons: v.hero_auth_buttons ?? true,
        },
        site_info: settings.site_info || { name: "وشّى", description: "", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
        shipping: settings.shipping || { flat_rate: 30, free_above: 500, tax_rate: 15 },
        creation_prices: {
            tshirt: cp.tshirt ?? 89,
            hoodie: cp.hoodie ?? 149,
            pullover: cp.pullover ?? 129,
        },
    };
}

// ─── أسعار القطع (للتصميم — بدون صلاحية أدمن) ───

export async function getCreationPrices() {
    const supabase = getAdminSupabase();
    const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "creation_prices")
        .maybeSingle();

    const p = (data as { value?: Record<string, number> } | null)?.value;
    return {
        tshirt: p?.tshirt ?? 89,
        hoodie: p?.hoodie ?? 149,
        pullover: p?.pullover ?? 129,
    };
}

// ─── Public visibility (للصفحات العامة — بدون صلاحية أدمن) ───

export async function getPublicVisibility() {
    const supabase = getAdminSupabase();
    const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "visibility")
        .maybeSingle();

    const visibility = (data as { value?: Record<string, boolean> } | null)?.value;
    return {
        gallery: visibility?.gallery ?? false,
        store: visibility?.store ?? false,
        signup: visibility?.signup ?? false,
        join: visibility?.join ?? true,
        join_artist: visibility?.join_artist ?? true,
        ai_section: visibility?.ai_section ?? true,
        hero_auth_buttons: visibility?.hero_auth_buttons ?? true,
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
    revalidatePath("/account");
    revalidatePath("/studio");
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
        .select("*, artist:profiles!artist_id(id, display_name, username)", { count: "exact" })
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
    title: string;
    description: string | null;
    type: string;
    price: number;
    image_url: string;
    artist_id: string;
    in_stock: boolean;
    is_featured: boolean;
    stock_quantity: number | null;
    badge: string | null;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const validTypes = ["print", "apparel", "digital", "nft", "original"];
    if (updates.type && !validTypes.includes(updates.type)) {
        return { success: false, error: "نوع المنتج غير صالح" };
    }

    const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products");
    revalidatePath("/store");
    return { success: true };
}

export async function deleteProduct(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products");
    revalidatePath("/store");
    return { success: true };
}

export async function createProductAdmin(data: {
    artist_id: string;
    title: string;
    description?: string;
    type: string;
    price: number;
    image_url: string;
    sizes?: string[];
    in_stock?: boolean;
    stock_quantity?: number;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const validTypes = ["print", "apparel", "digital", "nft", "original"];
    if (!validTypes.includes(data.type)) {
        return { success: false, error: "نوع المنتج غير صالح" };
    }

    const { data: created, error } = await supabase
        .from("products")
        .insert({
            artist_id: data.artist_id,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            type: data.type,
            price: Number(data.price),
            image_url: data.image_url.trim(),
            sizes: data.sizes || null,
            in_stock: data.in_stock ?? true,
            stock_quantity: data.stock_quantity ?? null,
            currency: "SAR",
        })
        .select("id")
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/products");
    revalidatePath("/store");
    return { success: true, productId: created?.id };
}

export async function getAdminArtistsForSelect() {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("role", ["wushsha", "admin"])
        .order("display_name");

    if (error) return [];
    return (data || []) as { id: string; display_name: string; username: string }[];
}

// ═══════════════════════════════════════════════════════════
//  PRODUCT IMAGE UPLOAD — Supabase Storage
// ═══════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadProductImage(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
        return { success: false, error: "لم يتم اختيار ملف" };
    }
    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت" };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم (PNG, JPG, WebP, GIF فقط)" };
    }

    const supabase = getAdminSupabase();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
        .from("products")
        .upload(fileName, buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
        });

    if (error) {
        console.error("[uploadProductImage]", error);
        return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(data.path);
    return { success: true, url: publicUrl };
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

// ═══════════════════════════════════════════════════════════
//  EXCLUSIVE DESIGNS — تصاميم وشّى الحصرية
// ═══════════════════════════════════════════════════════════

export async function getExclusiveDesigns() {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from("exclusive_designs")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("[getExclusiveDesigns]", error);
        return [];
    }
    return (data || []) as { id: string; title: string; description: string | null; image_url: string; sort_order: number; is_active: boolean }[];
}

export async function getActiveExclusiveDesigns() {
    const supabase = getAdminSupabase();
    const { data, error } = await supabase
        .from("exclusive_designs")
        .select("id, title, description, image_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (error) return [];
    return (data || []) as { id: string; title: string; description: string | null; image_url: string }[];
}

export async function createExclusiveDesign(formData: {
    title: string;
    description?: string;
    image_url: string;
    sort_order?: number;
}) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase.from("exclusive_designs").insert({
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        image_url: formData.image_url.trim(),
        sort_order: formData.sort_order ?? 0,
        is_active: true,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
    return { success: true };
}

export async function updateExclusiveDesign(id: string, formData: Partial<{
    title: string;
    description: string;
    image_url: string;
    sort_order: number;
    is_active: boolean;
}>) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from("exclusive_designs")
        .update(formData)
        .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
    return { success: true };
}

export async function deleteExclusiveDesign(id: string) {
    await requireAdmin();
    const supabase = getAdminSupabase();

    const { error } = await supabase.from("exclusive_designs").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/exclusive-designs");
    revalidatePath("/design");
    return { success: true };
}

export async function uploadExclusiveDesignImage(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    await requireAdmin();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
        return { success: false, error: "لم يتم اختيار ملف" };
    }
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت" };
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم" };
    }

    const supabase = getAdminSupabase();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `exclusive-designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
        .from("products")
        .upload(fileName, buffer, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
        console.error("[uploadExclusiveDesignImage]", error);
        return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(data.path);
    return { success: true, url: publicUrl };
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
