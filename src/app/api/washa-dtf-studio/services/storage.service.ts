import { getSupabaseAdminClient } from "@/lib/supabase";
import { uploadOptimizedImage, StorageUploadError as OptimizedStorageUploadError } from "@/lib/storage/upload-optimized-image";
import { splitStoragePath } from "@/lib/storage/upload-file";
import { logDiagnosticWarning } from "../utils/api-error";

export interface StorageServiceOptions {
    bucket?: string;
    maxBytes?: number;
}

type StorageUploadSuccess = { url: string };
type StorageUploadError = { error: string; status: number };

export class StorageService {
    static async uploadBase64Image(
        dataUrl: string,
        path: string,
        options?: StorageServiceOptions
    ): Promise<StorageUploadSuccess | StorageUploadError> {
        const bucket = options?.bucket ?? "smart-store";
        const maxBytes = options?.maxBytes ?? 6 * 1024 * 1024;

        const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i);
        if (!match) {
            return { error: "صيغة الصورة غير صحيحة", status: 400 };
        }

        const mimeType = match[1].toLowerCase();
        const base64 = match[2];
        const buffer = Buffer.from(base64, "base64");

        if (buffer.byteLength > maxBytes) {
            const maxMb = Math.floor(maxBytes / 1024 / 1024);
            return { error: `حجم الصورة كبير جدًا (الحد الأقصى المسموح ${maxMb} ميجابايت)`, status: 400 };
        }

        try {
            const { folder, fileName } = splitStoragePath(path);
            const uploaded = await uploadOptimizedImage({
                supabase: getSupabaseAdminClient(),
                bucket,
                folder,
                file: buffer,
                originalFileName: fileName,
                contentType: mimeType,
                profile: path.includes("mockup") || path.includes("design-orders") ? "mockup" : "display",
                createThumbnail: false,
                returnPublicUrl: true,
            });

            return { url: uploaded.publicUrl ?? "" };
        } catch (error) {
            logDiagnosticWarning("StorageService.uploadBase64Image", error);
            const message = error instanceof OptimizedStorageUploadError
                ? error.causeMessage || error.message
                : "تعذر رفع الصورة السحابية";
            return { error: message, status: 503 };
        }
    }
}
