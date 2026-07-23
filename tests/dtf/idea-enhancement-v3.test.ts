import { afterEach, describe, expect, it, vi } from "vitest";
import {
    AiStudioService,
    buildIdeaEnhancementPrompt,
    resolveIdeaEnhancementProvider,
    resolveOpenAiIdeaEnhancementModel,
} from "@/app/api/washa-dtf-studio/services/ai-studio.service";
import { enhanceIdeaSchema } from "@/app/api/washa-dtf-studio/validators/ai-studio.schema";

describe("WASHA AI V3 idea enhancement", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("accepts the V3 surface and a bounded creative direction", () => {
        const parsed = enhanceIdeaSchema.parse({
            idea: "صقر عربي يحلق فوق الجبال",
            surface: "dev-v3",
            creativeDirection: "فاخر متزن مع نقطة تركيز قوية",
        });

        expect(parsed.surface).toBe("dev-v3");
        expect(parsed.creativeDirection).toContain("فاخر");
    });

    it("builds an outcome-first art-direction prompt that preserves the customer idea", () => {
        const prompt = buildIdeaEnhancementPrompt({
            idea: "صقر عربي يحلق فوق الجبال",
            surface: "dev-v3",
            creativeDirection: "شاعري مضيء",
            style: "هندسي",
        });

        expect(prompt).toContain("مدير فني");
        expect(prompt).toContain("صقر عربي يحلق فوق الجبال");
        expect(prompt).toContain("شاعري مضيء");
        expect(prompt).toContain("لا تغيّر موضوع العميل");
        expect(prompt).toContain("تفصيلاً مميزاً");
    });

    it("routes V3 enhancement to OpenAI independently from the image provider", () => {
        expect(resolveIdeaEnhancementProvider({ idea: "فكرة", surface: "dev-v3" }, "gemini")).toBe("openai");
        expect(resolveIdeaEnhancementProvider({ idea: "فكرة" }, "gemini")).toBe("gemini");
    });

    it("uses a dedicated quality model for V3 without changing classic enhancement", () => {
        expect(resolveOpenAiIdeaEnhancementModel({ idea: "فكرة", surface: "dev-v3" }, {})).toBe("gpt-5.6-sol");
        expect(resolveOpenAiIdeaEnhancementModel({ idea: "فكرة" }, {})).toBe("gpt-4o-mini");
    });

    it("calls the OpenAI Responses API and reads its native output shape", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        const enhancedIdea = "صقر عربي مهيب يحلق فوق تضاريس العلا عند الغروب، تتقدم جناحاه المشهد في تكوين قطري واثق بينما ينساب الضوء الذهبي على الريش والصخور، ويترك خلفه مساراً رقيقاً من الغبار المضيء يمنح الفكرة حرية وهيبة وهدوءاً.";
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
            output: [{
                content: [{ type: "output_text", text: enhancedIdea }],
            }],
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));

        const result = await AiStudioService.enhanceIdea({
            idea: "صقر عربي يحلق فوق جبال العلا",
            surface: "dev-v3",
            creativeDirection: "فاخر متزن",
        }, { traceId: "test-v3-enhancer", timeoutMs: 4_000 });

        expect(result).toEqual({ enhancedIdea, provider: "openai" });
        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, request] = fetchMock.mock.calls[0];
        const body = JSON.parse(String(request?.body));
        expect(url).toBe("https://api.openai.com/v1/responses");
        expect(body.model).toBe("gpt-5.6-sol");
        expect(body.reasoning).toEqual({ effort: "none" });
        expect(body.input).toContain("صقر عربي يحلق فوق جبال العلا");
    });
});
