import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
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
]);

// These catch-all routes serve an auth-aware HTML shell as well as PWA files.
// Static extensions must still run through Clerk so currentUser() is safe in
// the route-level access guard.
const isAuthAwareWashaAiDevRoute = createRouteMatcher([
    '/design/washa-ai/dev(.*)',
    '/design/washa-ai/dev-v2(.*)',
    '/design/washa-ai/dev-v3(.*)',
]);

function nextWithPathname(req: NextRequest) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-washa-pathname", req.nextUrl.pathname);
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

    return response;
}

export const proxy = clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;
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
            return NextResponse.redirect(signInUrl);
        }

        return nextWithPathname(req);
    } else if (isAuthAwareApiRoute(req) || isAuthAwareWashaAiDevRoute(req)) {
        // Hydrate auth state so currentUser() works in these route handlers.
        // Clerk v6 uses lazy evaluation — auth() must be called in the proxy
        // for the session to be available downstream. No redirect on unauthenticated;
        // each route handler handles 401/403 itself.
        await auth();
    }
});

export const config = {
    matcher: [
        // The WASHA AI dev catch-all serves auth-aware PWA files whose static
        // extensions would otherwise be excluded by the generic matcher.
        '/design/washa-ai/dev/:path*',
        '/design/washa-ai/dev-v2/:path*',
        '/design/washa-ai/dev-v3/:path*',
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
