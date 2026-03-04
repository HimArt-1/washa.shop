"use server";

// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — المتجر الذكي Server Actions
//  CRUD operations for custom design garments, colors, etc.
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import type {
    CustomDesignGarment,
    CustomDesignColor,
    CustomDesignSize,
    CustomDesignStyle,
    CustomDesignArtStyle,
    CustomDesignColorPackage,
} from "@/types/database";

// Use raw client to avoid type mismatch before migration is introspected
function getSmartStoreSb() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Public Reads ────────────────────────────────────────

export async function getActiveGarments(): Promise<CustomDesignGarment[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_garments")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignGarment[]) ?? [];
}

export async function getGarmentColors(garmentId: string): Promise<CustomDesignColor[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_colors")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignColor[]) ?? [];
}

export async function getColorSizes(garmentId: string, colorId?: string): Promise<CustomDesignSize[]> {
    const sb = getSmartStoreSb();
    let query = sb
        .from("custom_design_sizes")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("is_active", true);
    if (colorId) query = query.eq("color_id", colorId);
    const { data } = await query.order("name");
    return (data as CustomDesignSize[]) ?? [];
}

export async function getDesignStyles(): Promise<CustomDesignStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_styles")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignStyle[]) ?? [];
}

export async function getArtStyles(): Promise<CustomDesignArtStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_art_styles")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignArtStyle[]) ?? [];
}

export async function getColorPackages(): Promise<CustomDesignColorPackage[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_color_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignColorPackage[]) ?? [];
}

// ─── Admin: Get All (including inactive) ─────────────────

export async function getAllGarments(): Promise<CustomDesignGarment[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_garments")
        .select("*")
        .order("sort_order");
    return (data as CustomDesignGarment[]) ?? [];
}

export async function getAllColors(garmentId?: string): Promise<CustomDesignColor[]> {
    const sb = getSmartStoreSb();
    let query = sb.from("custom_design_colors").select("*");
    if (garmentId) query = query.eq("garment_id", garmentId);
    const { data } = await query.order("sort_order");
    return (data as CustomDesignColor[]) ?? [];
}

export async function getAllSizes(garmentId?: string): Promise<CustomDesignSize[]> {
    const sb = getSmartStoreSb();
    let query = sb.from("custom_design_sizes").select("*");
    if (garmentId) query = query.eq("garment_id", garmentId);
    const { data } = await query.order("name");
    return (data as CustomDesignSize[]) ?? [];
}

export async function getAllStyles(): Promise<CustomDesignStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_styles").select("*").order("sort_order");
    return (data as CustomDesignStyle[]) ?? [];
}

export async function getAllArtStyles(): Promise<CustomDesignArtStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_art_styles").select("*").order("sort_order");
    return (data as CustomDesignArtStyle[]) ?? [];
}

export async function getAllColorPackages(): Promise<CustomDesignColorPackage[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_color_packages").select("*").order("sort_order");
    return (data as CustomDesignColorPackage[]) ?? [];
}

// ─── Admin: Upsert ───────────────────────────────────────

export async function upsertGarment(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        slug: formData.get("slug") as string,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_garments").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_garments").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertColor(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        garment_id: formData.get("garment_id") as string,
        name: formData.get("name") as string,
        hex_code: formData.get("hex_code") as string,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_colors").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_colors").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertSize(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        garment_id: formData.get("garment_id") as string,
        color_id: (formData.get("color_id") as string) || null,
        name: formData.get("name") as string,
        image_front_url: (formData.get("image_front_url") as string) || null,
        image_back_url: (formData.get("image_back_url") as string) || null,
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_sizes").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_sizes").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertStyle(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_styles").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_styles").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertArtStyle(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const payload = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_art_styles").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_art_styles").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertColorPackage(formData: FormData) {
    const sb = getSmartStoreSb();
    const id = formData.get("id") as string | null;
    const colorsRaw = formData.get("colors") as string;
    const payload = {
        name: formData.get("name") as string,
        colors: colorsRaw ? JSON.parse(colorsRaw) : [],
        image_url: (formData.get("image_url") as string) || null,
        sort_order: Number(formData.get("sort_order") ?? 0),
        is_active: formData.get("is_active") === "true",
    };

    if (id) {
        const { error } = await sb.from("custom_design_color_packages").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_color_packages").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

// ─── Admin: Delete ───────────────────────────────────────

export async function deleteGarment(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_garments").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteColor(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_colors").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteSize(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_sizes").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteStyle(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_styles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteArtStyle(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_art_styles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteColorPackage(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_color_packages").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Design Orders — طلبات التصميم
// ═══════════════════════════════════════════════════════════

import type { CustomDesignOrder, CustomDesignOrderStatus, CustomDesignSettings } from "@/types/database";

// ─── Get AI Prompt Template ─────────────────────────────

export async function getDesignPromptTemplate(): Promise<string> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_settings")
        .select("ai_prompt_template")
        .eq("id", "default")
        .single();
    return (data as any)?.ai_prompt_template ?? "";
}

export async function updateDesignPromptTemplate(template: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb
        .from("custom_design_settings")
        .update({ ai_prompt_template: template })
        .eq("id", "default");
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Generate AI Prompt from Template ───────────────────

function generateAiPrompt(template: string, data: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(data)) {
        prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "—");
    }
    return prompt;
}

// ─── Submit Design Order (Public) ───────────────────────

export async function submitDesignOrder(orderData: {
    garment_name: string;
    garment_image_url?: string;
    color_name: string;
    color_hex: string;
    color_image_url?: string;
    size_name: string;
    design_method: "from_text" | "from_image";
    text_prompt?: string;
    reference_image_url?: string;
    style_name: string;
    style_image_url?: string;
    art_style_name: string;
    art_style_image_url?: string;
    color_package_name?: string;
    custom_colors?: any[];
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
}) {
    const sb = getSmartStoreSb();

    // 1. Get prompt template
    const template = await getDesignPromptTemplate();

    // 2. Build colors string
    const colorsStr = orderData.color_package_name
        ? orderData.color_package_name
        : orderData.custom_colors && orderData.custom_colors.length > 0
            ? orderData.custom_colors.join(", ")
            : `${orderData.color_name} (${orderData.color_hex})`;

    // 3. User prompt or image note
    const userPrompt = orderData.design_method === "from_text"
        ? (orderData.text_prompt ?? "")
        : `[صورة مرجعية مرفقة: ${orderData.reference_image_url ?? "—"}]`;

    // 4. Generate AI prompt
    const aiPrompt = generateAiPrompt(template, {
        garment_name: orderData.garment_name,
        color_name: orderData.color_name,
        color_hex: orderData.color_hex,
        style_name: orderData.style_name,
        art_style_name: orderData.art_style_name,
        colors: colorsStr,
        user_prompt: userPrompt,
    });

    // 5. Insert order
    const payload = {
        garment_name: orderData.garment_name,
        garment_image_url: orderData.garment_image_url || null,
        color_name: orderData.color_name,
        color_hex: orderData.color_hex,
        color_image_url: orderData.color_image_url || null,
        size_name: orderData.size_name,
        design_method: orderData.design_method,
        text_prompt: orderData.text_prompt || null,
        reference_image_url: orderData.reference_image_url || null,
        style_name: orderData.style_name,
        style_image_url: orderData.style_image_url || null,
        art_style_name: orderData.art_style_name,
        art_style_image_url: orderData.art_style_image_url || null,
        color_package_name: orderData.color_package_name || null,
        custom_colors: orderData.custom_colors ?? [],
        ai_prompt: aiPrompt,
        customer_name: orderData.customer_name || null,
        customer_email: orderData.customer_email || null,
        customer_phone: orderData.customer_phone || null,
    };

    const { data, error } = await sb
        .from("custom_design_orders")
        .insert(payload)
        .select("id, order_number")
        .single();

    if (error) return { error: error.message };
    return { success: true, orderId: (data as any)?.id, orderNumber: (data as any)?.order_number };
}

// ─── Admin: Get Design Orders ───────────────────────────

export async function getDesignOrders(page = 1, status = "all") {
    const sb = getSmartStoreSb();
    const perPage = 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = sb.from("custom_design_orders").select("*", { count: "exact" });
    if (status !== "all") {
        query = query.eq("status", status);
    }
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) {
        console.error("getDesignOrders error:", error);
        return { data: [], count: 0, totalPages: 0 };
    }
    return {
        data: (data as CustomDesignOrder[]) ?? [],
        count: count ?? 0,
        totalPages: count ? Math.ceil(count / perPage) : 0,
    };
}

// ─── Admin: Get Single Order ────────────────────────────

export async function getDesignOrder(id: string): Promise<CustomDesignOrder | null> {
    const sb = getSmartStoreSb();
    const { data } = await sb.from("custom_design_orders").select("*").eq("id", id).single();
    return (data as CustomDesignOrder) ?? null;
}

// ─── Admin: Update Status ───────────────────────────────

export async function updateDesignOrderStatus(id: string, status: CustomDesignOrderStatus) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ status }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Upload Results ──────────────────────────────

export async function uploadDesignResult(id: string, field: "result_design_url" | "result_mockup_url" | "result_pdf_url", url: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ [field]: url }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Skip Results ────────────────────────────────

export async function skipDesignResults(id: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ skip_results: true, status: "completed" as any }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Update Notes ────────────────────────────────

export async function updateDesignOrderNotes(id: string, notes: string) {
    const sb = getSmartStoreSb();
    const { error } = await sb.from("custom_design_orders").update({ admin_notes: notes }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}
