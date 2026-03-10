/**
 * وشّى | WASHA — Service Worker
 * PWA + Web Push — لا يعترض طلبات RSC أو /dashboard أو /api
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ─── Push Notifications ─────────────────────────────────
self.addEventListener("push", (event) => {
    const data = event.data?.json?.() || {};
    const opts = {
        body: data.body || data.message || "إشعار جديد",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || "wusha-push",
        data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(data.title || "وشّى", opts));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
            if (list.length) list[0].navigate(url).focus();
            else if (clients.openWindow) clients.openWindow(url);
        })
    );
});

// ─── Fetch: تمرير RSC و /dashboard و /api للشبكة فقط (لا تخزين) ───
self.addEventListener("fetch", (event) => {
    const url = event.request.url;
    const isRSC = url.includes("_rsc=");
    const isDashboard = url.includes("/dashboard");
    const isApi = url.includes("/api/");

    if (isRSC || isDashboard || isApi) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(null, { status: 503, statusText: "Service Unavailable" })
            )
        );
        return;
    }

    // باقي الطلبات: تمرير عادي (لا تخزين)
    event.respondWith(fetch(event.request));
});
