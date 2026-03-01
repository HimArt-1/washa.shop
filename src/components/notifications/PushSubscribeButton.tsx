"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { useUser } from "@clerk/nextjs";

/** زر طلب إذن الإشعارات — يعرض للمستخدمين المسجلين فقط */
export function PushSubscribeButton() {
    const { isSignedIn } = useUser();
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const hasVapid = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        setSupported(
            typeof window !== "undefined" &&
            "Notification" in window &&
            "serviceWorker" in window &&
            hasVapid
        );
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleSubscribe = async () => {
        if (!supported || !isSignedIn || permission === "granted") return;
        setLoading(true);
        try {
            if (Notification.permission === "default") {
                const result = await Notification.requestPermission();
                setPermission(result);
                if (result !== "granted") {
                    setLoading(false);
                    return;
                }
            }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                    ? (urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) as BufferSource)
                    : undefined,
            });
            const json = sub.toJSON();
            await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: json.endpoint,
                    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
                }),
            });
            setPermission("granted");
        } catch (e) {
            console.warn("[Push] Subscribe failed:", e);
        }
        setLoading(false);
    };

    if (!supported || !isSignedIn) return null;
    if (permission === "granted") {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-fg/40">
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                الإشعارات مفعّلة
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-fg/50 hover:text-gold transition-colors"
        >
            <BellOff className="w-3.5 h-3.5" />
            {loading ? "جاري..." : "تفعيل الإشعارات"}
        </button>
    );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
