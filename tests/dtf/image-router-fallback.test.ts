import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGenerateContent,
    mockExtractGeneratedImageDataUrl,
    mockIsOpenAIKeyConfigured,
    mockRunOpenAIGenerateDataUrl,
    mockRunOpenAIEditDataUrl,
    mockIsReplicateTokenConfigured,
    mockRunReplicatePredictions,
    mockLogDtfTrace,
} = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
    mockExtractGeneratedImageDataUrl: vi.fn(),
    mockIsOpenAIKeyConfigured: vi.fn(),
    mockRunOpenAIGenerateDataUrl: vi.fn(),
    mockRunOpenAIEditDataUrl: vi.fn(),
    mockIsReplicateTokenConfigured: vi.fn(),
    mockRunReplicatePredictions: vi.fn(),
    mockLogDtfTrace: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
    WASHA_DTF_MODEL: "gemini-test-model",
    extractGeneratedImageDataUrl: mockExtractGeneratedImageDataUrl,
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
    logDtfTrace: mockLogDtfTrace,
}));

import {
    getWashaDtfResolvedImageProvider,
    washDtfRoutedExtractDesign,
    washDtfRoutedGenerateMockup,
} from "@/lib/washa-dtf-image-router";
import {
    getWashaDtfProviderAttempts,
    WashaDtfProviderChainError,
} from "@/lib/washa-dtf-provider-config";

describe("WASHA DTF image provider routing", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "genai");
        vi.stubEnv("IMAGE_PROVIDER", "byteplus");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-test-model");
        vi.stubEnv("GEMINI_API_KEY", "configured-test-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");

        mockGenerateContent.mockReset();
        mockExtractGeneratedImageDataUrl.mockReset();
        mockExtractGeneratedImageDataUrl.mockReturnValue(null);
        mockIsOpenAIKeyConfigured.mockReset();
        mockRunOpenAIGenerateDataUrl.mockReset();
        mockRunOpenAIEditDataUrl.mockReset();
        mockIsReplicateTokenConfigured.mockReset();
        mockRunReplicatePredictions.mockReset();
        mockLogDtfTrace.mockReset();
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

    it.each(["gemini", "genai"])(
        "routes %j through the successful GenAI SDK path without another provider",
        async (provider) => {
            vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", provider);
            mockGenerateContent.mockResolvedValue({
                candidates: [{ content: { parts: [] } }],
            });
            mockExtractGeneratedImageDataUrl.mockReturnValue(
                "data:image/png;base64,GEMINI"
            );
            mockIsOpenAIKeyConfigured.mockReturnValue(true);
            mockIsReplicateTokenConfigured.mockReturnValue(true);

            await expect(washDtfRoutedGenerateMockup(
                "تصميم عربي",
                null,
                { traceId: "trace_genai_success", timeoutMs: 5_000 }
            )).resolves.toBe("data:image/png;base64,GEMINI");

            expect(getWashaDtfResolvedImageProvider()).toBe("genai");
            expect(mockGenerateContent).toHaveBeenCalledOnce();
            expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
            expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
            expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        }
    );

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

    it.each(["false", " FALSE ", " false "])(
        "does not call OpenAI when fallback is disabled with %j",
        async (fallbackValue) => {
            vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", fallbackValue);
            const originalError = new Error("Gemini primary failure");
            mockGenerateContent.mockRejectedValue(originalError);
            mockIsOpenAIKeyConfigured.mockReturnValue(true);
            mockRunOpenAIGenerateDataUrl.mockRejectedValue(
                new Error("Billing hard limit has been reached.")
            );

            await expect(washDtfRoutedGenerateMockup(
                "تصميم عربي",
                null,
                { traceId: "trace_no_fallback", timeoutMs: 5_000 }
            )).rejects.toBe(originalError);

            expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
            expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
        }
    );

    it("retains the original Gemini failure when the OpenAI fallback also fails", async () => {
        const originalError = new Error(JSON.stringify({
            error: {
                status: "RESOURCE_EXHAUSTED",
                code: 429,
                message: "Gemini quota exhausted",
            },
        }));
        mockGenerateContent.mockRejectedValue(originalError);
        mockIsOpenAIKeyConfigured.mockReturnValue(true);
        mockRunOpenAIGenerateDataUrl.mockRejectedValue(new Error(JSON.stringify({
            error: {
                status: 400,
                code: "billing_hard_limit_reached",
                message: "Billing hard limit has been reached.",
            },
        })));

        const error = await washDtfRoutedGenerateMockup(
            "تصميم عربي",
            null,
            { traceId: "trace_double_failure", timeoutMs: 5_000 }
        ).catch((caught) => caught);

        expect(error).toBeInstanceOf(WashaDtfProviderChainError);
        expect(error.originalError).toBe(originalError);
        expect(getWashaDtfProviderAttempts(error)).toEqual([
            expect.objectContaining({
                provider: "genai",
                code: 429,
                attempt: 1,
            }),
            expect.objectContaining({
                provider: "openai",
                code: "billing_hard_limit_reached",
                attempt: 2,
            }),
        ]);
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).toContain(
            "Gemini quota exhausted"
        );
        expect(JSON.stringify(mockLogDtfTrace.mock.calls)).toContain(
            "Billing hard limit has been reached."
        );
    });

    it("falls back from OpenAI extraction to GenAI when OpenAI billing rejects the request", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        mockIsOpenAIKeyConfigured.mockReturnValue(true);
        mockRunOpenAIEditDataUrl.mockRejectedValue(new Error(JSON.stringify({
            error: {
                message: "Billing hard limit has been reached.",
                code: "billing_hard_limit_reached",
            },
        })));
        mockGenerateContent.mockResolvedValue({ candidates: [{ content: { parts: [] } }] });
        mockExtractGeneratedImageDataUrl.mockReturnValue("data:image/png;base64,GEMINI_EXTRACT");

        await expect(washDtfRoutedExtractDesign(
            "استخرج التصميم",
            "SOURCE_IMAGE",
            "image/jpeg",
            { traceId: "trace_openai_billing_fallback", timeoutMs: 5_000 }
        )).resolves.toBe("data:image/png;base64,GEMINI_EXTRACT");

        expect(mockRunOpenAIEditDataUrl).toHaveBeenCalledWith(
            "استخرج التصميم",
            "data:image/jpeg;base64,SOURCE_IMAGE",
            { throwOnError: true }
        );
        expect(mockGenerateContent).toHaveBeenCalledOnce();
    });
});
