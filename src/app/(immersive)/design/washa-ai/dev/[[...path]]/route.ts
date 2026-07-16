import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { ensureWashaAiDevSurfaceAccess } from "@/lib/washa-ai-dev-access";

export const runtime = "nodejs";

const DIST_ROOT = path.join(process.cwd(), "washa-dtf-studio", "dist");
const DEV_APP_PATH = "/design/washa-ai/dev";
const DEV_APP_SCOPE = "/design/washa-ai/dev";
const APP_ASSET_PATH = "/design/washa-ai/app";

const DEV_MANIFEST = {
    name: "WASHA AI Dev Studio",
    short_name: "WASHA AI",
    description: "النسخة التطويرية من WASHA AI لتصميم قطع DTF بالذكاء الاصطناعي.",
    start_url: DEV_APP_PATH,
    scope: DEV_APP_SCOPE,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    background_color: "#FAF8F4",
    theme_color: "#FAF8F4",
    orientation: "any",
    dir: "rtl",
    lang: "ar",
    categories: ["shopping", "design", "lifestyle"],
    icons: [
        {
            src: "/icon-192.png?v=20260630",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
        },
        {
            src: "/icon-512.png?v=20260630",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
        },
    ],
    shortcuts: [
        {
            name: "ابدأ التصميم",
            short_name: "تصميم",
            url: DEV_APP_PATH,
            icons: [{ src: "/icon-192.png?v=20260630", sizes: "192x192", type: "image/png" }],
        },
        {
            name: "واجهة WASHA AI الحالية",
            short_name: "الحالية",
            url: "/design/washa-ai/app",
            icons: [{ src: "/icon-192.png?v=20260630", sizes: "192x192", type: "image/png" }],
        },
    ],
};

function getContentType(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") return "text/html; charset=utf-8";
    if (ext === ".js") return "application/javascript; charset=utf-8";
    if (ext === ".css") return "text/css; charset=utf-8";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".svg") return "image/svg+xml";
    if (ext === ".json") return "application/json; charset=utf-8";
    if (ext === ".ico") return "image/x-icon";
    return "application/octet-stream";
}

function readUtf8(filePath: string) {
    return readFile(filePath, "utf8");
}

function extractShellAssetPaths(indexHtml: string) {
    const assetPaths = new Set<string>();
    const assetPattern = /(?:src|href)="(\/design\/washa-ai\/app\/[^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = assetPattern.exec(indexHtml)) !== null) {
        assetPaths.add(match[1]);
    }

    return Array.from(assetPaths);
}

function injectDevPwaTags(indexHtml: string) {
    if (indexHtml.includes("/design/washa-ai/dev/manifest.webmanifest")) {
        return indexHtml;
    }

    const pwaTags = [
        '<link rel="manifest" href="/design/washa-ai/dev/manifest.webmanifest" />',
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
        '<meta name="application-name" content="WASHA AI Dev Studio" />',
        '<meta name="apple-mobile-web-app-title" content="WASHA AI" />',
        '<meta name="format-detection" content="telephone=no" />',
        `<script>
          if ('serviceWorker' in navigator && window.location.pathname.indexOf('/design/washa-ai/dev') === 0) {
            window.addEventListener('load', function () {
              navigator.serviceWorker.register('/design/washa-ai/dev/sw.js', { scope: '/design/washa-ai/dev' }).catch(function () {});
            });
          }
        </script>`,
    ].join("\n    ");

    return indexHtml.replace("</head>", `    ${pwaTags}\n  </head>`);
}

async function readDevHtmlShell() {
    const indexHtml = await readUtf8(path.join(DIST_ROOT, "index.html"));
    return injectDevPwaTags(indexHtml);
}

async function buildDevServiceWorker() {
    const indexHtml = await readUtf8(path.join(DIST_ROOT, "index.html"));
    const shellAssets = extractShellAssetPaths(indexHtml);
    const versionSeed = shellAssets.join("|").replace(/[^a-zA-Z0-9_-]/g, "").slice(-40) || "dev";
    const cacheName = `washa-ai-dev-${versionSeed}`;
    const precacheAssets = [
        "/offline.html",
        "/icon-192.png?v=20260630",
        "/icon-512.png?v=20260630",
        `${APP_ASSET_PATH}/header-logo-identity.png`,
        ...shellAssets,
    ];

    return `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const DEV_APP_PATH = ${JSON.stringify(DEV_APP_PATH)};
const DEV_APP_SCOPE = ${JSON.stringify(DEV_APP_SCOPE)};
const APP_ASSET_PATH = ${JSON.stringify(APP_ASSET_PATH)};
const OFFLINE_URL = "/offline.html";
const PRECACHE_ASSETS = ${JSON.stringify(precacheAssets)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("washa-ai-dev-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isDevNavigation(pathname) {
  return pathname === DEV_APP_PATH || pathname.startsWith(DEV_APP_PATH + "/");
}

function isRuntimeApi(pathname) {
  return pathname.startsWith("/api/");
}

function isStudioAsset(pathname, destination) {
  return pathname.startsWith(APP_ASSET_PATH + "/assets/") ||
    pathname.startsWith(APP_ASSET_PATH + "/fonts/") ||
    pathname.startsWith(APP_ASSET_PATH + "/mockups/") ||
    pathname.startsWith(APP_ASSET_PATH + "/generated/") ||
    pathname.startsWith(APP_ASSET_PATH + "/thumbnails/") ||
    pathname === APP_ASSET_PATH + "/header-logo-identity.png" ||
    destination === "image" ||
    destination === "font" ||
    destination === "script" ||
    destination === "style";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isRuntimeApi(url.pathname)) return;

  if (request.mode === "navigate" && isDevNavigation(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(DEV_APP_PATH, clone));
          return response;
        })
        .catch(async () => {
          return (await caches.match(DEV_APP_PATH)) ||
            (await caches.match(DEV_APP_PATH + "/")) ||
            (await caches.match(OFFLINE_URL)) ||
            new Response("WASHA AI is offline", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        })
    );
    return;
  }

  if (isStudioAsset(url.pathname, request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || network;
      })
    );
  }
});
`.trimStart();
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> }
) {
    const params = await context.params;
    const segments = params.path ?? [];
    const relativePath = segments.length > 0 ? path.join(...segments) : "index.html";
    const guardResponse = await ensureWashaAiDevSurfaceAccess(request, "dev");
    if (guardResponse) {
        return guardResponse;
    }

    if (segments.length === 1 && segments[0] === "manifest.webmanifest") {
        return new NextResponse(JSON.stringify(DEV_MANIFEST, null, 2), {
            headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    }

    if (segments.length === 1 && segments[0] === "sw.js") {
        try {
            const sw = await buildDevServiceWorker();
            return new NextResponse(sw, {
                headers: {
                    "Content-Type": "application/javascript; charset=utf-8",
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                    "Service-Worker-Allowed": DEV_APP_SCOPE,
                },
            });
        } catch {
            return new NextResponse("WASHA AI dev service worker is missing", { status: 500 });
        }
    }

    const targetPath = path.join(DIST_ROOT, relativePath);
    const resolvedPath = path.resolve(targetPath);

    if (!resolvedPath.startsWith(path.resolve(DIST_ROOT))) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const file = await readFile(resolvedPath);
        const isAsset = segments[0] === "assets";

        if (path.extname(resolvedPath).toLowerCase() === ".html") {
            return new NextResponse(injectDevPwaTags(file.toString("utf8")), {
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                },
            });
        }

        return new NextResponse(file, {
            headers: {
                "Content-Type": getContentType(resolvedPath),
                "Cache-Control": isAsset ? "public, max-age=31536000, immutable" : "no-store",
            },
        });
    } catch {
        if (!path.extname(relativePath)) {
            try {
                const indexFile = await readDevHtmlShell();
                return new NextResponse(indexFile, {
                    headers: {
                        "Content-Type": "text/html; charset=utf-8",
                        "Cache-Control": "no-store",
                    },
                });
            } catch {
                return new NextResponse("DTF Studio build is missing", { status: 500 });
            }
        }

        return new NextResponse("Not Found", { status: 404 });
    }
}
