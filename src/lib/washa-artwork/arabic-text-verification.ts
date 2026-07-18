import {
    resolveWashaDtfVerificationProvider,
    runWashaDtfGeminiImageVerification,
} from "@/lib/washa-artwork/gemini-verification";

function extractAssistantText(payload: any) {
    const value = payload?.choices?.[0]?.message?.content;
    return typeof value === "string" ? value.trim() : "";
}

export class ArtworkTextPolicyError extends Error {
    readonly code = "ARTWORK_TEXT_POLICY_FAILED";

    constructor(message: string) {
        super(message);
        this.name = "ArtworkTextPolicyError";
    }
}

export function isArtworkTextPolicyError(
    error: unknown
): error is ArtworkTextPolicyError {
    return error instanceof ArtworkTextPolicyError
        || (
            error instanceof Error
            && "code" in error
            && error.code === "ARTWORK_TEXT_POLICY_FAILED"
        );
}

export async function verifyExactArabicText(params: {
    artworkPng: Buffer;
    expectedText?: string | null;
}) {
    const expectedText = params.expectedText?.trim();
    if (!expectedText) {
        return { required: false, verified: true, observedText: null, model: null };
    }
    const prompt = [
        "Act only as a strict Arabic OCR verifier.",
        `Expected exact text: ${JSON.stringify(expectedText)}`,
        "Read every Arabic character visible in the artwork.",
        "Return JSON only: {\"matches\":boolean,\"observedText\":string}.",
        "matches may be true only when observedText is character-for-character identical to expected text.",
    ].join("\n");
    const verificationProvider = resolveWashaDtfVerificationProvider();
    if (verificationProvider === "genai") {
        const result = await runWashaDtfGeminiImageVerification<{
            matches?: boolean;
            observedText?: string;
        }>({
            imagePng: params.artworkPng,
            prompt,
            responseJsonSchema: {
                type: "object",
                properties: {
                    matches: { type: "boolean" },
                    observedText: { type: "string" },
                },
                required: ["matches", "observedText"],
            },
        });
        const observedText = typeof result.parsed.observedText === "string"
            ? result.parsed.observedText
            : "";
        if (result.parsed.matches !== true || observedText !== expectedText) {
            throw new Error("Generated artwork does not preserve the supplied Arabic text exactly.");
        }
        return {
            required: true,
            verified: true,
            observedText,
            model: result.model,
        };
    }
    if (verificationProvider === "unavailable") {
        throw new Error("Arabic artwork verification provider is unavailable.");
    }
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("Arabic artwork verification requires OPENAI_API_KEY.");
    const model = (
        process.env.WASHA_DTF_ARABIC_VERIFICATION_MODEL
        || "gpt-4o-mini"
    ).trim();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                max_tokens: 160,
                response_format: { type: "json_object" },
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${params.artworkPng.toString("base64")}`,
                                detail: "high",
                            },
                        },
                    ],
                }],
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`Arabic artwork verification failed with status ${response.status}.`);
        }
        const payload = await response.json();
        const parsed = JSON.parse(extractAssistantText(payload));
        const observedText = typeof parsed?.observedText === "string"
            ? parsed.observedText
            : "";
        if (parsed?.matches !== true || observedText !== expectedText) {
            throw new Error("Generated artwork does not preserve the supplied Arabic text exactly.");
        }
        return {
            required: true,
            verified: true,
            observedText,
            model,
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function verifyNoUnexpectedText(params: {
    artworkPng: Buffer;
}) {
    const prompt = [
        "Act only as a strict OCR and visible-writing detector.",
        "The customer left the dedicated text field empty, so this artwork is required to contain no visible writing.",
        "Inspect the complete image for typography, letters, characters, glyphs, words, sentences, numbers, captions, labels, signatures, logos, watermarks, prompt text, and pseudo-text resembling writing in any language.",
        "Set hasVisibleText to true if any such writing or text-like content is visible, even when misspelled, distorted, decorative, very small, or only partially legible.",
        "Return JSON only: {\"hasVisibleText\":boolean,\"observedText\":string}.",
        "When no writing is visible, return hasVisibleText false and an empty observedText.",
    ].join("\n");
    const verificationProvider = resolveWashaDtfVerificationProvider();
    let parsed: {
        hasVisibleText?: boolean;
        observedText?: string;
    };
    let model: string;

    if (verificationProvider === "genai") {
        const result = await runWashaDtfGeminiImageVerification<{
            hasVisibleText?: boolean;
            observedText?: string;
        }>({
            imagePng: params.artworkPng,
            prompt,
            responseJsonSchema: {
                type: "object",
                properties: {
                    hasVisibleText: { type: "boolean" },
                    observedText: { type: "string" },
                },
                required: ["hasVisibleText", "observedText"],
            },
        });
        parsed = result.parsed;
        model = result.model;
    } else {
        if (verificationProvider === "unavailable") {
            throw new Error("Artwork text-policy verification provider is unavailable.");
        }
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) {
            throw new Error("Artwork text-policy verification requires OPENAI_API_KEY.");
        }
        model = (
            process.env.WASHA_DTF_TEXT_POLICY_VERIFICATION_MODEL
            || process.env.WASHA_DTF_ARABIC_VERIFICATION_MODEL
            || "gpt-4o-mini"
        ).trim();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    temperature: 0,
                    max_tokens: 160,
                    response_format: { type: "json_object" },
                    messages: [{
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${params.artworkPng.toString("base64")}`,
                                    detail: "high",
                                },
                            },
                        ],
                    }],
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Artwork text-policy verification failed with status ${response.status}.`);
            }
            parsed = JSON.parse(extractAssistantText(await response.json()));
        } finally {
            clearTimeout(timeout);
        }
    }

    const observedText = typeof parsed.observedText === "string"
        ? parsed.observedText.trim()
        : "";
    if (parsed.hasVisibleText !== false || observedText) {
        throw new ArtworkTextPolicyError(
            "Generated artwork contains unexpected visible text."
        );
    }
    return {
        mode: "forbidden" as const,
        required: true,
        verified: true,
        hasVisibleText: false,
        observedText: null,
        model,
    };
}

export async function verifyArtworkTextPolicy(params: {
    artworkPng: Buffer;
    expectedText?: string | null;
}) {
    const expectedText = params.expectedText?.trim();
    if (!expectedText) {
        return verifyNoUnexpectedText({
            artworkPng: params.artworkPng,
        });
    }

    const exactTextVerification = await verifyExactArabicText({
        artworkPng: params.artworkPng,
        expectedText,
    });
    return {
        ...exactTextVerification,
        mode: "exact" as const,
        hasVisibleText: true,
    };
}
