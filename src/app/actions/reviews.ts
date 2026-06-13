"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";

const MAX_REVIEW_COMMENT_LENGTH = 1000;

function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

async function getProfileId(clerkId: string) {
    const supabase = getAdminClient();
    const { data } = await supabase.from("profiles").select("id").eq("clerk_id", clerkId).maybeSingle();
    return data?.id;
}

async function getProductReviewTarget(productId: string) {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("products")
        .select("id, artist_id")
        .eq("id", productId)
        .maybeSingle();

    return data as { id: string; artist_id: string } | null;
}

async function getArtworkReviewTarget(artworkId: string) {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("artworks")
        .select("id, artist_id, status")
        .eq("id", artworkId)
        .maybeSingle();

    return data as { id: string; artist_id: string; status: string } | null;
}

function normalizeReviewComment(comment?: string) {
    const normalized = comment?.trim() || null;
    if (!normalized) return { value: null, error: null };
    if (normalized.length > MAX_REVIEW_COMMENT_LENGTH) {
        return { value: null, error: `التعليق يجب أن لا يتجاوز ${MAX_REVIEW_COMMENT_LENGTH} حرف` };
    }
    return { value: normalized, error: null };
}

type ReviewWithUser = { id: string; rating: number; comment: string | null; created_at: string; user: { display_name: string; avatar_url: string | null } };

function normalizeReviewUser<T extends { user?: unknown }>(row: T): T & { user: { display_name: string; avatar_url: string | null } } {
    const u = row.user;
    const user = Array.isArray(u) ? (u[0] ?? { display_name: "", avatar_url: null }) : (u ?? { display_name: "", avatar_url: null });
    return { ...row, user } as T & { user: { display_name: string; avatar_url: string | null } };
}

export async function getProductReviews(productId: string): Promise<ReviewWithUser[]> {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("product_reviews")
        .select("id, rating, comment, created_at, user:profiles!product_reviews_user_id_fkey(display_name, avatar_url)")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);
    return ((data || []) as Record<string, unknown>[]).map(normalizeReviewUser) as ReviewWithUser[];
}

export async function submitProductReview(productId: string, rating: number, comment?: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول" };
    if (rating < 1 || rating > 5) return { success: false, error: "التقييم يجب أن يكون بين 1 و 5" };

    const profileId = await getProfileId(user.id);
    if (!profileId) return { success: false, error: "لم يتم العثور على الملف الشخصي" };

    const target = await getProductReviewTarget(productId.trim());
    if (!target) return { success: false, error: "المنتج غير موجود" };
    if (target.artist_id === profileId) return { success: false, error: "لا يمكنك تقييم منتجك" };

    const normalizedComment = normalizeReviewComment(comment);
    if (normalizedComment.error) return { success: false, error: normalizedComment.error };

    const supabase = getAdminClient();
    const { error } = await supabase
        .from("product_reviews")
        .upsert(
            { product_id: target.id, user_id: profileId, rating, comment: normalizedComment.value },
            { onConflict: "product_id,user_id" }
        );

    if (error) {
        console.error("[submitProductReview]", error);
        return { success: false, error: error.message };
    }

    await updateProductRating(productId);
    return { success: true };
}

async function updateProductRating(productId: string) {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_id", productId);
    const reviews = data || [];
    const avg = reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;
    await supabase
        .from("products")
        .update({ rating: Math.round(avg * 100) / 100, reviews_count: reviews.length })
        .eq("id", productId);
}

export async function getArtworkReviews(artworkId: string): Promise<ReviewWithUser[]> {
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("artwork_reviews")
        .select("id, rating, comment, created_at, user:profiles!artwork_reviews_user_id_fkey(display_name, avatar_url)")
        .eq("artwork_id", artworkId)
        .order("created_at", { ascending: false })
        .limit(50);
    return ((data || []) as Record<string, unknown>[]).map(normalizeReviewUser) as ReviewWithUser[];
}

export async function submitArtworkReview(artworkId: string, rating: number, comment?: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "يجب تسجيل الدخول" };
    if (rating < 1 || rating > 5) return { success: false, error: "التقييم يجب أن يكون بين 1 و 5" };

    const profileId = await getProfileId(user.id);
    if (!profileId) return { success: false, error: "لم يتم العثور على الملف الشخصي" };

    const target = await getArtworkReviewTarget(artworkId.trim());
    if (!target || target.status !== "published") {
        return { success: false, error: "العمل الفني غير متاح للتقييم" };
    }
    if (target.artist_id === profileId) return { success: false, error: "لا يمكنك تقييم عملك الفني" };

    const normalizedComment = normalizeReviewComment(comment);
    if (normalizedComment.error) return { success: false, error: normalizedComment.error };

    const supabase = getAdminClient();
    const { error } = await supabase
        .from("artwork_reviews")
        .upsert(
            { artwork_id: target.id, user_id: profileId, rating, comment: normalizedComment.value },
            { onConflict: "artwork_id,user_id" }
        );

    if (error) {
        console.error("[submitArtworkReview]", error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

export async function getUserProductReview(productId: string) {
    const user = await currentUser();
    if (!user) return null;
    const profileId = await getProfileId(user.id);
    if (!profileId) return null;
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("product_reviews")
        .select("id, rating, comment")
        .eq("product_id", productId)
        .eq("user_id", profileId)
        .maybeSingle();
    return data as { id: string; rating: number; comment: string | null } | null;
}

export async function getUserArtworkReview(artworkId: string) {
    const user = await currentUser();
    if (!user) return null;
    const profileId = await getProfileId(user.id);
    if (!profileId) return null;
    const supabase = getAdminClient();
    const { data } = await supabase
        .from("artwork_reviews")
        .select("id, rating, comment")
        .eq("artwork_id", artworkId)
        .eq("user_id", profileId)
        .maybeSingle();
    return data as { id: string; rating: number; comment: string | null } | null;
}
