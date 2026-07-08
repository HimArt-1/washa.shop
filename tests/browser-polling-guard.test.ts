import { describe, expect, it } from "vitest";
import { createPollingNetworkGuard, isBrowserOffline } from "@/lib/browser-polling-guard";

describe("browser polling guard", () => {
    it("does not treat non-browser execution as offline", () => {
        expect(isBrowserOffline()).toBe(false);
    });

    it("blocks polling attempts when the browser reports offline", () => {
        const guard = createPollingNetworkGuard({
            isOffline: () => true,
        });

        expect(guard.canAttempt(1_000)).toBe(false);
    });

    it("delays polling after a failed request", () => {
        const guard = createPollingNetworkGuard({
            cooldownMs: 1_000,
            isOffline: () => false,
        });

        expect(guard.canAttempt(1_000)).toBe(true);
        expect(guard.recordFailure(1_000)).toEqual({
            retryAfterMs: 2_000,
            shouldLog: true,
        });
        expect(guard.canAttempt(1_500)).toBe(false);
        expect(guard.canAttempt(2_000)).toBe(true);
    });

    it("throttles duplicate failure logs and clears retry delay after success", () => {
        const guard = createPollingNetworkGuard({
            cooldownMs: 1_000,
            isOffline: () => false,
        });

        expect(guard.recordFailure(1_000).shouldLog).toBe(true);
        expect(guard.recordFailure(1_100).shouldLog).toBe(false);
        expect(guard.canAttempt(1_500)).toBe(false);

        guard.recordSuccess();

        expect(guard.canAttempt(1_500)).toBe(true);
        expect(guard.recordFailure(2_000).shouldLog).toBe(true);
    });
});
