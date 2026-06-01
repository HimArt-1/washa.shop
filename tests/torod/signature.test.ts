import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadTorodWithEnv(env: {
    clientSecret?: string;
    webhookSecret?: string;
}) {
    vi.resetModules();
    vi.stubEnv("TOROD_CLIENT_SECRET", env.clientSecret ?? "");
    vi.stubEnv("TOROD_WEBHOOK_SECRET", env.webhookSecret ?? "");

    const { torod } = await import("@/lib/shipping/torod");
    return torod;
}

function hmac(body: string, secret: string) {
    const digest = createHmac("sha256", secret).update(body, "utf8");
    return {
        base64: digest.digest("base64"),
        hex: createHmac("sha256", secret).update(body, "utf8").digest("hex"),
    };
}

describe("Torod webhook signature validation", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it("accepts the official Torod Authorization client secret header", async () => {
        const torod = await loadTorodWithEnv({ clientSecret: "client-secret" });

        expect(torod.validateWebhookAuthorization("client-secret")).toBe(true);
        expect(torod.validateWebhookAuthorization("Bearer client-secret")).toBe(true);
        expect(torod.validateWebhookRequest("{}", { authorization: "client-secret" })).toBe(true);
    });

    it("accepts base64 HMAC signatures as a backward-compatible fallback", async () => {
        const body = JSON.stringify({ order_id: "TOR-123", status: "delivered" });
        const torod = await loadTorodWithEnv({ webhookSecret: "webhook-secret" });

        expect(torod.validateWebhookSignature(body, hmac(body, "webhook-secret").base64)).toBe(true);
        expect(torod.validateWebhookRequest(body, { hmac: hmac(body, "webhook-secret").base64 })).toBe(true);
    });

    it("accepts hex signatures for older/custom webhook setups", async () => {
        const body = JSON.stringify({ tracking_id: "TRK-900", status: "in transit" });
        const torod = await loadTorodWithEnv({ webhookSecret: "webhook-secret" });

        expect(torod.validateWebhookSignature(body, hmac(body, "webhook-secret").hex)).toBe(true);
    });

    it("falls back to TOROD_CLIENT_SECRET when TOROD_WEBHOOK_SECRET is blank or comment-like", async () => {
        const body = JSON.stringify({ order_id: "TOR-456", status: "shipped" });
        const torod = await loadTorodWithEnv({
            clientSecret: "client-secret",
            webhookSecret: "   # optional webhook secret",
        });

        expect(torod.requiresWebhookSignature()).toBe(true);
        expect(torod.validateWebhookAuthorization("client-secret")).toBe(true);
    });

    it("rejects authorization and signatures generated with a different secret", async () => {
        const body = JSON.stringify({ order_id: "TOR-789", status: "delivered" });
        const torod = await loadTorodWithEnv({ webhookSecret: "webhook-secret" });

        expect(torod.validateWebhookAuthorization("wrong-secret")).toBe(false);
        expect(torod.validateWebhookSignature(body, hmac(body, "wrong-secret").base64)).toBe(false);
        expect(torod.validateWebhookRequest(body, { authorization: "wrong-secret" })).toBe(false);
    });
});
