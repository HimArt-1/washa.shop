import { getSupabaseAdminClient } from "@/lib/supabase";
import { logDiagnosticWarning } from "../utils/api-error";

export interface StorageServiceOptions {
    bucket?: string;
    maxBytes?: number;
}

export class StorageService {
    static async uploadBase64Image(
        dataUrl: string,
        path: string,
        options?: StorageServiceOptions
    ): Promise<{ url: string } | { error: string }> {
        const bucket = options?.bucket ?? "smart-store";
        const maxBytes = options?.maxBytes ?? 6 * 1024 * 1024;

        const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
        if (!match) {
            return { error: "صيغة الصورة غير صحيحة" };
        }

        const mimeType = match[1];
        const base64 = match[2];
        const buffer = Buffer.from(base64, "base64");

        if (buffer.byteLength > maxBytes) {
            const maxMb = Math.floor(maxBytes / 1024 / 1024);
            return { error: `حجم الصورة كبير جدًا (الحد الأقصى المسموح ${maxMb} ميجابايت)` };
        }

        const sb = getSupabaseAdminClient();
        const { data, error } = await sb.storage.from(bucket).upload(path, buffer, {
            contentType: mimeType,
            cacheControl: "31536000",
            upsert: false,
        });

        if (error || !data?.path) {
            logDiagnosticWarning("StorageService.uploadBase64Image", error);
            return { error: error?.message || "تعذر رفع الصورة السحابية" };
        }

        const { data: urlData } = sb.storage.from(bucket).getPublicUrl(data.path);
        return { url: urlData.publicUrl };
    }
}
