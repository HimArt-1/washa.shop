import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin-operational-alerts", () => ({
    reportAdminOperationalAlert: vi.fn(),
}));

describe("OpenAI artwork provider settings", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-1");
        vi.stubEnv("OPENAI_IMAGE_SIZE", "1024x1024");
        vi.stubEnv("OPENAI_IMAGE_QUALITY", "high");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("requests PNG with a true transparent background instead of relying on prompt wording", async () => {
        let requestBody: Record<string, unknown> | null = null;
        vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
            requestBody = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({
                data: [{ b64_json: "AAAA" }],
            }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }));
        const { runOpenAIGenerateDataUrl } = await import("@/lib/openai-image");

        const result = await runOpenAIGenerateDataUrl("isolated artwork", {
            throwOnError: true,
            background: "transparent",
            outputFormat: "png",
            quality: "high",
            size: "1024x1024",
        });

        expect(result).toBe("data:image/png;base64,AAAA");
        expect(requestBody).toMatchObject({
            model: "gpt-image-1",
            n: 1,
            size: "1024x1024",
            quality: "high",
            output_format: "png",
            background: "transparent",
        });
    });
});
