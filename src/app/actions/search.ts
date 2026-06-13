// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Search Actions
//  Server Actions للبحث الموحد في المنصة
// ═══════════════════════════════════════════════════════════

"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database, ProductType } from "@/types/database";
import { getSupabaseAdminClient } from "@/lib/supabase";

function getSearchClient() {
    try {
        return getSupabaseAdminClient();
    } catch {
        return createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } }
        );
    }
}

// ─── Types ──────────────────────────────────────────────────

export type SearchTab = "artworks" | "products" | "artists";

export interface SearchFilters {
    minPrice?: number;
    maxPrice?: number;
    category?: string;
    productType?: string;
    sortBy?: "newest" | "oldest" | "price_asc" | "price_desc" | "popular";
}

export interface SearchResult {
    artworks: { data: any[]; count: number };
    products: { data: any[]; count: number };
    artists: { data: any[]; count: number };
}

const emptyResult: SearchResult = {
    artworks: { data: [], count: 0 },
    products: { data: [], count: 0 },
    artists: { data: [], count: 0 },
};

// ─── Global Search ──────────────────────────────────────────

export async function globalSearch(
    query: string,
    tab: SearchTab = "artworks",
    page = 1,
    filters: SearchFilters = {}
): Promise<SearchResult> {
    try {
        const supabase = getSearchClient();
        const itemsPerPage = 12;
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        const searchTerm = `%${query}%`;

        const result: SearchResult = { ...emptyResult };

        // ─── Search Artworks ────────────────────────────────────
        if (tab === "artworks" || !query) {
            let artworkQuery = supabase
                .from("artworks")
                .select(`
                    *,
                    artist:profiles!artworks_artist_id_fkey(id, display_name, username, avatar_url, is_verified),
                    category:categories(name_ar, slug)
                `, { count: "exact" })
                .eq("status", "published");

            if (query) {
                artworkQuery = artworkQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
            }

            if (filters.category && filters.category !== "all") {
                const { data: cat } = await supabase
                    .from("categories")
                    .select("id")
                    .eq("slug", filters.category)
                    .single();
                if (cat) {
                    artworkQuery = artworkQuery.eq("category_id", cat.id);
                }
            }

            if (filters.minPrice !== undefined) {
                artworkQuery = artworkQuery.gte("price", filters.minPrice);
            }
            if (filters.maxPrice !== undefined) {
                artworkQuery = artworkQuery.lte("price", filters.maxPrice);
            }

            switch (filters.sortBy) {
                case "oldest":
                    artworkQuery = artworkQuery.order("created_at", { ascending: true });
                    break;
                case "price_asc":
                    artworkQuery = artworkQuery.order("price", { ascending: true });
                    break;
                case "price_desc":
                    artworkQuery = artworkQuery.order("price", { ascending: false });
                    break;
                case "popular":
                    artworkQuery = artworkQuery.order("views_count", { ascending: false });
                    break;
                default:
                    artworkQuery = artworkQuery.order("created_at", { ascending: false });
            }

            const { data, count, error } = await artworkQuery.range(from, to);
            if (error) console.error("[Search] Artworks error:", error.message);
            result.artworks = { data: data || [], count: count || 0 };
        }

        // ─── Search Products ────────────────────────────────────
        if (tab === "products" || !query) {
            let productQuery = supabase
                .from("products")
                .select(`
                    *,
                    artist:profiles!products_artist_id_fkey(id, display_name, username, avatar_url)
                `, { count: "exact" })
                .eq("in_stock", true);

            if (query) {
                productQuery = productQuery.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`);
            }

            if (filters.productType && filters.productType !== "all") {
                productQuery = productQuery.eq("type", filters.productType as ProductType);
            }

            if (filters.minPrice !== undefined) {
                productQuery = productQuery.gte("price", filters.minPrice);
            }
            if (filters.maxPrice !== undefined) {
                productQuery = productQuery.lte("price", filters.maxPrice);
            }

            switch (filters.sortBy) {
                case "oldest":
                    productQuery = productQuery.order("created_at", { ascending: true });
                    break;
                case "price_asc":
                    productQuery = productQuery.order("price", { ascending: true });
                    break;
                case "price_desc":
                    productQuery = productQuery.order("price", { ascending: false });
                    break;
                default:
                    productQuery = productQuery.order("created_at", { ascending: false });
            }

            const { data, count, error } = await productQuery.range(from, to);
            if (error) console.error("[Search] Products error:", error.message);
            result.products = { data: data || [], count: count || 0 };
        }

        // ─── Search Artists ─────────────────────────────────────
        if (tab === "artists" || !query) {
            let artistQuery = supabase
                .from("profiles")
                .select("id, display_name, username, bio, avatar_url, cover_url, is_verified, total_artworks, total_sales", { count: "exact" })
                .eq("role", "wushsha");

            if (query) {
                artistQuery = artistQuery.or(`display_name.ilike.${searchTerm},username.ilike.${searchTerm},bio.ilike.${searchTerm}`);
            }

            switch (filters.sortBy) {
                case "popular":
                    artistQuery = artistQuery.order("total_sales", { ascending: false });
                    break;
                default:
                    artistQuery = artistQuery.order("created_at", { ascending: false });
            }

            const { data, count, error } = await artistQuery.range(from, to);
            if (error) console.error("[Search] Artists error:", error.message);
            result.artists = { data: data || [], count: count || 0 };
        }

        return result;
    } catch (error) {
        console.error("[Search] Fatal error:", error);
        return emptyResult;
    }
}

// ─── Get Categories (for filter dropdown) ───────────────────

export async function getCategories() {
    try {
        const supabase = getSearchClient();
        const { data, error } = await supabase
            .from("categories")
            .select("id, name_ar, name_en, slug")
            .order("sort_order", { ascending: true });

        if (error) console.error("[Search] Categories error:", error.message);
        return data || [];
    } catch (error) {
        console.error("[Search] Categories fatal error:", error);
        return [];
    }
}
