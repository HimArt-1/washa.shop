"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import type { Database, UserRole } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type ClerkUserWithProfile = {
    id: string;
    name: string;
    email: string | null;
    imageUrl: string | null;
    createdAt: number;
    lastSignInAt: number | null;
    profile: {
        id: string;
        role: UserRole;
        display_name: string;
        username: string;
        clerk_id: string;
    } | null;
    emailMatchedProfile: {
        id: string;
        role: UserRole;
        display_name: string;
        username: string;
        clerk_id: string;
    } | null;
    syncState: "linked" | "email_match" | "clerk_only";
};

type DuplicateProfileSummary = {
    id: string;
    display_name: string | null;
    username: string | null;
    clerk_id: string;
    created_at: string;
};

type AuthSyncSnapshot = {
    stats: {
        totalClerkUsers: number;
        linked: number;
        emailMatches: number;
        clerkOnly: number;
        tempProfiles: number;
        duplicateEmailGroups: number;
        duplicateProfiles: number;
    };
    recoverableQueue: ClerkUserWithProfile[];
    clerkOnlyQueue: ClerkUserWithProfile[];
    tempProfilesQueue: Array<{
        id: string;
        display_name: string | null;
        username: string | null;
        email: string | null;
        created_at: string;
        clerk_id: string | null;
    }>;
    duplicateEmailQueue: Array<{
        email: string;
        profiles: DuplicateProfileSummary[];
        mergeSuggestion: {
            primaryProfileId: string;
            secondaryProfileId: string;
        } | null;
    }>;
};

const PER_PAGE = 20;

function getAdminSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Missing Supabase service role configuration");
    }

    return createClient<Database>(url, key, { auth: { persistSession: false } });
}

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const supabase = getAdminSupabase();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden");
    }

    return { user, supabase };
}

function normalizeEmail(value: string | null | undefined) {
    return value?.trim().toLowerCase() || null;
}

function mapProfile(profile: Pick<ProfileRow, "id" | "role" | "display_name" | "username" | "clerk_id"> | null) {
    if (!profile) return null;

    return {
        id: profile.id,
        role: profile.role,
        display_name: profile.display_name,
        username: profile.username,
        clerk_id: profile.clerk_id,
    };
}

function getProfileStrengthScore(profile: DuplicateProfileSummary) {
    let score = 0;
    if (profile.clerk_id && !profile.clerk_id.startsWith("app_")) score += 5;
    if (profile.display_name) score += 2;
    if (profile.username) score += 1;
    score += new Date(profile.created_at).getTime() / 1_000_000_000_000;
    return score;
}

function getMergeSuggestion(profiles: DuplicateProfileSummary[]) {
    if (profiles.length !== 2) return null;

    const sorted = [...profiles].sort((a, b) => getProfileStrengthScore(b) - getProfileStrengthScore(a));
    return {
        primaryProfileId: sorted[0]!.id,
        secondaryProfileId: sorted[1]!.id,
    };
}

async function fetchAllClerkUsers(limit = 100, maxPages = 5) {
    const client = await clerkClient();
    const all: Awaited<ReturnType<typeof client.users.getUserList>>["data"] = [];

    for (let page = 0; page < maxPages; page += 1) {
        const offset = page * limit;
        const { data } = await client.users.getUserList({
            limit,
            offset,
            orderBy: "-created_at",
        });

        if (!data.length) break;
        all.push(...data);
        if (data.length < limit) break;
    }

    return all;
}

async function buildClerkUserIdentityIndex(
    supabase: ReturnType<typeof getAdminSupabase>,
    clerkUsers: Awaited<ReturnType<typeof fetchAllClerkUsers>>
) {
    const clerkIds = Array.from(new Set(clerkUsers.map((user) => user.id)));
    const emails = Array.from(
        new Set(
            clerkUsers
                .map((user) => normalizeEmail(user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress))
                .filter((value): value is string => Boolean(value))
        )
    );

    const [linkedProfilesRes, emailProfilesRes] = await Promise.all([
        clerkIds.length
            ? supabase
                .from("profiles")
                .select("id, clerk_id, role, display_name, username, email")
                .in("clerk_id", clerkIds)
            : Promise.resolve({ data: [], error: null }),
        emails.length
            ? supabase
                .from("profiles")
                .select("id, clerk_id, role, display_name, username, email")
                .in("email", emails)
            : Promise.resolve({ data: [], error: null }),
    ]);

    if (linkedProfilesRes.error) throw linkedProfilesRes.error;
    if (emailProfilesRes.error) throw emailProfilesRes.error;

    const profileByClerkId = new Map(
        (linkedProfilesRes.data || []).map((profile) => [profile.clerk_id, profile])
    );
    const profileByEmail = new Map(
        (emailProfilesRes.data || [])
            .map((profile) => [normalizeEmail(profile.email), profile] as const)
            .filter((entry): entry is [string, (typeof emailProfilesRes.data)[number]] => Boolean(entry[0]))
    );

    return { profileByClerkId, profileByEmail };
}

function mapClerkUser(
    user: Awaited<ReturnType<typeof fetchAllClerkUsers>>[number],
    indexes: Awaited<ReturnType<typeof buildClerkUserIdentityIndex>>
): ClerkUserWithProfile {
    const primaryEmail = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ?? null;
    const directProfile = indexes.profileByClerkId.get(user.id) ?? null;
    const emailProfile = !directProfile ? indexes.profileByEmail.get(normalizeEmail(primaryEmail) || "") ?? null : null;

    return {
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || primaryEmail || "—",
        email: primaryEmail,
        imageUrl: user.imageUrl ?? null,
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt ?? null,
        profile: mapProfile(directProfile),
        emailMatchedProfile: mapProfile(emailProfile),
        syncState: directProfile ? "linked" : emailProfile ? "email_match" : "clerk_only",
    };
}

export async function getClerkUsersList(
    page: number = 1,
    query: string = ""
): Promise<{
    data: ClerkUserWithProfile[];
    totalCount: number;
    totalPages: number;
}> {
    const { supabase } = await requireAdmin();

    const client = await clerkClient();
    const offset = (page - 1) * PER_PAGE;
    const { data: clerkUsers, totalCount } = await client.users.getUserList({
        limit: PER_PAGE,
        offset,
        query: query.trim() || undefined,
        orderBy: "-created_at",
    });

    if (!clerkUsers.length) {
        return { data: [], totalCount: totalCount ?? 0, totalPages: 0 };
    }

    const indexes = await buildClerkUserIdentityIndex(supabase, clerkUsers);

    return {
        data: clerkUsers.map((user) => mapClerkUser(user, indexes)),
        totalCount: totalCount ?? 0,
        totalPages: Math.ceil((totalCount ?? 0) / PER_PAGE),
    };
}

export async function getClerkIdentitySnapshot(): Promise<AuthSyncSnapshot> {
    const { supabase } = await requireAdmin();

    const [clerkUsers, tempProfilesRes, profilesRes] = await Promise.all([
        fetchAllClerkUsers(),
        supabase
            .from("profiles")
            .select("id, display_name, username, email, created_at, clerk_id")
            .like("clerk_id", "app_%")
            .order("created_at", { ascending: false })
            .limit(8),
        supabase
            .from("profiles")
            .select("id, display_name, username, email, created_at, clerk_id")
            .not("email", "is", null)
            .order("created_at", { ascending: false }),
    ]);

    if (tempProfilesRes.error) throw tempProfilesRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const indexes = await buildClerkUserIdentityIndex(supabase, clerkUsers);
    const normalized = clerkUsers.map((user) => mapClerkUser(user, indexes));
    const duplicateGroups = new Map<
        string,
        Array<{
            id: string;
            display_name: string | null;
            username: string | null;
            clerk_id: string;
            created_at: string;
        }>
    >();

    for (const profile of profilesRes.data || []) {
        const email = normalizeEmail(profile.email);
        if (!email) continue;
        const group = duplicateGroups.get(email) || [];
        group.push({
            id: profile.id,
            display_name: profile.display_name,
            username: profile.username,
            clerk_id: profile.clerk_id,
            created_at: profile.created_at,
        });
        duplicateGroups.set(email, group);
    }

    const duplicateEmailQueue = Array.from(duplicateGroups.entries())
        .filter(([, profiles]) => profiles.length > 1)
        .map(([email, profiles]) => ({
            email,
            profiles,
            mergeSuggestion: getMergeSuggestion(profiles),
        }))
        .sort((a, b) => b.profiles.length - a.profiles.length)
        .slice(0, 6);
    const duplicateProfilesCount = duplicateEmailQueue.reduce((sum, group) => sum + group.profiles.length, 0);

    return {
        stats: {
            totalClerkUsers: normalized.length,
            linked: normalized.filter((user) => user.syncState === "linked").length,
            emailMatches: normalized.filter((user) => user.syncState === "email_match").length,
            clerkOnly: normalized.filter((user) => user.syncState === "clerk_only").length,
            tempProfiles: tempProfilesRes.data?.length ?? 0,
            duplicateEmailGroups: duplicateEmailQueue.length,
            duplicateProfiles: duplicateProfilesCount,
        },
        recoverableQueue: normalized.filter((user) => user.syncState === "email_match").slice(0, 6),
        clerkOnlyQueue: normalized.filter((user) => user.syncState === "clerk_only").slice(0, 6),
        tempProfilesQueue: tempProfilesRes.data || [],
        duplicateEmailQueue,
    };
}

export async function linkClerkUserToProfile(clerkUserId: string, profileId: string) {
    const { supabase } = await requireAdmin();
    const client = await clerkClient();

    if (!clerkUserId || !profileId) {
        return { success: false, error: "بيانات الربط غير مكتملة" };
    }

    const [clerkUser, profileRes] = await Promise.all([
        client.users.getUser(clerkUserId),
        supabase
            .from("profiles")
            .select("id, clerk_id, email, phone")
            .eq("id", profileId)
            .single(),
    ]);

    if (profileRes.error || !profileRes.data) {
        return { success: false, error: "ملف المنصة غير موجود" };
    }

    const primaryEmail = normalizeEmail(
        clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress
    );
    const clerkPhone = clerkUser.phoneNumbers.find((phone) => phone.id === clerkUser.primaryPhoneNumberId)?.phoneNumber ?? null;
    const existingClerkId = profileRes.data.clerk_id;

    if (existingClerkId && existingClerkId !== clerkUserId && !existingClerkId.startsWith("app_")) {
        return { success: false, error: "الملف مربوط مسبقًا بحساب Clerk مختلف" };
    }

    if (profileRes.data.email && primaryEmail && normalizeEmail(profileRes.data.email) !== primaryEmail) {
        return { success: false, error: "البريد في الملف لا يطابق البريد في Clerk" };
    }

    const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
        clerk_id: clerkUserId,
    };

    if (!profileRes.data.email && primaryEmail) {
        updatePayload.email = primaryEmail;
    }

    if (!profileRes.data.phone && clerkPhone) {
        updatePayload.phone = clerkPhone;
    }

    const { error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profileId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users-clerk");
    revalidatePath(`/dashboard/users/${profileId}`);

    return { success: true };
}

export async function mergeDuplicateProfiles(primaryProfileId: string, secondaryProfileId: string) {
    const { supabase, user } = await requireAdmin();

    if (!primaryProfileId || !secondaryProfileId || primaryProfileId === secondaryProfileId) {
        return { success: false, error: "بيانات الدمج غير صالحة" };
    }

    const [primaryRes, secondaryRes] = await Promise.all([
        supabase
            .from("profiles")
            .select("*")
            .eq("id", primaryProfileId)
            .single(),
        supabase
            .from("profiles")
            .select("*")
            .eq("id", secondaryProfileId)
            .single(),
    ]);

    if (primaryRes.error || !primaryRes.data || secondaryRes.error || !secondaryRes.data) {
        return { success: false, error: "أحد الملفين غير موجود" };
    }

    const primary = primaryRes.data;
    const secondary = secondaryRes.data;
    const primaryEmail = normalizeEmail(primary.email);
    const secondaryEmail = normalizeEmail(secondary.email);

    if (!primaryEmail || !secondaryEmail || primaryEmail !== secondaryEmail) {
        return { success: false, error: "لا يمكن الدمج إلا بين ملفين يتشاركان نفس البريد" };
    }

    if (secondary.role === "admin") {
        return { success: false, error: "لا يمكن دمج ملف أدمن ثانوي تلقائيًا" };
    }

    const strongerClerkId =
        primary.clerk_id && !primary.clerk_id.startsWith("app_")
            ? primary.clerk_id
            : secondary.clerk_id && !secondary.clerk_id.startsWith("app_")
              ? secondary.clerk_id
              : primary.clerk_id;

    const primaryRole = primary.role === "admin"
        ? "admin"
        : primary.role === "wushsha" || secondary.role === "wushsha"
          ? "wushsha"
          : "subscriber";

    const primaryLevel = primary.wushsha_level ?? secondary.wushsha_level ?? null;

    const dedupeTables = [
        {
            table: "product_wishlist",
            keyColumn: "product_id",
        },
        {
            table: "product_likes",
            keyColumn: "product_id",
        },
        {
            table: "product_reviews",
            keyColumn: "product_id",
        },
        {
            table: "artwork_reviews",
            keyColumn: "artwork_id",
        },
    ] as const;

    for (const dedupe of dedupeTables) {
        const { data: sourceRows, error: sourceError } = await supabase
            .from(dedupe.table as any)
            .select(`id, ${dedupe.keyColumn}`)
            .eq("user_id", secondaryProfileId);
        if (sourceError) return { success: false, error: sourceError.message };

        const sourceRowsUntyped = (sourceRows || []) as Array<Record<string, any>>;
        const keys = sourceRowsUntyped.map((row) => row[dedupe.keyColumn]);
        if (!keys.length) continue;

        const { data: targetRows, error: targetError } = await supabase
            .from(dedupe.table as any)
            .select(`id, ${dedupe.keyColumn}`)
            .eq("user_id", primaryProfileId)
            .in(dedupe.keyColumn, keys);
        if (targetError) return { success: false, error: targetError.message };

        const targetRowsUntyped = (targetRows || []) as Array<Record<string, any>>;
        const duplicateKeys = new Set(targetRowsUntyped.map((row) => row[dedupe.keyColumn]));
        const duplicateRowIds = sourceRowsUntyped
            .filter((row) => duplicateKeys.has(row[dedupe.keyColumn]))
            .map((row) => row.id);

        if (duplicateRowIds.length) {
            const { error: deleteError } = await supabase
                .from(dedupe.table as any)
                .delete()
                .in("id", duplicateRowIds);
            if (deleteError) return { success: false, error: deleteError.message };
        }

        const { error: updateError } = await supabase
            .from(dedupe.table as any)
            .update({ user_id: primaryProfileId })
            .eq("user_id", secondaryProfileId);
        if (updateError) return { success: false, error: updateError.message };
    }

    const transferSteps: Array<{ table: string; column: string }> = [
        { table: "orders", column: "buyer_id" },
        { table: "applications", column: "profile_id" },
        { table: "support_tickets", column: "user_id" },
        { table: "support_messages", column: "sender_id" },
        { table: "user_notifications", column: "user_id" },
        { table: "custom_design_orders", column: "user_id" },
        { table: "artworks", column: "artist_id" },
        { table: "products", column: "artist_id" },
        { table: "page_visits", column: "user_id" },
        { table: "system_logs", column: "user_id" },
        { table: "inventory_transactions", column: "created_by" },
        { table: "sales_records", column: "created_by" },
        { table: "push_subscriptions", column: "user_id" },
    ];

    for (const step of transferSteps) {
        const { error } = await supabase
            .from(step.table as any)
            .update({ [step.column]: primaryProfileId })
            .eq(step.column, secondaryProfileId);
        if (error) return { success: false, error: error.message };
    }

    const followPairs = [
        { ownerColumn: "follower_id", counterpartColumn: "artist_id" },
        { ownerColumn: "artist_id", counterpartColumn: "follower_id" },
    ] as const;

    for (const pair of followPairs) {
        const { data: sourceRows, error: sourceError } = await supabase
            // `artist_follows` is not represented in the generated Database type.
            .from("artist_follows" as any)
            .select(`id, ${pair.counterpartColumn}`)
            .eq(pair.ownerColumn, secondaryProfileId);
        if (sourceError) return { success: false, error: sourceError.message };

        const sourceFollowRows = (sourceRows || []) as Array<Record<string, any>>;
        const counterpartIds = sourceFollowRows.map((row) => row[pair.counterpartColumn]);
        if (counterpartIds.length) {
            const { data: targetRows, error: targetError } = await supabase
                .from("artist_follows" as any)
                .select(`id, ${pair.counterpartColumn}`)
                .eq(pair.ownerColumn, primaryProfileId)
                .in(pair.counterpartColumn, counterpartIds);
            if (targetError) return { success: false, error: targetError.message };

            const targetFollowRows = (targetRows || []) as Array<Record<string, any>>;
            const duplicateCounterparts = new Set(targetFollowRows.map((row) => row[pair.counterpartColumn]));
            const duplicateIds = sourceFollowRows
                .filter((row) => duplicateCounterparts.has(row[pair.counterpartColumn]))
                .map((row) => row.id);

            if (duplicateIds.length) {
                const { error: deleteError } = await supabase
                    .from("artist_follows" as any)
                    .delete()
                    .in("id", duplicateIds);
                if (deleteError) return { success: false, error: deleteError.message };
            }
        }

        const { error: updateError } = await supabase
            .from("artist_follows" as any)
            .update({ [pair.ownerColumn]: primaryProfileId })
            .eq(pair.ownerColumn, secondaryProfileId);
        if (updateError) return { success: false, error: updateError.message };
    }

    const { error: primaryUpdateError } = await supabase
        .from("profiles")
        .update({
            clerk_id: strongerClerkId,
            role: primaryRole,
            wushsha_level: primaryLevel,
            display_name: primary.display_name || secondary.display_name,
            username: primary.username || secondary.username,
            email: primary.email || secondary.email,
            phone: primary.phone || secondary.phone,
            avatar_url: primary.avatar_url || secondary.avatar_url,
            bio: primary.bio || secondary.bio,
            website: primary.website || secondary.website,
        })
        .eq("id", primaryProfileId);

    if (primaryUpdateError) {
        return { success: false, error: primaryUpdateError.message };
    }

    const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", secondaryProfileId);

    if (deleteError) {
        return { success: false, error: deleteError.message };
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/users-clerk");
    revalidatePath(`/dashboard/users/${primaryProfileId}`);

    return {
        success: true,
        mergedInto: primaryProfileId,
        removedProfileId: secondaryProfileId,
        message: `تم دمج الملف المكرر في الهوية الأساسية بواسطة ${user.id}`,
    };
}
