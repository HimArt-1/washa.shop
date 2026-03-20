"use client";

import { useEffect } from "react";

/** تسجيل Service Worker للـ PWA و Web Push */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        if (process.env.NODE_ENV === "development") {
            void (async () => {
                try {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(registrations.map((registration) => registration.unregister()));

                    if ("caches" in window) {
                        const cacheKeys = await window.caches.keys();
                        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
                    }

                    console.info("[SW] Development cleanup completed");
                } catch (error) {
                    console.warn("[SW] Development cleanup failed:", error);
                }
            })();
            return;
        }

        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
                console.log("[SW] Registered", reg.scope);
            })
            .catch((e) => {
                console.warn("[SW] Register failed:", e);
            });
    }, []);
    return null;
}
