import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getDevAdminUser, isDevAuthBypassEnabled } from "@/lib/dev-auth";
import { ensureIdentityProfile } from "@/lib/identity-sync";
import type { UserRole } from "@/types/database";

type ClerkEmailAddress = {
    id?: string | null;
    emailAddress?: string | null;
};

export type AdminAccessUser = {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    imageUrl?: string | null;
    primaryEmailAddressId?: string | null;
    emailAddresses?: ClerkEmailAddress[];
};

type ResolveAdminAccessOptions = {
    forceAdmin?: boolean;
};

type AdminAccessProfile = {
    id: string;
    role: UserRole;
};

const STAFF_ROLES: UserRole[] = ["admin", "dev", "shipping_manager", "financial_manager", "support_agent", "booth"];
const PLATFORM_ADMIN_ROLES: UserRole[] = ["admin", "dev"];

function normalizeEmail(email?: string | null) {
    return email?.trim().toLowerCase() || null;
}

function getPrimaryEmail(user: AdminAccessUser) {
    const primary = user.emailAddresses?.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress;
    return primary || user.emailAddresses?.[0]?.emailAddress || null;
}

export async function resolveAdminAccess(user: AdminAccessUser, options: ResolveAdminAccessOptions = {}) {
    const supabase = getSupabaseAdminClient();
    const forceAdmin = options.forceAdmin === true;
    const currentEmail = normalizeEmail(getPrimaryEmail(user));

    const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .maybeSingle();

    if (profileError) throw profileError;

    const profileRole = existingProfile?.role as UserRole | undefined;
    const isStaff = Boolean(profileRole && STAFF_ROLES.includes(profileRole));
    const isPlatformAdmin = Boolean(profileRole && PLATFORM_ADMIN_ROLES.includes(profileRole));

    if (isStaff) {
        return {
            supabase,
            profile: existingProfile as AdminAccessProfile,
            isAdmin: isPlatformAdmin,
            isStaff: true,
            bootstrapped: false,
        };
    }

    if (!forceAdmin) {
        const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

        if (!adminEmail || !currentEmail || adminEmail !== currentEmail) {
            return {
                supabase,
                profile: existingProfile as AdminAccessProfile | null,
                isAdmin: false,
                isStaff: false,
                bootstrapped: false,
            };
        }

        const { count: adminCount, error: adminCountError } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "admin");

        if (adminCountError) throw adminCountError;

        if ((adminCount ?? 0) > 0) {
            return {
                supabase,
                profile: existingProfile as AdminAccessProfile | null,
                isAdmin: false,
                isStaff: false,
                bootstrapped: false,
            };
        }
    }

    let profile = existingProfile as AdminAccessProfile | null;

    if (!profile) {
        const ensured = await ensureIdentityProfile(
            supabase,
            {
                clerkId: user.id,
                email: currentEmail,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl || null,
                role: "admin",
            },
            { role: "admin" }
        );

        if (ensured.action === "conflict") {
            return {
                supabase,
                profile: null,
                isAdmin: false,
                isStaff: false,
                bootstrapped: false,
            };
        }

        profile = { id: ensured.profile.id, role: ensured.profile.role as UserRole };
    }

    if (!profile) {
        return {
            supabase,
            profile: null,
            isAdmin: false,
            isStaff: false,
            bootstrapped: false,
        };
    }

    const { data: promotedProfile, error: promoteError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", profile.id)
        .select("id, role")
        .single();

    if (promoteError) throw promoteError;

    return {
        supabase,
        profile: promotedProfile as AdminAccessProfile,
        isAdmin: true,
        isStaff: true,
        bootstrapped: true,
    };
}

export async function getCurrentUserOrDevAdmin(): Promise<AdminAccessUser | null> {
    const user = await currentUser();
    if (user) {
        return user as AdminAccessUser;
    }

    if (!isDevAuthBypassEnabled()) {
        return null;
    }

    const devUser = getDevAdminUser();
    await resolveAdminAccess(devUser, { forceAdmin: true });
    return devUser;
}
