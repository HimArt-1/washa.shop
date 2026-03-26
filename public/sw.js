/**
 * وشّى | WASHA — Service Worker
 * PWA + Web Push + Offline Cache Strategy
 */

const CACHE_NAME = "wusha-v2";
const OFFLINE_URL = "/offline.html";

// Static assets to pre-cache
const PRECACHE_ASSETS = [
    OFFLINE_URL,
    "/icon-192.png",
    "/icon-512.png",
];

// ─── Install: Pre-cache offline page & critical assets ───
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
    self.skipWaiting();
});

// ─── Activate: Clean up old caches ──────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

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

// ─── Fetch Strategy ─────────────────────────────────────
// RSC, dashboard, API → Network only (no cache)
// Static assets (images, fonts, CSS, JS) → Stale-While-Revalidate
// Navigation → Network first, offline fallback
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = request.url;
    const pathname = new URL(url).pathname;

    // Skip non-GET requests
    if (request.method !== "GET") return;

    const isDtfStudio = pathname === "/design/dtf-studio" || pathname.startsWith("/design/dtf-studio/");

    if (isDtfStudio) {
        event.respondWith(fetch(request));
        return;
    }

    const isRSC = url.includes("_rsc=");
    const isDashboard = url.includes("/dashboard");
    const isApi = url.includes("/api/");

    // Network-only for RSC, dashboard, API
    if (isRSC || isDashboard || isApi) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(null, { status: 503, statusText: "Service Unavailable" })
            )
        );
        return;
    }

    // Navigation requests → network-first with offline fallback
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Static assets → stale-while-revalidate
    const isStaticAsset =
        url.match(/\.(png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?|ttf|css|js)(\?.*)?$/);

    if (isStaticAsset) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request)
                    .then((response) => {
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Everything else → network
    event.respondWith(fetch(request));
});
