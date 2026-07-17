import { getWashaDtfGenAiClient } from "@/lib/washa-dtf-studio";
import {
    cleanWashaDtfEnvValue,
    resolveWashaDtfProviderConfiguration,
} from "@/lib/washa-dtf-provider-config";

export type WashaDtfVerificationProvider = "genai" | "openai" | "unavailable";

function hasGeminiCredential() {
    return Boolean(
        cleanWashaDtfEnvValue(process.env.GEMINI_API_KEY)
        || cleanWashaDtfEnvValue(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    );
}

function hasOpenAiCredential() {
    return Boolean(cleanWashaDtfEnvValue(process.env.OPENAI_API_KEY));
}

export function resolveWashaDtfVerificationProvider(): WashaDtfVerificationProvider {
    const configuration = resolveWashaDtfProviderConfiguration();
    if (configuration.provider === "openai" && hasOpenAiCredential()) {
        return "openai";
    }
    if (hasGeminiCredential()) return "genai";
    if (configuration.fallbackEnabled && hasOpenAiCredential()) return "openai";
    return "unavailable";
}

function extractText(response: any) {
    const direct = typeof response?.text === "string" ? response.text.trim() : "";
    if (direct) return direct;
    return (response?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => typeof part?.text === "string" ? part.text.trim() : "")
        .filter(Boolean)
        .join("")
        .trim();
}

export async function runWashaDtfGeminiImageVerification<T>(params: {
    imagePng: Buffer;
    prompt: string;
    responseJsonSchema: Record<string, unknown>;
}): Promise<{ parsed: T; model: string }> {
    const configuration = resolveWashaDtfProviderConfiguration({
        ...process.env,
        WASHA_DTF_IMAGE_PROVIDER: "genai",
    });
    const timeoutMs = 30_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await getWashaDtfGenAiClient().models.generateContent({
            model: configuration.model,
            contents: {
                role: "user",
                parts: [
                    {
                        inlineData: {
                            data: params.imagePng.toString("base64"),
                            mimeType: "image/png",
                        },
                    },
                    { text: params.prompt },
                ],
            },
            config: {
                temperature: 0,
                responseModalities: ["TEXT"],
                responseMimeType: "application/json",
                responseJsonSchema: params.responseJsonSchema,
                httpOptions: {
                    timeout: timeoutMs,
                    retryOptions: { attempts: 1 },
                },
                abortSignal: controller.signal,
            } as any,
        });
        const text = extractText(response);
        if (!text) throw new Error("Gemini verification returned no JSON response.");
        return {
            parsed: JSON.parse(text) as T,
            model: configuration.model,
        };
    } finally {
        clearTimeout(timeout);
    }
}
