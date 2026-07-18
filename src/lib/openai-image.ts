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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const OPENAI_IMAGE_MODEL =
    (process.env.OPENAI_IMAGE_MODEL || "gpt-image-2").trim() || "gpt-image-2";
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

// المقاسات المدعومة رسمياً لكل نموذج. أي مقاس خارجها يُرفَض من واجهة OpenAI بخطأ 400،
// لذا نُطبّع القيمة القادمة من متغيرات البيئة إلى أقرب مقاس صالح بدل تعطّل التوليد.
const OPENAI_MODEL_SUPPORTED_SIZES: Record<string, readonly string[]> = {
    "gpt-image-1": ["1024x1024", "1024x1536", "1536x1024", "auto"],
    "dall-e-3": ["1024x1024", "1792x1024", "1024x1792"],
    "dall-e-2": ["256x256", "512x512", "1024x1024"],
};

// gpt-image-2: أحجام حرّة WxH بشرط أن يقبل كل بُعد القسمة على 16، ونسبة الأبعاد بين 1:3 و3:1،
// والحد الأقصى الرسمي 3840×2160 (فوق 2560×1440 تجريبي). نتحقّق بالقواعد بدل قائمة ثابتة،
// فيبقى 2048×2048 صالحاً دون تخفيض.
const GPT_IMAGE_2_DEFAULT_SIZE = "2048x2048";
const GPT_IMAGE_2_MAX_DIMENSION = 3840;
const GPT_IMAGE_2_MIN_DIMENSION = 256;

export function isGptImage2Model(model: string): boolean {
    return /^gpt-image-2(?:-|$)/i.test(model.trim());
}

function isValidGptImage2Size(size: string): boolean {
    if (size === "auto") return true;
    const match = size.match(/^(\d+)x(\d+)$/);
    if (!match) return false;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width % 16 !== 0 || height % 16 !== 0) return false;
    if (
        width < GPT_IMAGE_2_MIN_DIMENSION
        || height < GPT_IMAGE_2_MIN_DIMENSION
        || width > GPT_IMAGE_2_MAX_DIMENSION
        || height > GPT_IMAGE_2_MAX_DIMENSION
    ) return false;
    const aspect = width / height;
    return aspect >= 1 / 3 && aspect <= 3;
}

/**
 * تُعيد مقاساً صالحاً للنموذج المطلوب. النماذج غير المعروفة (مثل الأحدث) تمرّ كما هي
 * حتى لا نحجب مقاسات صحيحة لم تُدرَج بعد.
 */
export function normalizeOpenAiImageSize(
    model: string,
    requestedSize: string | undefined | null,
    fallback = "1024x1024"
): string {
    const size = (requestedSize || "").trim().toLowerCase();
    const normalizedModel = model.trim().toLowerCase();
    if (isGptImage2Model(normalizedModel)) {
        if (size && isValidGptImage2Size(size)) return size;
        const normalizedFallback = (fallback || "").trim().toLowerCase();
        return normalizedFallback && isValidGptImage2Size(normalizedFallback)
            ? normalizedFallback
            : GPT_IMAGE_2_DEFAULT_SIZE;
    }
    const supported = OPENAI_MODEL_SUPPORTED_SIZES[normalizedModel];
    if (!supported) return size || fallback;
    if (size && supported.includes(size)) return size;
    return supported.includes(fallback) ? fallback : supported[0];
}

// gpt-image-2 لا يدعم background="transparent". نُنتج بدلاً منه مخرجاً معتماً بمات نقل
// (transport matte) ثم تُزيله normalizeGeneratedArtworkForPrint لإنتاج PNG RGBA شفاف.
export function openAiModelSupportsTransparentBackground(model: string): boolean {
    return !isGptImage2Model(model);
}

function resolveOpenAiBackground(
    model: string,
    requested: "transparent" | "opaque" | "auto" | undefined
): "transparent" | "opaque" | "auto" {
    const background = requested || "auto";
    if (background === "transparent" && !openAiModelSupportsTransparentBackground(model)) {
        return "opaque";
    }
    return background;
}

function getProviderErrorMessage(rawBody: string): string {
    try {
        const parsed = JSON.parse(rawBody) as { error?: { message?: unknown } };
        return typeof parsed.error?.message === "string" ? parsed.error.message : rawBody;
    } catch {
        return rawBody;
    }
}

// نُغلّف خطأ OpenAI في بنية JSON موحّدة تحمل رمز حالة HTTP، حتى يصنّفه المتلقّي
// (getWashaDtfErrorDetails / createWashaDtfProviderAttempt) كـ 429/503/504 بدل السقوط إلى 500.
function buildOpenAiProviderError(status: number, providerMessage: string, rawBody: string) {
    const providerStatus =
        status === 429
            ? "RESOURCE_EXHAUSTED"
            : status === 504
                ? "DEADLINE_EXCEEDED"
                : status >= 500
                    ? "UNAVAILABLE"
                    : undefined;
    return new Error(JSON.stringify({
        error: {
            code: status,
            status: providerStatus,
            message: providerMessage || rawBody || `OpenAI Image API failed with status ${status}`,
        },
    }));
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
        size: normalizeOpenAiImageSize(
            OPENAI_IMAGE_MODEL,
            options.size || OPENAI_IMAGE_SIZE
        ),
    };

    // نماذج gpt-image-* تدعم quality و output_format و background.
    // background يُطبَّع حتى لا نرسل "transparent" لنموذج لا يدعمها (gpt-image-2).
    if (OPENAI_IMAGE_MODEL.startsWith("gpt-image-")) {
        body.quality = options.quality || OPENAI_IMAGE_QUALITY;
        body.output_format = options.outputFormat || "png";
        body.background = resolveOpenAiBackground(OPENAI_IMAGE_MODEL, options.background);
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
            throw buildOpenAiProviderError(res.status, providerMessage, err);
        }
        return null;
    }

    const data = await res.json();
    const imageData = data?.data?.[0];

    // gpt-image-1 و dall-e-3 (response_format=b64_json) يعيدان الصورة مضمّنة base64
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
    formData.append(
        "size",
        normalizeOpenAiImageSize(OPENAI_IMAGE_MODEL, options.size || OPENAI_IMAGE_SIZE)
    );
    if (OPENAI_IMAGE_MODEL.startsWith("gpt-image-")) {
        formData.append("quality", options.quality || OPENAI_IMAGE_QUALITY);
        formData.append("output_format", options.outputFormat || "png");
        formData.append(
            "background",
            resolveOpenAiBackground(OPENAI_IMAGE_MODEL, options.background)
        );
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
            throw buildOpenAiProviderError(res.status, providerMessage, err);
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
