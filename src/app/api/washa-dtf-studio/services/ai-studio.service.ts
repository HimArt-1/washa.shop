import {
    getWashaDtfResolvedImageProvider,
    washDtfRoutedExtractDesign,
    washDtfRoutedGenerateMockup,
} from "@/lib/washa-dtf-image-router";
import { getWashaDtfGenAiClient } from "@/lib/washa-dtf-studio";
import { logDtfTrace } from "../utils/trace";

type AiStudioImageReference = { base64: string; mimeType: string };
type EnhanceIdeaInput = {
    idea: string;
    garmentType?: string | null;
    style?: string | null;
    technique?: string | null;
    palette?: string | null;
};

function resolveProviderTimeoutMs(fallbackMs: number) {
    const parsed = Number.parseInt(process.env.WASHA_DTF_PROVIDER_TIMEOUT_MS || "", 10);
    if (!Number.isFinite(parsed)) return fallbackMs;
    return Math.min(Math.max(parsed, 15_000), 180_000);
}

function compactPrompt(parts: Array<string | null | undefined>) {
    return parts
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
        .join("\n")
        .trim();
}

function getTextFromGenAiResponse(response: any) {
    const directText = typeof response?.text === "string" ? response.text.trim() : "";
    if (directText) return directText;

    return (response?.candidates?.[0]?.content?.parts || [])
        .map((part: any) => (typeof part?.text === "string" ? part.text.trim() : ""))
        .filter(Boolean)
        .join(" ")
        .trim();
}

export function sanitizeEnhancedIdea(value: string, fallbackIdea: string) {
    const forbiddenPattern = /DTF|prompt|WASHA AI|مواصفات القطعة|موضع الطباعة|لون القطعة|المقاس|خلفية شفافة|قيود مهمة|الأسلوب الفني المطلوب|طريقة التنفيذ البصرية|لوحة الألوان|كاتلوج|كتالوج|برومبت|نموذج الذكاء|تعليمات/i;
    const cleaned = value
        .replace(/```[\s\S]*?```/g, "")
        .replace(/^[\s"'“”«»]+|[\s"'“”«»]+$/g, "")
        .split(/\n+/)
        .map((line) =>
            line
                .replace(/^\s*[-*•\d.]+ـ?\s*/, "")
                .replace(/^(الفكرة المحسنة|الوصف المحسن|النتيجة|الإجابة)\s*[:：]\s*/i, "")
                .trim()
        )
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    const minimumUsefulLength = Math.min(150, Math.max(110, Math.round(fallbackIdea.length * 0.72)));
    const isTooSmallForShortIdea = fallbackIdea.length <= 60 && cleaned.length < Math.max(110, fallbackIdea.length + 58);
    const isIncompleteEnhancement = cleaned.length < minimumUsefulLength || wordCount < 24;
    const isGeneric = /خلفية مناسبة|تفاصيل جميلة|مشهد غني وواضح|تصميم جذاب/i.test(cleaned) && cleaned.length < 95;

    if (!cleaned || forbiddenPattern.test(cleaned) || isTooSmallForShortIdea || isIncompleteEnhancement || isGeneric) {
        throw new Error(`Idea enhancer returned incomplete or invalid output for: ${fallbackIdea}`);
    }

    if (cleaned.length <= 420) return cleaned;

    const clipped = cleaned.slice(0, 421);
    const lastWordBoundary = clipped.lastIndexOf(" ");
    return clipped.slice(0, lastWordBoundary > 0 ? lastWordBoundary : 420).trim();
}

function buildIdeaEnhancementPrompt(input: EnhanceIdeaInput) {
    const context = compactPrompt([
        input.garmentType ? `نوع المنتج المختار للاسترشاد فقط: ${input.garmentType}` : null,
        input.style ? `الأسلوب المفضل للاسترشاد فقط: ${input.style}` : null,
        input.technique ? `المعالجة الفنية المفضلة للاسترشاد فقط: ${input.technique}` : null,
        input.palette ? `لوحة الألوان المفضلة للاسترشاد فقط: ${input.palette}` : null,
    ]);

    return compactPrompt([
        "أنت محرر فني عربي رفيع داخل تجربة تصميم. حوّل فكرة العميل الخام إلى رؤية بصرية مكتملة يقرأها العميل مباشرة ويشعر أنها امتداد ذكي لفكرته.",
        "حلّل الفكرة داخلياً ثم ابنِ لها: بطلاً بصرياً واضحاً، حركة مقصودة، بيئة ذات عمق، إضاءة تصنع المزاج، وتفصيلاً مفاجئاً لكنه منسجم. لا تعرض التحليل.",
        "اكتب فقرة عربية واحدة من جملتين مترابطتين، حسية ومحددة وراقية، بإيقاع طبيعي بعيد عن القوالب والعبارات التسويقية.",
        "وسّع الفكرة إبداعياً دون تغيير معناها: وضّح التكوين، العلاقة بين العناصر، ملمساً أو أثراً ضوئياً، ونقطة تركيز فنية تجعل المشهد قابلاً للتخيل فوراً.",
        "إذا كانت الفكرة قصيرة جداً فوسّعها بذكاء. مثال: «ديناصور يرقص» تصبح مشهداً مرحاً في غابة كثيفة وخلفه شلال ورذاذ ضوء وحركة سعيدة.",
        "إذا كانت الفكرة شخصية أو حيواناً فامنحه تعبيراً وحضوراً. إذا كانت شيئاً بسيطاً فحوّله إلى مشهد له قصة. إذا كانت عبارة نصية فحافظ على النص كما هو وأضف شعوراً بصرياً حوله فقط.",
        "لا تضف كلمات أو شعارات أو نصوصاً جديدة إلا إذا طلبها العميل صراحة.",
        "ممنوع تماماً ذكر: DTF، تيشيرت، قماش، مقاس، لون قطعة، موضع طباعة، خلفية شفافة، قيود، برومبت، نموذج، WASHA AI، كتالوج، أو أي مواصفات تشغيلية.",
        "ممنوع استخدام عناوين أو نقاط أو اقتباسات أو مقدمات مثل: الفكرة المحسنة. أخرج النص المحسن فقط.",
        "اكتب بين 32 و58 كلمة كاملة. لا تتوقف بعد الجملة الأولى، واختم الفقرة بصورة بصرية مكتملة لا بعبارة مبتورة.",
        context ? `سياق اختياري لا تذكره حرفياً:\n${context}` : null,
        `فكرة العميل: ${input.idea}`,
    ]);
}

async function runGeminiIdeaEnhancement(input: EnhanceIdeaInput, timeoutMs: number) {
    const client = getWashaDtfGenAiClient();
    const model = (process.env.WASHA_DTF_TEXT_MODEL || process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash").trim();
    const response = await client.models.generateContent({
        model,
        contents: { role: "user", parts: [{ text: buildIdeaEnhancementPrompt(input) }] },
        config: {
            temperature: 0.84,
            topP: 0.9,
            candidateCount: 1,
            responseMimeType: "text/plain",
            // This is a short editorial task. Reserving the budget for visible
            // text prevents Gemini thinking tokens from truncating the answer.
            thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
            maxOutputTokens: 768,
            httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
        } as any,
    });

    return sanitizeEnhancedIdea(getTextFromGenAiResponse(response), input.idea);
}

async function runOpenAiIdeaEnhancement(input: EnhanceIdeaInput, timeoutMs: number) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
    }

    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: (process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini").trim(),
                messages: [
                    {
                        role: "user",
                        content: buildIdeaEnhancementPrompt(input),
                    },
                ],
                temperature: 0.92,
                top_p: 0.92,
                max_tokens: 520,
            }),
            signal: abortController.signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `OpenAI idea enhancement failed with status ${response.status}`);
        }

        const data = await response.json();
        return sanitizeEnhancedIdea(String(data?.choices?.[0]?.message?.content || ""), input.idea);
    } finally {
        clearTimeout(timeoutHandle);
    }
}

export class AiStudioService {
    static async enhanceIdea(input: EnhanceIdeaInput, options?: { traceId?: string; timeoutMs?: number }) {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const timeoutMs = Math.min(Math.max(options?.timeoutMs ?? 12_000, 4_000), 25_000);
        const provider = getWashaDtfResolvedImageProvider();
        const startedAt = Date.now();

        logDtfTrace("dtf.ai.enhance-idea", traceId, "provider_started", {
            provider,
            idea_length: input.idea.length,
            timeout_ms: timeoutMs,
        });

        try {
            const shouldTryOpenAi = ["openai", "dall-e", "dalle", "gpt-image"].includes(provider);
            const enhancedIdea = shouldTryOpenAi
                ? await runOpenAiIdeaEnhancement(input, timeoutMs)
                : await runGeminiIdeaEnhancement(input, timeoutMs);

            logDtfTrace("dtf.ai.enhance-idea", traceId, "provider_succeeded", {
                provider: shouldTryOpenAi ? "openai" : "gemini",
                duration_ms: Date.now() - startedAt,
                enhanced_length: enhancedIdea.length,
            });

            return {
                enhancedIdea,
                provider: shouldTryOpenAi ? "openai" : "gemini",
            };
        } catch (primaryError) {
            const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError ?? "");
            const canFallbackToGemini = provider !== "genai" && provider !== "gemini" && provider !== "google_genai";

            if (canFallbackToGemini) {
                try {
                    const enhancedIdea = await runGeminiIdeaEnhancement(input, timeoutMs);
                    logDtfTrace("dtf.ai.enhance-idea", traceId, "provider_fallback_succeeded", {
                        from: provider,
                        to: "gemini",
                        duration_ms: Date.now() - startedAt,
                    });
                    return { enhancedIdea, provider: "gemini" };
                } catch (fallbackError) {
                    logDtfTrace("dtf.ai.enhance-idea", traceId, "provider_fallback_failed", {
                        from: provider,
                        primary_error: primaryMessage.slice(0, 220),
                        fallback_error: fallbackError instanceof Error ? fallbackError.message.slice(0, 220) : String(fallbackError ?? ""),
                    });
                }
            }

            logDtfTrace("dtf.ai.enhance-idea", traceId, "provider_failed", {
                provider,
                duration_ms: Date.now() - startedAt,
                error_message: primaryMessage.slice(0, 220),
            });
            throw primaryError;
        }
    }

    /**
     * يولّد موكباً — المزوّد من WASHA_DTF_IMAGE_PROVIDER أو IMAGE_PROVIDER (انظر washa-dtf-image-router).
     */
    static async generateMockup(
        prompt: string,
        referenceImage?: AiStudioImageReference | null,
        options?: { traceId?: string; timeoutMs?: number; garmentReferenceImage?: AiStudioImageReference | null }
    ) {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const timeoutMs = resolveProviderTimeoutMs(options?.timeoutMs ?? 45_000);
        const providerStartedAt = Date.now();

        logDtfTrace("dtf.ai.generate-mockup", traceId, "provider_started", {
            prompt_length: prompt.length,
            has_reference_image: Boolean(referenceImage?.base64),
            has_garment_reference_image: Boolean(options?.garmentReferenceImage?.base64),
            timeout_ms: timeoutMs,
        });

        try {
            const imageUrl = await washDtfRoutedGenerateMockup(prompt, referenceImage, {
                traceId,
                timeoutMs,
                garmentReferenceImage: options?.garmentReferenceImage ?? null,
            });
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
