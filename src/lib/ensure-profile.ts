// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Ensure Profile
//  إنشاء ملف subscriber تلقائياً عند أول دخول لمستخدم Clerk
// ═══════════════════════════════════════════════════════════

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ensureIdentityProfile } from "@/lib/identity-sync";

function getAdminSupabase() {
    try {
        return getSupabaseAdminClient();
    } catch {
        return null;
    }
}

export type EnsuredProfile = {
    id: string;
    clerk_id: string;
    display_name: string;
    username: string;
    role: string;
    avatar_url: string | null;
    bio: string | null;
    wushsha_level: number | null;
    is_verified: boolean;
};

/**
 * يتأكد من وجود ملف شخصي في Supabase للمستخدم الحالي.
 * إذا لم يكن موجوداً، يُنشئ واحداً بدور subscriber تلقائياً.
 * يُرجع الملف الشخصي أو null إذا لم يكن المستخدم مسجّل دخول.
 */
export async function ensureProfile(): Promise<EnsuredProfile | null> {
    try {
        const user = await currentUser();
        if (!user) return null;

        const supabase = getAdminSupabase();
        if (!supabase) return null;

        const { data: existing } = await supabase
            .from("profiles")
            .select("id, clerk_id, display_name, username, role, avatar_url, bio, wushsha_level, is_verified")
            .eq("clerk_id", user.id)
            .maybeSingle();

        if (existing) return existing as EnsuredProfile;

        const primaryEmail =
            user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress ||
            user.emailAddresses[0]?.emailAddress ||
            null;
        const primaryPhone =
            user.phoneNumbers.find((entry) => entry.id === user.primaryPhoneNumberId)?.phoneNumber ||
            user.phoneNumbers[0]?.phoneNumber ||
            null;

        const ensured = await ensureIdentityProfile(
            supabase,
            {
                clerkId: user.id,
                email: primaryEmail,
                phone: primaryPhone,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl || null,
                role: "subscriber",
            },
            { role: "subscriber" }
        );

        if (ensured.action === "conflict") {
            console.error("[ensureProfile] Identity conflict for clerk user:", user.id);
            return null;
        }

        return {
            id: ensured.profile.id,
            clerk_id: ensured.profile.clerk_id,
            display_name: ensured.profile.display_name,
            username: ensured.profile.username,
            role: ensured.profile.role,
            avatar_url: ensured.profile.avatar_url,
            bio: ensured.profile.bio,
            wushsha_level: ensured.profile.wushsha_level ?? null,
            is_verified: ensured.profile.is_verified,
        } satisfies EnsuredProfile;
    } catch (err) {
        console.error("[ensureProfile]", err);
        return null;
    }
}
