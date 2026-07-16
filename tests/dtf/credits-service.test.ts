import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchQuotaStatus } from "../../washa-dtf-studio/src/services/creditsService";

describe("WASHA AI quota client", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("sends one authenticated quota request with a Clerk bearer token", async () => {
        const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
            expect(new Headers(init?.headers).get("authorization")).toBe("Bearer session-token");
            expect(init?.credentials).toBe("omit");

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

        await expect(fetchQuotaStatus(undefined, "session-token")).resolves.toMatchObject({
            audience: "subscriber",
            freeRemaining: 4,
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
