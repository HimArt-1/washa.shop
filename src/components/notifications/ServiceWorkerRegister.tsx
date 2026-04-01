"use client";

import { useEffect } from "react";

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || "dev";

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

        const hadController = Boolean(navigator.serviceWorker.controller);
        let hasReloadedForUpdate = false;

        const handleControllerChange = () => {
            if (!hadController || hasReloadedForUpdate) return;
            hasReloadedForUpdate = true;
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        navigator.serviceWorker
            .register(`/sw.js?v=${BUILD_VERSION}`, {
                scope: "/",
                updateViaCache: "none",
            })
            .then(async (reg) => {
                console.log("[SW] Registered", reg.scope);

                await reg.update().catch((error) => {
                    console.warn("[SW] Update check failed:", error);
                });

                const promoteWaitingWorker = (worker: ServiceWorker | null) => {
                    if (!worker || !hadController) return;
                    worker.postMessage({ type: "SKIP_WAITING" });
                };

                promoteWaitingWorker(reg.waiting);

                reg.addEventListener("updatefound", () => {
                    const installing = reg.installing;
                    if (!installing) return;

                    installing.addEventListener("statechange", () => {
                        if (installing.state === "installed") {
                            promoteWaitingWorker(reg.waiting || installing);
                        }
                    });
                });
            })
            .catch((e) => {
                console.warn("[SW] Register failed:", e);
            });

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);
    return null;
}
