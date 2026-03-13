// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Products Actions
//  Server Actions لجلب وإدارة المنتجات
// ═══════════════════════════════════════════════════════════

"use server";

import { Database, ProductType, ApparelSize } from "@/types/database";
import { getSupabaseServerClient } from "@/lib/supabase";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";

export type SortOption = "newest" | "oldest" | "price_asc" | "price_desc" | "rating";

export async function getProducts(
    page = 1,
    type = "all",
    inStockOnly = false,
    sort: SortOption = "newest"
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
      artist:profiles(id, display_name, username, avatar_url),
      product_skus(
        inventory_levels(quantity)
      )
    `, { count: "exact" });

    if (inStockOnly) {
        query = query.eq("in_stock", true);
    }

    if (type !== "all") {
        query = query.eq("type", type as ProductType);
    }

    const sortMap: Record<SortOption, { column: string; ascending: boolean }> = {
        newest:    { column: "created_at", ascending: false },
        oldest:    { column: "created_at", ascending: true },
        price_asc: { column: "price",      ascending: true },
        price_desc:{ column: "price",      ascending: false },
        rating:    { column: "rating",     ascending: false },
    };
    const { column, ascending } = sortMap[sort] ?? sortMap.newest;

    const { data, count, error } = await query
        .order(column, { ascending })
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

    const profileData = profile;

    if (!profileData) return { success: false, error: "Profile not found" };

    const { error } = await supabase.from("products").insert({
        artist_id: profileData.id,
        artwork_id: input.artwork_id,
        title: input.title,
        description: input.description,
        type: input.type as ProductType,
        price: input.price,
        image_url: input.image_url,
        sizes: input.sizes as ApparelSize[],
        in_stock: true,
        stock_quantity: 100, // Unlimited for POD
        is_featured: false,
        currency: "SAR",
        original_price: null,
        badge: null,
    });

    if (error) {
        console.error("Error creating product:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/store");
    revalidatePath("/studio");
    return { success: true };
}

// ─── SYNC STOCK FROM ERP ─────────────────────────────────────
// تزامن علامة in_stock على كل منتج بناءً على مخزون ERP الفعلي
export async function syncProductStockFromERP() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized", updated: 0 };

    const supabase = getSupabaseServerClient();

    // التحقق من أن المستخدم أدمن
    const { data: profile } = await supabase
        .from("profiles").select("role").eq("clerk_id", user.id).single();
    if (profile?.role !== "admin") return { success: false, error: "Forbidden", updated: 0 };

    // جلب كل المنتجات مع مخزون SKU الخاص بها
    const { data: products, error } = await supabase
        .from("products")
        .select("id, in_stock, product_skus(inventory_levels(quantity))");

    if (error) return { success: false, error: error.message, updated: 0 };

    let updated = 0;

    for (const product of products || []) {
        const skus = (product as any).product_skus as any[] | null;

        // إذا لا يوجد SKU يعتمد على in_stock القديمة — تجاهل
        if (!skus || skus.length === 0) continue;

        const totalERP = skus.reduce((sum: number, sku: any) => {
            const levels = sku.inventory_levels as any[] | null;
            return sum + (levels?.reduce((s: number, l: any) => s + (Number(l.quantity) || 0), 0) ?? 0);
        }, 0);

        const shouldBeInStock = totalERP > 0;

        if (shouldBeInStock !== (product as any).in_stock) {
            await supabase
                .from("products")
                .update({ in_stock: shouldBeInStock })
                .eq("id", (product as any).id);
            updated++;
        }
    }

    revalidatePath("/store");
    revalidatePath("/dashboard/products-inventory");
    return { success: true, updated };
}
