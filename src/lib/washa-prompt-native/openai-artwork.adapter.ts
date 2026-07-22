import "server-only";

import {
    ArtworkPrintValidationError,
    type ArtworkNormalizationDiagnostics,
} from "@/lib/washa-artwork/normalization";
import { validateArtworkPng } from "@/lib/washa-artwork/validation";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";
import {
    assertPromptNativeModelCompatibility,
    PROMPT_NATIVE_MODELS,
} from "@/lib/washa-prompt-native/readiness";

const DEFAULT_MODEL = PROMPT_NATIVE_MODELS.artwork;
const DEFAULT_SIZE = "1024x1536";
// Two alpha-validation attempts must fit inside the 300s route budget together
// with text verification, Gemini composition, persistence, and response work.
const DEFAULT_TIMEOUT_MS = 70_000;
const MAX_ATTEMPTS = 2;

type OpenAiImageResponse = {
    data?: Array<{ b64_json?: string }>;
};

function configuredModel() {
    return (
        process.env.WASHA_PROMPT_NATIVE_OPENAI_MODEL
        || DEFAULT_MODEL
    ).trim() || DEFAULT_MODEL;
}

function configuredSize() {
    return (
        process.env.WASHA_PROMPT_NATIVE_OPENAI_SIZE
        || DEFAULT_SIZE
    ).trim() || DEFAULT_SIZE;
}

function configuredTimeoutMs() {
    const parsed = Number.parseInt(
        process.env.WASHA_PROMPT_NATIVE_OPENAI_TIMEOUT_MS || "",
        10
    );
    return Number.isFinite(parsed)
        ? Math.min(70_000, Math.max(20_000, parsed))
        : DEFAULT_TIMEOUT_MS;
}

function buildNativeArtworkPrompt(prompt: string, attempt: number) {
    const retryDirective = attempt > 1
        ? [
            "CORRECTION: The previous attempt failed alpha validation.",
            "Generate the requested artwork again from the original brief.",
            "Do not place it on a white, black, colored, checkerboard, or simulated transparent canvas.",
        ].join("\n")
        : null;

    return [
        "WASHA AI PROMPT NATIVE — AUTHORITATIVE ARTWORK CONTRACT",
        "Create exactly one standalone professional print artwork from the brief below.",
        "Return a native PNG whose canvas has a real alpha channel and genuinely transparent background pixels.",
        "The artwork itself must be fully opaque where visually intended, sharp, complete, centered, uncropped, and surrounded by generous transparent safe padding.",
        "Never draw a garment, person, mannequin, product mockup, studio, wall, paper, frame, floor, shadow cast onto a background, presentation surface, watermark, signature, or generation notes.",
        "Never simulate transparency with a checkerboard or a flat color. Never add an opaque panel behind the artwork.",
        "Preserve any customer-supplied Arabic text exactly as written. Do not invent, translate, correct, duplicate, or add text.",
        "Optimize edges, internal negative space, color separation, and detail for professional DTF printing.",
        retryDirective,
        "<artwork_brief>",
        prompt.trim(),
        "</artwork_brief>",
        "FINAL CHECK: one isolated print artwork, native transparent PNG, real alpha channel, no background and no mockup.",
    ].filter(Boolean).join("\n\n");
}

function normalizationFromValidation(
    validation: Awaited<ReturnType<typeof validateArtworkPng>>
): ArtworkNormalizationDiagnostics {
    const bounds = validation.contentBounds!;
    return {
        backgroundRemovalApplied: false,
        backgroundColor: null,
        borderBackgroundCoherence: null,
        borderSeedRatio: null,
        removedPixelRatio: 0,
        foregroundPixelRatio: 1 - validation.transparentPixelRatio,
        haloSuppressionApplied: false,
        contentBounds: bounds,
        paddingRatio: validation.safePaddingRatio,
        paddingPixels: {
            x: Math.min(bounds.left, validation.width - 1 - bounds.right),
            y: Math.min(bounds.top, validation.height - 1 - bounds.bottom),
        },
        outputScaleFactor: 1,
    };
}

function providerError(status: number, message: string) {
    const providerStatus = status === 429
        ? "RESOURCE_EXHAUSTED"
        : status >= 500
            ? "UNAVAILABLE"
            : "INVALID_ARGUMENT";
    return new Error(JSON.stringify({
        error: {
            code: status,
            status: providerStatus,
            message: message || `OpenAI Prompt Native failed with status ${status}`,
        },
    }));
}

async function requestArtwork(params: {
    prompt: string;
    model: string;
    size: string;
    timeoutMs: number;
    referenceImageDataUrl?: string | null;
}) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
    try {
        const reference = params.referenceImageDataUrl?.match(
            /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=\s]+)$/i
        );
        let endpoint = "https://api.openai.com/v1/images/generations";
        let body: BodyInit;
        let headers: HeadersInit = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        };
        if (reference) {
            endpoint = "https://api.openai.com/v1/images/edits";
            const mimeType = reference[1].toLowerCase();
            const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
            const formData = new FormData();
            formData.append("model", params.model);
            formData.append("prompt", params.prompt);
            formData.append("image", new Blob([
                Buffer.from(reference[2].replace(/\s+/g, ""), "base64"),
            ], { type: mimeType }), `customer-reference.${extension}`);
            formData.append("n", "1");
            formData.append("size", params.size);
            formData.append("quality", "high");
            formData.append("output_format", "png");
            formData.append("background", "transparent");
            body = formData;
            headers = { Authorization: `Bearer ${apiKey}` };
        } else {
            body = JSON.stringify({
                model: params.model,
                prompt: params.prompt,
                n: 1,
                size: params.size,
                quality: "high",
                output_format: "png",
                background: "transparent",
            });
        }
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
        });
        if (!response.ok) {
            const body = await response.text();
            let message = body;
            try {
                const parsed = JSON.parse(body) as { error?: { message?: string } };
                message = parsed.error?.message || body;
            } catch {
                // Keep the provider response as the diagnostic message.
            }
            throw providerError(response.status, message);
        }
        const payload = await response.json() as OpenAiImageResponse;
        const encoded = payload.data?.[0]?.b64_json;
        if (!encoded) throw providerError(502, "OpenAI returned no image bytes.");
        return Buffer.from(encoded, "base64");
    } finally {
        clearTimeout(timeout);
    }
}

export async function generatePromptNativeArtwork(params: {
    prompt: string;
    traceId: string;
    referenceImageDataUrl?: string | null;
}) {
    assertPromptNativeModelCompatibility(["artwork"]);
    const model = configuredModel();
    const size = configuredSize();
    const timeoutMs = configuredTimeoutMs();
    let lastValidation: Awaited<ReturnType<typeof validateArtworkPng>> | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const compiledPrompt = buildNativeArtworkPrompt(params.prompt, attempt);
        const startedAt = Date.now();
        logDtfTrace("dtf.prompt_native.artwork", params.traceId, "openai_artwork_started", {
            provider: "openai",
            model,
            attempt,
            size,
        });
        const buffer = await requestArtwork({
            prompt: compiledPrompt,
            model,
            size,
            timeoutMs,
            referenceImageDataUrl: params.referenceImageDataUrl,
        });
        const validation = await validateArtworkPng(buffer);
        lastValidation = validation;
        if (validation.valid) {
            logDtfTrace("dtf.prompt_native.artwork", params.traceId, "openai_artwork_verified", {
                provider: "openai",
                model,
                attempt,
                durationMs: Date.now() - startedAt,
                width: validation.width,
                height: validation.height,
                transparentPixelRatio: validation.transparentPixelRatio,
                safePaddingRatio: validation.safePaddingRatio,
            });
            return {
                buffer,
                provider: "openai" as const,
                model,
                prompt: compiledPrompt,
                parameters: {
                    pipeline: "prompt_native",
                    output_format: "png",
                    background: "transparent",
                    quality: "high",
                    size,
                    attempt,
                    backgroundRemovalApplied: false,
                    referenceImageUsed: Boolean(params.referenceImageDataUrl),
                },
                validation,
                normalization: normalizationFromValidation(validation),
                attempt,
            };
        }
        logDtfTrace("dtf.prompt_native.artwork", params.traceId, "openai_artwork_rejected", {
            provider: "openai",
            model,
            attempt,
            durationMs: Date.now() - startedAt,
            validationErrors: validation.errors,
            backgroundRemovalApplied: false,
        });
    }

    throw new ArtworkPrintValidationError({
        message: "OpenAI did not return a native transparent print-ready PNG after two attempts.",
        stage: "validation",
        diagnostics: {
            pipeline: "prompt_native",
            provider: "openai",
            model,
            backgroundRemovalApplied: false,
            validation: lastValidation,
        },
        validationErrors: lastValidation?.errors || ["Native transparency validation failed."],
    });
}
