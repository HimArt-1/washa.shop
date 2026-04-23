/**
 * واجهات REST (predict) لنماذج Google — تُستخدَم في ai actions و DTF.
 */

import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const IMAGEN_MODEL = "imagen-4.0-ultra-generate-001";
/** واجهة :predict (مُختلفة عن مسار DTF) — NANO_BANANA_PREDICT_MODEL للتجربة/الرجوع */
const NANO_BANANA_MODEL =
    (process.env.NANO_BANANA_PREDICT_MODEL || "imagen-4.0-ultra-generate-001").trim() || "imagen-4.0-ultra-generate-001";

export function isGeminiKeyConfigured() {
    return Boolean(GEMINI_API_KEY);
}

/**
 * توليد/تعديل عبر واجهة predict (مكافئ "Nano Banana" في أداة التصميم).
 */
export async function runNanoBananaDataUrl(
    prompt: string,
    imageDataUrl?: string | null
): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:predict`;
    const instance: Record<string, unknown> = { prompt };

    if (imageDataUrl) {
        const match = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
            instance.image = {
                bytesBase64Encoded: match[2],
                mimeType: `image/${match[1] === "jpg" ? "jpeg" : match[1]}`,
            };
        }
    }

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instances: [instance],
            parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/png",
            },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Nano Banana API error:", res.status, err);
        await reportAdminOperationalAlert({
            dispatchKey: `ai:nanobanana_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "فشل موفر Nano Banana للتوليد",
            message: "خدمة Nano Banana (Gemini 3) أعادت استجابة فاشلة.",
            link: "/dashboard/notifications",
            source: "ai.generation",
            metadata: { provider: "nanobanana", status: res.status },
        });
        return null;
    }

    const data = await res.json();
    const pred = data.predictions?.[0];
    const b64 = pred?.bytesBase64Encoded;
    if (!b64) return null;
    const mime = pred?.mimeType || "image/png";
    return `data:${mime};base64,${b64}`;
}

/**
 * Imagen 3 — نص → صورة فقط.
 */
export async function runGeminiImagenDataUrl(prompt: string): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1 },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Gemini Imagen API error:", res.status, err);
        await reportAdminOperationalAlert({
            dispatchKey: `ai:gemini_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "فشل موفر Gemini للتوليد",
            message: "خدمة Gemini Imagen أعادت استجابة فاشلة أثناء توليد صورة.",
            link: "/dashboard/notifications",
            source: "ai.generation",
            metadata: { provider: "gemini", status: res.status },
        });
        return null;
    }

    const data = (await res.json()) as {
        predictions?: Array<{
            bytesBase64Encoded?: string;
            mimeType?: string;
        }>;
    };
    const pred = data.predictions?.[0];
    const b64 = pred?.bytesBase64Encoded;
    if (!b64) return null;
    const mime = pred?.mimeType || "image/png";
    return `data:${mime};base64,${b64}`;
}
