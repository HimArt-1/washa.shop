import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";
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
]);

// Routes that need auth state available but shouldn't redirect unauthenticated users
const isAuthAwareApiRoute = createRouteMatcher([
    '/api/washa-dtf-studio(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;
    if (isProtectedRoute(req)) {
        if (shouldBypassClerkForDashboardPath(req.nextUrl.pathname)) {
            return;
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
    } else if (isAuthAwareApiRoute(req)) {
        // Hydrate auth state so currentUser() works in these route handlers.
        // Clerk v6 uses lazy evaluation — auth() must be called in the middleware
        // for the session to be available downstream. No redirect on unauthenticated;
        // each route handler handles 401/403 itself.
        await auth();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
