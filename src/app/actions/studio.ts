"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { unstable_noStore as noStore } from "next/cache";
import { resolveStudioAccess } from "@/lib/studio-access";

export async function getArtistStats() {
    noStore();
    const access = await resolveStudioAccess();
    if (!access.ok) return null;

    const supabase = getSupabaseAdminClient();
    const profileId = access.profile.id;

    // Get Artworks Stats (Views & Likes)
    const { data: artworks } = await supabase
        .from("artworks")
        .select("views_count, likes_count")
        .eq("artist_id", profileId);

    let totalViews = 0;
    let totalLikes = 0;

    if (artworks) {
        totalViews = artworks.reduce((sum, art) => sum + (art.views_count || 0), 0);
        totalLikes = artworks.reduce((sum, art) => sum + (art.likes_count || 0), 0);
    }

    // Get Sales Stats via order_items -> products -> artist_id
    const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("artist_id", profileId);

    let totalSales = 0;
    let totalRevenue = 0;

    if (products && products.length > 0) {
        const productIds = products.map(p => p.id);

        const { data: orderItems } = await supabase
            .from("order_items")
            .select("total_price, quantity")
            .in("product_id", productIds);

        if (orderItems) {
            totalRevenue = orderItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
            totalSales = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
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
