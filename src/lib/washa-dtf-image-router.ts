/**
 * يوجّه توليد/استخراج صور WASHA AI DTF حسب WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER.
 * القيم: genai (افتراضي) | replicate | nanobanana | gemini
 *   — تُوافق مفاتيح أداة التصميم في src/app/actions/ai.ts
 */

import {
    getWashaDtfGenAiClient,
    WASHA_DTF_MODEL,
    extractGeneratedImageDataUrl,
} from "@/lib/washa-dtf-studio";
import {
    FLUX_IMG2IMG,
    FLUX_SCHNELL,
    isReplicateTokenConfigured,
    runReplicatePredictions,
} from "@/lib/replicate-predictions";
import { isGeminiKeyConfigured, runGeminiImagenDataUrl, runNanoBananaDataUrl } from "@/lib/gemini-rest-image";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";

export function getWashaDtfResolvedImageProvider(): string {
    return (process.env.WASHA_DTF_IMAGE_PROVIDER || process.env.IMAGE_PROVIDER || "genai").toLowerCase().trim();
}

function buildProviderTimeoutError(timeoutMs: number) {
    return new Error(
        JSON.stringify({
            error: {
                code: 504,
                status: "DEADLINE_EXCEEDED",
                message: `Washa AI generation exceeded internal deadline of ${timeoutMs}ms`,
            },
        })
    );
}

async function withDtfProviderTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
    const abortController = new AbortController();
    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
        timeoutHandle = setTimeout(() => {
            abortController.abort(buildProviderTimeoutError(timeoutMs));
        }, timeoutMs);
        return await operation(abortController.signal);
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    }
}

async function runGenaiSdkMockup(
    prompt: string,
    referenceImage: { base64: string; mimeType: string } | null | undefined,
    timeoutMs: number,
    traceId: string
) {
    const client = getWashaDtfGenAiClient();
    const parts: any[] = [{ text: prompt }];
    if (referenceImage?.base64 && referenceImage?.mimeType) {
        parts.unshift({
            inlineData: { data: referenceImage.base64, mimeType: referenceImage.mimeType },
        });
    }
    const config = {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
        httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
    } as any;

    const response = await withDtfProviderTimeout(
        (abortSignal) =>
            client.models.generateContent({
                model: WASHA_DTF_MODEL,
                contents: { role: "user", parts },
                config: { ...config, abortSignal },
            }),
        timeoutMs
    );
    const imageUrl = extractGeneratedImageDataUrl(response);
    if (!imageUrl) {
        logDtfTrace("dtf.ai.router", traceId, "genai_empty_image", {});
        throw new Error("لم يتم توليد صورة من Washa AI");
    }
    return imageUrl;
}

async function runGenaiSdkExtract(
    prompt: string,
    mockupImage: string,
    mimeType: string,
    timeoutMs: number,
    traceId: string
) {
    const client = getWashaDtfGenAiClient();
    const config = {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
        httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
    } as any;

    const response = await withDtfProviderTimeout(
        (abortSignal) =>
            client.models.generateContent({
                model: WASHA_DTF_MODEL,
                contents: {
                    role: "user",
                    parts: [
                        { inlineData: { data: mockupImage, mimeType } },
                        { text: prompt },
                    ],
                },
                config: { ...config, abortSignal },
            }),
        timeoutMs
    );
    const imageUrl = extractGeneratedImageDataUrl(response);
    if (!imageUrl) {
        logDtfTrace("dtf.ai.router", traceId, "genai_extract_empty", {});
        throw new Error("لم يتم استخراج التصميم من Washa AI");
    }
    return imageUrl;
}

function referenceToDataUrl(ref: { base64: string; mimeType: string }): string {
    return `data:${ref.mimeType};base64,${ref.base64}`;
}

/**
 * توليد موكب — باستخدام المزوّد المُعرَّف.
 */
export async function washDtfRoutedGenerateMockup(
    prompt: string,
    referenceImage: { base64: string; mimeType: string } | null | undefined,
    options: { traceId: string; timeoutMs: number }
): Promise<string> {
    const { traceId, timeoutMs } = options;
    const p = getWashaDtfResolvedImageProvider();
    logDtfTrace("dtf.ai.generate-mockup", traceId, "router_provider", {
        resolved: p,
    });

    if (
        p === "genai" ||
        p === "google_genai" ||
        p === "gemini_flash" ||
        p === "flash_image" ||
        p === "gemini-2.5-flash-image" ||
        p === "gemini-2.5-flash-image-preview" ||
        p === "gemini-3.1-flash-image-preview"
    ) {
        return runGenaiSdkMockup(prompt, referenceImage, timeoutMs, traceId);
    }

    if (p === "replicate") {
        if (!isReplicateTokenConfigured()) {
            throw new Error(
                "ضُبط WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER على replicate لكن REPLICATE_API_TOKEN غير مضبوط."
            );
        }
        if (referenceImage?.base64) {
            const out = await runReplicatePredictions(
                { version: FLUX_IMG2IMG, input: { prompt, image: referenceToDataUrl(referenceImage) } },
                { onHttpError: () => {} }
            );
            if (out?.urls?.[0]) return out.urls[0];
        } else {
            const out = await runReplicatePredictions(
                { version: FLUX_SCHNELL, input: { prompt } },
                { onHttpError: () => {} }
            );
            if (out?.urls?.[0]) return out.urls[0];
        }
        throw new Error("فشل توليد الصورة عبر Replicate");
    }

    if (p === "nanobanana" && isGeminiKeyConfigured()) {
        const u = await runNanoBananaDataUrl(prompt, referenceImage ? referenceToDataUrl(referenceImage) : null, {
            throwOnError: true,
        });
        if (u) return u;
    }

    if (p === "gemini" && isGeminiKeyConfigured()) {
        const refUrl = referenceImage ? referenceToDataUrl(referenceImage) : null;
        const n = await runNanoBananaDataUrl(prompt, refUrl);
        if (n) return n;
        if (!referenceImage) {
            const im = await runGeminiImagenDataUrl(prompt);
            if (im) return im;
        }
        if (referenceImage && isReplicateTokenConfigured()) {
            const out = await runReplicatePredictions(
                { version: FLUX_IMG2IMG, input: { prompt, image: referenceToDataUrl(referenceImage) } },
                { onHttpError: () => {} }
            );
            if (out?.urls?.[0]) return out.urls[0];
        }
    }

    // غير مُعرَّف أو فشل المسارات أعلاه — Google GenAI الافتراضي إن وُجد مفتاح
    if (isGeminiKeyConfigured()) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_genai", { from: p });
        return runGenaiSdkMockup(prompt, referenceImage, timeoutMs, traceId);
    }

    throw new Error("لم يُهيأ أي مزوّد توليد صالح لـ WASHA AI. راجع WASHA_DTF_IMAGE_PROVIDER والمفاتيح (GEMINI / REPLICATE).");
}

/**
 * استخراج تصميم — يُفضّل نفس مزوّد genai لأن المسارات الأخرى نصيحة فقط.
 */
export async function washDtfRoutedExtractDesign(
    prompt: string,
    mockupImage: string,
    mimeType: string,
    options: { traceId: string; timeoutMs: number }
): Promise<string> {
    const { traceId, timeoutMs } = options;
    const p = getWashaDtfResolvedImageProvider();
    logDtfTrace("dtf.ai.extract-design", traceId, "router_provider", { resolved: p });

    if (
        p === "genai" ||
        p === "google_genai" ||
        p === "gemini_flash" ||
        p === "flash_image" ||
        p === "gemini-2.5-flash-image" ||
        p === "gemini-2.5-flash-image-preview" ||
        p === "gemini-3.1-flash-image-preview"
    ) {
        return runGenaiSdkExtract(prompt, mockupImage, mimeType, timeoutMs, traceId);
    }

    if (p === "replicate") {
        if (!isReplicateTokenConfigured()) {
            throw new Error(
                "ضُبط WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER على replicate لكن REPLICATE_API_TOKEN غير مضبوط."
            );
        }
        const dataUrl = `data:${mimeType};base64,${mockupImage}`;
        const out = await runReplicatePredictions(
            { version: FLUX_IMG2IMG, input: { prompt, image: dataUrl } },
            { onHttpError: () => {} }
        );
        if (out?.urls?.[0]) return out.urls[0];
        throw new Error("فشل استخراج التصميم عبر Replicate");
    }

    if ((p === "nanobanana" || p === "gemini") && isGeminiKeyConfigured()) {
        const n = await runNanoBananaDataUrl(prompt, `data:${mimeType};base64,${mockupImage}`);
        if (n) return n;
    }

    if (isGeminiKeyConfigured()) {
        logDtfTrace("dtf.ai.extract-design", traceId, "router_fallback_genai", { from: p });
        return runGenaiSdkExtract(prompt, mockupImage, mimeType, timeoutMs, traceId);
    }

    throw new Error("لم يُهيأ مزوّد مناسب لاستخراج التصميم. استخدم genai أو أضف مفاتيح Google / Replicate.");
}
