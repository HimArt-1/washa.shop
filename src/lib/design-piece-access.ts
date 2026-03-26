import { currentUser } from "@clerk/nextjs/server";
import { ensureProfile } from "@/lib/ensure-profile";

const ALLOWED_ROLES = ["admin", "wushsha", "subscriber"];

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

    const role = profile.role as string;

    if (ALLOWED_ROLES.includes(role)) {
        return { allowed: true, reason: "approved", profileId: profile.id };
    }

    return { allowed: false, reason: "guest_needs_approval" };
}
