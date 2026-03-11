"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateNextSKU } from "@/lib/product-identifiers";

// ─── Admin Supabase Client ──────────────────────────────────

function getAdminSupabase() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured — admin operations require the service role key.");
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
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

export type SiteSettingsType = {
        visibility: {
            gallery?: boolean;
            store?: boolean;
            signup?: boolean;
            join?: boolean;
            join_artist?: boolean;
            ai_section?: boolean;
            hero_auth_buttons?: boolean;
        };
        site_info: Record<string, string>;
        shipping: Record<string, number>;
        creation_prices?: { tshirt?: number; hoodie?: number; pullover?: number };
        product_identifiers?: { prefix?: string; product_code_template?: string; sku_template?: string; type_map?: Record<string, string> };
        ai_simulation?: {
            step1_image?: string;
            step1_color_name?: string;
            step1_pattern?: string;
            step2_prompt?: string;
            step2_art_style?: string;
            step2_result_image?: string;
        };
        brand_assets?: {
            business_card_name?: string;
            business_card_title?: string;
            business_card_phone?: string;
            business_card_email?: string;
            business_card_website?: string;
            thank_you_title?: string;
            thank_you_message?: string;
            thank_you_handle?: string;
        };
};

// ═══════════════════════════════════════════════════════════
//  GET ALL SETTINGS
// ═══════════════════════════════════════════════════════════

export async function getSiteSettings() {
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
            visibility: { gallery: false, store: false, signup: false, join: true, join_artist: true, ai_section: true, hero_auth_buttons: true },
            site_info: { name: "وشّى", description: "منصة الفن العربي الأصيل", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
            shipping: { flat_rate: 30, free_above: 500, tax_rate: 15 },
            creation_prices: { tshirt: 89, hoodie: 149, pullover: 129 },
            product_identifiers: { prefix: "WSH", product_code_template: "{PREFIX}-{SEQ:5}", sku_template: "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}", type_map: {} },
            ai_simulation: { 
                step1_image: "/images/design/heavy-tshirt-black-front.png", 
                step1_color_name: "أسود كلاسيك", 
                step1_pattern: "بدون نمط",
                step2_prompt: "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...", 
                step2_art_style: "رسم رقمي (Digital Art)",
                step2_result_image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" 
            },
            brand_assets: {
                business_card_name: "حمزة آرت",
                business_card_title: "المدير الإبداعي | Founder",
                business_card_phone: "+966 53 223 5005",
                business_card_email: "washaksa@hotmail.com",
                business_card_website: "www.washa.shop",
                thank_you_title: "شكراً لثقتكم",
                thank_you_message: "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
                thank_you_handle: "@washha.sa"
            },
        };
    }
    
    try {
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
            product_identifiers: { prefix: "WSH", product_code_template: "{PREFIX}-{SEQ:5}", sku_template: "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}", type_map: {} },
            ai_simulation: { 
                step1_image: "/images/design/heavy-tshirt-black-front.png", 
                step1_color_name: "أسود كلاسيك", 
                step1_pattern: "بدون نمط",
                step2_prompt: "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...", 
                step2_art_style: "رسم رقمي (Digital Art)",
                step2_result_image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" 
            },
            brand_assets: {
                business_card_name: "حمزة آرت",
                business_card_title: "المدير الإبداعي | Founder",
                business_card_phone: "+966 53 223 5005",
                business_card_email: "washaksa@hotmail.com",
                business_card_website: "www.washa.shop",
                thank_you_title: "شكراً لثقتكم",
                thank_you_message: "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
                thank_you_handle: "@washha.sa"
            },
        };
    }

    const settings: Record<string, any> = {};
    for (const row of data) {
        settings[row.key] = row.value;
    }

    const v = settings.visibility || {};
    const cp = settings.creation_prices || {};
    const pi = settings.product_identifiers || {};
    const aiSim = settings.ai_simulation || {};
    
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
        product_identifiers: {
            prefix: pi.prefix ?? "WSH",
            product_code_template: pi.product_code_template ?? "{PREFIX}-{SEQ:5}",
            sku_template: pi.sku_template ?? "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}",
            type_map: pi.type_map ?? { print: "P", apparel: "T", digital: "D", nft: "N", original: "O" },
        },
        ai_simulation: {
            step1_image: aiSim.step1_image ?? "/images/design/heavy-tshirt-black-front.png",
            step1_color_name: aiSim.step1_color_name ?? "أسود كلاسيك",
            step1_pattern: aiSim.step1_pattern ?? "بدون نمط",
            step2_prompt: aiSim.step2_prompt ?? "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...",
            step2_art_style: aiSim.step2_art_style ?? "رسم رقمي (Digital Art)",
            step2_result_image: aiSim.step2_result_image ?? "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80",
        },
        brand_assets: {
            business_card_name: settings.brand_assets?.business_card_name ?? "هشام الزهراني",
            business_card_title: settings.brand_assets?.business_card_title ?? "المدير التنفيذي",
            business_card_phone: settings.brand_assets?.business_card_phone ?? "+966 53 223 5005",
            business_card_email: settings.brand_assets?.business_card_email ?? "washaksa@hotmail.com",
            business_card_website: settings.brand_assets?.business_card_website ?? "www.washa.shop",
            thank_you_title: settings.brand_assets?.thank_you_title ?? "شكراً لثقتكم",
            thank_you_message: settings.brand_assets?.thank_you_message ?? "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
            thank_you_handle: settings.brand_assets?.thank_you_handle ?? "@washha.sa"
        },
    };
    } catch (error) {
        // Return defaults if Supabase is not configured (development mode)
        console.warn("getSiteSettings: Supabase not configured, returning defaults");
        return {
            visibility: { gallery: false, store: false, signup: false, join: true, join_artist: true, ai_section: true, hero_auth_buttons: true },
            site_info: { name: "وشّى", description: "منصة الفن العربي الأصيل", email: "", phone: "", instagram: "", twitter: "", tiktok: "" },
            shipping: { flat_rate: 30, free_above: 500, tax_rate: 15 },
            creation_prices: { tshirt: 89, hoodie: 149, pullover: 129 },
            product_identifiers: { prefix: "WSH", product_code_template: "{PREFIX}-{SEQ:5}", sku_template: "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}", type_map: {} },
            ai_simulation: { 
                step1_image: "/images/design/heavy-tshirt-black-front.png", 
                step1_color_name: "أسود كلاسيك", 
                step1_pattern: "بدون نمط",
                step2_prompt: "صمم لي ذئب بستايل سايبربانك مع ألوان نيون وخلفية مظلمة...", 
                step2_art_style: "رسم رقمي (Digital Art)",
                step2_result_image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80" 
            },
            brand_assets: {
                business_card_name: "حمزة آرت",
                business_card_title: "المدير الإبداعي | Founder",
                business_card_phone: "+966 53 223 5005",
                business_card_email: "washaksa@hotmail.com",
                business_card_website: "www.washa.shop",
                thank_you_title: "شكراً لثقتكم",
                thank_you_message: "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
                thank_you_handle: "@washha.sa"
            },
        };
    }
}

// ─── أسعار القطع (للتصميم — بدون صلاحية أدمن) ───

export async function getCreationPrices() {
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
            tshirt: 89,
            hoodie: 149,
            pullover: 129,
        };
    }
    
    try {
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
    } catch (error) {
        // Return defaults if Supabase is not configured
        return {
            tshirt: 89,
            hoodie: 149,
            pullover: 129,
        };
    }
}

// ─── Public visibility (للصفحات العامة — بدون صلاحية أدمن) ───

export async function getPublicVisibility() {
    // Check if Supabase is configured before attempting to use it
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return {
            gallery: false,
            store: false,
            signup: false,
            join: true,
            join_artist: true,
            ai_section: true,
            hero_auth_buttons: true,
        };
    }
    
    try {
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
    } catch (error) {
        // Return defaults if Supabase is not configured
        return {
            gallery: false,
            store: false,
            signup: false,
            join: true,
            join_artist: true,
            ai_section: true,
            hero_auth_buttons: true,
        };
    }
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
    store_name: string | null;
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

    revalidatePath("/dashboard/products-inventory");
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

    revalidatePath("/dashboard/products-inventory");
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
    store_name?: string;
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
            sizes: data.sizes && data.sizes.length > 0 ? data.sizes : null,
            in_stock: data.in_stock ?? true,
            stock_quantity: data.stock_quantity ?? null,
            store_name: data.store_name?.trim() || null,
            currency: "SAR",
        })
        .select("id")
        .single();

    if (error) return { success: false, error: error.message };

    const productId = created?.id;

    // ERP: Auto-generate SKUs & Initial Inventory
    if (productId) {
        const sizesToCreate = data.sizes && data.sizes.length > 0 ? data.sizes : [null];
        const totalQty = data.stock_quantity != null ? data.stock_quantity : (data.in_stock ? 100 : 0);
        const qtyPerSku = Math.floor(totalQty / sizesToCreate.length);

        let warehouseId = null;
        const { data: wh } = await supabase.from("warehouses").select("id").limit(1).single();
        if (wh) warehouseId = wh.id;

        for (const size of sizesToCreate) {
            const skuResult = await generateNextSKU(data.type, size || undefined, undefined);
            if ("error" in skuResult) {
                console.error("[createProductAdmin] SKU generation failed:", skuResult.error);
                continue;
            }
            const finalSku = skuResult.sku;

            const { data: newSku } = await supabase.from("product_skus").insert({
                product_id: productId,
                sku: finalSku,
                size: size ? size.trim() : null,
            }).select("id").single();

            if (newSku && warehouseId && qtyPerSku > 0) {
                await supabase.from("inventory_levels").insert({
                    sku_id: newSku.id,
                    warehouse_id: warehouseId,
                    quantity: qtyPerSku
                });
                await supabase.from("inventory_transactions").insert({
                    sku_id: newSku.id,
                    warehouse_id: warehouseId,
                    transaction_type: 'addition',
                    quantity_change: qtyPerSku,
                    previous_quantity: 0,
                    new_quantity: qtyPerSku,
                    notes: 'Initial stock creation from Admin Product Form'
                });
            }
        }
    }

    revalidatePath("/dashboard/products-inventory");
    revalidatePath("/store");
    revalidatePath("/dashboard/erp/inventory");
    return { success: true, productId };
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return [];
    }
    try {
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
    } catch (err) {
        console.error("[getExclusiveDesigns]", err);
        return [];
    }
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
