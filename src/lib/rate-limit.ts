type RateLimitRecord = {
    count: number;
    resetAt: number;
};

// Global cache object (persists within a Serverless Container execution context)
// Ideal for Edge and basic burst-bot protection.
const globalRateLimitCache = new Map<string, RateLimitRecord>();

export function checkRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
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
