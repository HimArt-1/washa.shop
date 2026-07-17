import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGenerateContent,
    mockExtractGeneratedImageDataUrl,
    mockIsOpenAIKeyConfigured,
    mockGetOpenAIImageModel,
    mockRunOpenAIGenerateDataUrl,
    mockRunOpenAIEditDataUrl,
    mockIsGeminiKeyConfigured,
    mockRunNanoBananaDataUrl,
    mockRunGeminiImagenDataUrl,
    mockIsReplicateTokenConfigured,
    mockRunReplicatePredictions,
    mockLogDtfTrace,
} = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
    mockExtractGeneratedImageDataUrl: vi.fn(),
    mockIsOpenAIKeyConfigured: vi.fn(),
    mockGetOpenAIImageModel: vi.fn(),
    mockRunOpenAIGenerateDataUrl: vi.fn(),
    mockRunOpenAIEditDataUrl: vi.fn(),
    mockIsGeminiKeyConfigured: vi.fn(),
    mockRunNanoBananaDataUrl: vi.fn(),
    mockRunGeminiImagenDataUrl: vi.fn(),
    mockIsReplicateTokenConfigured: vi.fn(),
    mockRunReplicatePredictions: vi.fn(),
    mockLogDtfTrace: vi.fn(),
}));

vi.mock("@/lib/openai-image", () => ({
    getOpenAIImageModel: mockGetOpenAIImageModel,
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
    isGeminiKeyConfigured: mockIsGeminiKeyConfigured,
    runGeminiImagenDataUrl: mockRunGeminiImagenDataUrl,
    runNanoBananaDataUrl: mockRunNanoBananaDataUrl,
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    extractGeneratedImageDataUrl: mockExtractGeneratedImageDataUrl,
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
    WASHA_DTF_MODEL: "gemini-test-model",
}));

vi.mock("@/app/api/washa-dtf-studio/utils/trace", () => ({
    logDtfTrace: mockLogDtfTrace,
}));

import {
    generateIsolatedArtwork,
    getIsolatedArtworkProviderReadiness,
} from "@/lib/washa-artwork/provider";
import {
    getWashaDtfProviderAttempts,
    WashaDtfProviderChainError,
} from "@/lib/washa-dtf-provider-config";

describe("isolated artwork provider routing", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "genai");
        vi.stubEnv("IMAGE_PROVIDER", "openai");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "false");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-test-model");
        vi.stubEnv("GEMINI_API_KEY", "configured-test-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");

        mockGenerateContent.mockReset();
        mockExtractGeneratedImageDataUrl.mockReset();
        mockIsOpenAIKeyConfigured.mockReset();
        mockGetOpenAIImageModel.mockReset();
        mockRunOpenAIGenerateDataUrl.mockReset();
        mockRunOpenAIEditDataUrl.mockReset();
        mockIsGeminiKeyConfigured.mockReset();
        mockRunNanoBananaDataUrl.mockReset();
        mockRunGeminiImagenDataUrl.mockReset();
        mockIsReplicateTokenConfigured.mockReset();
        mockRunReplicatePredictions.mockReset();
        mockLogDtfTrace.mockReset();

        mockIsOpenAIKeyConfigured.mockReturnValue(true);
        mockGetOpenAIImageModel.mockReturnValue("gpt-image-2");
        mockIsGeminiKeyConfigured.mockReturnValue(true);
        mockIsReplicateTokenConfigured.mockReturnValue(false);
        mockGenerateContent.mockResolvedValue({ candidates: [{ content: { parts: [] } }] });
        mockExtractGeneratedImageDataUrl.mockReturnValue("data:image/png;base64,GEMINI");
        mockRunOpenAIGenerateDataUrl.mockResolvedValue("data:image/png;base64,OPENAI");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it.each(["genai", "gemini"])(
        "uses the SDK Gemini provider selected by %j for the real isolated-artwork path",
        async (provider) => {
            vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", provider);
            expect(getIsolatedArtworkProviderReadiness()).toMatchObject({
                ready: true,
                provider: "genai",
                model: "gemini-test-model",
            });

            await expect(generateIsolatedArtwork({
                prompt: "isolated falcon artwork",
            })).resolves.toMatchObject({
                imageUrl: "data:image/png;base64,GEMINI",
                provider: "genai",
                model: "gemini-test-model",
            });

            expect(mockGenerateContent).toHaveBeenCalledOnce();
            expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
            expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
            expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        }
    );

    it("builds the proven @google/genai request shape without logging image bytes", async () => {
        const referenceBytes = "R".repeat(256);

        await generateIsolatedArtwork({
            prompt: "isolated falcon artwork",
            referenceImageDataUrl: `data:image/png;base64,${referenceBytes}`,
            traceId: "trace_request_shape",
        });

        expect(mockGenerateContent).toHaveBeenCalledWith({
            model: "gemini-test-model",
            contents: {
                role: "user",
                parts: [
                    {
                        text: expect.stringContaining("customer reference"),
                    },
                    {
                        inlineData: {
                            data: referenceBytes,
                            mimeType: "image/png",
                        },
                    },
                    { text: "isolated falcon artwork" },
                ],
            },
            config: expect.objectContaining({
                responseModalities: ["IMAGE", "TEXT"],
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "2K",
                },
                httpOptions: {
                    timeout: 120_000,
                    retryOptions: { attempts: 1 },
                },
                abortSignal: expect.any(AbortSignal),
            }),
        });

        const diagnostics = JSON.stringify(mockLogDtfTrace.mock.calls);
        expect(diagnostics).not.toContain(referenceBytes);
        expect(diagnostics).not.toContain("data:image");
    });

    it.each(["false", " FALSE ", " false "])(
        "never calls OpenAI when fallback is disabled with %j",
        async (fallbackValue) => {
            vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", fallbackValue);
            const originalError = new Error("Gemini primary failure");
            mockGenerateContent.mockRejectedValue(originalError);

            const error = await generateIsolatedArtwork({
                prompt: "isolated falcon artwork",
                traceId: "trace_no_fallback",
            }).catch((caught) => caught);

            expect(error).toBeInstanceOf(WashaDtfProviderChainError);
            expect(error.originalError).toBe(originalError);
            expect(getWashaDtfProviderAttempts(error)).toHaveLength(1);
            expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
            expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
            expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        }
    );

    it("retains both Gemini and OpenAI errors when the fallback also fails", async () => {
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");
        const secret = "gemini-secret-that-must-never-appear";
        const imagePayload = "Q".repeat(320);
        const originalError = new Error(JSON.stringify({
            error: {
                code: 429,
                status: "RESOURCE_EXHAUSTED",
                message: `Gemini quota failed api_key=${secret} data:image/png;base64,${imagePayload}`,
            },
        }));
        mockGenerateContent.mockRejectedValue(originalError);
        mockRunOpenAIGenerateDataUrl.mockRejectedValue(new Error(JSON.stringify({
            error: {
                code: "billing_hard_limit_reached",
                status: 400,
                message: "Billing hard limit has been reached.",
            },
        })));

        const error = await generateIsolatedArtwork({
            prompt: "isolated falcon artwork",
            traceId: "trace_double_failure",
        }).catch((caught) => caught);

        expect(error).toBeInstanceOf(WashaDtfProviderChainError);
        expect(error.originalError).toBe(originalError);
        expect(getWashaDtfProviderAttempts(error)).toEqual([
            expect.objectContaining({
                provider: "genai",
                model: "gemini-test-model",
                attempt: 1,
                status: "RESOURCE_EXHAUSTED",
                code: 429,
            }),
            expect.objectContaining({
                provider: "openai",
                attempt: 2,
                status: 400,
                code: "billing_hard_limit_reached",
            }),
        ]);
        expect(error.message).toContain("Gemini quota failed");
        expect(error.message).toContain("Billing hard limit has been reached.");

        const diagnostics = JSON.stringify(mockLogDtfTrace.mock.calls);
        expect(diagnostics).toContain("provider_fallback_failed");
        expect(diagnostics).toContain("Gemini quota failed");
        expect(diagnostics).toContain("Billing hard limit has been reached.");
        expect(diagnostics).not.toContain(secret);
        expect(diagnostics).not.toContain(imagePayload);
        expect(diagnostics).not.toContain("data:image");
    });
});
