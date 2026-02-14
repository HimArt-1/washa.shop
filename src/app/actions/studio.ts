"use server";

import { getSupabaseServerClient } from "@/lib/supabase";
import { unstable_noStore as noStore } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";

export async function getArtistStats() {
    noStore();
    const user = await currentUser();
    if (!user) return null;

    const supabase = getSupabaseServerClient();

    // 1. Get Profile ID
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    const profileData = profile as any;

    if (!profileData) return null;

    // 2. Get Artworks Stats (Views & Likes)
    const { data: artworks, error: artworksError } = await supabase
        .from("artworks")
        .select("views_count, likes_count")
        .eq("artist_id", profileData.id);

    let totalViews = 0;
    let totalLikes = 0;

    const artworksData = artworks as any[];

    if (artworksData) {
        totalViews = artworksData.reduce((sum, art) => sum + (art.views_count || 0), 0);
        totalLikes = artworksData.reduce((sum, art) => sum + (art.likes_count || 0), 0);
    }

    // 3. Get Sales Stats
    // We need to join order_items -> products -> artist_id

    // Get all product IDs for this artist
    const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("artist_id", profileData.id);

    let totalSales = 0;
    let totalRevenue = 0; // Number of items sold

    const productsData = products as any[];

    if (productsData && productsData.length > 0) {
        const productIds = productsData.map(p => p.id);

        const { data: orderItems } = await supabase
            .from("order_items")
            .select("total_price, quantity")
            .in("product_id", productIds);

        const orderItemsData = orderItems as any[];

        if (orderItemsData) {
            totalRevenue = orderItemsData.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
            totalSales = orderItemsData.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
    }

    // Calculate conversion rate (sales / views) * 100 roughly
    const conversionRate = totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(1) : "0";

    return {
        totalRevenue,
        totalSales,
        totalViews,
        totalLikes,
        conversionRate
    };
}
