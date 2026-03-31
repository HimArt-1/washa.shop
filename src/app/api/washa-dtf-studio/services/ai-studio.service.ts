import {
    getWashaDtfGenAiClient,
    WASHA_DTF_MODEL,
    extractGeneratedImageDataUrl,
} from "@/lib/washa-dtf-studio";
import { logDtfTrace } from "../utils/trace";

function resolveProviderTimeoutMs(fallbackMs: number) {
    const parsed = Number.parseInt(process.env.WASHA_DTF_PROVIDER_TIMEOUT_MS || "", 10);
    if (!Number.isFinite(parsed)) return fallbackMs;
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
): Promise<T> {
    const abortController = new AbortController();
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
        timeoutHandle = setTimeout(() => {
            abortController.abort(buildProviderTimeoutError(timeoutMs));
        }, timeoutMs);

        return await operation(abortController.signal);
    } catch (error) {
        if (abortController.signal.aborted && abortController.signal.reason instanceof Error) {
            throw abortController.signal.reason;
        }

        throw error;
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
        const timeoutMs = resolveProviderTimeoutMs(options?.timeoutMs ?? 45_000);
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

        // Properly cast config to avoid @ts-ignore debt, as the SDK types
        // might not fully map standard imageConfig structures seamlessly.
        const config = {
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K",
            },
            httpOptions: {
                timeout: timeoutMs,
                retryOptions: {
                    attempts: 1,
                },
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
                (abortSignal) => client.models.generateContent({
                    model: WASHA_DTF_MODEL,
                    contents: { role: "user", parts },
                    config: {
                        ...config,
                        abortSignal,
                    },
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
            throw new Error("لم يتم توليد صورة من Washa AI");
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
    static async extractDesign(
        prompt: string,
        mockupImage: string,
        mimeType: string,
        options?: { traceId?: string; timeoutMs?: number }
    ) {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const timeoutMs = resolveProviderTimeoutMs(options?.timeoutMs ?? 45_000);
        const providerStartedAt = Date.now();
        const client = getWashaDtfGenAiClient();
        const config = {
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: "1K",
            },
            httpOptions: {
                timeout: timeoutMs,
                retryOptions: {
                    attempts: 1,
                },
            },
        } as any;

        logDtfTrace("dtf.ai.extract-design", traceId, "provider_started", {
            prompt_length: prompt.length,
            mime_type: mimeType,
            mockup_image_length: mockupImage.length,
            timeout_ms: timeoutMs,
        });

        let response: unknown;
        try {
            response = await withProviderTimeout(
                (abortSignal) => client.models.generateContent({
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
                    config: {
                        ...config,
                        abortSignal,
                    },
                }),
                timeoutMs
            );
        } catch (error) {
            logDtfTrace("dtf.ai.extract-design", traceId, "provider_failed", {
                duration_ms: Date.now() - providerStartedAt,
                error_message: error instanceof Error ? error.message : String(error ?? ""),
            });
            throw error;
        }

        const imageUrl = extractGeneratedImageDataUrl(response);
        if (!imageUrl) {
            logDtfTrace("dtf.ai.extract-design", traceId, "provider_empty_image", {
                duration_ms: Date.now() - providerStartedAt,
            });
            throw new Error("لم يتم استخراج التصميم من Washa AI");
        }

        logDtfTrace("dtf.ai.extract-design", traceId, "provider_succeeded", {
            duration_ms: Date.now() - providerStartedAt,
            image_url_length: imageUrl.length,
        });

        return imageUrl;
    }
}
