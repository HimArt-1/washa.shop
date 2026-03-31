import {
    getWashaDtfGenAiClient,
    WASHA_DTF_MODEL,
    extractGeneratedImageDataUrl,
} from "@/lib/washa-dtf-studio";
import { logDtfTrace } from "../utils/trace";

function buildProviderTimeoutError(timeoutMs: number) {
    return new Error(JSON.stringify({
        error: {
            code: 504,
            status: "DEADLINE_EXCEEDED",
            message: `Gemini generation exceeded internal deadline of ${timeoutMs}ms`,
        },
    }));
}

async function withProviderTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => reject(buildProviderTimeoutError(timeoutMs)), timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}

export class AiStudioService {
    /**
     * Generates a mockup image using the configured GenAI client and prompt.
     * Extracts configuration casting out of the controller logic.
     */
    static async generateMockup(
        prompt: string,
        referenceImage?: { base64: string; mimeType: string } | null,
        options?: { traceId?: string; timeoutMs?: number }
    ) {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const timeoutMs = options?.timeoutMs ?? 45_000;
        const providerStartedAt = Date.now();
        const client = getWashaDtfGenAiClient();
        const parts: any[] = [{ text: prompt }];

        if (referenceImage?.base64 && referenceImage?.mimeType) {
            parts.unshift({
                inlineData: {
                    data: referenceImage.base64,
                    mimeType: referenceImage.mimeType,
                },
            });
        }

        // Properly cast config to avoid @ts-ignore debt, as the Gemini SDK types
        // might not fully map standard imageConfig structures seamlessly.
        const config = {
            imageConfig: {
                aspectRatio: "1:1",
            },
        } as any;

        logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_started", {
            prompt_length: prompt.length,
            has_reference_image: Boolean(referenceImage?.base64),
            timeout_ms: timeoutMs,
        });

        let response: unknown;
        try {
            response = await withProviderTimeout(
                client.models.generateContent({
                    model: WASHA_DTF_MODEL,
                    contents: { role: "user", parts },
                    config,
                }),
                timeoutMs
            );
        } catch (error) {
            logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_failed", {
                duration_ms: Date.now() - providerStartedAt,
                error_message: error instanceof Error ? error.message : String(error ?? ""),
            });
            throw error;
        }

        const imageUrl = extractGeneratedImageDataUrl(response);
        if (!imageUrl) {
            logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_empty_image", {
                duration_ms: Date.now() - providerStartedAt,
            });
            throw new Error("لم يتم توليد صورة من Gemini");
        }

        logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_succeeded", {
            duration_ms: Date.now() - providerStartedAt,
            image_url_length: imageUrl.length,
        });

        return imageUrl;
    }

    /**
     * Extracts the core DTF design cleanly from a given mockup reference.
     * Consolidates configuration properties internally for ease of testing.
     */
    static async extractDesign(prompt: string, mockupImage: string, mimeType: string) {
        const client = getWashaDtfGenAiClient();
        const config = {
            imageConfig: {
                aspectRatio: "1:1",
            },
        } as any;

        const response = await client.models.generateContent({
            model: WASHA_DTF_MODEL,
            contents: {
                role: "user",
                parts: [
                    {
                        inlineData: {
                            data: mockupImage,
                            mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
            config,
        });

        const imageUrl = extractGeneratedImageDataUrl(response);
        if (!imageUrl) {
            throw new Error("لم يتم استخراج التصميم من Gemini");
        }

        return imageUrl;
    }
}
