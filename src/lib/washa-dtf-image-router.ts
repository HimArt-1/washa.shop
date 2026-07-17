/**
 * يوجّه توليد/استخراج صور WASHA AI DTF حسب WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER.
 * القيم: genai (افتراضي) | replicate | nanobanana | gemini | openai | dall-e
 *   — تُوافق مفاتيح أداة التصميم في src/app/actions/ai.ts
 */

import {
    getWashaDtfGenAiClient,
    extractGeneratedImageDataUrl,
} from "@/lib/washa-dtf-studio";
import {
    FLUX_IMG2IMG,
    FLUX_SCHNELL,
    isReplicateTokenConfigured,
    runReplicatePredictions,
} from "@/lib/replicate-predictions";
import { isGeminiKeyConfigured, runNanoBananaDataUrl } from "@/lib/gemini-rest-image";
import { isOpenAIKeyConfigured, runOpenAIGenerateDataUrl, runOpenAIEditDataUrl } from "@/lib/openai-image";
import { logDtfTrace } from "@/app/api/washa-dtf-studio/utils/trace";
import {
    createWashaDtfProviderAttempt,
    resolveWashaDtfProviderConfiguration,
    sanitizeWashaDtfProviderMessage,
    WashaDtfProviderChainError,
} from "@/lib/washa-dtf-provider-config";

type DtfImageReference = { base64: string; mimeType: string };

export function getWashaDtfResolvedImageProvider(): string {
    return resolveWashaDtfProviderConfiguration().provider;
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
    traceId: string,
    primaryModel = resolveWashaDtfProviderConfiguration().model
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

    const attemptStartedAt = Date.now();
    logDtfTrace("dtf.ai.router", traceId, "genai_trying_model", {
        resolvedProvider: "genai",
        attemptedProvider: "genai",
        attemptedModel: primaryModel,
        providerAttempt: 1,
    });
    try {
        const response = await withDtfProviderTimeout(
            (abortSignal) =>
                client.models.generateContent({
                    model: primaryModel,
                    contents: { role: "user", parts },
                    config: { ...config, abortSignal },
                }),
            timeoutMs
        );
        const imageUrl = extractGeneratedImageDataUrl(response);
        if (!imageUrl) throw new Error("لم يتم توليد صورة من Washa AI");
        logDtfTrace("dtf.ai.router", traceId, "genai_model_success", {
            attemptedProvider: "genai",
            attemptedModel: primaryModel,
            providerAttempt: 1,
            durationMs: Date.now() - attemptStartedAt,
        });
        return imageUrl;
    } catch (error) {
        const diagnostic = createWashaDtfProviderAttempt({
            provider: "genai",
            model: primaryModel,
            attempt: 1,
            durationMs: Date.now() - attemptStartedAt,
            error,
        });
        logDtfTrace("dtf.ai.router", traceId, "genai_model_failed", {
            attemptedProvider: diagnostic.provider,
            attemptedModel: diagnostic.model,
            providerAttempt: diagnostic.attempt,
            durationMs: diagnostic.durationMs,
            providerStatus: diagnostic.status,
            providerCode: diagnostic.code,
            providerMessage: diagnostic.message,
            is_quota: isQuotaOrUnavailableError(error),
        });
        throw error;
    }
}

async function runGenaiSdkExtract(
    prompt: string,
    mockupImage: string,
    mimeType: string,
    timeoutMs: number,
    traceId: string,
    model = resolveWashaDtfProviderConfiguration().model
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
                model,
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

export function isDtfProviderFallbackEnabled() {
    return resolveWashaDtfProviderConfiguration().fallbackEnabled;
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
        reason: sanitizeWashaDtfProviderMessage(originalError),
    });

    try {
        const result = await runReplicateMockup(prompt, referenceImage);
        if (result) return result;
        throw originalError;
    } catch (fallbackError) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_replicate_failed", {
            from: fromProvider,
            error_message: sanitizeWashaDtfProviderMessage(fallbackError),
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

    const primaryConfiguration = resolveWashaDtfProviderConfiguration();
    logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_openai", {
        from: fromProvider,
        fromModel: primaryConfiguration.model,
        attemptedProvider: "openai",
        attemptedModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
        fallbackEnabled: true,
        reasonMessage: sanitizeWashaDtfProviderMessage(originalError),
    });

    const fallbackStartedAt = Date.now();
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
        const primaryAttempt = createWashaDtfProviderAttempt({
            provider: fromProvider,
            model: primaryConfiguration.model,
            attempt: 1,
            durationMs: 0,
            error: originalError,
        });
        const fallbackAttempt = createWashaDtfProviderAttempt({
            provider: "openai",
            model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1",
            attempt: 2,
            durationMs: Date.now() - fallbackStartedAt,
            error: fallbackError,
        });
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_openai_failed", {
            originalProvider: primaryAttempt.provider,
            originalModel: primaryAttempt.model,
            originalStatus: primaryAttempt.status,
            originalCode: primaryAttempt.code,
            originalMessage: primaryAttempt.message,
            attemptedProvider: fallbackAttempt.provider,
            attemptedModel: fallbackAttempt.model,
            providerAttempt: fallbackAttempt.attempt,
            durationMs: fallbackAttempt.durationMs,
            providerStatus: fallbackAttempt.status,
            providerCode: fallbackAttempt.code,
            providerMessage: fallbackAttempt.message,
        });
        throw new WashaDtfProviderChainError(
            [primaryAttempt, fallbackAttempt],
            originalError
        );
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
    const providerConfiguration = resolveWashaDtfProviderConfiguration();
    const p = providerConfiguration.provider;
    logDtfTrace("dtf.ai.generate-mockup", traceId, "router_provider", {
        configuredProvider: providerConfiguration.configuredProvider,
        resolvedProvider: p,
        resolvedModel: providerConfiguration.model,
        fallbackEnabled: providerConfiguration.fallbackEnabled,
        credentialConfigured: providerConfiguration.credentialConfigured,
        has_reference_image: Boolean(referenceImage?.base64),
        has_garment_reference_image: Boolean(garmentReferenceImage?.base64),
    });

    if (p === "genai") {
        try {
            return await runGenaiSdkMockup(
                prompt,
                referenceImage,
                garmentReferenceImage,
                timeoutMs,
                traceId,
                providerConfiguration.model
            );
        } catch (error) {
            return runOpenAIMockupFallback(error, prompt, primaryReferenceImage, traceId, p);
        }
    }

    // ─── OpenAI (gpt-image-1 / dall-e-3) ─────────────────────
    if (p === "openai" && isOpenAIKeyConfigured()) {
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
            if (providerConfiguration.fallbackEnabled) {
                if (isGeminiKeyConfigured()) {
                    logDtfTrace("dtf.ai.generate-mockup", traceId, "openai_fallback_genai", {});
                    try {
                        const genaiConfiguration = resolveWashaDtfProviderConfiguration({
                            ...process.env,
                            WASHA_DTF_IMAGE_PROVIDER: "genai",
                        });
                        return await runGenaiSdkMockup(
                            prompt,
                            referenceImage,
                            garmentReferenceImage,
                            timeoutMs,
                            traceId,
                            genaiConfiguration.model
                        );
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
        if (providerConfiguration.fallbackEnabled) {
            logDtfTrace("dtf.ai.generate-mockup", traceId, "replicate_no_token_fallback_genai", {});
        }
        if (providerConfiguration.fallbackEnabled && isGeminiKeyConfigured()) {
            const genaiConfiguration = resolveWashaDtfProviderConfiguration({
                ...process.env,
                WASHA_DTF_IMAGE_PROVIDER: "genai",
            });
            return runGenaiSdkMockup(
                prompt,
                referenceImage,
                garmentReferenceImage,
                timeoutMs,
                traceId,
                genaiConfiguration.model
            );
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

    // غير مُعرَّف أو فشل المسارات أعلاه — جرّب OpenAI ثم Google GenAI الافتراضي
    if (providerConfiguration.fallbackEnabled && isOpenAIKeyConfigured()) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_openai", { from: p });
        try {
            const result = await runOpenAIGenerateDataUrl(prompt, { throwOnError: true });
            if (result) return result;
        } catch { /* تراجع إلى الخيار التالي */ }
    }

    if (providerConfiguration.fallbackEnabled && isGeminiKeyConfigured()) {
        logDtfTrace("dtf.ai.generate-mockup", traceId, "router_fallback_genai", { from: p });
        try {
            const genaiConfiguration = resolveWashaDtfProviderConfiguration({
                ...process.env,
                WASHA_DTF_IMAGE_PROVIDER: "genai",
            });
            return await runGenaiSdkMockup(
                prompt,
                referenceImage,
                garmentReferenceImage,
                timeoutMs,
                traceId,
                genaiConfiguration.model
            );
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
    const providerConfiguration = resolveWashaDtfProviderConfiguration();
    const p = providerConfiguration.provider;
    logDtfTrace("dtf.ai.extract-design", traceId, "router_provider", {
        configuredProvider: providerConfiguration.configuredProvider,
        resolvedProvider: p,
        resolvedModel: providerConfiguration.model,
        fallbackEnabled: providerConfiguration.fallbackEnabled,
        credentialConfigured: providerConfiguration.credentialConfigured,
    });

    if (p === "genai") {
        try {
            return await runGenaiSdkExtract(
                prompt,
                mockupImage,
                mimeType,
                timeoutMs,
                traceId,
                providerConfiguration.model
            );
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
                    error_message: sanitizeWashaDtfProviderMessage(fallbackError),
                });
            }

            throw error;
        }
    }

    // ─── OpenAI extract ──────────────────────────────────────
    if (p === "openai" && isOpenAIKeyConfigured()) {
        const dataUrl = `data:${mimeType};base64,${mockupImage}`;
        try {
            const result = await runOpenAIEditDataUrl(prompt, dataUrl, { throwOnError: true });
            if (result) return result;
            throw new Error("لم يرجع مزود OpenAI صورة صالحة.");
        } catch (error) {
            if (isDtfProviderFallbackEnabled() && isGeminiKeyConfigured()) {
                logDtfTrace("dtf.ai.extract-design", traceId, "openai_fallback_genai", {});
                try {
                    const genaiConfiguration = resolveWashaDtfProviderConfiguration({
                        ...process.env,
                        WASHA_DTF_IMAGE_PROVIDER: "genai",
                    });
                    return await runGenaiSdkExtract(
                        prompt,
                        mockupImage,
                        mimeType,
                        timeoutMs,
                        traceId,
                        genaiConfiguration.model
                    );
                } catch (fallbackError) {
                    logDtfTrace("dtf.ai.extract-design", traceId, "openai_fallback_genai_failed", {
                        error_message: sanitizeWashaDtfProviderMessage(fallbackError),
                    });
                }
            }

            throw error;
        }
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
        if (providerConfiguration.fallbackEnabled) {
            logDtfTrace("dtf.ai.extract-design", traceId, "replicate_no_token_fallback_genai", {});
        }
        if (providerConfiguration.fallbackEnabled && isGeminiKeyConfigured()) {
            const genaiConfiguration = resolveWashaDtfProviderConfiguration({
                ...process.env,
                WASHA_DTF_IMAGE_PROVIDER: "genai",
            });
            return runGenaiSdkExtract(
                prompt,
                mockupImage,
                mimeType,
                timeoutMs,
                traceId,
                genaiConfiguration.model
            );
        }
    }

    if (p === "nanobanana" && isGeminiKeyConfigured()) {
        const n = await runNanoBananaDataUrl(prompt, `data:${mimeType};base64,${mockupImage}`);
        if (n) return n;
    }

    // تراجع عام — OpenAI ثم GenAI
    if (providerConfiguration.fallbackEnabled && isOpenAIKeyConfigured()) {
        logDtfTrace("dtf.ai.extract-design", traceId, "router_fallback_openai", { from: p });
        const dataUrl = `data:${mimeType};base64,${mockupImage}`;
        const result = await runOpenAIEditDataUrl(prompt, dataUrl);
        if (result) return result;
    }

    if (providerConfiguration.fallbackEnabled && isGeminiKeyConfigured()) {
        logDtfTrace("dtf.ai.extract-design", traceId, "router_fallback_genai", { from: p });
        const genaiConfiguration = resolveWashaDtfProviderConfiguration({
            ...process.env,
            WASHA_DTF_IMAGE_PROVIDER: "genai",
        });
        return runGenaiSdkExtract(
            prompt,
            mockupImage,
            mimeType,
            timeoutMs,
            traceId,
            genaiConfiguration.model
        );
    }

    throw new Error("لم يُهيأ مزوّد مناسب لاستخراج التصميم. استخدم openai أو genai أو أضف مفاتيح OpenAI / Google / Replicate.");
}
