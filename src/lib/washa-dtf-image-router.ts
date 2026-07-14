/**
 * يوجّه توليد/استخراج صور WASHA AI DTF حسب WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER.
 * القيم: genai (افتراضي) | replicate | nanobanana | gemini | openai | dall-e
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
import { isOpenAIKeyConfigured, runOpenAIGenerateDataUrl, runOpenAIEditDataUrl } from "@/lib/openai-image";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";

type DtfImageReference = { base64: string; mimeType: string };

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

/**
 * نماذج احتياطية — كل نموذج عنده حصة مستقلة في الطبقة المجانية.
 * يُجرَّب النموذج الأساسي أولاً ثم البدائل عند فشل الحصة.
 */
const GENAI_FALLBACK_MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
];

function isQuotaOrUnavailableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
        msg.includes("resource_exhausted") ||
        msg.includes("quota") ||
        msg.includes("rate") ||
        msg.includes("429") ||
        msg.includes("free_tier") ||
        msg.includes("is not found") ||
        msg.includes("not supported") ||
        msg.includes("404")
    );
}

async function runGenaiSdkMockup(
    prompt: string,
    referenceImage: DtfImageReference | null | undefined,
    garmentReferenceImage: DtfImageReference | null | undefined,
    timeoutMs: number,
    traceId: string
) {
    const client = getWashaDtfGenAiClient();
    const parts: any[] = [];
    parts.push({
        text: "Authoritative task: generate a final DTF product mockup where the customer's text prompt becomes a visible printed artwork on the garment. Reference images are support material only; a blank or merely recolored garment is a failed result.",
    });
    if (garmentReferenceImage?.base64 && garmentReferenceImage?.mimeType) {
        parts.push({
            text: "Image A is a hidden operational garment reference. Match its cut, proportions, seams, fabric behavior, camera angle, and studio lighting. Do not copy any artwork from it, and do not output it as a blank/recolored product without the new printed artwork.",
        });
        parts.push({
            inlineData: { data: garmentReferenceImage.base64, mimeType: garmentReferenceImage.mimeType },
        });
    }
    if (referenceImage?.base64 && referenceImage?.mimeType) {
        parts.push({
            text: "Image B is a customer design reference. Use it only for the artwork idea, composition, or visual style when relevant.",
        });
        parts.push({
            inlineData: { data: referenceImage.base64, mimeType: referenceImage.mimeType },
        });
    }
    parts.push({ text: prompt });
    const config = {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
        httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
    } as any;

    // جرّب النموذج الأساسي أولاً
    const modelsToTry = [WASHA_DTF_MODEL, ...GENAI_FALLBACK_MODELS];
    let lastError: unknown = null;

    for (const model of modelsToTry) {
        try {
            logDtfTrace("dtf.ai.router", traceId, "genai_trying_model", { model });
            const response = await withDtfProviderTimeout(
                (abortSignal) =>
                    client.models.generateContent({
                        model,
                        contents: { role: "user", parts },
                        config: { ...config, abortSignal },
                    }),
                timeoutMs
            );
            const imageUrl = extractGeneratedImageDataUrl(response);
            if (imageUrl) {
                logDtfTrace("dtf.ai.router", traceId, "genai_model_success", { model });
                return imageUrl;
            }
        } catch (error) {
            lastError = error;
            logDtfTrace("dtf.ai.router", traceId, "genai_model_failed", {
                model,
                is_quota: isQuotaOrUnavailableError(error),
                error_message: error instanceof Error ? error.message.slice(0, 200) : String(error),
            });
            // إذا كان الخطأ حصة — جرّب النموذج التالي
            if (isQuotaOrUnavailableError(error)) continue;
            // أخطاء أخرى (مفتاح خاطئ، شبكة) — لا فائدة من المحاولة مع نموذج آخر
            throw error;
        }
    }

    // كل النماذج فشلت
    if (lastError) throw lastError;
    logDtfTrace("dtf.ai.router", traceId, "genai_empty_image", {});
    throw new Error("لم يتم توليد صورة من Washa AI");
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

function referenceToDataUrl(ref: DtfImageReference): string {
    return `data:${ref.mimeType};base64,${ref.base64}`;
}

function resolvePrimaryMockupReference(
    referenceImage: DtfImageReference | null | undefined,
    garmentReferenceImage: DtfImageReference | null | undefined
) {
    return garmentReferenceImage?.base64 ? garmentReferenceImage : referenceImage;
}

function isDtfProviderFallbackEnabled() {
    return process.env.WASHA_DTF_PROVIDER_FALLBACK !== "false";
}

async function runReplicateMockup(
    prompt: string,
    referenceImage: DtfImageReference | null | undefined
) {
    if (!isReplicateTokenConfigured()) {
        return null;
    }

    const out = referenceImage?.base64
        ? await runReplicatePredictions(
            { version: FLUX_IMG2IMG, input: { prompt, image: referenceToDataUrl(referenceImage) } },
            { onHttpError: () => {} }
        )
        : await runReplicatePredictions(
            { version: FLUX_SCHNELL, input: { prompt } },
            { onHttpError: () => {} }
        );

    if (out?.urls?.[0]) return out.urls[0];
    throw new Error("فشل توليد الصورة عبر Replicate");
}

async function runReplicateMockupFallback(
    originalError: unknown,
    prompt: string,
    referenceImage: DtfImageReference | null | undefined,
    traceId: string,
    fromProvider: string
) {
    if (!isDtfProviderFallbackEnabled() || !isReplicateTokenConfigured()) {
        throw originalError;
    }

    // لا تحاول Replicate إذا كان الخطأ الأصلي بسبب نفاد رصيده
    const errMsg = originalError instanceof Error ? originalError.message : String(originalError ?? "");
    if (/insufficient credit/i.test(errMsg) || /purchase credit/i.test(errMsg)) {
        throw originalError;
    }

    logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_replicate", {
        from: fromProvider,
        reason: errMsg,
    });

    try {
        const result = await runReplicateMockup(prompt, referenceImage);
        if (result) return result;
        throw originalError;
    } catch (fallbackError) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_replicate_failed", {
            from: fromProvider,
            error_message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError ?? ""),
        });
        throw originalError;
    }
}

async function runOpenAIMockupFallback(
    originalError: unknown,
    prompt: string,
    referenceImage: DtfImageReference | null | undefined,
    traceId: string,
    fromProvider: string
) {
    if (!isDtfProviderFallbackEnabled() || !isOpenAIKeyConfigured()) {
        throw originalError;
    }

    logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_openai", {
        from: fromProvider,
    });

    try {
        let result: string | null = null;
        if (referenceImage?.base64 && referenceImage.mimeType) {
            result = await runOpenAIEditDataUrl(
                prompt,
                referenceToDataUrl(referenceImage),
                { throwOnError: true }
            );
        }
        if (!result) {
            result = await runOpenAIGenerateDataUrl(prompt, { throwOnError: true });
        }
        if (result) return result;
    } catch (fallbackError) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_openai_failed", {
            from: fromProvider,
            error_message: fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError ?? ""),
        });
    }

    throw originalError;
}

/**
 * توليد موكب — باستخدام المزوّد المُعرَّف.
 */
export async function washDtfRoutedGenerateMockup(
    prompt: string,
    referenceImage: DtfImageReference | null | undefined,
    options: { traceId: string; timeoutMs: number; garmentReferenceImage?: DtfImageReference | null }
): Promise<string> {
    const { traceId, timeoutMs } = options;
    const garmentReferenceImage = options.garmentReferenceImage ?? null;
    const primaryReferenceImage = resolvePrimaryMockupReference(referenceImage, garmentReferenceImage);
    const p = getWashaDtfResolvedImageProvider();
    logDtfTrace("dtf.ai.generate-mockup", traceId, "router_provider", {
        resolved: p,
        has_reference_image: Boolean(referenceImage?.base64),
        has_garment_reference_image: Boolean(garmentReferenceImage?.base64),
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
        try {
            return await runGenaiSdkMockup(prompt, referenceImage, garmentReferenceImage, timeoutMs, traceId);
        } catch (error) {
            return runOpenAIMockupFallback(error, prompt, primaryReferenceImage, traceId, p);
        }
    }

    // ─── OpenAI (gpt-image-1 / dall-e-3) ─────────────────────
    if ((p === "openai" || p === "dall-e" || p === "dalle" || p === "gpt-image") && isOpenAIKeyConfigured()) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "openai_start", { model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1" });
        try {
            let result: string | null = null;
            if (primaryReferenceImage?.base64 && primaryReferenceImage?.mimeType) {
                // تعديل صورة (gpt-image-1 يدعم edit)
                result = await runOpenAIEditDataUrl(
                    prompt,
                    referenceToDataUrl(primaryReferenceImage),
                    { throwOnError: true }
                );
            }
            if (!result) {
                // توليد من نص
                result = await runOpenAIGenerateDataUrl(prompt, { throwOnError: true });
            }
            if (result) return result;
            throw new Error("لم يرجع مزود OpenAI صورة صالحة.");
        } catch (error) {
            // تراجع إلى Gemini أو Replicate
            if (isDtfProviderFallbackEnabled()) {
                if (isGeminiKeyConfigured()) {
                    logDtfTrace("dtf.ai.generate-mockup", traceId, "openai_fallback_genai", {});
                    try {
                        return await runGenaiSdkMockup(prompt, referenceImage, garmentReferenceImage, timeoutMs, traceId);
                    } catch { /* تجاهل — سنرمي الخطأ الأصلي */ }
                }
                return runReplicateMockupFallback(error, prompt, primaryReferenceImage, traceId, p);
            }
            throw error;
        }
    }

    if (p === "replicate") {
        if (isReplicateTokenConfigured()) {
            const result = await runReplicateMockup(prompt, primaryReferenceImage);
            if (result) return result;
            // Replicate فشل — نحاول Gemini
        }
        // توكن Replicate غير مضبوط أو فشل — تراجع تلقائي إلى Gemini
        logDtfTrace("dtf.ai.generate-mockup", traceId, "replicate_no_token_fallback_genai", {});
        if (isGeminiKeyConfigured()) {
            return runGenaiSdkMockup(prompt, referenceImage, garmentReferenceImage, timeoutMs, traceId);
        }
    }

    if (p === "nanobanana" && isGeminiKeyConfigured()) {
        try {
            const u = await runNanoBananaDataUrl(prompt, primaryReferenceImage ? referenceToDataUrl(primaryReferenceImage) : null, {
                throwOnError: true,
            });
            if (u) return u;
            throw new Error("لم يرجع مزود Nano Banana صورة صالحة.");
        } catch (error) {
            return runReplicateMockupFallback(error, prompt, primaryReferenceImage, traceId, p);
        }
    }

    if (p === "gemini" && isGeminiKeyConfigured()) {
        const refUrl = primaryReferenceImage ? referenceToDataUrl(primaryReferenceImage) : null;
        try {
            const n = await runNanoBananaDataUrl(prompt, refUrl, { throwOnError: true });
            if (n) return n;
            if (!primaryReferenceImage) {
                const im = await runGeminiImagenDataUrl(prompt);
                if (im) return im;
            }
            throw new Error("لم يرجع مزود Gemini صورة صالحة.");
        } catch (error) {
            return runReplicateMockupFallback(error, prompt, primaryReferenceImage, traceId, p);
        }
    }

    // غير مُعرَّف أو فشل المسارات أعلاه — جرّب OpenAI ثم Google GenAI الافتراضي
    if (isOpenAIKeyConfigured()) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_openai", { from: p });
        try {
            const result = await runOpenAIGenerateDataUrl(prompt, { throwOnError: true });
            if (result) return result;
        } catch { /* تراجع إلى الخيار التالي */ }
    }

    if (isGeminiKeyConfigured()) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_genai", { from: p });
        try {
            return await runGenaiSdkMockup(prompt, referenceImage, garmentReferenceImage, timeoutMs, traceId);
        } catch (error) {
            return runReplicateMockupFallback(error, prompt, primaryReferenceImage, traceId, "genai");
        }
    }

    throw new Error("لم يُهيأ أي مزوّد توليد صالح لـ WASHA AI. راجع WASHA_DTF_IMAGE_PROVIDER والمفاتيح (OPENAI / GEMINI / REPLICATE).");
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
        try {
            return await runGenaiSdkExtract(prompt, mockupImage, mimeType, timeoutMs, traceId);
        } catch (error) {
            if (!isDtfProviderFallbackEnabled() || !isOpenAIKeyConfigured()) {
                throw error;
            }

            logDtfTrace("dtf.ai.extract-design", traceId, "genai_fallback_openai", {});
            try {
                const result = await runOpenAIEditDataUrl(
                    prompt,
                    `data:${mimeType};base64,${mockupImage}`,
                    { throwOnError: true }
                );
                if (result) return result;
            } catch (fallbackError) {
                logDtfTrace("dtf.ai.extract-design", traceId, "genai_fallback_openai_failed", {
                    error_message: fallbackError instanceof Error
                        ? fallbackError.message
                        : String(fallbackError ?? ""),
                });
            }

            throw error;
        }
    }

    // ─── OpenAI extract ──────────────────────────────────────
    if ((p === "openai" || p === "dall-e" || p === "dalle" || p === "gpt-image") && isOpenAIKeyConfigured()) {
        const dataUrl = `data:${mimeType};base64,${mockupImage}`;
        const result = await runOpenAIEditDataUrl(prompt, dataUrl, { throwOnError: true });
        if (result) return result;
        // تراجع
        if (isGeminiKeyConfigured()) {
            logDtfTrace("dtf.ai.extract-design", traceId, "openai_fallback_genai", {});
            return runGenaiSdkExtract(prompt, mockupImage, mimeType, timeoutMs, traceId);
        }
        throw new Error("فشل استخراج التصميم عبر OpenAI ولا يوجد مزوّد بديل.");
    }

    if (p === "replicate") {
        if (isReplicateTokenConfigured()) {
            const dataUrl = `data:${mimeType};base64,${mockupImage}`;
            const out = await runReplicatePredictions(
                { version: FLUX_IMG2IMG, input: { prompt, image: dataUrl } },
                { onHttpError: () => {} }
            );
            if (out?.urls?.[0]) return out.urls[0];
            throw new Error("فشل استخراج التصميم عبر Replicate");
        }
        // توكن Replicate غير مضبوط — تراجع تلقائي إلى Gemini
        logDtfTrace("dtf.ai.extract-design", traceId, "replicate_no_token_fallback_genai", {});
        if (isGeminiKeyConfigured()) {
            return runGenaiSdkExtract(prompt, mockupImage, mimeType, timeoutMs, traceId);
        }
    }

    if ((p === "nanobanana" || p === "gemini") && isGeminiKeyConfigured()) {
        const n = await runNanoBananaDataUrl(prompt, `data:${mimeType};base64,${mockupImage}`);
        if (n) return n;
    }

    // تراجع عام — OpenAI ثم GenAI
    if (isOpenAIKeyConfigured()) {
        logDtfTrace("dtf.ai.extract-design", traceId, "router_fallback_openai", { from: p });
        const dataUrl = `data:${mimeType};base64,${mockupImage}`;
        const result = await runOpenAIEditDataUrl(prompt, dataUrl);
        if (result) return result;
    }

    if (isGeminiKeyConfigured()) {
        logDtfTrace("dtf.ai.extract-design", traceId, "router_fallback_genai", { from: p });
        return runGenaiSdkExtract(prompt, mockupImage, mimeType, timeoutMs, traceId);
    }

    throw new Error("لم يُهيأ مزوّد مناسب لاستخراج التصميم. استخدم openai أو genai أو أضف مفاتيح OpenAI / Google / Replicate.");
}
