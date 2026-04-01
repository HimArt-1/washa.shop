/**
 * وشّى | WASHA — Service Worker
 * PWA + Web Push + Offline Cache Strategy
 */

const SW_VERSION = "2026-04-css-recovery-1";
const CACHE_NAME = `wusha-shell-${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Static assets to pre-cache
const PRECACHE_ASSETS = [
    OFFLINE_URL,
    "/icon-192.png",
    "/icon-512.png",
];

function createServiceUnavailableResponse() {
    return new Response("Service Unavailable", {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}

function shouldCacheAssetResponse(response) {
    return Boolean(response && response.ok && response.type !== "error");
}

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

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// ─── Fetch Strategy ─────────────────────────────────────
// RSC, dashboard, API → Network only (no cache)
// Next.js CSS/JS/fonts → Browser/HTTP cache only
// Public images/icons → Stale-While-Revalidate
// Navigation → Network first, offline fallback
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = request.url;
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;

    // Skip non-HTTP(S) requests (e.g. chrome-extension://) — Cache API rejects them
    if (!url.startsWith("http://") && !url.startsWith("https://")) return;

    // Leave cross-origin requests to the browser.
    // Intercepting them here adds no value and can interfere with third-party assets.
    if (parsedUrl.origin !== self.location.origin) return;

    // Skip non-GET requests
    if (request.method !== "GET") return;

    const isDtfStudio = pathname === "/design/washa-ai" || pathname.startsWith("/design/washa-ai/");
    const isNextStatic = pathname.startsWith("/_next/");
    const isStylesheet = request.destination === "style";
    const isScript = request.destination === "script";
    const isFont = request.destination === "font";

    if (isDtfStudio) {
        // Keep the immersive DTF Studio outside SW interception completely.
        return;
    }

    if (isNextStatic || isStylesheet || isScript || isFont) {
        // Let the browser and Next.js manage versioned CSS/JS/font assets.
        // Intercepting them here risks mixed deploys and stale stylesheet states.
        return;
    }

    const isRSC = url.includes("_rsc=");
    const isDashboard = url.includes("/dashboard");
    const isApi = url.includes("/api/");

    // Network-only for RSC, dashboard, API
    if (isRSC || isDashboard || isApi) {
        event.respondWith(
            fetch(request).catch(() =>
                createServiceUnavailableResponse()
            )
        );
        return;
    }

    // Navigation requests → network-first with offline fallback
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () =>
                (await caches.match(OFFLINE_URL)) || createServiceUnavailableResponse()
            )
        );
        return;
    }

    // Public images/icons → stale-while-revalidate
    const isStaticAsset =
        request.destination === "image" ||
        url.match(/\.(png|jpg|jpeg|webp|avif|svg|gif|ico)(\?.*)?$/);

    if (isStaticAsset) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request)
                    .then((response) => {
                        if (shouldCacheAssetResponse(response)) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => cached || createServiceUnavailableResponse());
                return cached || fetchPromise;
            })
        );
        return;
    }

    // Everything else → network
    event.respondWith(
        fetch(request).catch(() =>
            request.mode === "navigate"
                ? caches.match(OFFLINE_URL).then((cached) => cached || createServiceUnavailableResponse())
                : createServiceUnavailableResponse()
        )
    );
});
