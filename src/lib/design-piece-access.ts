import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

const ALLOWED_ROLES = ["admin", "wushsha", "subscriber"];

export async function resolveDesignPieceAccess(): Promise<{
    allowed: boolean;
    reason?: "not_signed_in" | "guest_needs_approval" | "approved";
}> {
    const user = await currentUser();
    if (!user) {
        return { allowed: false, reason: "not_signed_in" };
    }

    let supabase;
    try {
        supabase = getSupabaseAdminClient();
    } catch {
        return { allowed: false, reason: "guest_needs_approval" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile) {
        return { allowed: false, reason: "guest_needs_approval" };
    }

    const role = profile.role as string;

    if (ALLOWED_ROLES.includes(role)) {
        return { allowed: true, reason: "approved" };
    }

    return { allowed: false, reason: "guest_needs_approval" };
}
