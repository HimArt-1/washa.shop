import { washDtfRoutedExtractDesign, washDtfRoutedGenerateMockup } from "@/lib/washa-dtf-image-router";
import { logDtfTrace } from "../utils/trace";

function resolveProviderTimeoutMs(fallbackMs: number) {
    const parsed = Number.parseInt(process.env.WASHA_DTF_PROVIDER_TIMEOUT_MS || "", 10);
    if (!Number.isFinite(parsed)) return fallbackMs;
    return Math.min(Math.max(parsed, 15_000), 180_000);
}

export class AiStudioService {
    /**
     * يولّد موكباً — المزوّد من WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER (انظر washa-dtf-image-router).
     */
    static async generateMockup(
        prompt: string,
        referenceImage?: { base64: string; mimeType: string } | null,
        options?: { traceId?: string; timeoutMs?: number }
    ) {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const timeoutMs = resolveProviderTimeoutMs(options?.timeoutMs ?? 45_000);
        const providerStartedAt = Date.now();

        logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_started", {
            prompt_length: prompt.length,
            has_reference_image: Boolean(referenceImage?.base64),
            timeout_ms: timeoutMs,
        });

        try {
            const imageUrl = await washDtfRoutedGenerateMockup(prompt, referenceImage, { traceId, timeoutMs });
            logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_succeeded", {
                duration_ms: Date.now() - providerStartedAt,
                image_url_length: imageUrl.length,
            });
            return imageUrl;
        } catch (error) {
            logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_failed", {
                duration_ms: Date.now() - providerStartedAt,
                error_message: error instanceof Error ? error.message : String(error ?? ""),
            });
            throw error;
        }
    }

    /**
     * يستخرج التصميم من موكب مرجعي.
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

        logDtfTrace("dtf.ai.extract-design", traceId, "provider_started", {
            prompt_length: prompt.length,
            mime_type: mimeType,
            mockup_image_length: mockupImage.length,
            timeout_ms: timeoutMs,
        });

        try {
            const imageUrl = await washDtfRoutedExtractDesign(prompt, mockupImage, mimeType, { traceId, timeoutMs });
            logDtfTrace("dtf.ai.extract-design", traceId, "provider_succeeded", {
                duration_ms: Date.now() - providerStartedAt,
                image_url_length: imageUrl.length,
            });
            return imageUrl;
        } catch (error) {
            logDtfTrace("dtf.ai.extract-design", traceId, "provider_failed", {
                duration_ms: Date.now() - providerStartedAt,
                error_message: error instanceof Error ? error.message : String(error ?? ""),
            });
            throw error;
        }
    }
}
