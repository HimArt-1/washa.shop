"use server";

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

function isPushEnabled() {
    return !!VAPID_PUBLIC && !!VAPID_PRIVATE;
}

export async function sendPushToAll(title: string, body: string, url?: string) {
    if (!isPushEnabled()) return { sent: 0 };
    try {
        webpush.setVapidDetails(
            "mailto:support@washa.shop",
            VAPID_PUBLIC!,
            VAPID_PRIVATE!
        );
        const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth");
        if (!subs?.length) return { sent: 0 };
        let sent = 0;
        const payload = JSON.stringify({ title, body, message: body, url });
        for (const sub of subs) {
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
                if ((e as any)?.statusCode === 410 || (e as any)?.statusCode === 404) {
                    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
                }
            }
        }
        return { sent };
    } catch (e) {
        console.error("[Push] sendToAll error:", e);
        return { sent: 0 };
    }
}
