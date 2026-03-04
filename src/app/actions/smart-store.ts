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
