import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";

// Leave empty to allow ALL authenticated users.
// Populate to restrict by role: ["admin", "wushsha", "subscriber"]
const ALLOWED_ROLES: string[] = [];

export async function resolveDesignPieceAccess(): Promise<{
    allowed: boolean;
    profileId?: string;
    clerkId?: string;
    role?: string;
    reason?: "not_signed_in" | "guest_needs_approval" | "approved";
}> {
    // Use auth() — reads JWT directly from request headers (no extra Clerk API network call).
    // This is the recommended pattern for Route Handlers in Clerk v6.
    const { userId } = await auth();
    if (!userId) {
        return { allowed: false, reason: "not_signed_in" };
    }

    // Fast path: look up profile directly in Supabase by clerk_id.
    // Avoids the extra currentUser() network call to Clerk's API for existing users.
    try {
        const supabase = getSupabaseAdminClient();
        const { data: profile } = await supabase
            .from("profiles")
            .select("id, role")
            .eq("clerk_id", userId)
            .maybeSingle();

        if (profile) {
            if (ALLOWED_ROLES.length === 0 || ALLOWED_ROLES.includes(profile.role as string)) {
                return {
                    allowed: true,
                    reason: "approved",
                    profileId: profile.id,
                    clerkId: userId,
                    role: profile.role as string,
                };
            }
            return { allowed: false, reason: "guest_needs_approval" };
        }
    } catch {
        // Supabase unavailable — fall through to ensureProfile
    }

    // Slow path: profile not found — try to auto-create it for first-time users.
    // ensureProfile() uses currentUser() to fetch full user data needed for creation.
    const created = await ensureProfile();
    if (!created) {
        return { allowed: false, reason: "guest_needs_approval" };
    }

    if (ALLOWED_ROLES.length === 0 || ALLOWED_ROLES.includes(created.role as string)) {
        return {
            allowed: true,
            reason: "approved",
            profileId: created.id,
            clerkId: userId,
            role: created.role as string,
        };
    }

    return { allowed: false, reason: "guest_needs_approval" };
}
