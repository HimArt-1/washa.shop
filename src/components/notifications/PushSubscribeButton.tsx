"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, ShieldAlert, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import type { PushSubscriptionScope } from "@/lib/push-subscription-scope";

type PushSubscribeButtonProps = {
    scope?: PushSubscriptionScope;
    variant?: "user" | "admin";
    mode?: "inline" | "icon";
    className?: string;
};

type SubscriptionStateResponse = {
    success?: boolean;
    enabledScopes?: PushSubscriptionScope[];
};

export function PushSubscribeButton({
    scope = "user",
    variant = scope === "admin" ? "admin" : "user",
    mode = "inline",
    className = "",
}: PushSubscribeButtonProps) {
    const { isSignedIn } = useUser();
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isScopeEnabled, setIsScopeEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function syncSubscriptionState() {
            const hasVapid = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            const canUsePush =
                typeof window !== "undefined" &&
                "Notification" in window &&
                "serviceWorker" in navigator &&
                hasVapid;

            if (cancelled) return;
            setSupported(canUsePush);

            if (typeof window !== "undefined" && "Notification" in window) {
                setPermission(Notification.permission);
            }

            if (!canUsePush || !isSignedIn) {
                setIsScopeEnabled(false);
                return;
            }

            try {
                const reg = await navigator.serviceWorker.ready;
                const subscription = await reg.pushManager.getSubscription();

                if (!subscription) {
                    if (!cancelled) {
                        setIsScopeEnabled(false);
                    }
                    return;
                }

                const response = await fetch(
                    `/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
                    { cache: "no-store" }
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch push subscription state");
                }

                const data = await response.json().catch(() => null) as SubscriptionStateResponse | null;
                if (!cancelled) {
                    setIsScopeEnabled((data?.enabledScopes || []).includes(scope));
                }
            } catch {
                if (!cancelled) {
                    setIsScopeEnabled(false);
                }
            }
        }

        syncSubscriptionState();

        return () => {
            cancelled = true;
        };
    }, [isSignedIn, scope]);

    const handleSubscribe = async () => {
        if (!supported || !isSignedIn || loading) return;
        setLoading(true);
        try {
            if (Notification.permission === "denied") {
                setPermission("denied");
                return;
            }

            if (Notification.permission === "default") {
                const result = await Notification.requestPermission();
                setPermission(result);
                if (result !== "granted") {
                    return;
                }
            }

            const reg = await navigator.serviceWorker.ready;
            const subscription = await getOrCreatePushSubscription(reg);

            const json = subscription.toJSON();
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: json.endpoint,
                    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
                    scope,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save push subscription");
            }

            const data = await response.json().catch(() => null) as SubscriptionStateResponse | null;
            setPermission("granted");
            setIsScopeEnabled((data?.enabledScopes || []).includes(scope));
        } catch (error) {
            console.warn("[Push] Subscribe failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!supported || !isSignedIn || loading) return;
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.getSubscription();
            if (!subscription) {
                setIsScopeEnabled(false);
                return;
            }

            const response = await fetch("/api/push/subscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endpoint: subscription.endpoint,
                    scope,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to remove push subscription");
            }

            const data = await response.json().catch(() => null) as SubscriptionStateResponse | null;
            const enabledScopes = data?.enabledScopes || [];

            if (!enabledScopes.length) {
                await subscription.unsubscribe().catch(() => false);
            }

            setIsScopeEnabled(enabledScopes.includes(scope));
            setPermission(Notification.permission);
        } catch (error) {
            console.warn("[Push] Unsubscribe failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!supported || !isSignedIn) return null;

    const labels = getLabels(variant, permission === "denied");
    const isEnabled = permission === "granted" && isScopeEnabled;
    const action = isEnabled ? handleUnsubscribe : handleSubscribe;

    if (mode === "icon") {
        const Icon = variant === "admin"
            ? (isEnabled ? ShieldCheck : ShieldAlert)
            : (isEnabled ? Bell : BellOff);

        return (
            <button
                type="button"
                onClick={action}
                disabled={loading}
                aria-label={isEnabled ? labels.disable : labels.enable}
                title={isEnabled ? labels.disable : labels.enable}
                className={getIconButtonClassName(variant, isEnabled, className)}
            >
                <Icon className="w-[18px] h-[18px]" />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={action}
            disabled={loading || permission === "denied"}
            className={getInlineButtonClassName(variant, isEnabled, className)}
        >
            {variant === "admin"
                ? (isEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />)
                : isEnabled
                    ? <Bell className="w-3.5 h-3.5" />
                    : <BellOff className="w-3.5 h-3.5" />
            }
            {loading ? "جاري..." : isEnabled ? labels.disable : labels.enable}
        </button>
    );
}

async function getOrCreatePushSubscription(reg: ServiceWorkerRegistration) {
    const existingSubscription = await reg.pushManager.getSubscription();
    if (existingSubscription) {
        return existingSubscription;
    }

    const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ? (urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) as BufferSource)
        : undefined;

    try {
        return await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
        });
    } catch (error: any) {
        if (error && typeof error === "object" && error.name === "InvalidStateError") {
            const staleSubscription = await reg.pushManager.getSubscription();
            if (staleSubscription) {
                await staleSubscription.unsubscribe().catch(() => false);
            }

            return reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });
        }

        throw error;
    }
}

function getLabels(variant: "user" | "admin", permissionDenied: boolean) {
    if (variant === "admin") {
        return permissionDenied
            ? { enable: "تنبيهات الإدارة محظورة", disable: "إيقاف تنبيهات الإدارة" }
            : { enable: "تفعيل تنبيهات الإدارة", disable: "إيقاف تنبيهات الإدارة" };
    }

    return permissionDenied
        ? { enable: "الإشعارات محظورة", disable: "إيقاف الإشعارات" }
        : { enable: "تفعيل الإشعارات", disable: "إيقاف الإشعارات" };
}

function getInlineButtonClassName(
    variant: "user" | "admin",
    isEnabled: boolean,
    className: string
) {
    if (variant === "admin") {
        return [
            "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-colors",
            isEnabled
                ? "border-amber-400/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-amber-500/20 hover:text-amber-300",
            className,
        ].join(" ").trim();
    }

    return [
        "inline-flex items-center gap-1.5 text-xs transition-colors",
        isEnabled
            ? "text-emerald-400 hover:text-emerald-300"
            : "text-theme-subtle hover:text-gold",
        className,
    ].join(" ").trim();
}

function getIconButtonClassName(
    variant: "user" | "admin",
    isEnabled: boolean,
    className: string
) {
    if (variant === "admin") {
        return [
            "relative p-2.5 rounded-xl border transition-colors",
            isEnabled
                ? "border-amber-400/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                : "border-theme-soft text-theme-subtle hover:text-amber-300 hover:border-amber-500/20 hover:bg-theme-subtle",
            className,
        ].join(" ").trim();
    }

    return [
        "relative p-2.5 rounded-xl transition-colors",
        isEnabled
            ? "text-emerald-400 hover:text-emerald-300 hover:bg-theme-subtle"
            : "text-theme-subtle hover:text-gold hover:bg-theme-subtle",
        className,
    ].join(" ").trim();
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
