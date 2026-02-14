// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Products Actions
//  Server Actions لجلب وإدارة المنتجات
// ═══════════════════════════════════════════════════════════

"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";

export async function getProducts(
    page = 1,
    type = "all"
) {
    noStore();
    const supabase = getSupabaseServerClient();
    const itemsPerPage = 12;
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
        .from("products")
        .select(`
      *,
      artist:profiles(id, display_name, username, avatar_url)
    `, { count: "exact" })
        .eq("in_stock", true);

    if (type !== "all") {
        query = query.eq("type", type);
    }

    const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching products:", error);
        return { data: [], count: 0, totalPages: 0 };
    }

    return {
        data,
        count: count || 0,
        totalPages: count ? Math.ceil(count / itemsPerPage) : 0,
    };
}

export async function getProductById(id: string) {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
        .from("products")
        .select(`
      *,
      artist:profiles(id, display_name, username, avatar_url)
    `)
        .eq("id", id)
        .single();

    if (error) return null;
    return data;
}

// ─── WRITE ACTIONS ───────────────────────────────────────────

interface CreateProductInput {
    artwork_id: string;
    title: string;
    description: string;
    type: string;
    price: number;
    image_url: string; // The generated product mockup image
    sizes: string[];
}

export async function createProduct(input: CreateProductInput) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = getSupabaseServerClient();

    // Get profile id
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    const profileData = profile as any;

    if (!profileData) return { success: false, error: "Profile not found" };

    const { error } = await supabase.from("products").insert({
        artist_id: profileData.id,
        artwork_id: input.artwork_id,
        title: input.title,
        description: input.description,
        type: input.type,
        price: input.price,
        image_url: input.image_url, // In a real app, we'd upload the mockup first
        sizes: input.sizes,
        in_stock: true,
        stock_quantity: 100, // Unlimited for POD
        is_featured: false,
        currency: "SAR",
    } as any);

    if (error) {
        console.error("Error creating product:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/store");
    revalidatePath("/studio");
    return { success: true };
}
