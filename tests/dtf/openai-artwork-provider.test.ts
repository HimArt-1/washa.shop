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

    it("keeps 2048x2048 for gpt-image-2 and clamps unsupported sizes to a valid one", async () => {
        const { normalizeOpenAiImageSize } = await import("@/lib/openai-image");
        // 2048x2048 صالح لـ gpt-image-2 (قابل للقسمة على 16، نسبة 1:1) ⇒ لا يُخفَّض
        expect(normalizeOpenAiImageSize("gpt-image-2", "2048x2048")).toBe("2048x2048");
        expect(normalizeOpenAiImageSize("gpt-image-2", "2048x2048", "2048x2048")).toBe("2048x2048");
        // غير قابل للقسمة على 16 ⇒ يرجع لـ fallback الصريح للمسار (2048x2048) بدل خطأ 400
        expect(normalizeOpenAiImageSize("gpt-image-2", "1000x1000", "2048x2048")).toBe("2048x2048");
        // نسبة أبعاد خارج 1:3..3:1 ⇒ يرجع لـ fallback
        expect(normalizeOpenAiImageSize("gpt-image-2", "2048x256", "2048x2048")).toBe("2048x2048");
        // fallback الافتراضي 1024x1024 صالح أيضاً لـ gpt-image-2
        expect(normalizeOpenAiImageSize("gpt-image-2", "1000x1000")).toBe("1024x1024");
        // gpt-image-1 لا يدعم 2048x2048 ⇒ يُقلَّم إلى مقاس مدعوم
        expect(normalizeOpenAiImageSize("gpt-image-1", "2048x2048")).toBe("1024x1024");
    });

    it("does not downscale 2048x2048 nor send background=transparent for gpt-image-2", async () => {
        vi.resetModules();
        vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-2");
        let requestBody: Record<string, unknown> | null = null;
        vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
            requestBody = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({ data: [{ b64_json: "AAAA" }] }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }));
        const { runOpenAIGenerateDataUrl } = await import("@/lib/openai-image");

        const result = await runOpenAIGenerateDataUrl("isolated artwork", {
            throwOnError: true,
            background: "transparent", // يجب ألا تُرسَل كما هي مع gpt-image-2
            outputFormat: "png",
            quality: "high",
            size: "2048x2048",
        });

        expect(result).toBe("data:image/png;base64,AAAA");
        expect(requestBody).toMatchObject({
            model: "gpt-image-2",
            size: "2048x2048",
            output_format: "png",
        });
        expect(requestBody!.background).not.toBe("transparent");
        expect(requestBody!.background).toBe("opaque");
    });
});
