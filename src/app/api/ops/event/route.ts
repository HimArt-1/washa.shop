// وشّى | WASHA — تسجيل الأحداث السلوكية
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIdentifier } from "@/lib/request-client";
import type { BehavioralEventType } from "@/lib/analytics-events";

const RATE_LIMIT = 300;
const RATE_WINDOW_MS = 60_000;

const VALID_EVENT_TYPES: BehavioralEventType[] = [
    "product_view",
    "add_to_cart",
    "cart_view",
    "cart_abandon",
    "checkout_start",
    "checkout_complete",
    "search_query",
    "gallery_view",
    "artwork_view",
    "design_order_start",
    "design_order_submit",
    "design_ai_generate",
    "coupon_apply",
    "newsletter_subscribe",
];

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false } });
}

async function getAuthenticatedProfileId(): Promise<string | null> {
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

async function hashIp(ip: string): Promise<string> {
    return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseClient();
        if (!supabase) {
            return NextResponse.json({ ok: false }, { status: 500 });
        }

        const identifier = getRequestClientIdentifier(req);
        const rateLimit = await checkRateLimit(
            `ops-event:${identifier}`,
            RATE_LIMIT,
            RATE_WINDOW_MS
        );
        if (!rateLimit.success) {
            return NextResponse.json(
                { ok: false },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(
                            Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
                        ),
                    },
                }
            );
        }

        const body = await req.json().catch(() => ({}));
        const { eventType, entityType, entityId, metadata, pagePath, sessionId } = body;

        if (!eventType || !VALID_EVENT_TYPES.includes(eventType as BehavioralEventType)) {
            return NextResponse.json({ ok: false, error: "invalid event type" }, { status: 400 });
        }

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "";
        const _ipHash = ip ? await hashIp(ip) : null;

        const userId = await getAuthenticatedProfileId();

        await supabase.from("behavioral_events").insert({
            event_type: eventType,
            entity_type: typeof entityType === "string" ? entityType.slice(0, 64) : null,
            entity_id: typeof entityId === "string" ? entityId.slice(0, 128) : null,
            metadata:
                metadata && typeof metadata === "object" && !Array.isArray(metadata)
                    ? metadata
                    : {},
            page_path: typeof pagePath === "string" ? pagePath.slice(0, 500) : null,
            session_id: typeof sessionId === "string" ? sessionId.slice(0, 64) : null,
            user_id: userId,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
