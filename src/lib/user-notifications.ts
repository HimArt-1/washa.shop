import { createClient } from "@supabase/supabase-js";
import type { NotificationPreferences, UserNotificationType } from "@/types/database";
import { sendPushToUser } from "@/lib/push";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    shouldSendUserPush,
} from "@/lib/notification-preferences";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";

function getNotificationsAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    return createClient(url, key, { auth: { persistSession: false } });
}

/** Internal service. Never expose this function from a `use server` module. */
export async function createUserNotification(data: {
    userId: string;
    type: UserNotificationType | string;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
}) {
    const supabase = getNotificationsAdminClient();
    const { data: notification, error } = await supabase
        .from("user_notifications")
        .insert({
            user_id: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link || null,
            metadata: data.metadata || {},
        })
        .select("id")
        .single();

    if (error || !notification?.id) {
        console.error("[createUserNotification]", error?.message || "Notification was not created");
        return { success: false as const, error: error?.message || "Notification was not created" };
    }

    const { data: storedPreferences, error: preferencesError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("profile_id", data.userId)
        .maybeSingle();

    if (preferencesError) {
        console.error("[createUserNotification:preferences] Push suppressed:", preferencesError.message);
        return { success: true as const };
    }

    const preferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(storedPreferences || {}),
        profile_id: data.userId,
        updated_at: storedPreferences?.updated_at || new Date(0).toISOString(),
    } as NotificationPreferences;

    if (shouldSendUserPush(preferences, data.type)) {
        try {
            await runIdempotentDispatch(
                {
                    dispatchKey: `user_notification:${notification.id}:push`,
                    eventType: "user_notification_push",
                    channel: "push_user",
                    resourceType: "user_notification",
                    resourceId: notification.id,
                    metadata: { notification_id: notification.id, user_id: data.userId, type: data.type },
                },
                async () => {
                    const delivery = await sendPushToUser(data.userId, data.title, data.message, data.link);
                    if (delivery.failed > 0) {
                        throw new Error(`Push delivery failed for ${delivery.failed} subscription(s)`);
                    }
                }
            );
        } catch (pushError) {
            console.warn("[createUserNotification:push] Push dispatch recorded as failed:", pushError);
        }
    }

    return { success: true as const };
}
