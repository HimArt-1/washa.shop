import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
import { createContentSecurityPolicy } from "@/lib/content-security-policy";
import { shouldBypassClerkForDashboardPath } from "@/lib/dev-auth";

const isProtectedRoute = createRouteMatcher([
    '/studio(.*)',
    '/dashboard(.*)',
    '/settings(.*)',
    '/account(.*)',
]);

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
    '/api/telegram(.*)',
]);

// Routes that need auth state available but shouldn't redirect unauthenticated users
const isAuthAwareApiRoute = createRouteMatcher([
    '/api/washa-dtf-studio(.*)',
    '/api/washa-ai-v4(.*)',
]);

// These catch-all routes serve an auth-aware HTML shell as well as PWA files.
// Static extensions must still run through Clerk so currentUser() is safe in
// the route-level access guard.
const isAuthAwareWashaAiDevRoute = createRouteMatcher([
    '/design/washa-ai/dev(.*)',
    '/design/washa-ai/dev-v2(.*)',
    '/design/washa-ai/dev-v3(.*)',
    '/design/washa-ai/dev-v4(.*)',
]);

function createRequestSecurity(req: NextRequest, allowInlineScripts = false) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const contentSecurityPolicy = createContentSecurityPolicy({
        nonce,
        isDevelopment: process.env.NODE_ENV === "development",
        allowInlineScripts,
    });
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-washa-pathname", req.nextUrl.pathname);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

    return { requestHeaders, contentSecurityPolicy };
}

function applyDocumentSecurityHeaders(
    response: NextResponse,
    contentSecurityPolicy: string
) {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return response;
}

function nextWithPathname(req: NextRequest, allowInlineScripts = false) {
    const { requestHeaders, contentSecurityPolicy } = createRequestSecurity(
        req,
        allowInlineScripts
    );
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    if (
        req.nextUrl.pathname.startsWith("/dashboard") ||
        req.nextUrl.pathname.startsWith("/account") ||
        req.nextUrl.pathname.startsWith("/studio")
    ) {
        response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        response.headers.set("Pragma", "no-cache");
    }

    return applyDocumentSecurityHeaders(response, contentSecurityPolicy);
}

function secureRedirect(req: NextRequest, response: NextResponse) {
    const { contentSecurityPolicy } = createRequestSecurity(req);
    return applyDocumentSecurityHeaders(response, contentSecurityPolicy);
}

export const proxy = clerkMiddleware(async (auth, req) => {
    const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

    if (isPublicRoute(req)) {
        return isApiRoute ? undefined : nextWithPathname(req);
    }
    if (isProtectedRoute(req)) {
        if (shouldBypassClerkForDashboardPath(req.nextUrl.pathname)) {
            return nextWithPathname(req);
        }

        const { userId } = await auth();
        if (!userId) {
            const signInUrl = new URL("/sign-in", req.url);
            signInUrl.searchParams.set(
                "redirect_url",
                `${req.nextUrl.pathname}${req.nextUrl.search}`
            );
            return secureRedirect(req, NextResponse.redirect(signInUrl));
        }

        return nextWithPathname(req);
    } else if (isAuthAwareApiRoute(req) || isAuthAwareWashaAiDevRoute(req)) {
        // Hydrate auth state so currentUser() works in these route handlers.
        // Clerk v6 uses lazy evaluation — auth() must be called in the proxy
        // for the session to be available downstream. No redirect on unauthenticated;
        // each route handler handles 401/403 itself.
        await auth();

        if (isApiRoute) return;
        return nextWithPathname(req, true);
    }

    if (!isApiRoute) return nextWithPathname(req);
});

export const config = {
    matcher: [
        // The WASHA AI dev catch-all serves auth-aware PWA files whose static
        // extensions would otherwise be excluded by the generic matcher.
        '/design/washa-ai/dev/:path*',
        '/design/washa-ai/dev-v2/:path*',
        '/design/washa-ai/dev-v3/:path*',
        '/design/washa-ai/dev-v4/:path*',
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
