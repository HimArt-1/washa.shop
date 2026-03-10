"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { Database, DiscountCoupon } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize admin client to bypass RLS for server operations
// Note: We use the service key because validating coupons or listing them
// often requires elevated privileges not available to anonymous users.
function getAdminSb() {
    return createClient(supabaseUrl, supabaseServiceKey);
}

// ─── ADMIN ACTIONS ─────────────────────────────────────────────

export async function createDiscountCoupon(data: {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    max_uses?: number;
    valid_until?: string | null;
    details?: string | null;
    is_active?: boolean;
}) {
    const user = await currentUser();
    if (!user) return { error: "غير مصرح" };

    const sb = getAdminSb();

    // Verify admin
    const { data: profile } = await sb
        .from("profiles")
        .select("role")
        .eq("clerk_id", user.id)
        .single() as unknown as { data: { role: string } | null };

    if (profile?.role !== "admin") return { error: "صلاحيات غير كافية" };

    const { error, data: newCoupon } = await sb
        .from("discount_coupons")
        .insert({
            code: data.code.toUpperCase(),
            discount_type: data.discount_type,
            discount_value: data.discount_value,
            max_uses: data.max_uses || 0,
            valid_until: data.valid_until || null,
            details: data.details || null,
            is_active: data.is_active !== undefined ? data.is_active : true,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') return { error: "كود الخصم موجود مسبقاً" };
        return { error: error.message };
    }

    revalidatePath("/dashboard/coupons");
    return { success: true, data: newCoupon };
}

export async function getAllDiscountCoupons() {
    const sb = getAdminSb();
    const { data, error } = await sb
        .from("discount_coupons")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

export async function toggleCouponStatus(id: string, currentStatus: boolean) {
    const user = await currentUser();
    if (!user) return { error: "غير مصرح" };

    const sb = getAdminSb();
    const { data: profile } = await sb.from("profiles").select("role").eq("clerk_id", user.id).single() as unknown as { data: { role: string } | null };
    if (profile?.role !== "admin") return { error: "صلاحيات غير كافية" };

    const { error } = await sb
        .from("discount_coupons")
        .update({ is_active: !currentStatus })
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/coupons");
    return { success: true };
}

export async function deleteDiscountCoupon(id: string) {
    const user = await currentUser();
    if (!user) return { error: "غير مصرح" };

    const sb = getAdminSb();
    const { data: profile } = await sb.from("profiles").select("role").eq("clerk_id", user.id).single() as unknown as { data: { role: string } | null };
    if (profile?.role !== "admin") return { error: "صلاحيات غير كافية" };

    const { error } = await sb
        .from("discount_coupons")
        .delete()
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/coupons");
    return { success: true };
}

// ─── PUBLIC ACTIONS ─────────────────────────────────────────────

export async function validateDiscountCoupon(code: string) {
    if (!code) return { error: "كود غير صالح" };

    const sb = getAdminSb();
    const { data: coupon, error } = await sb
        .from("discount_coupons")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .single();

    if (error || !coupon) {
        return { error: "عذراً، هذا الكود غير صالح أو غير موجود." };
    }

    // Check expiration date
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        return { error: "لقد انتهت صلاحية كوبون الخصم هذا." };
    }

    // Check usage limits
    if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
        return { error: "تم الوصول للحد الأقصى لاستخدام هذا الكود." };
    }

    return { success: true, data: coupon };
}
