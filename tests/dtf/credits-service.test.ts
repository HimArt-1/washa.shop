import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchQuotaStatus } from "../../washa-dtf-studio/src/services/creditsService";

describe("WASHA AI quota client", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("retries one transient authenticated-session downgrade without showing guest state", async () => {
        const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
            expect(new Headers(init?.headers).get("x-washa-auth-state")).toBe("authenticated");
            expect(init?.credentials).toBe("same-origin");

            if (fetchMock.mock.calls.length === 1) {
                return new Response(JSON.stringify({ code: "session_unavailable", retryable: true }), {
                    status: 503,
                    headers: { "content-type": "application/json" },
                });
            }

            return new Response(JSON.stringify({
                audience: "subscriber",
                unlimited: false,
                blocked: false,
                freeLimit: 5,
                freeUsed: 1,
                freeRemaining: 4,
                paidBalance: 0,
                canPurchase: true,
            }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(fetchQuotaStatus(undefined, true)).resolves.toMatchObject({
            audience: "subscriber",
            freeRemaining: 4,
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
