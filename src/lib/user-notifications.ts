import { createClient } from "@supabase/supabase-js";
import type { NotificationPreferences, UserNotificationType } from "@/types/database";
import { sendPushToUser } from "@/lib/push";
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    shouldSendUserPush,
} from "@/lib/notification-preferences";
import {
    DispatchDeliveryError,
    runIdempotentDispatch,
} from "@/lib/idempotent-dispatch";

const PUSH_RECOVERY_STALE_MS = 10 * 60 * 1000;
const PUSH_RECOVERY_BASE_DELAY_MS = 5 * 60 * 1000;
const PUSH_RECOVERY_MAX_ATTEMPTS = 5;

function getNotificationsAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    return createClient(url, key, { auth: { persistSession: false } });
}

type NotificationsAdminClient = ReturnType<typeof getNotificationsAdminClient>;

type StoredUserNotificationPush = {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
};

async function dispatchUserNotificationPush(
    supabase: NotificationsAdminClient,
    notification: StoredUserNotificationPush,
    dispatchKey = `user_notification:${notification.id}:push`,
    targetEndpoints?: string[]
) {
    return runIdempotentDispatch(
        {
            dispatchKey,
            eventType: "user_notification_push",
            channel: "push_user",
            resourceType: "user_notification",
            resourceId: notification.id,
            metadata: {
                notification_id: notification.id,
                user_id: notification.user_id,
                type: notification.type,
                ...(targetEndpoints?.length ? { failed_endpoints: targetEndpoints } : {}),
            },
        },
        async () => {
            const { data: storedPreferences, error: preferencesError } = await supabase
                .from("notification_preferences")
                .select("*")
                .eq("profile_id", notification.user_id)
                .maybeSingle();

            if (preferencesError) {
                throw new Error(`Notification preferences unavailable: ${preferencesError.message}`);
            }

            const preferences = {
                ...DEFAULT_NOTIFICATION_PREFERENCES,
                ...(storedPreferences || {}),
                profile_id: notification.user_id,
                updated_at: storedPreferences?.updated_at || new Date(0).toISOString(),
            } as NotificationPreferences;

            if (!shouldSendUserPush(preferences, notification.type)) return;

            const delivery = await sendPushToUser(
                notification.user_id,
                notification.title,
                notification.message,
                notification.link || undefined,
                targetEndpoints
            );
            if (delivery.failed > 0) {
                throw new DispatchDeliveryError(
                    `Push delivery failed for ${delivery.failed} subscription(s)`,
                    { failed_endpoints: delivery.failedEndpoints || targetEndpoints || [] }
                );
            }
        }
    );
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

    try {
        await dispatchUserNotificationPush(supabase, {
            id: notification.id,
            user_id: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link || null,
        });
    } catch (pushError) {
        console.warn("[createUserNotification:push] Push dispatch recorded as failed:", pushError);
    }

    return { success: true as const };
}

export async function recoverFailedUserNotificationPushes(limit = 50) {
    const supabase = getNotificationsAdminClient();
    const normalizedLimit = Number.isFinite(limit) ? Math.floor(limit) : 50;
    const safeLimit = Math.max(1, Math.min(100, normalizedLimit));
    const { data: failedDispatches, error: dispatchesError } = await supabase
        .from("event_dispatches")
        .select("id, dispatch_key, resource_id, status, attempt_count, updated_at, metadata")
        .eq("channel", "push_user")
        .eq("resource_type", "user_notification")
        .in("status", ["failed", "processing"])
        .order("updated_at", { ascending: true })
        .limit(Math.min(300, safeLimit * 3));

    if (dispatchesError) throw new Error(dispatchesError.message);

    const now = Date.now();
    const dispatches = (failedDispatches || []).filter((item) => {
        if (typeof item.dispatch_key !== "string" || typeof item.resource_id !== "string") return false;
        const metadata = item.metadata && typeof item.metadata === "object"
            ? item.metadata as Record<string, unknown>
            : {};
        if (metadata.recovery_terminal === true) return false;
        const updatedAtMs = new Date(item.updated_at).getTime();
        const ageMs = Number.isFinite(updatedAtMs) ? now - updatedAtMs : Number.POSITIVE_INFINITY;
        if (item.status === "processing") return ageMs >= PUSH_RECOVERY_STALE_MS;
        const attemptCount = Math.max(1, Number(item.attempt_count) || 1);
        if (attemptCount >= PUSH_RECOVERY_MAX_ATTEMPTS) return true;
        const retryDelayMs = PUSH_RECOVERY_BASE_DELAY_MS * (2 ** Math.max(0, attemptCount - 1));
        return ageMs >= retryDelayMs;
    }).slice(0, safeLimit) as Array<{
        id: string;
        dispatch_key: string;
        resource_id: string;
        status: "failed" | "processing";
        attempt_count: number;
        updated_at: string;
        metadata: Record<string, unknown> | null;
    }>;
    if (!dispatches.length) {
        return { ok: true, inspected: 0, recovered: 0, failed: 0, terminal: 0, skipped: 0 };
    }

    const notificationIds = Array.from(new Set(dispatches.map((item) => item.resource_id)));
    const { data: notifications, error: notificationsError } = await supabase
        .from("user_notifications")
        .select("id, user_id, type, title, message, link")
        .in("id", notificationIds);
    if (notificationsError) throw new Error(notificationsError.message);

    const notificationsById = new Map(
        ((notifications || []) as StoredUserNotificationPush[])
            .map((notification) => [notification.id, notification])
    );

    async function markTerminal(
        dispatch: typeof dispatches[number],
        reason: string,
        status: "abandoned" | "delivery_unknown" = "abandoned"
    ) {
        const metadata = dispatch.metadata && typeof dispatch.metadata === "object"
            ? dispatch.metadata
            : {};
        const { data, error } = await supabase
            .from("event_dispatches")
            .update({
                status,
                metadata: {
                    ...metadata,
                    recovery_terminal: true,
                    recovery_terminal_reason: reason,
                    recovery_terminal_at: new Date().toISOString(),
                },
                last_error: reason,
                updated_at: new Date().toISOString(),
            })
            .eq("id", dispatch.id)
            .eq("status", dispatch.status)
            .eq("attempt_count", dispatch.attempt_count)
            .eq("updated_at", dispatch.updated_at)
            .select("id")
            .maybeSingle();
        if (error) throw new Error(error.message);
        return Boolean(data?.id);
    }

    const results = await Promise.allSettled(dispatches.map(async (dispatch) => {
        if (dispatch.status === "processing") {
            const marked = await markTerminal(
                dispatch,
                "Push delivery outcome is unknown after a stale processing lease",
                "delivery_unknown"
            );
            return marked ? "terminal" as const : "skipped" as const;
        }
        if (Math.max(1, Number(dispatch.attempt_count) || 1) >= PUSH_RECOVERY_MAX_ATTEMPTS) {
            const marked = await markTerminal(dispatch, "Push recovery attempts exhausted");
            return marked ? "terminal" as const : "skipped" as const;
        }
        const notification = notificationsById.get(dispatch.resource_id);
        if (!notification) {
            const marked = await markTerminal(
                dispatch,
                `Notification ${dispatch.resource_id} is unavailable for push recovery`
            );
            return marked ? "terminal" as const : "skipped" as const;
        }
        const failedEndpoints = Array.isArray(dispatch.metadata?.failed_endpoints)
            ? dispatch.metadata.failed_endpoints.filter((endpoint): endpoint is string => typeof endpoint === "string")
            : undefined;
        const dispatchResult = await dispatchUserNotificationPush(
            supabase,
            notification,
            dispatch.dispatch_key,
            failedEndpoints?.length ? failedEndpoints : undefined
        );
        return dispatchResult.skipped ? "skipped" as const : "recovered" as const;
    }));
    const failed = results.filter((result) => result.status === "rejected").length;
    const terminal = results.filter(
        (result) => result.status === "fulfilled" && result.value === "terminal"
    ).length;
    const skipped = results.filter(
        (result) => result.status === "fulfilled" && result.value === "skipped"
    ).length;

    return {
        ok: failed === 0 && terminal === 0,
        inspected: results.length,
        recovered: results.length - failed - terminal - skipped,
        failed,
        terminal,
        skipped,
    };
}
