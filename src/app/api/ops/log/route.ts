// وشّى | WASHA — تسجيل الأخطاء لمركز الدعم الفني
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIdentifier } from "@/lib/request-client";

const OPS_LOG_RATE_LIMIT = 30;
const OPS_LOG_RATE_WINDOW_MS = 60_000;

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
        const rateLimit = await checkRateLimit(`ops-log:${identifier}`, OPS_LOG_RATE_LIMIT, OPS_LOG_RATE_WINDOW_MS);
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
        const { type = "error", source, message, stack, metadata } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        const validTypes = ["error", "warning", "info", "security"];
        const logType = validTypes.includes(type) ? type : "error";
        const userId = await getAuthenticatedProfileId();
        const safeMetadata =
            typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
                ? metadata
                : {};

        await supabase.from("system_logs").insert({
            type: logType,
            source: typeof source === "string" ? source.slice(0, 200) : null,
            message: message.slice(0, 2000),
            stack: typeof stack === "string" ? stack.slice(0, 5000) : null,
            metadata: safeMetadata,
            user_id: userId,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
