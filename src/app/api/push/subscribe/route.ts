import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/ensure-profile";
import {
    getPushScopeList,
    mergePushScopes,
    normalizeRequestedPushScope,
    normalizeStoredPushScope,
    removePushScope,
} from "@/lib/push-subscription-scope";
import { canReceiveAdminNotifications } from "@/lib/notification-roles";

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Supabase configuration is missing");
    }

    return createClient(url, key, { auth: { persistSession: false } });
}

function validateEndpoint(endpoint: string) {
    if (!endpoint || endpoint.length > 2000) {
        return { ok: false as const, error: "Invalid endpoint" };
    }

    try {
        const parsedEndpoint = new URL(endpoint);
        if (parsedEndpoint.protocol !== "https:") {
            return { ok: false as const, error: "Invalid endpoint" };
        }
    } catch {
        return { ok: false as const, error: "Invalid endpoint" };
    }

    return { ok: true as const };
}

function buildScopeResponse(scope: ReturnType<typeof normalizeStoredPushScope>) {
    return {
        success: true,
        scope,
        enabledScopes: getPushScopeList(scope),
    };
}

async function requireCurrentProfile() {
    const { userId } = await auth();
    if (!userId) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const profile = await ensureProfile();
    if (!profile?.id) {
        return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
    }

    return { profileId: profile.id, role: profile.role };
}

export async function GET(req: NextRequest) {
    try {
        const authResult = await requireCurrentProfile();
        if ("error" in authResult) {
            return authResult.error;
        }

        const endpoint = req.nextUrl.searchParams.get("endpoint")?.trim() || "";
        const endpointValidation = validateEndpoint(endpoint);
        if (!endpointValidation.ok) {
            return NextResponse.json({ error: endpointValidation.error }, { status: 400 });
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("push_subscriptions")
            .select("scope")
            .eq("endpoint", endpoint)
            .eq("user_id", authResult.profileId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json(buildScopeResponse(normalizeStoredPushScope(data?.scope)));
    } catch (error) {
        console.error("[push/subscribe:GET] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireCurrentProfile();
        if ("error" in authResult) {
            return authResult.error;
        }

        const body = await req.json().catch(() => null);
        const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
        const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
        const authKey = typeof body?.keys?.auth === "string" ? body.keys.auth.trim() : "";
        const requestedScope = body?.scope == null
            ? "user"
            : normalizeRequestedPushScope(body.scope);

        if (!endpoint || !p256dh || !authKey || !requestedScope) {
            return NextResponse.json({ error: "Missing subscription data" }, { status: 400 });
        }

        if (p256dh.length > 512 || authKey.length > 512) {
            return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
        }

        const endpointValidation = validateEndpoint(endpoint);
        if (!endpointValidation.ok) {
            return NextResponse.json({ error: endpointValidation.error }, { status: 400 });
        }

        if (requestedScope === "admin" && !canReceiveAdminNotifications(authResult.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const supabase = getSupabaseClient();
        const { data: existing, error: existingError } = await supabase
            .from("push_subscriptions")
            .select("scope")
            .eq("endpoint", endpoint)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        const nextScope = mergePushScopes(
            normalizeStoredPushScope(existing?.scope),
            requestedScope
        );

        const { error } = await supabase.from("push_subscriptions").upsert(
            {
                user_id: authResult.profileId,
                endpoint,
                p256dh,
                auth: authKey,
                scope: nextScope,
                user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
            },
            { onConflict: "endpoint" }
        );

        if (error) {
            throw error;
        }

        return NextResponse.json(buildScopeResponse(nextScope));
    } catch (error) {
        console.error("[push/subscribe:POST] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const authResult = await requireCurrentProfile();
        if ("error" in authResult) {
            return authResult.error;
        }

        const body = await req.json().catch(() => null);
        const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
        const requestedScope = body?.scope == null
            ? "user"
            : normalizeRequestedPushScope(body.scope);
        const endpointValidation = validateEndpoint(endpoint);

        if (!endpointValidation.ok || !requestedScope) {
            return NextResponse.json({ error: endpointValidation.error }, { status: 400 });
        }

        if (requestedScope === "admin" && !canReceiveAdminNotifications(authResult.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const supabase = getSupabaseClient();
        const { data: existing, error: existingError } = await supabase
            .from("push_subscriptions")
            .select("scope")
            .eq("endpoint", endpoint)
            .eq("user_id", authResult.profileId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existing) {
            return NextResponse.json(buildScopeResponse(null));
        }

        const nextScope = removePushScope(
            normalizeStoredPushScope(existing.scope),
            requestedScope
        );

        if (!nextScope) {
            const { error } = await supabase
                .from("push_subscriptions")
                .delete()
                .eq("endpoint", endpoint)
                .eq("user_id", authResult.profileId);

            if (error) {
                throw error;
            }

            return NextResponse.json(buildScopeResponse(null));
        }

        const { error } = await supabase
            .from("push_subscriptions")
            .update({ scope: nextScope })
            .eq("endpoint", endpoint)
            .eq("user_id", authResult.profileId);

        if (error) {
            throw error;
        }

        return NextResponse.json(buildScopeResponse(nextScope));
    } catch (error) {
        console.error("[push/subscribe:DELETE] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
