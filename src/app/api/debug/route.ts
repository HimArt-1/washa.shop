import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const diagnostics: Record<string, string> = {};

    // Check env vars
    diagnostics.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ SET" : "❌ MISSING";
    diagnostics.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ SET" : "❌ MISSING";
    diagnostics.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ SET" : "❌ MISSING";
    diagnostics.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "✅ SET" : "❌ MISSING";
    diagnostics.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY ? "✅ SET" : "❌ MISSING";
    diagnostics.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "❌ MISSING";

    // Try to test imports that could crash
    try {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { count, error } = await sb.from("profiles").select("id", { count: "exact", head: true });
        diagnostics.supabase_test = error ? `❌ ${error.message}` : `✅ ${count} profiles`;
    } catch (e: any) {
        diagnostics.supabase_test = `❌ ${e.message}`;
    }

    // Try Clerk
    try {
        const { currentUser } = await import("@clerk/nextjs/server");
        const user = await currentUser();
        diagnostics.clerk_test = user ? `✅ User: ${user.id}` : "✅ No user (anonymous)";
    } catch (e: any) {
        diagnostics.clerk_test = `❌ ${e.message}`;
    }

    // Try ensureProfile
    try {
        const { ensureProfile } = await import("@/lib/ensure-profile");
        const profile = await ensureProfile();
        diagnostics.ensure_profile = profile ? `✅ Profile: ${profile.display_name}` : "✅ No profile (anonymous)";
    } catch (e: any) {
        diagnostics.ensure_profile = `❌ ${e.message}`;
    }

    // Try rendering Header
    try {
        await import("@/components/layout/Header");
        diagnostics.header_import = "✅ OK";
    } catch (e: any) {
        diagnostics.header_import = `❌ ${e.message}`;
    }

    // Try rendering Footer
    try {
        await import("@/components/layout/Footer");
        diagnostics.footer_import = "✅ OK";
    } catch (e: any) {
        diagnostics.footer_import = `❌ ${e.message}`;
    }

    return NextResponse.json(diagnostics, { status: 200 });
}
