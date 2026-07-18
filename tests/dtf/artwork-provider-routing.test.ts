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
    normalizeOpenAiImageSize: (
        _model: string,
        size?: string | null,
        fallback = "1024x1024"
    ) => (typeof size === "string" && size.trim() ? size.trim() : fallback),
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

    it("builds a supported opaque 2K transport request for gpt-image-2", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-2");
        vi.stubEnv("WASHA_ARTWORK_OPENAI_SIZE", "");

        await expect(generateIsolatedArtwork({
            prompt: "isolated falcon artwork",
            traceId: "trace_openai_gpt_image_2",
        })).resolves.toMatchObject({
            provider: "openai",
            model: "gpt-image-2",
            parameters: {
                size: "2048x2048",
                output_format: "png",
                background: "opaque",
            },
        });

        expect(mockRunOpenAIGenerateDataUrl).toHaveBeenCalledWith(
            expect.stringMatching(
                /isolated falcon artwork[\s\S]*perfectly uniform solid[\s\S]*transport matte/i
            ),
            expect.objectContaining({
                size: "2048x2048",
                outputFormat: "png",
                background: "opaque",
            })
        );
        expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
        expect(mockGenerateContent).not.toHaveBeenCalled();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
    });

    it("keeps transparent PNG output for OpenAI models that support it", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-1");
        vi.stubEnv("WASHA_ARTWORK_OPENAI_SIZE", "");

        await expect(generateIsolatedArtwork({
            prompt: "isolated falcon artwork",
            traceId: "trace_openai_gpt_image_1",
        })).resolves.toMatchObject({
            provider: "openai",
            model: "gpt-image-1",
            parameters: {
                size: "1024x1536",
                output_format: "png",
                background: "transparent",
            },
        });

        expect(mockRunOpenAIGenerateDataUrl).toHaveBeenCalledWith(
            "isolated falcon artwork",
            expect.objectContaining({
                size: "1024x1536",
                outputFormat: "png",
                background: "transparent",
            })
        );
    });

    it("falls back from the OpenAI primary to Gemini without losing the actual provider result", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        vi.stubEnv("OPENAI_IMAGE_MODEL", "gpt-image-2");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");
        mockRunOpenAIGenerateDataUrl.mockRejectedValue(
            new Error("OpenAI primary unavailable")
        );

        await expect(generateIsolatedArtwork({
            prompt: "isolated falcon artwork",
            traceId: "trace_openai_to_gemini_fallback",
        })).resolves.toMatchObject({
            imageUrl: "data:image/png;base64,GEMINI",
            provider: "genai",
            model: "gemini-test-model",
        });

        expect(mockRunOpenAIGenerateDataUrl).toHaveBeenCalledOnce();
        expect(mockGenerateContent).toHaveBeenCalledOnce();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        expect(mockLogDtfTrace).toHaveBeenCalledWith(
            "dtf.artwork.provider",
            "trace_openai_to_gemini_fallback",
            "provider_fallback_succeeded",
            expect.objectContaining({
                attemptedProvider: "genai",
                attemptedModel: "gemini-test-model",
                providerAttempt: 2,
            })
        );
    });

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
                    {
                        text: expect.stringMatching(
                            /isolated falcon artwork[\s\S]*perfectly uniform solid[\s\S]*transport matte/i
                        ),
                    },
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

    it("keeps a background-recovery attempt locked to the original provider and model", async () => {
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");
        mockGenerateContent.mockRejectedValue(new Error("Gemini recovery failure"));

        await expect(generateIsolatedArtwork({
            prompt: "preserve the supplied artwork",
            referenceImageDataUrl: "data:image/jpeg;base64,AAAA",
            traceId: "trace_locked_recovery",
            requiredProvider: "genai",
            requiredModel: "gemini-test-model",
            attemptPurpose: "background_recovery",
        })).rejects.toBeInstanceOf(WashaDtfProviderChainError);

        expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
        expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        const resolvedLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "provider_resolved"
        );
        expect(resolvedLog?.[3]).toMatchObject({
            resolvedProvider: "genai",
            resolvedModel: "gemini-test-model",
            fallbackEnabled: false,
            attemptPurpose: "background_recovery",
        });
    });

    it("reuses a successful Gemini fallback for background recovery when OpenAI remains configured", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "true");

        await expect(generateIsolatedArtwork({
            prompt: "preserve the supplied artwork",
            referenceImageDataUrl: "data:image/jpeg;base64,AAAA",
            traceId: "trace_locked_fallback_recovery",
            requiredProvider: "genai",
            requiredModel: "gemini-test-model",
            attemptPurpose: "background_recovery",
        })).resolves.toMatchObject({
            provider: "genai",
            model: "gemini-test-model",
        });

        expect(mockGenerateContent).toHaveBeenCalledOnce();
        expect(mockRunOpenAIGenerateDataUrl).not.toHaveBeenCalled();
        expect(mockRunOpenAIEditDataUrl).not.toHaveBeenCalled();
        expect(mockRunReplicatePredictions).not.toHaveBeenCalled();
        const resolvedLog = mockLogDtfTrace.mock.calls.find(
            (call) => call[2] === "provider_resolved"
        );
        expect(resolvedLog?.[3]).toMatchObject({
            configuredProvider: "openai",
            resolvedProvider: "genai",
            resolvedModel: "gemini-test-model",
            fallbackEnabled: false,
            attemptPurpose: "background_recovery",
        });
    });

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
