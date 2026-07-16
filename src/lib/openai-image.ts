/**
 * مزوّد OpenAI لتوليد/تعديل الصور — يُستخدَم في DTF Image Router.
 * يدعم نموذجين:
 *   - gpt-image-1 (الافتراضي) — توليد + تعديل صور
 *   - dall-e-3 — توليد نصي فقط
 *
 * متغيرات البيئة:
 *   OPENAI_API_KEY          — مفتاح OpenAI (مطلوب)
 *   OPENAI_IMAGE_MODEL      — النموذج (افتراضي: gpt-image-1)
 *   OPENAI_IMAGE_SIZE       — الأبعاد (افتراضي: 1024x1024)
 *   OPENAI_IMAGE_QUALITY    — الجودة: auto | low | medium | high (افتراضي: auto)
 */

import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGE_MODEL =
    (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim() || "gpt-image-1";
const OPENAI_IMAGE_SIZE =
    (process.env.OPENAI_IMAGE_SIZE || "1024x1024").trim() || "1024x1024";
const OPENAI_IMAGE_QUALITY =
    (process.env.OPENAI_IMAGE_QUALITY || "auto").trim() || "auto";

export function isOpenAIKeyConfigured(): boolean {
    return Boolean(OPENAI_API_KEY);
}

export function getOpenAIImageModel() {
    return OPENAI_IMAGE_MODEL;
}

function getProviderErrorMessage(rawBody: string): string {
    try {
        const parsed = JSON.parse(rawBody) as { error?: { message?: unknown } };
        return typeof parsed.error?.message === "string" ? parsed.error.message : rawBody;
    } catch {
        return rawBody;
    }
}

/**
 * توليد صورة من نص عبر OpenAI Images API.
 * يدعم gpt-image-1 و dall-e-3.
 */
export async function runOpenAIGenerateDataUrl(
    prompt: string,
    options: {
        throwOnError?: boolean;
        background?: "transparent" | "opaque" | "auto";
        outputFormat?: "png" | "webp" | "jpeg";
        quality?: "auto" | "low" | "medium" | "high";
        size?: string;
    } = {}
): Promise<string | null> {
    if (!OPENAI_API_KEY) return null;

    const body: Record<string, unknown> = {
        model: OPENAI_IMAGE_MODEL,
        prompt,
        n: 1,
        size: options.size || OPENAI_IMAGE_SIZE,
    };

    // gpt-image-1 يدعم quality و output_format
    if (OPENAI_IMAGE_MODEL.startsWith("gpt-image-")) {
        body.quality = options.quality || OPENAI_IMAGE_QUALITY;
        body.output_format = options.outputFormat || "png";
        body.background = options.background || "auto";
    } else if (OPENAI_IMAGE_MODEL === "dall-e-3") {
        body.quality = OPENAI_IMAGE_QUALITY === "auto" ? "standard" : "hd";
        body.response_format = "b64_json";
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.text();
        const providerMessage = getProviderErrorMessage(err);
        console.error("OpenAI Image API error:", res.status, err);
        await reportAdminOperationalAlert({
            dispatchKey: `ai:openai_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "فشل موفر OpenAI للتوليد",
            message: "خدمة OpenAI أعادت استجابة فاشلة أثناء توليد صورة.",
            link: "/dashboard/notifications",
            source: "ai.generation",
            metadata: { provider: "openai", model: OPENAI_IMAGE_MODEL, status: res.status, providerMessage },
        });
        if (options.throwOnError) {
            throw new Error(err || `OpenAI Image API failed with status ${res.status}`);
        }
        return null;
    }

    const data = await res.json();
    const imageData = data?.data?.[0];

    // gpt-image-1 يعيد b64_json مباشرة
    if (imageData?.b64_json) {
        return `data:image/png;base64,${imageData.b64_json}`;
    }
    // dall-e-3 مع response_format=b64_json
    if (imageData?.b64_json) {
        return `data:image/png;base64,${imageData.b64_json}`;
    }
    // رابط URL (حالة fallback)
    if (imageData?.url) {
        return imageData.url;
    }

    return null;
}

/**
 * تعديل صورة عبر OpenAI Images Edit API.
 * يعمل فقط مع gpt-image-1 (dall-e-2 أيضاً يدعمه لكن بجودة أقل).
 */
export async function runOpenAIEditDataUrl(
    prompt: string,
    imageDataUrl: string,
    options: {
        throwOnError?: boolean;
        background?: "transparent" | "opaque" | "auto";
        outputFormat?: "png" | "webp" | "jpeg";
        quality?: "auto" | "low" | "medium" | "high";
        size?: string;
    } = {}
): Promise<string | null> {
    if (!OPENAI_API_KEY) return null;

    // استخراج البيانات الثنائية من data URL
    const match = imageDataUrl.match(/^data:image\/([\w+]+);base64,(.+)$/);
    if (!match) {
        console.error("OpenAI edit: invalid data URL format");
        if (options.throwOnError) throw new Error("صيغة الصورة المرجعية غير صالحة لـ OpenAI.");
        return null;
    }

    const [, ext, base64Data] = match;
    const mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;

    // OpenAI Images Edit يتطلب multipart/form-data
    const imageBuffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([imageBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append("model", OPENAI_IMAGE_MODEL);
    formData.append("image", blob, `reference.${ext === "jpeg" ? "png" : ext}`);
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", options.size || OPENAI_IMAGE_SIZE);
    if (OPENAI_IMAGE_MODEL.startsWith("gpt-image-")) {
        formData.append("quality", options.quality || OPENAI_IMAGE_QUALITY);
        formData.append("output_format", options.outputFormat || "png");
        formData.append("background", options.background || "auto");
    }

    const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
    });

    if (!res.ok) {
        const err = await res.text();
        const providerMessage = getProviderErrorMessage(err);
        console.error("OpenAI Image Edit error:", res.status, err);
        await reportAdminOperationalAlert({
            dispatchKey: `ai:openai_edit_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            category: "system",
            severity: "warning",
            title: "فشل موفر OpenAI لتعديل الصور",
            message: "خدمة OpenAI أعادت استجابة فاشلة أثناء تعديل صورة.",
            link: "/dashboard/notifications",
            source: "ai.generation",
            metadata: { provider: "openai", model: OPENAI_IMAGE_MODEL, status: res.status, providerMessage },
        });
        if (options.throwOnError) {
            throw new Error(err || `OpenAI Image Edit failed with status ${res.status}`);
        }
        return null;
    }

    const data = await res.json();
    const imageResult = data?.data?.[0];

    if (imageResult?.b64_json) {
        return `data:image/png;base64,${imageResult.b64_json}`;
    }
    if (imageResult?.url) {
        return imageResult.url;
    }

    return null;
}
