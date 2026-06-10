// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Artworks Actions
//  Server Actions لجلب وإدارة الأعمال الفنية
// ═══════════════════════════════════════════════════════════

"use server";

import { getSupabaseServerClient, getSupabaseAdminClient } from "@/lib/supabase";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { resolveStudioAccess } from "@/lib/studio-access";

const MAX_ARTWORK_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_ARTWORK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ─── READ ACTIONS ────────────────────────────────────────────

export async function getFeaturedArtworks() {
    noStore();
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
        .from("artworks")
        .select(`
      *,
      artist:profiles(id, display_name, username, avatar_url, is_verified)
    `)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(6);

    if (error) {
        console.error("Error fetching featured artworks:", error);
        return [];
    }

    return data;
}

export async function getArtworks(
    page = 1,
    category = "all",
    search = ""
) {
    noStore();
    const supabase = getSupabaseServerClient();
    const itemsPerPage = 12;
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from("artworks")
        .select(`
      *,
      artist:profiles(id, display_name, username, avatar_url, is_verified)
    `, { count: "exact" })
        .eq("status", "published");

    // Filter by category
    if (category !== "all") {
        const { data } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", category)
            .single();

        if (data) {
            query = query.eq("category_id", data.id);
        }
    }

    // Search by title or description (tags are arrays, not text-searchable the same way)
    if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching artworks:", error);
        return { data: [], count: 0, totalPages: 0 };
    }

    return {
        data,
        count: count || 0,
        totalPages: count ? Math.ceil(count / itemsPerPage) : 0,
    };
}

export async function getArtworkById(id: string, adminOverride = false) {
    noStore();
    const supabase = getSupabaseServerClient();

    let query = supabase
        .from("artworks")
        .select(`
      *,
      artist:profiles(id, display_name, username, bio, avatar_url, is_verified),
      category:categories(name_ar, slug)
    `)
        .eq("id", id);

    // Public access: only show published artworks
    if (!adminOverride) query = query.eq("status", "published");

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;
    return data;
}

export async function getArtistArtworks(page = 1) {
    noStore();
    const access = await resolveStudioAccess();
    if (!access.ok) return { data: [], count: 0 };

    const supabase = getSupabaseAdminClient();
    const profileId = access.profile.id;

    const itemsPerPage = 12;
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data, count, error } = await supabase
        .from("artworks")
        .select("*", { count: "exact" })
        .eq("artist_id", profileId)
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching artist artworks:", error);
        return { data: [], count: 0 };
    }

    return { data, count: count || 0 };
}

// ─── UPLOAD ARTWORK IMAGE (Server-side, bypasses RLS) ────────

export async function uploadArtworkImage(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
    const access = await resolveStudioAccess();
    if (!access.ok) return { success: false, error: access.error };

    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
        return { success: false, error: "لم يتم اختيار ملف" };
    }
    if (file.size > MAX_ARTWORK_FILE_SIZE) {
        return { success: false, error: "حجم الملف يجب أن لا يتجاوز 5 ميجابايت" };
    }
    if (!ALLOWED_ARTWORK_TYPES.includes(file.type)) {
        return { success: false, error: "نوع الملف غير مدعوم (PNG, JPG, WebP, GIF فقط)" };
    }

    const adminSupabase = getSupabaseAdminClient();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `uploads/${access.profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await adminSupabase.storage
        .from("artworks")
        .upload(fileName, buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
        });

    if (error) {
        console.error("[uploadArtworkImage]", error);
        return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = adminSupabase.storage.from("artworks").getPublicUrl(data.path);
    return { success: true, url: publicUrl };
}

// ─── WRITE ACTIONS ───────────────────────────────────────────

export async function createArtwork(formData: {
    title: string;
    description?: string;
    category_id?: string;
    image_url: string;
    tags?: string[];
    price?: number | null;
    medium?: string;
    dimensions?: string;
    year?: number | null;
}) {
    const access = await resolveStudioAccess();
    if (!access.ok) return { success: false, error: access.error };

    if (!formData.title?.trim()) return { success: false, error: "العنوان مطلوب" };
    if (!formData.image_url) return { success: false, error: "صورة العمل مطلوبة" };

    const adminSupabase = getSupabaseAdminClient();

    const { error } = await adminSupabase.from("artworks").insert({
        artist_id: access.profile.id,
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        category_id: formData.category_id || null,
        image_url: formData.image_url,
        status: "pending",
        tags: formData.tags || [],
        currency: "SAR",
        price: formData.price ?? null,
        medium: formData.medium?.trim() || null,
        dimensions: formData.dimensions?.trim() || null,
        year: formData.year ?? null,
    });

    if (error) {
        console.error("Error creating artwork:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/studio/artworks");
    revalidatePath("/studio");
    revalidatePath("/gallery");
    return { success: true };
}

export async function deleteArtwork(id: string, imageUrl: string) {
    const access = await resolveStudioAccess();
    if (!access.ok) return { success: false, error: access.error };

    const adminSupabase = getSupabaseAdminClient();

    // Verify ownership
    const { data: artwork } = await adminSupabase
        .from("artworks")
        .select("artist_id")
        .eq("id", id)
        .single();

    if (!artwork) return { success: false, error: "العمل الفني غير موجود" };

    if (artwork.artist_id !== access.profile.id) {
        return { success: false, error: "غير مصرح — هذا العمل لا ينتمي لحسابك" };
    }

    // Delete from DB (admin client bypasses RLS)
    const { error } = await adminSupabase.from("artworks").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    // Delete from Storage
    const path = imageUrl.split("/artworks/").pop();
    if (path) {
        await adminSupabase.storage.from("artworks").remove([path]);
    }

    revalidatePath("/studio/artworks");
    revalidatePath("/gallery");
    return { success: true };
}
