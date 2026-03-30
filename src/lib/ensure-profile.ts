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

export type EnsureProfileResult =
    | { status: "ok"; profile: EnsuredProfile }
    | { status: "not_signed_in" }
    | { status: "supabase_error" }
    | { status: "identity_conflict" };

function mapEnsuredProfile(profile: {
    id: string;
    clerk_id: string;
    display_name: string;
    username: string;
    role: string;
    avatar_url: string | null;
    bio: string | null;
    wushsha_level?: number | null;
    is_verified: boolean;
}) {
    return {
        id: profile.id,
        clerk_id: profile.clerk_id,
        display_name: profile.display_name,
        username: profile.username,
        role: profile.role,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        wushsha_level: profile.wushsha_level ?? null,
        is_verified: profile.is_verified,
    } satisfies EnsuredProfile;
}

/**
 * يتأكد من وجود ملف شخصي في Supabase للمستخدم الحالي.
 * إذا لم يكن موجوداً، يُنشئ واحداً بدور subscriber تلقائياً.
 * يُرجع الملف الشخصي أو null إذا لم يكن المستخدم مسجّل دخول.
 */
export async function ensureProfileWithStatus(): Promise<EnsureProfileResult> {
    try {
        const user = await currentUser();
        if (!user) return { status: "not_signed_in" };

        const supabase = getAdminSupabase();
        if (!supabase) return { status: "supabase_error" };

        const { data: existing, error: existingError } = await supabase
            .from("profiles")
            .select("id, clerk_id, display_name, username, role, avatar_url, bio, wushsha_level, is_verified")
            .eq("clerk_id", user.id)
            .maybeSingle();

        if (existingError) {
            console.error("[ensureProfile] Read existing profile:", existingError);
            return { status: "supabase_error" };
        }

        if (existing) {
            return { status: "ok", profile: mapEnsuredProfile(existing as EnsuredProfile) };
        }

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
            return { status: "identity_conflict" };
        }

        return { status: "ok", profile: mapEnsuredProfile(ensured.profile) };
    } catch (err) {
        console.error("[ensureProfile]", err);
        return { status: "supabase_error" };
    }
}

export async function ensureProfile(): Promise<EnsuredProfile | null> {
    const result = await ensureProfileWithStatus();
    return result.status === "ok" ? result.profile : null;
}
