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
