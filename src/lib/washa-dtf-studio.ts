import { GoogleGenAI } from "@google/genai";

/**
 * WASHA AI (DTF) — توليد/تحرير صور عبر @google/genai.
 * الافتراضي: Nano Banana 2 = gemini-3.1-flash-image-preview
 * (تراجع: gemini-2.5-flash-image = الأصل "Nano Banana")
 * اختياري: WASHA_DTF_GENAI_MODEL=... في .env
 */
export const WASHA_DTF_MODEL =
    (process.env.WASHA_DTF_GENAI_MODEL || "gemini-3.1-flash-image-preview").trim() || "gemini-3.1-flash-image-preview";

export function getWashaDtfGenAiClient() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    return new GoogleGenAI({ apiKey });
}

export function extractGeneratedImageDataUrl(response: any) {
    for (const part of response?.candidates?.[0]?.content?.parts || []) {
        if (part?.inlineData?.data && part?.inlineData?.mimeType) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }

    return null;
}

export function getWashaDtfErrorDetails(error: unknown): {
    message: string;
    status: number;
} {
    const fallbackMessage = error instanceof Error ? error.message : "فشل تنفيذ طلب Washa AI";

    let parsed: {
        error?: {
            code?: number;
            message?: string;
            status?: string;
        };
    } | null = null;

    if (error instanceof Error) {
        try {
            parsed = JSON.parse(error.message);
        } catch {
            parsed = null;
        }
    }

    const providerMessage = parsed?.error?.message || fallbackMessage;
    const providerStatus = parsed?.error?.status || "";
    const providerCode = parsed?.error?.code;
    const normalizedProviderMessage = providerMessage.toLowerCase();

    if (/gemini_api_key is not configured/i.test(providerMessage)) {
        return {
            message: "إعدادات Washa AI غير مكتملة على الخادم. أضف المفتاح الصحيح ثم أعد المحاولة.",
            status: 503,
        };
    }

    if (
        providerStatus === "PERMISSION_DENIED" &&
        (
            normalizedProviderMessage.includes("project has been denied access") ||
            normalizedProviderMessage.includes("denied access")
        )
    ) {
        return {
            message: "مشروع Google المرتبط بـ Washa AI لا يملك صلاحية الوصول لنموذج الصور الحالي. فعّل صلاحية النموذج/الفوترة أو غيّر مزود WASHA AI.",
            status: 503,
        };
    }

    if (
        /reported as leaked/i.test(providerMessage) ||
        providerStatus === "PERMISSION_DENIED" ||
        normalizedProviderMessage.includes("api key expired") ||
        normalizedProviderMessage.includes("api key invalid") ||
        normalizedProviderMessage.includes("api_key_invalid")
    ) {
        return {
            message: "مفتاح Washa AI الحالي غير صالح أو منتهي. حدّثه في متغيرات البيئة على الخادم ثم أعد المحاولة.",
            status: 503,
        };
    }

    if (
        providerCode === 429 ||
        providerStatus === "RESOURCE_EXHAUSTED" ||
        /quota/i.test(providerMessage) ||
        /rate.?limit/i.test(providerMessage)
    ) {
        if (
            normalizedProviderMessage.includes("check your plan and billing") ||
            /free_tier[\s\S]*limit:\s*0/i.test(providerMessage)
        ) {
            return {
                message: "حصة Google المرتبطة بـ Washa AI غير مفعّلة أو نفدت لهذا النموذج. راجع الفوترة والحدود في Google AI Studio أو استخدم مزودًا آخر.",
                status: 429,
            };
        }

        return {
            message: "تم تجاوز حصة Washa AI الحالية. يرجى المحاولة بعد قليل أو التواصل مع الدعم.",
            status: 429,
        };
    }

    if (
        providerCode === 504 ||
        providerStatus === "DEADLINE_EXCEEDED" ||
        /deadline exceeded/i.test(providerMessage) ||
        /timed out/i.test(providerMessage)
    ) {
        return {
            message: "انتهت مهلة توليد التصميم قبل أن يستجيب Washa AI. حاول مرة أخرى بصورة أخف أو وصف أقصر.",
            status: 504,
        };
    }

    if (
        providerCode === 503 ||
        providerStatus === "UNAVAILABLE" ||
        /high demand/i.test(providerMessage) ||
        /try again later/i.test(providerMessage) ||
        /temporar(?:y|ily)/i.test(providerMessage)
    ) {
        return {
            message: "خدمة Washa AI تحت ضغط مؤقت الآن. أعد المحاولة بعد قليل.",
            status: 503,
        };
    }

    return {
        message: providerMessage,
        status: typeof providerCode === "number" && providerCode >= 400 && providerCode < 600
            ? providerCode
            : 500,
    };
}
