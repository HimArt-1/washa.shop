"use server";

import { createClient } from "@supabase/supabase-js";
import type { NotificationPreferences, UserNotification } from "@/types/database";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/notification-preferences";

// Raw client for user_notifications (bypasses typed schema to avoid postgrest-js never-type issue)
function getRawClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    return createClient(
        url,
        key,
        { auth: { persistSession: false } }
    );
}

async function getCurrentProfileId() {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const supabase = getRawClient();
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("clerk_id", userId)
            .maybeSingle();

        if (error) {
            console.error("[getCurrentProfileId]", error.message);
            return null;
        }

        return profile?.id ?? null;
    } catch (error) {
        console.error("[getCurrentProfileId] Failed to resolve auth state:", error);
        return null;
    }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const profileId = await getCurrentProfileId();
    if (!profileId) return null;

    const supabase = getRawClient();
    const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("profile_id", profileId)
        .maybeSingle();

    if (error) {
        console.error("[getNotificationPreferences]", error.message);
        return null;
    }

    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(data || {}),
        profile_id: profileId,
        updated_at: data?.updated_at || new Date(0).toISOString(),
    } as NotificationPreferences;
}

export async function updateNotificationPreferences(input: Partial<Pick<
    NotificationPreferences,
    | "push_enabled"
    | "order_updates"
    | "support_replies"
    | "design_updates"
    | "artist_updates"
    | "quiet_hours_start"
    | "quiet_hours_end"
    | "timezone"
>>) {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false as const, error: "Unauthorized" };

    const booleanKeys = [
        "push_enabled",
        "order_updates",
        "support_replies",
        "design_updates",
        "artist_updates",
    ] as const;
    const update: Record<string, boolean | string | null> = {};
    for (const key of booleanKeys) {
        if (typeof input[key] === "boolean") update[key] = input[key];
    }

    for (const key of ["quiet_hours_start", "quiet_hours_end"] as const) {
        const value = input[key];
        if (value === null || (typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value))) {
            update[key] = value;
        }
    }

    if (typeof input.timezone === "string" && input.timezone.length <= 80) {
        try {
            new Intl.DateTimeFormat("en", { timeZone: input.timezone }).format();
            update.timezone = input.timezone;
        } catch {
            return { success: false as const, error: "Invalid timezone" };
        }
    }

    const supabase = getRawClient();
    const { data: updated, error: updateError } = await supabase
        .from("notification_preferences")
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq("profile_id", profileId)
        .select("profile_id")
        .maybeSingle();

    if (updateError) return { success: false as const, error: updateError.message };

    if (!updated) {
        const { error: insertError } = await supabase.from("notification_preferences").insert({
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...update,
            profile_id: profileId,
            updated_at: new Date().toISOString(),
        });

        if (insertError?.code === "23505") {
            const { error: retryError } = await supabase
                .from("notification_preferences")
                .update({ ...update, updated_at: new Date().toISOString() })
                .eq("profile_id", profileId);
            if (retryError) return { success: false as const, error: retryError.message };
        } else if (insertError) {
            return { success: false as const, error: insertError.message };
        }
    }

    revalidatePath("/account/settings");
    return { success: true as const };
}

export async function getUserNotifications(limit = 20) {
    const profileId = await getCurrentProfileId();
    if (!profileId) return [];

    const supabase = getRawClient();

    const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        console.error("[getUserNotifications]", error.message);
        return [];
    }

    return (data || []) as UserNotification[];
}

export async function getUnreadUserNotificationsCount() {
    const profileId = await getCurrentProfileId();
    if (!profileId) return 0;

    const supabase = getRawClient();

    const { count, error } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profileId)
        .eq("is_read", false);

    if (error) {
        console.error("[getUnreadUserNotificationsCount]", error.message);
        return 0;
    }

    return count || 0;
}

export async function markUserNotificationRead(id: string) {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false };

    const raw = getRawClient();
    const { error } = await raw
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", profileId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/", "layout");
    return { success: true };
}

export async function markAllUserNotificationsRead() {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { success: false };

    const supabase = getRawClient();

    const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", profileId)
        .eq("is_read", false);

    if (error) return { success: false, error: error.message };

    revalidatePath("/", "layout");
    return { success: true };
}
