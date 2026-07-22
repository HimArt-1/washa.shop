import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
    createWashaAiDevGenerationMetaTags,
    ensureWashaAiDevSurfaceAccess,
} from "@/lib/washa-ai-dev-access";

export const runtime = "nodejs";

const DIST_ROOT = path.join(process.cwd(), "washa-dtf-studio", "dist");
const APP_PATH = "/design/washa-ai/dev-v3";

const MANIFEST = {
    name: "WASHA AI Prompt Native",
    short_name: "WASHA AI V3",
    description: "مسار تطويري يولّد أصل طباعة PNG شفافًا ثم يركبه واقعيًا على الموكب المختار.",
    start_url: APP_PATH,
    scope: APP_PATH,
    display: "standalone",
    background_color: "#F2F0E8",
    theme_color: "#14362F",
    orientation: "any",
    dir: "rtl",
    lang: "ar",
    categories: ["shopping", "design", "lifestyle"],
    icons: [
        { src: "/icon-192.png?v=20260630", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icon-512.png?v=20260630", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
};

function getContentType(filePath: string) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === ".html") return "text/html; charset=utf-8";
    if (extension === ".js") return "application/javascript; charset=utf-8";
    if (extension === ".css") return "text/css; charset=utf-8";
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    if (extension === ".svg") return "image/svg+xml";
    if (extension === ".json") return "application/json; charset=utf-8";
    if (extension === ".ico") return "image/x-icon";
    return "application/octet-stream";
}

function injectPromptNativeTags(indexHtml: string) {
    if (indexHtml.includes(`${APP_PATH}/manifest.webmanifest`)) return indexHtml;

    const tags = [
        ...createWashaAiDevGenerationMetaTags("dev-v3"),
        `<link rel="manifest" href="${APP_PATH}/manifest.webmanifest" />`,
        '<meta name="application-name" content="WASHA AI Prompt Native" />',
        '<meta name="apple-mobile-web-app-title" content="WASHA AI V3" />',
        '<meta name="theme-color" content="#14362F" />',
        `<script>
          if ('serviceWorker' in navigator && window.location.pathname.indexOf('${APP_PATH}') === 0) {
            window.addEventListener('load', function () {
              navigator.serviceWorker.register('${APP_PATH}/sw.js', { scope: '${APP_PATH}' }).catch(function () {});
            });
          }
        </script>`,
    ].join("\n    ");

    return indexHtml.replace("</head>", `    ${tags}\n  </head>`);
}

async function readHtmlShell() {
    const html = await readFile(path.join(DIST_ROOT, "index.html"), "utf8");
    return injectPromptNativeTags(html);
}

function serviceWorkerSource() {
    return `
const CACHE_NAME = "washa-ai-prompt-native-shell-v1";
const APP_PATH = ${JSON.stringify(APP_PATH)};
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !(url.pathname === APP_PATH || url.pathname.startsWith(APP_PATH + "/"))) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(APP_PATH, copy));
    return response;
  }).catch(() => caches.match(APP_PATH)));
});
`.trimStart();
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path?: string[] }> }
) {
    const guardResponse = await ensureWashaAiDevSurfaceAccess(request, "dev-v3");
    if (guardResponse) return guardResponse;

    const { path: pathSegments = [] } = await context.params;

    if (pathSegments.length === 1 && pathSegments[0] === "manifest.webmanifest") {
        return new NextResponse(JSON.stringify(MANIFEST, null, 2), {
            headers: {
                "Content-Type": "application/manifest+json; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    }

    if (pathSegments.length === 1 && pathSegments[0] === "sw.js") {
        return new NextResponse(serviceWorkerSource(), {
            headers: {
                "Content-Type": "application/javascript; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Service-Worker-Allowed": APP_PATH,
            },
        });
    }

    const relativePath = pathSegments.length > 0 ? path.join(...pathSegments) : "index.html";
    const resolvedRoot = path.resolve(DIST_ROOT);
    const resolvedPath = path.resolve(DIST_ROOT, relativePath);

    if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {
        const file = await readFile(resolvedPath);
        if (path.extname(resolvedPath).toLowerCase() === ".html") {
            return new NextResponse(injectPromptNativeTags(file.toString("utf8")), {
                headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
            });
        }

        return new NextResponse(file, {
            headers: { "Content-Type": getContentType(resolvedPath), "Cache-Control": "no-store" },
        });
    } catch {
        if (!path.extname(relativePath)) {
            try {
                return new NextResponse(await readHtmlShell(), {
                    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
                });
            } catch {
                return new NextResponse("WASHA AI Prompt Native build is missing", { status: 500 });
            }
        }

        return new NextResponse("Not Found", { status: 404 });
    }
}
