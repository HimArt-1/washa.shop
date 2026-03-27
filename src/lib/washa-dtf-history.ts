import { currentUser } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/ensure-profile";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { Database } from "@/types/database";

const ALLOWED_ROLES = new Set(["admin", "wushsha", "subscriber"]);
const HISTORY_LIMIT = 12;
const THUMBNAIL_BUCKET = "designs";
const THUMBNAIL_PREFIX = "dtf-history";
const MAX_THUMBNAIL_BYTES = 450 * 1024;
const MAX_FIELD_LENGTH = 120;
const MAX_PROMPT_LENGTH = 280;
const ALLOWED_THUMBNAIL_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DtfHistoryTable = Database["public"]["Tables"]["dtf_design_history"];
type DtfHistoryRow = DtfHistoryTable["Row"];
type DtfHistoryProjection = Pick<
    DtfHistoryRow,
    "id" | "garment_type" | "garment_color" | "style" | "technique" | "palette" | "prompt" | "thumbnail_url" | "created_at"
>;

export type DtfHistoryItem = {
    id: string;
    garmentType: string;
    garmentColor: string;
    style: string;
    technique: string;
    palette: string;
    prompt: string;
    thumbnail: string | null;
    createdAt: string;
};

type RawCreateInput = {
    id?: string;
    garmentType?: string;
    garmentColor?: string;
    style?: string;
    technique?: string;
    palette?: string;
    prompt?: string;
    thumbnailDataUrl?: string | null;
};

type CreateInput = {
    id: string;
    garmentType: string;
    garmentColor: string;
    style: string;
    technique: string;
    palette: string;
    prompt: string;
    thumbnailDataUrl: string | null;
};

function sanitizeShortText(value: unknown, fieldName: string) {
    const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    if (!text) {
        throw new Error(`${fieldName} مطلوب`);
    }
    if (text.length > MAX_FIELD_LENGTH) {
        throw new Error(`${fieldName} أطول من المسموح`);
    }
    return text;
}

function sanitizePrompt(value: unknown) {
    const prompt = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    return prompt.slice(0, MAX_PROMPT_LENGTH);
}

function parseThumbnailDataUrl(dataUrl: string | null) {
    if (!dataUrl) {
        return null;
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        throw new Error("صيغة صورة المعاينة غير صالحة");
    }

    const mimeType = match[1].toLowerCase();
    if (!ALLOWED_THUMBNAIL_MIME_TYPES.has(mimeType)) {
        throw new Error("نوع صورة المعاينة غير مدعوم");
    }

    const base64Payload = match[2];
    const padding = base64Payload.endsWith("==") ? 2 : base64Payload.endsWith("=") ? 1 : 0;
    const byteLength = Math.floor((base64Payload.length * 3) / 4) - padding;
    if (byteLength <= 0 || byteLength > MAX_THUMBNAIL_BYTES) {
        throw new Error("حجم صورة المعاينة كبير جدًا");
    }

    return {
        mimeType,
        buffer: Buffer.from(base64Payload, "base64"),
    };
}

export function sanitizeDtfHistoryCreateInput(payload: RawCreateInput): CreateInput {
    const generatedId = typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : crypto.randomUUID();

    return {
        id: generatedId,
        garmentType: sanitizeShortText(payload.garmentType, "نوع القطعة"),
        garmentColor: sanitizeShortText(payload.garmentColor, "لون القطعة"),
        style: sanitizeShortText(payload.style, "الستايل"),
        technique: sanitizeShortText(payload.technique, "التقنية"),
        palette: sanitizeShortText(payload.palette, "الباليت"),
        prompt: sanitizePrompt(payload.prompt),
        thumbnailDataUrl: typeof payload.thumbnailDataUrl === "string" ? payload.thumbnailDataUrl : null,
    };
}

export async function requireWashaDtfHistoryAccess(): Promise<
    | { ok: true; supabase: SupabaseClient<Database>; profileId: string; clerkId: string }
    | { ok: false; status: number; error: string }
> {
    const user = await currentUser();
    if (!user) {
        return { ok: false, status: 401, error: "يجب تسجيل الدخول لاستخدام استوديو DTF" };
    }

    const profile = await ensureProfile();
    if (!profile || !ALLOWED_ROLES.has(profile.role)) {
        return { ok: false, status: 403, error: "غير مصرح لك باستخدام استوديو DTF" };
    }

    let supabase: SupabaseClient<Database>;
    try {
        supabase = getSupabaseAdminClient();
    } catch {
        return { ok: false, status: 503, error: "إعدادات التخزين السحابي غير مكتملة" };
    }

    return {
        ok: true,
        supabase,
        profileId: profile.id,
        clerkId: user.id,
    };
}

export function mapDtfHistoryRow(row: DtfHistoryProjection): DtfHistoryItem {
    return {
        id: row.id,
        garmentType: row.garment_type,
        garmentColor: row.garment_color,
        style: row.style,
        technique: row.technique,
        palette: row.palette,
        prompt: row.prompt,
        thumbnail: row.thumbnail_url,
        createdAt: row.created_at,
    };
}

async function uploadThumbnail(
    supabase: SupabaseClient<Database>,
    profileId: string,
    itemId: string,
    thumbnailDataUrl: string | null
) {
    const parsed = parseThumbnailDataUrl(thumbnailDataUrl);
    if (!parsed) {
        return { thumbnailPath: null as string | null, thumbnailUrl: null as string | null };
    }

    const extension = parsed.mimeType === "image/png" ? "png" : parsed.mimeType === "image/webp" ? "webp" : "jpg";
    const thumbnailPath = `${THUMBNAIL_PREFIX}/${profileId}/${itemId}.${extension}`;
    const { data, error } = await supabase.storage.from(THUMBNAIL_BUCKET).upload(thumbnailPath, parsed.buffer, {
        upsert: true,
        contentType: parsed.mimeType,
        cacheControl: "31536000",
    });

    if (error) {
        throw new Error("تعذر رفع صورة المعاينة");
    }

    const { data: publicData } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(data.path);

    return {
        thumbnailPath: data.path,
        thumbnailUrl: publicData.publicUrl,
    };
}

async function removeThumbnailPaths(
    supabase: SupabaseClient<Database>,
    paths: Array<string | null | undefined>
) {
    const cleaned = paths.filter((value): value is string => Boolean(value));
    if (!cleaned.length) {
        return;
    }

    const { error } = await supabase.storage.from(THUMBNAIL_BUCKET).remove(cleaned);
    if (error) {
        console.error("[washa-dtf-history.removeThumbnailPaths]", error);
    }
}

async function findDtfHistoryItem(
    supabase: SupabaseClient<Database>,
    profileId: string,
    itemId: string
) {
    const { data, error } = await supabase
        .from("dtf_design_history")
        .select("id, garment_type, garment_color, style, technique, palette, prompt, thumbnail_url, created_at")
        .eq("profile_id", profileId)
        .eq("id", itemId)
        .maybeSingle();

    if (error) {
        throw new Error("تعذر قراءة عنصر السجل");
    }

    return data ? mapDtfHistoryRow(data) : null;
}

async function trimExcessHistory(
    supabase: SupabaseClient<Database>,
    profileId: string
) {
    const { data: overflow, error } = await supabase
        .from("dtf_design_history")
        .select("id, thumbnail_path")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .range(HISTORY_LIMIT, HISTORY_LIMIT + 50);

    if (error || !overflow?.length) {
        if (error) {
            console.error("[washa-dtf-history.trimExcessHistory]", error);
        }
        return;
    }

    const ids = overflow.map((item) => item.id);
    const paths = overflow.map((item) => item.thumbnail_path);

    const { error: deleteError } = await supabase
        .from("dtf_design_history")
        .delete()
        .eq("profile_id", profileId)
        .in("id", ids);

    if (deleteError) {
        console.error("[washa-dtf-history.trimExcessHistory.delete]", deleteError);
        return;
    }

    await removeThumbnailPaths(supabase, paths);
}

export async function listDtfHistory(
    supabase: SupabaseClient<Database>,
    profileId: string
) {
    const { data, error } = await supabase
        .from("dtf_design_history")
        .select("id, garment_type, garment_color, style, technique, palette, prompt, thumbnail_path, thumbnail_url, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

    if (error) {
        throw new Error("تعذر تحميل سجل التصاميم");
    }

    return (data ?? []).map(mapDtfHistoryRow);
}

export async function createDtfHistoryItem(
    supabase: SupabaseClient<Database>,
    profileId: string,
    rawPayload: RawCreateInput
) {
    const payload = sanitizeDtfHistoryCreateInput(rawPayload);
    const existing = await findDtfHistoryItem(supabase, profileId, payload.id);
    if (existing) {
        return existing;
    }

    let uploadedPath: string | null = null;

    try {
        const uploaded = await uploadThumbnail(supabase, profileId, payload.id, payload.thumbnailDataUrl);
        uploadedPath = uploaded.thumbnailPath;

        const row: DtfHistoryTable["Insert"] = {
            id: payload.id,
            profile_id: profileId,
            garment_type: payload.garmentType,
            garment_color: payload.garmentColor,
            style: payload.style,
            technique: payload.technique,
            palette: payload.palette,
            prompt: payload.prompt,
            thumbnail_path: uploaded.thumbnailPath,
            thumbnail_url: uploaded.thumbnailUrl,
        };

        const { data, error } = await supabase
            .from("dtf_design_history")
            .insert(row)
            .select("id, garment_type, garment_color, style, technique, palette, prompt, thumbnail_path, thumbnail_url, created_at")
            .single();

        if (error || !data) {
            const afterInsertAttempt = await findDtfHistoryItem(supabase, profileId, payload.id);
            if (afterInsertAttempt) {
                return afterInsertAttempt;
            }
            throw new Error("تعذر حفظ التصميم في السجل");
        }

        await trimExcessHistory(supabase, profileId);
        return mapDtfHistoryRow(data);
    } catch (error) {
        if (uploadedPath) {
            await removeThumbnailPaths(supabase, [uploadedPath]);
        }
        throw error;
    }
}

export async function deleteDtfHistoryItem(
    supabase: SupabaseClient<Database>,
    profileId: string,
    itemId: string
) {
    const { data: existing, error: existingError } = await supabase
        .from("dtf_design_history")
        .select("id, thumbnail_path")
        .eq("profile_id", profileId)
        .eq("id", itemId)
        .maybeSingle();

    if (existingError) {
        throw new Error("تعذر قراءة عنصر السجل");
    }

    if (!existing) {
        return;
    }

    const { error } = await supabase
        .from("dtf_design_history")
        .delete()
        .eq("profile_id", profileId)
        .eq("id", itemId);

    if (error) {
        throw new Error("تعذر حذف العنصر");
    }

    await removeThumbnailPaths(supabase, [existing.thumbnail_path]);
}

export async function clearDtfHistory(
    supabase: SupabaseClient<Database>,
    profileId: string
) {
    const { data: existing, error: existingError } = await supabase
        .from("dtf_design_history")
        .select("thumbnail_path")
        .eq("profile_id", profileId);

    if (existingError) {
        throw new Error("تعذر قراءة سجل التصاميم");
    }

    const { error } = await supabase
        .from("dtf_design_history")
        .delete()
        .eq("profile_id", profileId);

    if (error) {
        throw new Error("تعذر مسح السجل");
    }

    await removeThumbnailPaths(supabase, (existing ?? []).map((item) => item.thumbnail_path));
}
