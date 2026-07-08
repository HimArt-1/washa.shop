export const DEFAULT_POLLING_RETRY_COOLDOWN_MS = 60_000;

type PollingNetworkGuardOptions = {
    cooldownMs?: number;
    isOffline?: () => boolean;
};

export function isBrowserOffline() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function createPollingNetworkGuard(options: PollingNetworkGuardOptions = {}) {
    const cooldownMs = options.cooldownMs ?? DEFAULT_POLLING_RETRY_COOLDOWN_MS;
    const isOffline = options.isOffline ?? isBrowserOffline;
    let retryAfterMs = 0;
    let lastLoggedAtMs: number | null = null;

    return {
        canAttempt(nowMs = Date.now()) {
            return !isOffline() && nowMs >= retryAfterMs;
        },
        recordSuccess() {
            retryAfterMs = 0;
        },
        recordFailure(nowMs = Date.now()) {
            retryAfterMs = nowMs + cooldownMs;
            const shouldLog = lastLoggedAtMs === null || nowMs - lastLoggedAtMs >= cooldownMs;
            if (shouldLog) lastLoggedAtMs = nowMs;

            return { retryAfterMs, shouldLog };
        },
        reset() {
            retryAfterMs = 0;
            lastLoggedAtMs = null;
        },
    };
}
