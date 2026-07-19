import {
    resolveWashaDtfVerificationProvider,
    runWashaDtfGeminiImageVerification,
    type WashaDtfVerificationProvider,
} from "@/lib/washa-artwork/gemini-verification";
import {
    ArtworkVerificationUnavailableError,
    createArtworkVerificationHttpError,
    createArtworkVerificationRuntimeError,
    isArtworkVerificationUnavailableError,
} from "@/lib/washa-artwork/verification-error";
import {
    isArabicTextMatch,
    normalizeArabicForCompare,
} from "@/lib/washa-artwork/arabic-normalize";

function extractAssistantText(payload: any) {
    const value = payload?.choices?.[0]?.message?.content;
    return typeof value === "string" ? value.trim() : "";
}

type TextVerificationContext = {
    preferredProvider?: string | null;
    sourceModel?: string | null;
};

function resolveSourceProvider(
    context: TextVerificationContext,
    verificationProvider: WashaDtfVerificationProvider
) {
    return context.preferredProvider?.trim().toLowerCase()
        || (
            verificationProvider === "unavailable"
                ? null
                : verificationProvider
        );
}

function unavailableVerificationError(params: {
    context: TextVerificationContext;
    verificationProvider: WashaDtfVerificationProvider;
}) {
    const sourceProvider = resolveSourceProvider(
        params.context,
        params.verificationProvider
    );
    return new ArtworkVerificationUnavailableError({
        provider: sourceProvider || "unavailable",
        model: null,
        sourceProvider,
        sourceModel: params.context.sourceModel,
        stage: "text_policy_verification",
        providerCode: "verification_provider_unavailable",
        providerMessage: "Artwork text-policy verification provider is unavailable.",
        retryable: false,
    });
}

async function runOpenAiTextVerification<T>(params: {
    artworkPng: Buffer;
    prompt: string;
    model: string;
    context: TextVerificationContext;
}): Promise<{ parsed: T; provider: "openai"; model: string }> {
    const sourceProvider = resolveSourceProvider(params.context, "openai");
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        throw new ArtworkVerificationUnavailableError({
            provider: "openai",
            model: params.model,
            sourceProvider,
            sourceModel: params.context.sourceModel,
            stage: "text_policy_verification",
            providerCode: "missing_credential",
            providerMessage: "Artwork text-policy verification credential is unavailable.",
            retryable: false,
        });
    }
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
                model: params.model,
                temperature: 0,
                max_tokens: 160,
                response_format: { type: "json_object" },
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: params.prompt,
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
            throw await createArtworkVerificationHttpError({
                response,
                provider: "openai",
                model: params.model,
                sourceProvider,
                sourceModel: params.context.sourceModel,
                stage: "text_policy_verification",
            });
        }
        const assistantText = extractAssistantText(await response.json());
        if (!assistantText) {
            throw new Error("OpenAI verification returned no JSON response.");
        }
        return {
            parsed: JSON.parse(assistantText) as T,
            provider: "openai",
            model: params.model,
        };
    } catch (error) {
        if (isArtworkVerificationUnavailableError(error)) throw error;
        throw createArtworkVerificationRuntimeError({
            error,
            provider: "openai",
            model: params.model,
            sourceProvider,
            sourceModel: params.context.sourceModel,
            stage: "text_policy_verification",
            fallbackCode: "invalid_verification_response",
        });
    } finally {
        clearTimeout(timeout);
    }
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

function assertArabicTextMatches(params: {
    verifierMatches: boolean | undefined;
    observedText: string;
    expectedText: string;
}) {
    const tolerantMatch = isArabicTextMatch(
        params.observedText,
        params.expectedText
    );
    if (process.env.WASHA_ENABLE_TOLERANT_TEXT_MATCH === "true") {
        if (!tolerantMatch.matches) {
            throw new ArtworkTextPolicyError(
                `Text mismatch: observed ${JSON.stringify(params.observedText)}, `
                + `expected ${JSON.stringify(params.expectedText)}, `
                + `distance ${tolerantMatch.distance} > tolerance ${tolerantMatch.tolerance}`
            );
        }
        return;
    }

    const legacyMatch =
        params.verifierMatches === true
        && params.observedText === params.expectedText;
    if (!legacyMatch) {
        throw new ArtworkTextPolicyError(
            "Generated artwork does not preserve the supplied Arabic text exactly."
        );
    }
}

export async function verifyExactArabicText(params: {
    artworkPng: Buffer;
    expectedText?: string | null;
    preferredProvider?: string | null;
    sourceModel?: string | null;
}) {
    const expectedText = params.expectedText?.trim();
    if (!expectedText) {
        return {
            required: false,
            verified: true,
            observedText: null,
            provider: null,
            model: null,
        };
    }
    const prompt = [
        "Act only as a strict Arabic OCR verifier.",
        `Expected exact text: ${JSON.stringify(expectedText)}`,
        "Read every Arabic character visible in the artwork.",
        "Return JSON only: {\"matches\":boolean,\"observedText\":string}.",
        "matches may be true only when observedText is character-for-character identical to expected text.",
    ].join("\n");
    const verificationProvider = resolveWashaDtfVerificationProvider(
        params.preferredProvider
    );
    const context: TextVerificationContext = {
        preferredProvider: params.preferredProvider,
        sourceModel: params.sourceModel,
    };
    if (verificationProvider === "genai") {
        const result = await runWashaDtfGeminiImageVerification<{
            matches?: boolean;
            observedText?: string;
        }>({
            imagePng: params.artworkPng,
            prompt,
            sourceProvider: resolveSourceProvider(context, verificationProvider),
            sourceModel: params.sourceModel,
            stage: "text_policy_verification",
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
        assertArabicTextMatches({
            verifierMatches: result.parsed.matches,
            observedText,
            expectedText,
        });
        return {
            required: true,
            verified: true,
            observedText,
            provider: result.provider,
            model: result.model,
        };
    }
    if (verificationProvider === "unavailable") {
        throw unavailableVerificationError({ context, verificationProvider });
    }
    const model = (
        process.env.WASHA_DTF_ARABIC_VERIFICATION_MODEL
        || "gpt-4o-mini"
    ).trim();
    const result = await runOpenAiTextVerification<{
        matches?: boolean;
        observedText?: string;
    }>({
        artworkPng: params.artworkPng,
        prompt,
        model,
        context,
    });
    const observedText = typeof result.parsed.observedText === "string"
        ? result.parsed.observedText
        : "";
    assertArabicTextMatches({
        verifierMatches: result.parsed.matches,
        observedText,
        expectedText,
    });
    return {
        required: true,
        verified: true,
        observedText,
        provider: result.provider,
        model: result.model,
    };
}

async function verifyNoUnexpectedText(params: {
    artworkPng: Buffer;
    preferredProvider?: string | null;
    sourceModel?: string | null;
}) {
    const prompt = [
        "Act only as a strict OCR and visible-writing detector.",
        "The customer left the dedicated text field empty, so this artwork is required to contain no visible writing.",
        "Inspect the complete image for typography, letters, characters, glyphs, words, sentences, numbers, captions, labels, signatures, logos, watermarks, prompt text, and pseudo-text resembling writing in any language.",
        "Set hasVisibleText to true if any such writing or text-like content is visible, even when misspelled, distorted, decorative, very small, or only partially legible.",
        "Return JSON only: {\"hasVisibleText\":boolean,\"observedText\":string}.",
        "When no writing is visible, return hasVisibleText false and an empty observedText.",
    ].join("\n");
    const verificationProvider = resolveWashaDtfVerificationProvider(
        params.preferredProvider
    );
    const context: TextVerificationContext = {
        preferredProvider: params.preferredProvider,
        sourceModel: params.sourceModel,
    };
    let parsed: {
        hasVisibleText?: boolean;
        observedText?: string;
    };
    let provider: "genai" | "openai";
    let model: string;

    if (verificationProvider === "genai") {
        const result = await runWashaDtfGeminiImageVerification<{
            hasVisibleText?: boolean;
            observedText?: string;
        }>({
            imagePng: params.artworkPng,
            prompt,
            sourceProvider: resolveSourceProvider(context, verificationProvider),
            sourceModel: params.sourceModel,
            stage: "text_policy_verification",
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
        provider = result.provider;
        model = result.model;
    } else {
        if (verificationProvider === "unavailable") {
            throw unavailableVerificationError({ context, verificationProvider });
        }
        model = (
            process.env.WASHA_DTF_TEXT_POLICY_VERIFICATION_MODEL
            || process.env.WASHA_DTF_ARABIC_VERIFICATION_MODEL
            || "gpt-4o-mini"
        ).trim();
        const result = await runOpenAiTextVerification<{
            hasVisibleText?: boolean;
            observedText?: string;
        }>({
            artworkPng: params.artworkPng,
            prompt,
            model,
            context,
        });
        parsed = result.parsed;
        provider = result.provider;
        model = result.model;
    }

    const observedText = typeof parsed.observedText === "string"
        ? parsed.observedText.trim()
        : "";
    const normalizedLength = normalizeArabicForCompare(observedText).length;
    const hasUnexpectedText =
        process.env.WASHA_ENABLE_TOLERANT_TEXT_MATCH === "true"
            ? normalizedLength >= 3
                || (parsed.hasVisibleText === true && observedText.length > 5)
            : parsed.hasVisibleText !== false || Boolean(observedText);
    if (hasUnexpectedText) {
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
        provider,
        model,
    };
}

export async function verifyArtworkTextPolicy(params: {
    artworkPng: Buffer;
    expectedText?: string | null;
    preferredProvider?: string | null;
    sourceModel?: string | null;
}) {
    const expectedText = params.expectedText?.trim();
    if (!expectedText) {
        return verifyNoUnexpectedText({
            artworkPng: params.artworkPng,
            preferredProvider: params.preferredProvider,
            sourceModel: params.sourceModel,
        });
    }

    const exactTextVerification = await verifyExactArabicText({
        artworkPng: params.artworkPng,
        expectedText,
        preferredProvider: params.preferredProvider,
        sourceModel: params.sourceModel,
    });
    return {
        ...exactTextVerification,
        mode: "exact" as const,
        hasVisibleText: true,
    };
}
