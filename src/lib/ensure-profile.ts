// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Ensure Profile
//  إنشاء ملف subscriber تلقائياً عند أول دخول لمستخدم Clerk
// ═══════════════════════════════════════════════════════════

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { ensureIdentityProfile } from "@/lib/identity-sync";
import { sendAdminNewUserNotificationEmail } from "@/lib/email";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";

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

async function dispatchProfileCreatedAdminEmail(params: {
    clerkId: string;
    profileId: string;
    name: string;
    email: string | null;
    phone: string | null;
    username: string | null;
    action: "created" | "linked" | string;
}) {
    try {
        await runIdempotentDispatch(
            {
                dispatchKey: `clerk_user:${params.clerkId}:admin_email:user_created`,
                eventType: "user_created",
                channel: "email_admin",
                resourceType: "user",
                resourceId: params.profileId,
                metadata: {
                    clerk_id: params.clerkId,
                    profile_id: params.profileId,
                    email: params.email,
                    action: params.action,
                    source: "ensure_profile",
                },
            },
            async () => {
                const result = await sendAdminNewUserNotificationEmail({
                    name: params.name,
                    email: params.email,
                    phone: params.phone,
                    username: params.username,
                    clerkId: params.clerkId,
                    profileAction: params.action,
                });
                if (result.success === false) {
                    throw new Error("Failed to send admin new user email");
                }
            }
        );
    } catch (error) {
        console.error("[ensureProfile] Admin new user email:", error);
    }
}

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

        const displayName =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            "مستخدم وشّى";

        await dispatchProfileCreatedAdminEmail({
            clerkId: user.id,
            profileId: ensured.profile.id,
            name: displayName,
            email: primaryEmail,
            phone: primaryPhone,
            username: user.username,
            action: ensured.action,
        });

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
