import { currentUser } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/ensure-profile";

// Leave empty to allow ALL authenticated users.
// Populate to restrict by role: ["admin", "wushsha", "subscriber"]
const ALLOWED_ROLES: string[] = [];

export async function resolveDesignPieceAccess(): Promise<{
    allowed: boolean;
    profileId?: string;
    reason?: "not_signed_in" | "guest_needs_approval" | "approved";
}> {
    const user = await currentUser();
    if (!user) {
        return { allowed: false, reason: "not_signed_in" };
    }

    const profile = await ensureProfile();

    if (!profile) {
        return { allowed: false, reason: "guest_needs_approval" };
    }

    // If ALLOWED_ROLES is empty, any authenticated user with a profile is allowed.
    // To restrict by role, populate the array above.
    if (ALLOWED_ROLES.length === 0 || ALLOWED_ROLES.includes(profile.role as string)) {
        return { allowed: true, reason: "approved", profileId: profile.id };
    }

    return { allowed: false, reason: "guest_needs_approval" };
}
