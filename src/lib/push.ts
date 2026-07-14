"use server";

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import type { Database } from "@/types/database";
import { ADMIN_NOTIFICATION_ROLES } from "@/lib/notification-roles";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const MAX_PUSH_TITLE_LENGTH = 120;
const MAX_PUSH_BODY_LENGTH = 240;
const MAX_PUSH_URL_LENGTH = 512;

function getPushAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Push notifications require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient<Database>(url, key, { auth: { persistSession: false } });
}

function isPushEnabled() {
    return !!VAPID_PUBLIC && !!VAPID_PRIVATE;
}

function sanitizePushText(value: string, maxLength: number) {
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function sanitizePushUrl(url?: string) {
    if (!url) return undefined;
    const normalized = url.trim();
    if (!normalized || normalized.length > MAX_PUSH_URL_LENGTH) return undefined;
    if (!normalized.startsWith("/") || normalized.startsWith("//")) return undefined;
    return normalized;
}

async function sendPush(
    scope: "admins" | "all" | "user",
    title: string,
    body: string,
    url?: string,
    userId?: string
) {
    if (!isPushEnabled()) {
        await reportAdminOperationalAlert({
            dispatchKey: "push:vapid_config_missing",
            bucketMs: 6 * 60 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "تنبيهات البوش غير مهيأة",
            message: "مفاتيح VAPID غير مكتملة، لذلك لن يتم إرسال إشعارات البوش حتى تصحيح الإعدادات.",
            link: "/dashboard/settings",
            source: "push.config",
            metadata: {
                has_vapid_public: !!VAPID_PUBLIC,
                has_vapid_private: !!VAPID_PRIVATE,
                scope,
            },
        });
        return { sent: 0, failed: 0 };
    }

    const sanitizedTitle = sanitizePushText(title, MAX_PUSH_TITLE_LENGTH);
    const sanitizedBody = sanitizePushText(body, MAX_PUSH_BODY_LENGTH);
    const sanitizedUrl = sanitizePushUrl(url);

    if (!sanitizedTitle || !sanitizedBody) {
        return { sent: 0, failed: 0 };
    }

    try {
        const supabase = getPushAdminClient();
        webpush.setVapidDetails(
            "mailto:support@washa.shop",
            VAPID_PUBLIC!,
            VAPID_PRIVATE!
        );

        let subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }> = [];

        if (scope === "admins") {
            const { data: admins, error: adminsError } = await supabase
                .from("profiles")
                .select("id")
                .in("role", [...ADMIN_NOTIFICATION_ROLES]);
            if (adminsError) throw adminsError;

            const adminIds = (admins || []).map((item) => item.id);
            if (!adminIds.length) return { sent: 0, failed: 0 };

            const { data: subs, error: subscriptionsError } = await supabase
                .from("push_subscriptions")
                .select("endpoint, p256dh, auth")
                .in("scope", ["admin", "both"])
                .in("user_id", adminIds);
            if (subscriptionsError) throw subscriptionsError;

            subscriptions = (subs || []) as Array<{ endpoint: string; p256dh: string; auth: string }>;
        } else if (scope === "user" && userId) {
            const { data: subs, error: subscriptionsError } = await supabase
                .from("push_subscriptions")
                .select("endpoint, p256dh, auth")
                .in("scope", ["user", "both"])
                .eq("user_id", userId);
            if (subscriptionsError) throw subscriptionsError;

            subscriptions = (subs || []) as Array<{ endpoint: string; p256dh: string; auth: string }>;
        } else {
            const { data: subs, error: subscriptionsError } = await supabase
                .from("push_subscriptions")
                .select("endpoint, p256dh, auth")
                .in("scope", ["user", "both"]);
            if (subscriptionsError) throw subscriptionsError;

            subscriptions = (subs || []) as Array<{ endpoint: string; p256dh: string; auth: string }>;
        }

        if (!subscriptions.length) return { sent: 0, failed: 0 };

        const uniqueSubscriptions = Array.from(
            new Map(subscriptions.map((item) => [item.endpoint, item])).values()
        );

        let sent = 0;
        let failed = 0;
        const payload = JSON.stringify({
            title: sanitizedTitle,
            body: sanitizedBody,
            message: sanitizedBody,
            url: sanitizedUrl,
        });

        for (const sub of uniqueSubscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    payload
                );
                sent++;
            } catch (e) {
                const statusCode = (e as { statusCode?: number })?.statusCode;
                if (statusCode === 410 || statusCode === 404) {
                    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
                } else {
                    failed++;
                }
            }
        }
        return { sent, failed };
    } catch (e) {
        console.error("[Push] sendToAll error:", e);
        await reportAdminOperationalAlert({
            dispatchKey: `push:send_failed:${scope}`,
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "فشل إرسال إشعارات البوش",
            message: "حدث خطأ تشغيلي أثناء محاولة إرسال إشعارات البوش من الخادم.",
            link: "/dashboard/notifications",
            source: "push.send",
            metadata: {
                scope,
                error: e instanceof Error ? e.message : String(e),
            },
            stack: e instanceof Error ? e.stack ?? null : null,
        });
        return { sent: 0, failed: 1 };
    }
}

export async function sendPushToAdmins(title: string, body: string, url?: string) {
    return sendPush("admins", title, body, url);
}

export async function sendPushToAll(title: string, body: string, url?: string) {
    return sendPush("all", title, body, url);
}

export async function sendPushToUser(userId: string, title: string, body: string, url?: string) {
    return sendPush("user", title, body, url, userId);
}
