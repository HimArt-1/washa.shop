"use server";

import { createClient } from "@supabase/supabase-js";
import type { UserNotificationType, UserNotification } from "@/types/database";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

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

export async function createUserNotification(data: {
    userId: string;
    type: UserNotificationType | string;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
}) {
    const supabase = getRawClient();
    const { error } = await supabase.from("user_notifications").insert({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        metadata: data.metadata || {},
    });

    if (error) {
        console.error("[createUserNotification]", error.message);
        return { success: false, error: error.message };
    }

    return { success: true };
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
