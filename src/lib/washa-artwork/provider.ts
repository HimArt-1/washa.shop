import {
    getOpenAIImageModel,
    isOpenAIKeyConfigured,
    runOpenAIEditDataUrl,
    runOpenAIGenerateDataUrl,
} from "@/lib/openai-image";
import {
    FLUX_SCHNELL,
    FLUX_IMG2IMG,
    isReplicateTokenConfigured,
    runReplicatePredictions,
} from "@/lib/replicate-predictions";
import {
    isGeminiKeyConfigured,
    runGeminiImagenDataUrl,
    runNanoBananaDataUrl,
} from "@/lib/gemini-rest-image";
import {
    extractGeneratedImageDataUrl,
    getWashaDtfGenAiClient,
} from "@/lib/washa-dtf-studio";
import { buildGenAiArtworkTransportPrompt } from "@/lib/washa-artwork/prompt";
import {
    createWashaDtfProviderAttempt,
    resolveWashaDtfProviderConfiguration,
    WashaDtfProviderChainError,
    type WashaDtfProviderAttempt,
    type WashaDtfProviderConfiguration,
} from "@/lib/washa-dtf-provider-config";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";

export type ProviderImageResult = {
    imageUrl: string;
    provider: string;
    model: string;
    parameters: Record<string, unknown>;
};

export function getIsolatedArtworkProviderReadiness() {
    const configuration = resolveWashaDtfProviderConfiguration();
    if (
        configuration.provider === "unsupported"
        || !configuration.credentialConfigured
    ) {
        return {
            ready: false as const,
            provider: configuration.provider,
            model: configuration.model,
            fallbackEnabled: configuration.fallbackEnabled,
            message: "مزوّد توليد ملفات التصميم غير مهيأ بالمفتاح المطلوب.",
        };
    }

    return {
        ready: true as const,
        provider: configuration.provider,
        model: configuration.model,
        fallbackEnabled: configuration.fallbackEnabled,
    }
}

function resolveProviderTimeoutMs() {
    const parsed = Number.parseInt(process.env.WASHA_DTF_PROVIDER_TIMEOUT_MS || "", 10);
    if (!Number.isFinite(parsed)) return 120_000;
    return Math.min(Math.max(parsed, 15_000), 180_000);
}

function buildProviderTimeoutError(timeoutMs: number) {
    return new Error(JSON.stringify({
        error: {
            code: 504,
            status: "DEADLINE_EXCEEDED",
            message: `Washa AI generation exceeded internal deadline of ${timeoutMs}ms`,
        },
    }));
}

async function withProviderTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number
) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(
        () => controller.abort(buildProviderTimeoutError(timeoutMs)),
        timeoutMs
    );
    try {
        return await operation(controller.signal);
    } finally {
        clearTimeout(timeoutHandle);
    }
}

function dataUrlToInlineData(value: string | null | undefined) {
    if (!value) return null;
    const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
    if (!match) throw new Error("Invalid artwork reference image data URL.");
    return {
        mimeType: match[1].toLowerCase(),
        data: match[2].replace(/\s+/g, ""),
    };
}

async function generateIsolatedWithGenAi(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
    model: string;
    timeoutMs: number;
}) {
    const client = getWashaDtfGenAiClient();
    const reference = dataUrlToInlineData(params.referenceImageDataUrl);
    const parts: Array<Record<string, unknown>> = [];
    if (reference) {
        parts.push({
            text: "Use this customer reference only as directed by the artwork prompt. Never preserve its background or presentation surface.",
        });
        parts.push({ inlineData: reference });
    }
    parts.push({ text: buildGenAiArtworkTransportPrompt(params.prompt) });
    const imageSize = (process.env.WASHA_ARTWORK_GENAI_IMAGE_SIZE || "2K").trim() || "2K";
    const response = await withProviderTimeout(
        (abortSignal) => client.models.generateContent({
            model: params.model,
            contents: { role: "user", parts },
            config: {
                responseModalities: ["IMAGE", "TEXT"],
                imageConfig: { aspectRatio: "1:1", imageSize },
                httpOptions: {
                    timeout: params.timeoutMs,
                    retryOptions: { attempts: 1 },
                },
                abortSignal,
            } as any,
        }),
        params.timeoutMs
    );
    const imageUrl = extractGeneratedImageDataUrl(response);
    if (!imageUrl) throw new Error("Gemini returned no image output.");
    return {
        imageUrl,
        provider: "genai",
        model: params.model,
        parameters: {
            responseModalities: ["IMAGE", "TEXT"],
            aspectRatio: "1:1",
            imageSize,
            output: "image",
        },
    };
}

async function generateIsolatedWithOpenAi(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
    model: string;
}) {
    const size = (process.env.WASHA_ARTWORK_OPENAI_SIZE || "1024x1536").trim();
    const options = {
        throwOnError: true,
        size,
        quality: "high" as const,
        outputFormat: "png" as const,
        background: "transparent" as const,
    };
    const imageUrl = params.referenceImageDataUrl
        ? await runOpenAIEditDataUrl(params.prompt, params.referenceImageDataUrl, options)
        : await runOpenAIGenerateDataUrl(params.prompt, options);
    if (!imageUrl) throw new Error("OpenAI returned no image output.");
    return {
        imageUrl,
        provider: "openai",
        model: params.model,
        parameters: {
            size,
            quality: "high",
            output_format: "png",
            background: "transparent",
            n: 1,
        },
    };
}

async function generateIsolatedWithNanoBanana(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
    model: string;
}) {
    const imageUrl = await runNanoBananaDataUrl(
        params.prompt,
        params.referenceImageDataUrl,
        { throwOnError: true }
    );
    if (!imageUrl) throw new Error("Nano Banana returned no image output.");
    return {
        imageUrl,
        provider: "nanobanana",
        model: params.model,
        parameters: {
            aspectRatio: "1:1",
            outputMimeType: "image/png",
        },
    };
}

async function generateIsolatedWithReplicate(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
    model: string;
}) {
    const prediction = await runReplicatePredictions({
        version: params.referenceImageDataUrl ? FLUX_IMG2IMG : FLUX_SCHNELL,
        input: {
            prompt: params.prompt,
            ...(params.referenceImageDataUrl
                ? { image: params.referenceImageDataUrl }
                : {}),
            output_format: "png",
            aspect_ratio: "1:1",
        },
    });
    const imageUrl = prediction?.urls?.[0];
    if (!imageUrl) throw new Error("Replicate returned no image output.");
    return {
        imageUrl,
        provider: "replicate",
        model: params.model,
        parameters: {
            output_format: "png",
            aspect_ratio: "1:1",
        },
    };
}

async function attemptIsolatedArtworkGeneration(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
    configuration: WashaDtfProviderConfiguration;
    timeoutMs: number;
}) {
    if (params.configuration.provider === "genai") {
        return generateIsolatedWithGenAi({
            ...params,
            model: params.configuration.model,
        });
    }
    if (params.configuration.provider === "nanobanana") {
        return generateIsolatedWithNanoBanana({
            ...params,
            model: params.configuration.model,
        });
    }
    if (params.configuration.provider === "openai") {
        return generateIsolatedWithOpenAi({
            ...params,
            model: params.configuration.model,
        });
    }
    if (params.configuration.provider === "replicate") {
        return generateIsolatedWithReplicate({
            ...params,
            model: params.configuration.model,
        });
    }
    throw new Error(`Unsupported WASHA DTF image provider: ${params.configuration.configuredProvider}`);
}

function resolveFallbackConfiguration(
    primary: WashaDtfProviderConfiguration
) {
    if (!primary.fallbackEnabled) return null;
    const candidates =
        primary.provider === "openai"
            ? ["genai", "replicate"]
            : primary.provider === "nanobanana"
                ? ["genai", "openai", "replicate"]
                : ["openai", "replicate"];
    for (const candidate of candidates) {
        const configuration = resolveWashaDtfProviderConfiguration({
            ...process.env,
            WASHA_DTF_IMAGE_PROVIDER: candidate,
        });
        if (
            configuration.provider !== primary.provider
            && configuration.credentialConfigured
        ) {
            return configuration;
        }
    }
    return null;
}

export async function generateIsolatedArtwork(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
    traceId?: string;
    requiredProvider?: string;
    requiredModel?: string;
    attemptPurpose?: "generation" | "background_recovery";
}) : Promise<ProviderImageResult> {
    const traceId = params.traceId || crypto.randomUUID();
    const timeoutMs = resolveProviderTimeoutMs();
    const primary = resolveWashaDtfProviderConfiguration();
    const providerLocked = Boolean(params.requiredProvider || params.requiredModel);
    if (
        (params.requiredProvider && primary.provider !== params.requiredProvider)
        || (params.requiredModel && primary.model !== params.requiredModel)
    ) {
        throw new Error("Configured artwork provider changed during the locked generation attempt.");
    }
    const fallbackEnabled = primary.fallbackEnabled && !providerLocked;
    logDtfTrace("dtf.artwork.provider", traceId, "provider_resolved", {
        configuredProvider: primary.configuredProvider,
        resolvedProvider: primary.provider,
        resolvedModel: primary.model,
        fallbackEnabled,
        attemptPurpose: params.attemptPurpose || "generation",
        credentialConfigured: primary.credentialConfigured,
        hasReferenceImage: Boolean(params.referenceImageDataUrl),
        timeoutMs,
    });
    if (
        primary.provider === "unsupported"
        || !primary.credentialConfigured
    ) {
        throw new Error("The configured artwork provider is unavailable.");
    }

    const attempts: WashaDtfProviderAttempt[] = [];
    const primaryStartedAt = Date.now();
    logDtfTrace("dtf.artwork.provider", traceId, "provider_attempt_started", {
        resolvedProvider: primary.provider,
        attemptedProvider: primary.provider,
        attemptedModel: primary.model,
        providerAttempt: 1,
        fallbackEnabled,
        attemptPurpose: params.attemptPurpose || "generation",
    });
    try {
        const result = await attemptIsolatedArtworkGeneration({
            ...params,
            configuration: primary,
            timeoutMs,
        });
        logDtfTrace("dtf.artwork.provider", traceId, "provider_attempt_succeeded", {
            attemptedProvider: result.provider,
            attemptedModel: result.model,
            providerAttempt: 1,
            durationMs: Date.now() - primaryStartedAt,
        });
        return result;
    } catch (originalError) {
        const primaryAttempt = createWashaDtfProviderAttempt({
            provider: primary.provider,
            model: primary.model,
            attempt: 1,
            durationMs: Date.now() - primaryStartedAt,
            error: originalError,
        });
        attempts.push(primaryAttempt);
        logDtfTrace("dtf.artwork.provider", traceId, "provider_attempt_failed", {
            attemptedProvider: primaryAttempt.provider,
            attemptedModel: primaryAttempt.model,
            providerAttempt: primaryAttempt.attempt,
            durationMs: primaryAttempt.durationMs,
            providerStatus: primaryAttempt.status,
            providerCode: primaryAttempt.code,
            providerMessage: primaryAttempt.message,
        });

        const fallback = providerLocked
            ? null
            : resolveFallbackConfiguration(primary);
        if (!fallback) {
            throw new WashaDtfProviderChainError(attempts, originalError);
        }

        logDtfTrace("dtf.artwork.provider", traceId, "provider_fallback_started", {
            fromProvider: primary.provider,
            fromModel: primary.model,
            attemptedProvider: fallback.provider,
            attemptedModel: fallback.model,
            providerAttempt: 2,
            reasonCode: primaryAttempt.code,
            reasonStatus: primaryAttempt.status,
            reasonMessage: primaryAttempt.message,
        });
        const fallbackStartedAt = Date.now();
        try {
            const result = await attemptIsolatedArtworkGeneration({
                ...params,
                configuration: fallback,
                timeoutMs,
            });
            logDtfTrace("dtf.artwork.provider", traceId, "provider_fallback_succeeded", {
                attemptedProvider: result.provider,
                attemptedModel: result.model,
                providerAttempt: 2,
                durationMs: Date.now() - fallbackStartedAt,
            });
            return result;
        } catch (fallbackError) {
            const fallbackAttempt = createWashaDtfProviderAttempt({
                provider: fallback.provider,
                model: fallback.model,
                attempt: 2,
                durationMs: Date.now() - fallbackStartedAt,
                error: fallbackError,
            });
            attempts.push(fallbackAttempt);
            logDtfTrace("dtf.artwork.provider", traceId, "provider_fallback_failed", {
                originalProvider: primaryAttempt.provider,
                originalModel: primaryAttempt.model,
                originalStatus: primaryAttempt.status,
                originalCode: primaryAttempt.code,
                originalMessage: primaryAttempt.message,
                attemptedProvider: fallbackAttempt.provider,
                attemptedModel: fallbackAttempt.model,
                providerAttempt: fallbackAttempt.attempt,
                durationMs: fallbackAttempt.durationMs,
                providerStatus: fallbackAttempt.status,
                providerCode: fallbackAttempt.code,
                providerMessage: fallbackAttempt.message,
            });
            throw new WashaDtfProviderChainError(attempts, originalError);
        }
    }
}

async function generateBlankWithGenAi(prompt: string, model: string) {
    const imageSize = (process.env.WASHA_DTF_GARMENT_IMAGE_SIZE || "2K").trim();
    const client = getWashaDtfGenAiClient();
    const response = await client.models.generateContent({
        model,
        contents: {
            role: "user",
            parts: [
                {
                    text:
                        "Authoritative task: generate only a clean blank garment mockup. Any artwork, lettering, logo, symbol, or decorative graphic is a failed result.",
                },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1", imageSize },
        } as any,
    });
    const imageUrl = extractGeneratedImageDataUrl(response);
    if (!imageUrl) throw new Error("The garment provider returned no image.");
    return {
        imageUrl,
        provider: "genai",
        model,
        parameters: { aspectRatio: "1:1", imageSize, output: "image" },
    };
}

export async function generateBlankGarment(prompt: string): Promise<ProviderImageResult> {
    const configuration = resolveWashaDtfProviderConfiguration();
    const resolved = configuration.provider;

    if (resolved === "openai" && isOpenAIKeyConfigured()) {
        const imageUrl = await runOpenAIGenerateDataUrl(prompt, {
            throwOnError: true,
            size: (process.env.WASHA_GARMENT_OPENAI_SIZE || "1024x1024").trim(),
            quality: "high",
            outputFormat: "png",
            background: "opaque",
        });
        if (imageUrl) {
            return {
                imageUrl,
                provider: "openai",
                model: getOpenAIImageModel(),
                parameters: {
                    size: (process.env.WASHA_GARMENT_OPENAI_SIZE || "1024x1024").trim(),
                    quality: "high",
                    output_format: "png",
                    background: "opaque",
                },
            };
        }
    }

    if (resolved === "replicate" && isReplicateTokenConfigured()) {
        const result = await runReplicatePredictions({
            version: FLUX_SCHNELL,
            input: { prompt, output_format: "png", aspect_ratio: "1:1" },
        });
        if (result?.urls?.[0]) {
            return {
                imageUrl: result.urls[0],
                provider: "replicate",
                model: FLUX_SCHNELL,
                parameters: { output_format: "png", aspect_ratio: "1:1" },
            };
        }
    }

    if (resolved === "nanobanana" && isGeminiKeyConfigured()) {
        const imageUrl = await runNanoBananaDataUrl(prompt, null, { throwOnError: true })
            || await runGeminiImagenDataUrl(prompt);
        if (imageUrl) {
            return {
                imageUrl,
                provider: "nanobanana",
                model: configuration.model,
                parameters: { aspectRatio: "1:1", outputMimeType: "image/png" },
            };
        }
    }

    if (resolved === "genai" && isGeminiKeyConfigured()) {
        return generateBlankWithGenAi(prompt, configuration.model);
    }

    if (!configuration.fallbackEnabled) {
        throw new Error("The configured blank-garment provider is unavailable.");
    }

    if (resolved !== "genai" && isGeminiKeyConfigured()) {
        const genaiConfiguration = resolveWashaDtfProviderConfiguration({
            ...process.env,
            WASHA_DTF_IMAGE_PROVIDER: "genai",
        });
        return generateBlankWithGenAi(prompt, genaiConfiguration.model);
    }

    if (resolved !== "openai" && isOpenAIKeyConfigured()) {
        const imageUrl = await runOpenAIGenerateDataUrl(prompt, {
            throwOnError: true,
            quality: "high",
            outputFormat: "png",
            background: "opaque",
        });
        if (imageUrl) {
            return {
                imageUrl,
                provider: "openai",
                model: getOpenAIImageModel(),
                parameters: { quality: "high", output_format: "png", background: "opaque" },
            };
        }
    }

    throw new Error("No configured provider could generate a blank garment mockup.");
}
