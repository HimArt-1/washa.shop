import { getSupabaseAdminClient } from "@/lib/supabase";

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

type RateLimitRpcPayload = {
    success?: unknown;
    remaining?: unknown;
    count?: unknown;
    reset_at?: unknown;
};

export type RateLimitResult = {
    success: boolean;
    remaining: number;
    resetAt: number;
};

// Fallback cache if Supabase rate limiting is temporarily unavailable.
const globalRateLimitCache = new Map<string, RateLimitRecord>();

function consumeLocalRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    const now = Date.now();
    const record = globalRateLimitCache.get(identifier);

    if (!record || now > record.resetAt) {
        globalRateLimitCache.set(identifier, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (record.count >= limit) {
        return { success: false, remaining: 0, resetAt: record.resetAt };
    }

    record.count += 1;
    return { success: true, remaining: limit - record.count, resetAt: record.resetAt };
}

function normalizeRateLimitPayload(data: RateLimitRpcPayload | null) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return null;
    }

    return data;
}

export async function checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
): Promise<RateLimitResult> {
    try {
        const sb = getSupabaseAdminClient();
        const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

        const { data, error } = await sb.rpc("consume_rate_limit", {
            p_identifier: identifier,
            p_limit: limit,
            p_window_seconds: windowSeconds,
        });

        if (error) {
            console.warn("[rate-limit] distributed limiter failed, using local fallback:", error);
            return consumeLocalRateLimit(identifier, limit, windowMs);
        }

        const payload = normalizeRateLimitPayload(data as RateLimitRpcPayload | null);
        if (!payload || typeof payload.success !== "boolean" || typeof payload.reset_at !== "string") {
            console.warn("[rate-limit] invalid distributed limiter payload, using local fallback:", data);
            return consumeLocalRateLimit(identifier, limit, windowMs);
        }

        const resetAt = new Date(payload.reset_at).getTime();
        if (Number.isNaN(resetAt)) {
            console.warn("[rate-limit] invalid reset_at value, using local fallback:", payload.reset_at);
            return consumeLocalRateLimit(identifier, limit, windowMs);
        }

        return {
            success: payload.success,
            remaining: typeof payload.remaining === "number" ? payload.remaining : 0,
            resetAt,
        };
    } catch (error) {
        console.warn("[rate-limit] unexpected distributed limiter failure, using local fallback:", error);
        return consumeLocalRateLimit(identifier, limit, windowMs);
    }
}
