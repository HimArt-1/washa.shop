import {
    getOpenAIImageModel,
    isOpenAIKeyConfigured,
    runOpenAIEditDataUrl,
    runOpenAIGenerateDataUrl,
} from "@/lib/openai-image";
import {
    FLUX_SCHNELL,
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
    WASHA_DTF_MODEL,
} from "@/lib/washa-dtf-studio";
import { getWashaDtfResolvedImageProvider } from "@/lib/washa-dtf-image-router";

export type ProviderImageResult = {
    imageUrl: string;
    provider: string;
    model: string;
    parameters: Record<string, unknown>;
};

export function getIsolatedArtworkProviderReadiness() {
    if (!isOpenAIKeyConfigured()) {
        return {
            ready: false as const,
            message:
                "توليد ملف شفاف حقيقي يتطلب تفعيل مزود OpenAI الموجود في المشروع؛ مزود Gemini الحالي لا يدعم خلفية شفافة أصلية.",
        };
    }

    const model = getOpenAIImageModel();
    if (!model.startsWith("gpt-image-")) {
        return {
            ready: false as const,
            message: "نموذج OpenAI الحالي لا يدعم إعداد الخلفية الشفافة المطلوبة.",
        };
    }

    return { ready: true as const, provider: "openai", model };
}

export async function generateIsolatedArtwork(params: {
    prompt: string;
    referenceImageDataUrl?: string | null;
}) : Promise<ProviderImageResult> {
    const readiness = getIsolatedArtworkProviderReadiness();
    if (!readiness.ready) throw new Error(readiness.message);

    const parameters = {
        size: (process.env.WASHA_ARTWORK_OPENAI_SIZE || "1024x1536").trim(),
        quality: "high",
        output_format: "png",
        background: "transparent",
        n: 1,
    };
    const options = {
        throwOnError: true,
        size: parameters.size,
        quality: "high" as const,
        outputFormat: "png" as const,
        background: "transparent" as const,
    };
    const imageUrl = params.referenceImageDataUrl
        ? await runOpenAIEditDataUrl(params.prompt, params.referenceImageDataUrl, options)
        : await runOpenAIGenerateDataUrl(params.prompt, options);

    if (!imageUrl) throw new Error("The artwork provider returned no image.");
    return {
        imageUrl,
        provider: readiness.provider,
        model: readiness.model,
        parameters,
    };
}

async function generateBlankWithGenAi(prompt: string) {
    const imageSize = (process.env.WASHA_DTF_GARMENT_IMAGE_SIZE || "2K").trim();
    const client = getWashaDtfGenAiClient();
    const response = await client.models.generateContent({
        model: WASHA_DTF_MODEL,
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
        model: WASHA_DTF_MODEL,
        parameters: { aspectRatio: "1:1", imageSize, output: "image" },
    };
}

export async function generateBlankGarment(prompt: string): Promise<ProviderImageResult> {
    const resolved = getWashaDtfResolvedImageProvider();

    if (["openai", "dall-e", "dalle", "gpt-image"].includes(resolved) && isOpenAIKeyConfigured()) {
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

    if (["nanobanana", "gemini"].includes(resolved) && isGeminiKeyConfigured()) {
        const imageUrl = await runNanoBananaDataUrl(prompt, null, { throwOnError: true })
            || await runGeminiImagenDataUrl(prompt);
        if (imageUrl) {
            return {
                imageUrl,
                provider: "gemini",
                model: process.env.NANO_BANANA_PREDICT_MODEL || "imagen-4.0-ultra-generate-001",
                parameters: { aspectRatio: "1:1", outputMimeType: "image/png" },
            };
        }
    }

    if (isGeminiKeyConfigured()) return generateBlankWithGenAi(prompt);

    if (isOpenAIKeyConfigured()) {
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
