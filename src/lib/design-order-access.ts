import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { CustomDesignOrder, Database } from "@/types/database";

export type DesignOrderAccessLevel = "none" | "token" | "owner" | "admin";

export type DesignOrderAccess = {
    sb: SupabaseClient<Database>;
    order: CustomDesignOrder | null;
    access: DesignOrderAccessLevel;
    profileId: string | null;
};

export async function getDesignOrderAccess(
    orderId: string,
    trackerToken?: string | null
): Promise<DesignOrderAccess> {
    const sb = getSupabaseAdminClient();
    const { data: order } = await sb
        .from("custom_design_orders")
        .select("*")
        .eq("id", orderId)
        .single();

    const designOrder = (order as CustomDesignOrder | null) ?? null;
    if (!designOrder) {
        return { sb, order: null, access: "none", profileId: null };
    }

    if (trackerToken && designOrder.tracker_token === trackerToken) {
        // التحقق من انتهاء صلاحية الرابط
        const expiresAt = designOrder.tracker_token_expires_at
            ? new Date(designOrder.tracker_token_expires_at)
            : null;
        if (expiresAt && expiresAt < new Date()) {
            return { sb, order: null, access: "none", profileId: null };
        }
        return { sb, order: designOrder, access: "token", profileId: null };
    }

    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        return { sb, order: null, access: "none", profileId: null };
    }

    const { data: profile } = await sb
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile) {
        return { sb, order: null, access: "none", profileId: null };
    }

    if (profile.role === "admin") {
        return { sb, order: designOrder, access: "admin", profileId: profile.id };
    }

    if (designOrder.user_id && designOrder.user_id === profile.id) {
        return { sb, order: designOrder, access: "owner", profileId: profile.id };
    }

    return { sb, order: null, access: "none", profileId: profile.id };
}
