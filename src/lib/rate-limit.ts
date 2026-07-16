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
let refundReadinessCache: { available: boolean; expiresAt: number } | null = null;
const REFUND_READINESS_CACHE_MS = 60_000;

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

function releaseLocalRateLimit(identifier: string) {
    const record = globalRateLimitCache.get(identifier);
    if (!record || Date.now() > record.resetAt || record.count <= 0) return false;
    record.count -= 1;
    return true;
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

export async function releaseRateLimit(identifier: string, windowMs: number): Promise<boolean> {
    try {
        const sb = getSupabaseAdminClient();
        const { data, error } = await sb.rpc("refund_rate_limit", {
            p_identifier: identifier,
            p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
        });

        if (error) {
            console.warn("[rate-limit] distributed refund failed, using local fallback:", error);
            return releaseLocalRateLimit(identifier);
        }

        return Boolean((data as { released?: unknown } | null)?.released);
    } catch (error) {
        console.warn("[rate-limit] unexpected distributed refund failure, using local fallback:", error);
        return releaseLocalRateLimit(identifier);
    }
}

export async function isRateLimitRefundAvailable(): Promise<boolean> {
    const now = Date.now();
    if (refundReadinessCache && refundReadinessCache.expiresAt > now) {
        return refundReadinessCache.available;
    }

    try {
        const sb = getSupabaseAdminClient();
        const { data, error } = await sb.rpc("refund_rate_limit", {
            p_identifier: "washa:refund-readiness-probe",
            p_window_seconds: 86_400,
        });
        const available = !error
            && Boolean(data)
            && typeof (data as { released?: unknown }).released === "boolean";
        refundReadinessCache = { available, expiresAt: now + REFUND_READINESS_CACHE_MS };
        if (error) {
            console.warn("[rate-limit] refund RPC is unavailable; guest generation will remain disabled:", error);
        }
        return available;
    } catch (error) {
        console.warn("[rate-limit] failed to verify refund RPC; guest generation will remain disabled:", error);
        refundReadinessCache = { available: false, expiresAt: now + REFUND_READINESS_CACHE_MS };
        return false;
    }
}

export async function peekRateLimit(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    try {
        const sb = getSupabaseAdminClient();
        const { data, error } = await sb.rpc("peek_rate_limit" as never, {
            p_identifier: identifier,
            p_limit: limit,
            p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
        } as never);
        if (error) throw error;
        const payload = normalizeRateLimitPayload(data as RateLimitRpcPayload | null);
        const resetAt = typeof payload?.reset_at === "string" ? new Date(payload.reset_at).getTime() : NaN;
        if (!payload || typeof payload.success !== "boolean" || Number.isNaN(resetAt)) throw new Error("invalid payload");
        return {
            success: payload.success,
            remaining: typeof payload.remaining === "number" ? payload.remaining : 0,
            resetAt,
        };
    } catch {
        const record = globalRateLimitCache.get(identifier);
        if (!record || now > record.resetAt) return { success: true, remaining: limit, resetAt: now + windowMs };
        return { success: record.count < limit, remaining: Math.max(limit - record.count, 0), resetAt: record.resetAt };
    }
}
