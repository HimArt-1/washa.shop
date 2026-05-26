// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Social Actions
//  متابعة فنان، محفوظات، إعجاب بمنتج
// ═══════════════════════════════════════════════════════════

"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function getCurrentProfile() {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("clerk_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[social.getCurrentProfile]", error.message);
            return null;
        }

        return (data as { id: string } | null) ?? null;
    } catch (error) {
        console.error("[social.getCurrentProfile] Failed to resolve auth state:", error);
        return null;
    }
}

async function getFollowableArtist(artistId: string) {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", artistId)
        .eq("role", "wushsha")
        .maybeSingle();

    return (data as { id: string } | null) ?? null;
}

async function productExists(productId: string) {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
        .from("products")
        .select("id")
        .eq("id", productId)
        .maybeSingle();

    return !!data;
}

// ─── متابعة الفنان ───────────────────────────────────────

export async function followArtist(artistId: string) {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "يجب تسجيل الدخول" };

    const artist = await getFollowableArtist(artistId.trim());
    if (!artist) return { success: false, error: "الفنان غير موجود" };
    if (profile.id === artist.id) return { success: false, error: "لا يمكن متابعة نفسك" };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
        .from("artist_follows")
        .insert({ follower_id: profile.id, artist_id: artist.id });

    if (error) {
        if (error.code === "23505") return { success: true };
        return { success: false, error: error.message };
    }

    revalidatePath("/artists/[username]", "page");
    return { success: true };
}

export async function unfollowArtist(artistId: string) {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "الملف الشخصي غير موجود" };

    const supabase = getSupabaseAdminClient();
    const { error: deleteError } = await supabase
        .from("artist_follows")
        .delete()
        .eq("follower_id", profile.id)
        .eq("artist_id", artistId.trim());

    if (deleteError) return { success: false, error: deleteError.message };
    revalidatePath("/artists/[username]", "page");
    return { success: true };
}

export async function isFollowingArtist(artistId: string): Promise<boolean> {
    const profile = await getCurrentProfile();
    if (!profile) return false;

    const supabase = getSupabaseAdminClient();
    const { data: followRow } = await supabase
        .from("artist_follows")
        .select("id")
        .eq("follower_id", profile.id)
        .eq("artist_id", artistId.trim())
        .maybeSingle();

    return !!followRow;
}

export async function getArtistFollowersCount(artistId: string): Promise<number> {
    const supabase = getSupabaseAdminClient();
    const { count } = await supabase
        .from("artist_follows")
        .select("id", { count: "exact", head: true })
        .eq("artist_id", artistId);
    return count ?? 0;
}

// ─── محفوظات المنتج (Wishlist) ────────────────────────────

export async function addToWishlist(productId: string) {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "الملف الشخصي غير موجود" };
    if (!(await productExists(productId.trim()))) return { success: false, error: "المنتج غير موجود" };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
        .from("product_wishlist")
        .insert({ user_id: profile.id, product_id: productId.trim() });

    if (error) {
        if (error.code === "23505") return { success: true };
        return { success: false, error: error.message };
    }

    revalidatePath("/products/[id]", "page");
    revalidatePath("/account/wishlist", "page");
    return { success: true };
}

export async function removeFromWishlist(productId: string) {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "الملف الشخصي غير موجود" };

    const supabase = getSupabaseAdminClient();
    const { error: deleteError } = await supabase
        .from("product_wishlist")
        .delete()
        .eq("user_id", profile.id)
        .eq("product_id", productId.trim());

    if (deleteError) return { success: false, error: deleteError.message };
    revalidatePath("/products/[id]", "page");
    revalidatePath("/account/wishlist", "page");
    return { success: true };
}

export async function isInWishlist(productId: string): Promise<boolean> {
    const profile = await getCurrentProfile();
    if (!profile) return false;

    const supabase = getSupabaseAdminClient();
    const { data: wishlistRow } = await supabase
        .from("product_wishlist")
        .select("id")
        .eq("user_id", profile.id)
        .eq("product_id", productId.trim())
        .maybeSingle();

    return !!wishlistRow;
}

export async function getWishlistProducts() {
    const profile = await getCurrentProfile();
    if (!profile) return { data: [], count: 0 };

    const supabase = getSupabaseAdminClient();
    const { data: wishlistItems } = await supabase
        .from("product_wishlist")
        .select("product_id")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

    if (!wishlistItems?.length) return { data: [], count: 0 };

    const productIds = wishlistItems.map((r: { product_id: string }) => r.product_id);
    const { data: products } = await supabase
        .from("products")
        .select("id, title, price, image_url, type, in_stock, artist:profiles(display_name, username)")
        .in("id", productIds);

    const orderMap = Object.fromEntries(productIds.map((id: string, i: number) => [id, i]));
    const sorted = (products || []).sort((a: any, b: any) => (orderMap[a.id] ?? 99) - (orderMap[b.id] ?? 99));
    return { data: sorted, count: sorted.length };
}

export async function getWishlistProductIds(): Promise<string[]> {
    const profile = await getCurrentProfile();
    if (!profile) return [];

    const supabase = getSupabaseAdminClient();
    const { data: wishlistData } = await supabase
        .from("product_wishlist")
        .select("product_id")
        .eq("user_id", profile.id);

    return (wishlistData || []).map((r: { product_id: string }) => r.product_id);
}

// ─── إعجاب بالمنتج ───────────────────────────────────────

export async function likeProduct(productId: string) {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "الملف الشخصي غير موجود" };
    if (!(await productExists(productId.trim()))) return { success: false, error: "المنتج غير موجود" };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
        .from("product_likes")
        .insert({ user_id: profile.id, product_id: productId.trim() });

    if (error) {
        if (error.code === "23505") return { success: true };
        return { success: false, error: error.message };
    }

    revalidatePath("/products/[id]", "page");
    return { success: true };
}

export async function unlikeProduct(productId: string) {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "الملف الشخصي غير موجود" };

    const supabase = getSupabaseAdminClient();
    const { error: deleteError } = await supabase
        .from("product_likes")
        .delete()
        .eq("user_id", profile.id)
        .eq("product_id", productId.trim());

    if (deleteError) return { success: false, error: deleteError.message };
    revalidatePath("/products/[id]", "page");
    return { success: true };
}

export async function isProductLiked(productId: string): Promise<boolean> {
    const profile = await getCurrentProfile();
    if (!profile) return false;

    const supabase = getSupabaseAdminClient();
    const { data: likeRow } = await supabase
        .from("product_likes")
        .select("id")
        .eq("user_id", profile.id)
        .eq("product_id", productId.trim())
        .maybeSingle();

    return !!likeRow;
}

export async function getProductLikesCount(productId: string): Promise<number> {
    const supabase = getSupabaseAdminClient();
    const { count } = await supabase
        .from("product_likes")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);
    return count ?? 0;
}
