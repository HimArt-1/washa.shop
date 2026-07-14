import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGoogleGenAIConstructor } = vi.hoisted(() => ({
    mockGoogleGenAIConstructor: vi.fn(),
}));

vi.mock("@google/genai", () => ({
    GoogleGenAI: class {
        constructor(options: unknown) {
            mockGoogleGenAIConstructor(options);
        }
    },
}));

describe("WASHA DTF GenAI configuration", () => {
    beforeEach(() => {
        vi.resetModules();
        mockGoogleGenAIConstructor.mockReset();
        vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
        vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-custom-dtf-model");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("constructs the DTF GenAI client from the Gemini key and selected DTF model", async () => {
        const {
            getWashaDtfGenAiClient,
            WASHA_DTF_MODEL,
        } = await import("@/lib/washa-dtf-studio");

        getWashaDtfGenAiClient();

        expect(WASHA_DTF_MODEL).toBe("gemini-custom-dtf-model");
        expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({
            apiKey: "test-gemini-key",
        });
    });
});
