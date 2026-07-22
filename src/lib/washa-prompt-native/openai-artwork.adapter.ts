import "server-only";

import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";
import {
    assertPromptNativeModelCompatibility,
    PROMPT_NATIVE_MODELS,
} from "@/lib/washa-prompt-native/readiness";

const DEFAULT_MODEL = PROMPT_NATIVE_MODELS.artwork;
const DEFAULT_SIZE = "1024x1536";
const DEFAULT_TIMEOUT_MS = 70_000;

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

function buildNativeArtworkPrompt(prompt: string) {
    return [
        "WASHA AI PROMPT NATIVE — AUTHORITATIVE ARTWORK CONTRACT",
        "Create exactly one standalone professional print artwork from the brief below.",
        "Return a native PNG whose canvas has a real alpha channel and genuinely transparent background pixels.",
        "The artwork itself must be fully opaque where visually intended, sharp, complete, centered, uncropped, and surrounded by generous transparent safe padding.",
        "Never draw a garment, person, mannequin, product mockup, studio, wall, paper, frame, floor, shadow cast onto a background, presentation surface, watermark, signature, or generation notes.",
        "Never simulate transparency with a checkerboard or a flat color. Never add an opaque panel behind the artwork.",
        "Preserve any customer-supplied Arabic text exactly as written. Do not invent, translate, correct, duplicate, or add text.",
        "Optimize edges, internal negative space, color separation, and detail for professional DTF printing.",
        "<artwork_brief>",
        prompt.trim(),
        "</artwork_brief>",
        "FINAL CHECK: one isolated print artwork, native transparent PNG, real alpha channel, no background and no mockup.",
    ].filter(Boolean).join("\n\n");
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
    const attempt = 1;
    const compiledPrompt = buildNativeArtworkPrompt(params.prompt);
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
    // Deliberately return the exact provider bytes before print validation.
    // The caller persists them as the immutable Raw Source first, then runs
    // normalization and all production gates against a derivative.
    logDtfTrace("dtf.prompt_native.artwork", params.traceId, "openai_artwork_received", {
        provider: "openai",
        model,
        attempt,
        durationMs: Date.now() - startedAt,
        byteLength: buffer.byteLength,
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
        attempt,
    };
}
