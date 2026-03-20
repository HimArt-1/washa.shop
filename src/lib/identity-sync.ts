import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "@/types/database";

type ProfilesTable = Database["public"]["Tables"]["profiles"];
type ProfileRow = ProfilesTable["Row"];
type ProfileUpdate = ProfilesTable["Update"];
type ProfileInsert = ProfilesTable["Insert"];

export type IdentityUserSeed = {
    clerkId: string;
    email?: string | null;
    phone?: string | null;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
    role?: UserRole;
};

function normalizeEmail(email?: string | null) {
    return email?.trim().toLowerCase() || null;
}

function buildProfileDefaults(seed: IdentityUserSeed) {
    const email = normalizeEmail(seed.email);
    const displayName =
        [seed.firstName, seed.lastName].filter(Boolean).join(" ") ||
        seed.username ||
        "مستخدم وشّى";

    const baseUsername = (
        seed.username ||
        email?.split("@")[0] ||
        "user"
    )
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .slice(0, 20);

    return {
        display_name: displayName,
        username: `${baseUsername}_${Date.now().toString(36)}`,
        avatar_url: seed.imageUrl || null,
        bio: null,
        cover_url: null,
        website: null,
    };
}

export async function findProfileForIdentity(
    supabase: SupabaseClient<Database>,
    params: {
        clerkId?: string | null;
        email?: string | null;
        tempClerkId?: string | null;
    }
) {
    const email = normalizeEmail(params.email);

    if (params.clerkId) {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("clerk_id", params.clerkId)
            .maybeSingle();

        if (data) return data as ProfileRow;
    }

    if (params.tempClerkId) {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("clerk_id", params.tempClerkId)
            .maybeSingle();

        if (data) return data as ProfileRow;
    }

    if (email) {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", email)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) return data as ProfileRow;
    }

    return null;
}

export async function linkIdentityProfile(
    supabase: SupabaseClient<Database>,
    profileId: string,
    seed: IdentityUserSeed,
    extra: ProfileUpdate = {}
) {
    const payload: ProfileUpdate = {
        clerk_id: seed.clerkId,
        ...extra,
    };

    if (seed.email) payload.email = normalizeEmail(seed.email);
    if (seed.phone) payload.phone = seed.phone;
    if (seed.imageUrl) payload.avatar_url = seed.imageUrl;
    if (seed.firstName || seed.lastName || seed.username) {
        payload.display_name =
            [seed.firstName, seed.lastName].filter(Boolean).join(" ") ||
            seed.username ||
            undefined;
    }

    const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profileId)
        .select("*")
        .single();

    if (error) throw error;
    return data as ProfileRow;
}

export async function ensureIdentityProfile(
    supabase: SupabaseClient<Database>,
    seed: IdentityUserSeed,
    options: {
        tempClerkId?: string | null;
        role?: UserRole;
        additionalInsert?: Partial<ProfileInsert>;
        additionalUpdate?: ProfileUpdate;
    } = {}
) {
    const existing = await findProfileForIdentity(supabase, {
        clerkId: seed.clerkId,
        email: seed.email,
        tempClerkId: options.tempClerkId,
    });

    if (existing) {
        const existingClerkId = existing.clerk_id || "";
        const canRelink =
            !existingClerkId ||
            existingClerkId === seed.clerkId ||
            existingClerkId === options.tempClerkId ||
            existingClerkId.startsWith("app_");

        if (!canRelink) {
            return { profile: existing, action: "conflict" as const };
        }

        const linked = await linkIdentityProfile(supabase, existing.id, seed, options.additionalUpdate);
        return { profile: linked, action: "linked" as const };
    }

    const defaults = buildProfileDefaults(seed);
    const insertPayload: ProfileInsert = {
        clerk_id: seed.clerkId,
        role: options.role ?? seed.role ?? "subscriber",
        email: normalizeEmail(seed.email),
        phone: seed.phone || null,
        ...defaults,
        ...(options.additionalInsert || {}),
    };

    const { data, error } = await supabase
        .from("profiles")
        .insert(insertPayload)
        .select("*")
        .single();

    if (error) throw error;
    return { profile: data as ProfileRow, action: "created" as const };
}
