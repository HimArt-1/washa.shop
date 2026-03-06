import { NextResponse } from "next/server";
import React from "react";

export const dynamic = "force-dynamic";

export async function GET() {
    const results: Record<string, string> = {};

    // Test 1: Try rendering the public layout chain
    try {
        const { ensureProfile } = await import("@/lib/ensure-profile");
        await ensureProfile();
        results.step1_ensureProfile = "✅ OK";
    } catch (e: any) {
        results.step1_ensureProfile = `❌ ${e.message}\n${e.stack?.slice(0, 300)}`;
        return NextResponse.json(results, { status: 200 });
    }

    // Test 2: Try getPublicVisibility
    try {
        const { getPublicVisibility } = await import("@/app/actions/settings");
        await getPublicVisibility();
        results.step2_visibility = "✅ OK";
    } catch (e: any) {
        results.step2_visibility = `❌ ${e.message}\n${e.stack?.slice(0, 300)}`;
        return NextResponse.json(results, { status: 200 });
    }

    // Test 3: Try React Server Component rendering with renderToString
    try {
        const ReactDOM = await import("react-dom/server");
        const { Hero } = await import("@/components/sections/Hero");
        // Can't render server components directly, but we can check the function exists
        results.step3_hero_exists = `✅ Hero type: ${typeof Hero}`;
    } catch (e: any) {
        results.step3_hero_exists = `❌ ${e.message}\n${e.stack?.slice(0, 300)}`;
    }

    // Test 4: Check if there's a zustand issue (the console mentions deprecated zustand export)
    try {
        // Check if any component uses zustand with default export
        const zustand = await import("zustand");
        results.step4_zustand = `✅ Zustand keys: ${Object.keys(zustand).join(", ")}`;
    } catch (e: any) {
        results.step4_zustand = `❌ ${e.message}`;
    }

    // Test 5: Check node version and environment
    results.step5_env = `Node: ${process.version}, ENV: ${process.env.NODE_ENV}, Vercel: ${process.env.VERCEL || "false"}`;

    // Test 6: Try a direct supabase query that could fail
    try {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await sb.from("custom_design_settings").select("*").limit(1).single();
        results.step6_settings = error ? `❌ ${error.message}` : `✅ ${JSON.stringify(data).slice(0, 100)}`;
    } catch (e: any) {
        results.step6_settings = `❌ ${e.message}`;
    }

    // Test 7: Catch any uncaught rendering errors
    try {
        // Simulate what the ClerkProvider does at the layout level
        const clerk = await import("@clerk/nextjs");
        results.step7_clerk_provider = `✅ ClerkProvider type: ${typeof clerk.ClerkProvider}`;
    } catch (e: any) {
        results.step7_clerk_provider = `❌ ${e.message}\n${e.stack?.slice(0, 300)}`;
    }

    return NextResponse.json(results, { status: 200 });
}
