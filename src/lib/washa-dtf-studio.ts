import { GoogleGenAI } from "@google/genai";

export const WASHA_DTF_MODEL = "gemini-3.1-flash-image-preview";

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
    const fallbackMessage = error instanceof Error ? error.message : "فشل تنفيذ طلب Gemini";

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

    if (
        /reported as leaked/i.test(providerMessage) ||
        providerStatus === "PERMISSION_DENIED"
    ) {
        return {
            message: "مفتاح Gemini الحالي مرفوض من Google. أنشئ مفتاحًا جديدًا وحدّثه في متغيرات البيئة على الخادم.",
            status: 503,
        };
    }

    if (
        providerCode === 429 ||
        providerStatus === "RESOURCE_EXHAUSTED" ||
        /quota/i.test(providerMessage) ||
        /rate.?limit/i.test(providerMessage)
    ) {
        return {
            message: "تجاوزت الحصة اليومية لـ Gemini AI. يرجى المحاولة بعد قليل أو التواصل مع الدعم.",
            status: 429,
        };
    }

    return {
        message: providerMessage,
        status: typeof providerCode === "number" && providerCode >= 400 && providerCode < 600
            ? providerCode
            : 500,
    };
}
