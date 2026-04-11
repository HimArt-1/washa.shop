"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";

// ─── مزوّد التوليد: Nano Banana (Gemini 3), Replicate أو Gemini (Imagen 3) ────────
// ضبط في .env: IMAGE_PROVIDER=nanobanana | replicate | gemini
const IMAGE_PROVIDER = (process.env.IMAGE_PROVIDER || "nanobanana").toLowerCase();
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const FLUX_SCHNELL = "black-forest-labs/flux-schnell";
const FLUX_IMG2IMG = "bxclib2/flux_img2img"; // صورة → صورة
const REPLICATE_WAIT = 120; // ثواني انتظار أقصى
const IMAGEN_MODEL = "imagen-3.0-generate-002";
const NANO_BANANA_MODEL = "gemini-3-flash-preview"; // Nano Banana 2

const AI_ALLOWED_ROLES = new Set(["admin", "wushsha", "subscriber"]);
const AI_LOG_SOURCE = "ai.generation";
const AI_USAGE_WINDOW_MS = 15 * 60 * 1000;
const AI_USAGE_LIMIT = 8;
const MAX_PROMPT_LENGTH = 1200;
const MAX_STYLE_LENGTH = 80;
const MAX_COLOR_IDS = 8;
const MAX_COLOR_ID_LENGTH = 40;
const MAX_BASE64_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_BASE64_IMAGE_MIME_TYPES = new Set(["png", "jpg", "jpeg", "webp"]);

interface GenerateImageResult {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

export interface GenerateDesignForPrintInput {
    method: "from_image" | "from_text";
    prompt: string;
    styleId: string;
    colorIds?: string[];
    imageBase64?: string | null;
}

type AiAccessResult =
    | {
        ok: true;
        supabase: any;
        profileId: string;
        role: string;
        clerkId: string;
    }
    | {
        ok: false;
        error: string;
    };

function getAiAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("AI generation requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

async function requireAiAccess(): Promise<AiAccessResult> {
    const user = await currentUser();
    if (!user) {
        return { ok: false, error: "يجب تسجيل الدخول لاستخدام التوليد" };
    }

    const supabase = getAiAdminClient();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .maybeSingle();

    if (!profile || !AI_ALLOWED_ROLES.has(profile.role)) {
        return { ok: false, error: "غير مصرح لك باستخدام التوليد" };
    }

    return {
        ok: true,
        supabase,
        profileId: profile.id as string,
        role: profile.role as string,
        clerkId: user.id,
    };
}

async function logAiEvent(
    supabase: any,
    profileId: string,
    type: "info" | "warning" | "error",
    message: string,
    metadata: Record<string, unknown>
) {
    try {
        await supabase.from("system_logs").insert({
            type,
            source: AI_LOG_SOURCE,
            message,
            user_id: profileId,
            metadata,
        });
    } catch (error) {
        console.error("[ai.logAiEvent]", error);
    }
}

async function enforceAiUsageLimit(
    supabase: any,
    profileId: string
) {
    const cutoffIso = new Date(Date.now() - AI_USAGE_WINDOW_MS).toISOString();
    const { count, error } = await supabase
        .from("system_logs")
        .select("id", { count: "exact", head: true })
        .eq("source", AI_LOG_SOURCE)
        .eq("user_id", profileId)
        .gte("created_at", cutoffIso);

    if (error) {
        console.error("[ai.enforceAiUsageLimit]", error);
        return { ok: false as const, error: "تعذر التحقق من حد الاستخدام الآن، جرّب بعد قليل" };
    }

    if ((count ?? 0) >= AI_USAGE_LIMIT) {
        return {
            ok: false as const,
            error: `وصلت إلى الحد المسموح مؤقتًا. جرّب بعد ${Math.ceil(AI_USAGE_WINDOW_MS / 60000)} دقيقة`,
        };
    }

    return { ok: true as const };
}

function sanitizePrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim().replace(/\s+/g, " ");
    if (!prompt) {
        return { ok: false as const, error: "الوصف مطلوب" };
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
        return { ok: false as const, error: `الوصف طويل جدًا. الحد الأقصى ${MAX_PROMPT_LENGTH} حرف` };
    }
    return { ok: true as const, prompt };
}

function sanitizeStyle(rawStyle: string) {
    const style = rawStyle.trim().replace(/\s+/g, " ");
    if (!style) {
        return { ok: false as const, error: "النمط مطلوب" };
    }
    if (style.length > MAX_STYLE_LENGTH) {
        return { ok: false as const, error: "قيمة النمط غير صالحة" };
    }
    return { ok: true as const, style };
}

function sanitizeColorIds(colorIds?: string[]) {
    if (!colorIds?.length) {
        return { ok: true as const, colorIds: [] as string[] };
    }

    const sanitized = Array.from(
        new Set(
            colorIds
                .map((value) => value.trim())
                .filter(Boolean)
        )
    );

    if (sanitized.length > MAX_COLOR_IDS) {
        return { ok: false as const, error: `الحد الأقصى للألوان هو ${MAX_COLOR_IDS}` };
    }

    if (sanitized.some((value) => value.length > MAX_COLOR_ID_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(value))) {
        return { ok: false as const, error: "قائمة الألوان غير صالحة" };
    }

    return { ok: true as const, colorIds: sanitized };
}

function sanitizeBase64Image(imageBase64?: string | null) {
    if (!imageBase64) {
        return { ok: true as const, imageBase64: null as string | null };
    }

    const match = imageBase64.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        return { ok: false as const, error: "صيغة الصورة غير صالحة" };
    }

    const extension = match[1].toLowerCase();
    if (!ALLOWED_BASE64_IMAGE_MIME_TYPES.has(extension)) {
        return { ok: false as const, error: "نوع الصورة غير مدعوم" };
    }

    const base64Payload = match[2];
    const padding = base64Payload.endsWith("==") ? 2 : base64Payload.endsWith("=") ? 1 : 0;
    const byteLength = Math.floor((base64Payload.length * 3) / 4) - padding;

    if (byteLength <= 0 || byteLength > MAX_BASE64_IMAGE_BYTES) {
        return {
            ok: false as const,
            error: `حجم الصورة المرجعية كبير جدًا. الحد الأقصى ${Math.floor(MAX_BASE64_IMAGE_BYTES / (1024 * 1024))}MB`,
        };
    }

    return { ok: true as const, imageBase64 };
}

function getAiProviderName() {
    if (isNanoBananaEnabled()) return "nanobanana";
    if (isGeminiEnabled()) return "gemini";
    if (isReplicateEnabled()) return "replicate";
    return "mock";
}

async function reportAiOperationalAlert(params: {
    dispatchKey: string;
    title: string;
    message: string;
    severity: "warning" | "critical";
    metadata?: Record<string, unknown>;
    bucketMs?: number;
    stack?: string | null;
}) {
    await reportAdminOperationalAlert({
        dispatchKey: params.dispatchKey,
        bucketMs: params.bucketMs,
        category: "system",
        severity: params.severity,
        title: params.title,
        message: params.message,
        link: "/dashboard/notifications",
        source: "ai.generation",
        metadata: params.metadata,
        stack: params.stack,
    });
}

function isDevelopment() {
    return process.env.NODE_ENV !== "production";
}

function getNoProviderResponse() {
    if (isDevelopment()) {
        return {
            success: true,
            imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1024&q=80",
        } as const;
    }

    return {
        success: false,
        error: "خدمة التوليد غير مهيأة حالياً",
    } as const;
}

/** هل مزوّد التوليد الحالي هو Nano Banana 2؟ */
function isNanoBananaEnabled(): boolean {
    return (IMAGE_PROVIDER === "nanobanana" || IMAGE_PROVIDER === "gemini") && !!GEMINI_API_KEY;
}

/** هل مزוّد التوليد الحالي هو Gemini (Imagen)؟ */
function isGeminiEnabled(): boolean {
    return IMAGE_PROVIDER === "gemini" && !!GEMINI_API_KEY;
}

/** هل مزوّد التوليد الحالي هو Replicate؟ */
function isReplicateEnabled(): boolean {
    return !!REPLICATE_API_TOKEN;
}

/**
 * توليد/تعديل صورة عبر Nano Banana 2 (Gemini 3 Flash Image).
 */
async function runNanoBanana(prompt: string, imageBase64?: string | null): Promise<string | null> {
    if (!GEMINI_API_KEY) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:predict`;
    const instance: any = { prompt };
    
    if (imageBase64) {
        const match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (match) {
            instance.image = {
                bytesBase64Encoded: match[2],
                mimeType: `image/${match[1] === "jpg" ? "jpeg" : match[1]}`
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
                outputMimeType: "image/png"
            },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Nano Banana API error:", res.status, err);
        await reportAiOperationalAlert({
            dispatchKey: `ai:nanobanana_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            severity: "warning",
            title: "فشل موفر Nano Banana للتوليد",
            message: "خدمة Nano Banana (Gemini 3) أعادت استجابة فاشلة.",
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
 * توليد صورة عبر Gemini (Imagen 3). يرجع data URL للصورة.
 * Imagen نص→صورة فقط (لا يدعم صورة مرجعية).
 */
async function runGeminiImagen(prompt: string): Promise<string | null> {
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
        await reportAiOperationalAlert({
            dispatchKey: `ai:gemini_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            severity: "warning",
            title: "فشل موفر Gemini للتوليد",
            message: "خدمة Gemini Imagen أعادت استجابة فاشلة أثناء توليد صورة.",
            metadata: {
                provider: "gemini",
                status: res.status,
            },
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

/**
 * تشغيل نموذج على Replicate (نص → صورة).
 * يدعم Prefer: wait للانتظار حتى انتهاء التوليد.
 */
async function runReplicatePredictions(params: {
    version: string;
    input: Record<string, unknown>;
}): Promise<{ urls?: string[] } | null> {
    if (!REPLICATE_API_TOKEN) return null;

    const res = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${REPLICATE_WAIT}`,
        },
        body: JSON.stringify({
            version: params.version,
            input: params.input,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Replicate API error:", res.status, err);
        await reportAiOperationalAlert({
            dispatchKey: `ai:replicate_http_error:${res.status}`,
            bucketMs: 30 * 60 * 1000,
            severity: "warning",
            title: "فشل موفر Replicate للتوليد",
            message: "خدمة Replicate أعادت استجابة فاشلة أثناء تنفيذ طلب توليد.",
            metadata: {
                provider: "replicate",
                status: res.status,
            },
        });
        throw new Error(err || "Replicate request failed");
    }

    const data = (await res.json()) as {
        status?: string;
        output?: string | string[];
        error?: string;
    };

    if (data.status !== "succeeded") {
        throw new Error(data.error || "التوليد لم يكتمل");
    }

    const output = data.output;
    if (Array.isArray(output)) {
        const urls = output.filter((value): value is string => typeof value === "string");
        return { urls };
    }
    if (typeof output === "string") {
        return { urls: [output] };
    }
    return null;
}

/**
 * رفع صورة (base64) إلى Supabase Storage وإرجاع رابط عام.
 * يستخدم Admin (Service Role) لتفادي سياسات RLS على الرفع من السيرفر.
 */
async function uploadImageToStorage(
    supabase: any,
    base64Data: string
): Promise<string | null> {
    const bucket = "designs";
    const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return null;

    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const buffer = Buffer.from(match[2], "base64");
    const path = `temp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
        contentType: `image/${ext}`,
        upsert: false,
    });

    if (error) {
        console.error("Upload design image error:", error.message);
        return null;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData?.publicUrl ?? null;
}

export async function generateImage(prompt: string, style: string): Promise<GenerateImageResult> {
    let access: Awaited<ReturnType<typeof requireAiAccess>> | null = null;
    let provider = getAiProviderName();

    try {
        access = await requireAiAccess();
        if (!access.ok) {
            return { success: false, error: access.error };
        }

        const usage = await enforceAiUsageLimit(access.supabase, access.profileId);
        if (!usage.ok) {
            await logAiEvent(access.supabase, access.profileId, "warning", "AI usage limit reached", {
                action: "generateImage",
                provider,
            });
            return { success: false, error: usage.error };
        }

        const promptCheck = sanitizePrompt(prompt);
        if (!promptCheck.ok) return { success: false, error: promptCheck.error };

        const styleCheck = sanitizeStyle(style);
        if (!styleCheck.ok) return { success: false, error: styleCheck.error };

        const fullPrompt = `${styleCheck.style} style: ${promptCheck.prompt}. High quality, detailed.`;

        if (isNanoBananaEnabled()) {
            provider = "nanobanana";
            const dataUrl = await runNanoBanana(fullPrompt);
            if (dataUrl) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI image generated (Nano Banana)", {
                    action: "generateImage",
                    provider,
                    promptLength: promptCheck.prompt.length,
                });
                return { success: true, imageUrl: dataUrl };
            }
        }

        if (isGeminiEnabled()) {
            provider = "gemini";
            const dataUrl = await runGeminiImagen(fullPrompt);
            if (dataUrl) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI image generated (Imagen)", {
                    action: "generateImage",
                    provider,
                    promptLength: promptCheck.prompt.length,
                });
                return { success: true, imageUrl: dataUrl };
            }
        }
        if (isReplicateEnabled()) {
            provider = "replicate";
            const out = await runReplicatePredictions({
                version: FLUX_SCHNELL,
                input: { prompt: fullPrompt },
            });
            if (out?.urls?.[0]) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI image generated", {
                    action: "generateImage",
                    provider,
                    promptLength: promptCheck.prompt.length,
                });
                return { success: true, imageUrl: out.urls[0] };
            }
        }

        const noProvider = getNoProviderResponse();
        if (!noProvider.success) {
            await reportAiOperationalAlert({
                dispatchKey: "ai:no_provider:generate_image",
                bucketMs: 60 * 60 * 1000,
                severity: "critical",
                title: "خدمة التوليد غير مهيأة",
                message: "لا يوجد موفر AI صالح لتوليد الصور حالياً، والميزة متوقفة في الإنتاج.",
                metadata: {
                    action: "generateImage",
                    configured_provider: IMAGE_PROVIDER,
                },
            });
        }
        await logAiEvent(access.supabase, access.profileId, noProvider.success ? "info" : "warning", "AI provider unavailable", {
            action: "generateImage",
            provider: noProvider.success ? "mock" : "none",
        });
        return noProvider;
    } catch (error) {
        console.error("AI Generation Error:", error);
        await reportAiOperationalAlert({
            dispatchKey: "ai:generation_exception:generate_image",
            bucketMs: 15 * 60 * 1000,
            severity: "warning",
            title: "استثناء في توليد الصور",
            message: "حدث استثناء غير متوقع أثناء تنفيذ generateImage.",
            metadata: {
                action: "generateImage",
                provider,
                error: error instanceof Error ? error.message : String(error),
            },
            stack: error instanceof Error ? error.stack ?? null : null,
        });
        if (access?.ok) {
            await logAiEvent(access.supabase, access.profileId, "error", "AI image generation failed", {
                action: "generateImage",
                provider,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return { success: false, error: "فشل التوليد" };
    }
}

export async function generateDesignForPrint(
    input: GenerateDesignForPrintInput
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    let access: Awaited<ReturnType<typeof requireAiAccess>> | null = null;
    let provider = getAiProviderName();

    try {
        access = await requireAiAccess();
        if (!access.ok) {
            return { success: false, error: access.error };
        }

        const usage = await enforceAiUsageLimit(access.supabase, access.profileId);
        if (!usage.ok) {
            await logAiEvent(access.supabase, access.profileId, "warning", "AI usage limit reached", {
                action: "generateDesignForPrint",
                provider,
                method: input.method,
            });
            return { success: false, error: usage.error };
        }

        if (input.method !== "from_text" && input.method !== "from_image") {
            return { success: false, error: "طريقة التوليد غير صالحة" };
        }

        const promptCheck = sanitizePrompt(input.prompt);
        if (!promptCheck.ok) return { success: false, error: promptCheck.error };

        const styleCheck = sanitizeStyle(input.styleId);
        if (!styleCheck.ok) return { success: false, error: styleCheck.error };

        const colorCheck = sanitizeColorIds(input.colorIds);
        if (!colorCheck.ok) return { success: false, error: colorCheck.error };

        const imageCheck = sanitizeBase64Image(input.imageBase64);
        if (!imageCheck.ok) return { success: false, error: imageCheck.error };

        const stylePrompt = styleCheck.style ? `Style: ${styleCheck.style}. ` : "";
        const colorPrompt =
            colorCheck.colorIds.length ? `Colors: ${colorCheck.colorIds.join(", ")}. ` : "";
        const qualitySuffix =
            " Print-ready, no background, transparent or white background, suitable for apparel printing, high resolution, clean edges.";
        const fullPrompt = `${stylePrompt}${colorPrompt}${promptCheck.prompt}${qualitySuffix}`;

        if (input.method === "from_image") {
            if (!imageCheck.imageBase64) {
                return { success: false, error: "الصورة المرجعية مطلوبة" };
            }

            // محاولة استخدام Nano Banana أولاً للتعديل (Native)
            if (isNanoBananaEnabled()) {
                provider = "nanobanana";
                const dataUrl = await runNanoBanana(fullPrompt, imageCheck.imageBase64);
                if (dataUrl) {
                    await logAiEvent(access.supabase, access.profileId, "info", "AI design edited (Nano Banana)", {
                        action: "generateDesignForPrint",
                        provider,
                        method: input.method,
                        promptLength: promptCheck.prompt.length,
                    });
                    return { success: true, imageUrl: dataUrl };
                }
            }

            if (!isReplicateEnabled()) {
                await reportAiOperationalAlert({
                    dispatchKey: "ai:img2img_provider_missing",
                    bucketMs: 60 * 60 * 1000,
                    severity: "critical",
                    title: "تعطل التوليد من صورة مرجعية",
                    message: "ميزة image-to-image مطلوبة من الواجهة لكن Replicate و Nano Banana غير مهيأين حالياً.",
                    metadata: {
                        action: "generateDesignForPrint",
                        method: input.method,
                    },
                });
                return { success: false, error: "التوليد من صورة غير متاح حالياً" };
            }

            let imageInput = imageCheck.imageBase64;
            if (imageCheck.imageBase64.length > 250 * 1024) {
                const uploaded = await uploadImageToStorage(access.supabase, imageCheck.imageBase64);
                if (!uploaded) {
                    return { success: false, error: "تعذر تجهيز الصورة المرجعية، جرّب صورة أصغر" };
                }
                imageInput = uploaded;
            }

            provider = "replicate";
            const imgOut = await runReplicatePredictions({
                version: FLUX_IMG2IMG,
                input: { prompt: fullPrompt, image: imageInput },
            });

            if (imgOut?.urls?.[0]) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI print design generated (Flux)", {
                    action: "generateDesignForPrint",
                    provider,
                    method: input.method,
                    promptLength: promptCheck.prompt.length,
                    colorCount: colorCheck.colorIds.length,
                });
                return { success: true, imageUrl: imgOut.urls[0] };
            }

            return { success: false, error: "لم يتم توليد الصورة المرجعية، جرّب مرة أخرى" };
        }

        if (isNanoBananaEnabled()) {
            provider = "nanobanana";
            const dataUrl = await runNanoBanana(fullPrompt);
            if (dataUrl) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI print design generated (Nano Banana)", {
                    action: "generateDesignForPrint",
                    provider,
                    method: input.method,
                    promptLength: promptCheck.prompt.length,
                    colorCount: colorCheck.colorIds.length,
                });
                return { success: true, imageUrl: dataUrl };
            }
        }

        if (isGeminiEnabled()) {
            provider = "gemini";
            const dataUrl = await runGeminiImagen(fullPrompt);
            if (dataUrl) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI print design generated (Imagen)", {
                    action: "generateDesignForPrint",
                    provider,
                    method: input.method,
                    promptLength: promptCheck.prompt.length,
                    colorCount: colorCheck.colorIds.length,
                });
                return { success: true, imageUrl: dataUrl };
            }
        }

        if (isReplicateEnabled()) {
            provider = "replicate";
            const out = await runReplicatePredictions({
                version: FLUX_SCHNELL,
                input: { prompt: fullPrompt },
            });
            if (out?.urls?.[0]) {
                await logAiEvent(access.supabase, access.profileId, "info", "AI print design generated", {
                    action: "generateDesignForPrint",
                    provider,
                    method: input.method,
                    promptLength: promptCheck.prompt.length,
                    colorCount: colorCheck.colorIds.length,
                });
                return { success: true, imageUrl: out.urls[0] };
            }
        }

        const noProvider = getNoProviderResponse();
        if (!noProvider.success) {
            await reportAiOperationalAlert({
                dispatchKey: "ai:no_provider:generate_print_design",
                bucketMs: 60 * 60 * 1000,
                severity: "critical",
                title: "خدمة تصميم الطباعة غير مهيأة",
                message: "لا يوجد موفر AI صالح لتوليد تصاميم الطباعة حالياً في بيئة الإنتاج.",
                metadata: {
                    action: "generateDesignForPrint",
                    method: input.method,
                    configured_provider: IMAGE_PROVIDER,
                },
            });
        }
        await logAiEvent(access.supabase, access.profileId, noProvider.success ? "info" : "warning", "AI provider unavailable", {
            action: "generateDesignForPrint",
            provider: noProvider.success ? "mock" : "none",
            method: input.method,
        });
        return noProvider;
    } catch (err) {
        console.error("generateDesignForPrint:", err);
        await reportAiOperationalAlert({
            dispatchKey: "ai:generation_exception:generate_print_design",
            bucketMs: 15 * 60 * 1000,
            severity: "warning",
            title: "استثناء في توليد تصميم الطباعة",
            message: "حدث استثناء غير متوقع أثناء تنفيذ generateDesignForPrint.",
            metadata: {
                action: "generateDesignForPrint",
                method: input.method,
                provider,
                error: err instanceof Error ? err.message : String(err),
            },
            stack: err instanceof Error ? err.stack ?? null : null,
        });
        if (access?.ok) {
            await logAiEvent(access.supabase, access.profileId, "error", "AI print design generation failed", {
                action: "generateDesignForPrint",
                provider,
                method: input.method,
                error: err instanceof Error ? err.message : String(err),
            });
        }
        const message = err instanceof Error ? err.message : "فشل التوليد، جرّب مرة أخرى";
        return { success: false, error: message };
    }
}
