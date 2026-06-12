// وشّى | WASHA — تسجيل الزيارات لمركز الدعم الفني
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIdentifier } from "@/lib/request-client";

const OPS_VISIT_RATE_LIMIT = 120;
const OPS_VISIT_RATE_WINDOW_MS = 60_000;

async function hashIp(ip: string): Promise<string> {
    return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

async function getAuthenticatedProfileId() {
    const { userId } = await auth();
    if (!userId) return null;

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", userId)
        .single();

    return profile?.id ?? null;
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ ok: false }, { status: 500 });
        }

        const identifier = getRequestClientIdentifier(req);
        const rateLimit = await checkRateLimit(`ops-visit:${identifier}`, OPS_VISIT_RATE_LIMIT, OPS_VISIT_RATE_WINDOW_MS);
        if (!rateLimit.success) {
            return NextResponse.json(
                { ok: false },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
                    },
                }
            );
        }

        const body = await req.json().catch(() => ({}));
        const { path, fullUrl, referrer, sessionId } = body;

        if (!path || typeof path !== "string" || !path.startsWith("/")) {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        // تجنب تسجيل مسارات حساسة
        const skipPaths = ["/api/", "/_next/", "/favicon", "/dashboard/ops"];
        if (skipPaths.some((p) => path.startsWith(p))) {
            return NextResponse.json({ ok: true });
        }

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
        const ipHash = ip ? (await hashIp(ip)) : null;
        const userId = await getAuthenticatedProfileId();
        await supabase.from("page_visits").insert({
            path: path.slice(0, 500),
            full_url: typeof fullUrl === "string" ? fullUrl.slice(0, 1000) : null,
            referrer: typeof referrer === "string" ? referrer.slice(0, 500) : null,
            user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
            ip_hash: ipHash,
            user_id: userId,
            session_id: typeof sessionId === "string" ? sessionId.slice(0, 64) : null,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
