import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGenerateContent,
    mockIsOpenAIKeyConfigured,
    mockRunOpenAIGenerateDataUrl,
    mockRunOpenAIEditDataUrl,
    mockIsReplicateTokenConfigured,
    mockRunReplicatePredictions,
} = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
    mockIsOpenAIKeyConfigured: vi.fn(),
    mockRunOpenAIGenerateDataUrl: vi.fn(),
    mockRunOpenAIEditDataUrl: vi.fn(),
    mockIsReplicateTokenConfigured: vi.fn(),
    mockRunReplicatePredictions: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
    WASHA_DTF_MODEL: "gemini-test-model",
    extractGeneratedImageDataUrl: vi.fn(() => null),
}));

vi.mock("@/lib/openai-image", () => ({
    isOpenAIKeyConfigured: mockIsOpenAIKeyConfigured,
    runOpenAIGenerateDataUrl: mockRunOpenAIGenerateDataUrl,
    runOpenAIEditDataUrl: mockRunOpenAIEditDataUrl,
}));

vi.mock("@/lib/replicate-predictions", () => ({
    FLUX_IMG2IMG: "replicate-img2img",
    FLUX_SCHNELL: "replicate-text2img",
    isReplicateTokenConfigured: mockIsReplicateTokenConfigured,
    runReplicatePredictions: mockRunReplicatePredictions,
}));

vi.mock("@/lib/gemini-rest-image", () => ({
    isGeminiKeyConfigured: vi.fn(() => true),
    runGeminiImagenDataUrl: vi.fn(),
    runNanoBananaDataUrl: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/trace", () => ({
    logDtfTrace: vi.fn(),
}));

import {
    getWashaDtfResolvedImageProvider,
    washDtfRoutedExtractDesign,
    washDtfRoutedGenerateMockup,
} from "@/lib/washa-dtf-image-router";

describe("WASHA DTF image provider routing", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "genai");
        vi.stubEnv("IMAGE_PROVIDER", "byteplus");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");

        mockGenerateContent.mockReset();
        mockIsOpenAIKeyConfigured.mockReset();
        mockRunOpenAIGenerateDataUrl.mockReset();
        mockRunOpenAIEditDataUrl.mockReset();
        mockIsReplicateTokenConfigured.mockReset();
        mockRunReplicatePredictions.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("falls back from genai to OpenAI without consulting Replicate", async () => {
        mockGenerateContent.mockRejectedValue(new Error("Gemini is unavailable"));
        mockIsOpenAIKeyConfigured.mockReturnValue(true);
        mockRunOpenAIGenerateDataUrl.mockResolvedValue("data:image/png;base64,OPENAI");

        await expect(washDtfRoutedGenerateMockup(
            "تصميم عربي",
            null,
            { traceId: "trace_fallback", timeoutMs: 5_000 }
        )).resolves.toBe("data:image/png;base64,OPENAI");

        expect(getWashaDtfResolvedImageProvider()).toBe("genai");
        expect(mockRunOpenAIGenerateDataUrl).toHaveBeenCalledWith(
            "تصميم عربي",
            { throwOnError: true }
        );
        expect(mockIsReplicateTokenConfigured).not.toHaveBeenCalled();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
    });

    it("falls back from genai extraction to OpenAI without consulting Replicate", async () => {
        mockGenerateContent.mockRejectedValue(new Error("Gemini extraction is unavailable"));
        mockIsOpenAIKeyConfigured.mockReturnValue(true);
        mockRunOpenAIEditDataUrl.mockResolvedValue("data:image/png;base64,OPENAI_EXTRACT");

        await expect(washDtfRoutedExtractDesign(
            "استخرج التصميم",
            "SOURCE_IMAGE",
            "image/png",
            { traceId: "trace_extract_fallback", timeoutMs: 5_000 }
        )).resolves.toBe("data:image/png;base64,OPENAI_EXTRACT");

        expect(mockRunOpenAIEditDataUrl).toHaveBeenCalledWith(
            "استخرج التصميم",
            "data:image/png;base64,SOURCE_IMAGE",
            { throwOnError: true }
        );
        expect(mockIsReplicateTokenConfigured).not.toHaveBeenCalled();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
    });
});
