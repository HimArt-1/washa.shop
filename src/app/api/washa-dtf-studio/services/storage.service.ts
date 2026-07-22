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
type ImmutableStorageUploadSuccess = {
    bucket: string;
    path: string;
    url: string;
    size: number;
    mimeType: string;
};

export class StorageService {
    static getPrivateAssetUrl(kind: "source" | "master" | "derivative" | "garment", assetId: string) {
        const configuredBaseUrl =
            process.env.NEXT_PUBLIC_APP_URL
            || process.env.NEXT_PUBLIC_BASE_URL
            || (process.env.NODE_ENV === "production" ? "https://washa.shop" : "http://localhost:3000");
        const baseUrl = configuredBaseUrl.replace(/\/+$/, "");
        return `${baseUrl}/api/washa-dtf-studio/assets/${kind}/${encodeURIComponent(assetId)}`;
    }

    static async uploadImmutableBuffer(
        buffer: Buffer,
        path: string,
        options: {
            bucket?: string;
            mimeType: string;
            accessUrl: string;
            metadata?: Record<string, string>;
            maxBytes?: number;
        }
    ): Promise<ImmutableStorageUploadSuccess | StorageUploadError> {
        const bucket = options.bucket ?? "washa-design-assets";
        const maxBytes = options.maxBytes ?? 25 * 1024 * 1024;
        if (!buffer.length) return { error: "الملف فارغ", status: 400 };
        if (buffer.byteLength > maxBytes) {
            return { error: "حجم الملف يتجاوز الحد المسموح", status: 400 };
        }

        try {
            const sb = getSupabaseAdminClient() as any;
            const bucketClient = sb.storage.from(bucket);
            const { data, error } = await bucketClient.upload(path, buffer, {
                cacheControl: "31536000",
                upsert: false,
                contentType: options.mimeType,
                metadata: options.metadata,
            });
            if (error || !data?.path) {
                return {
                    error: error?.message || "تعذر رفع الأصل الدائم",
                    status: error?.message?.toLowerCase().includes("already exists") ? 409 : 503,
                };
            }
            return {
                bucket,
                path: data.path,
                url: options.accessUrl,
                size: buffer.byteLength,
                mimeType: options.mimeType,
            };
        } catch (error) {
            logDiagnosticWarning("StorageService.uploadImmutableBuffer", error);
            return {
                error: error instanceof Error ? error.message : "تعذر رفع الأصل الدائم",
                status: 503,
            };
        }
    }

    static async downloadStoredBuffer(
        path: string,
        options: { bucket?: string } = {}
    ): Promise<Buffer | StorageUploadError> {
        try {
            const sb = getSupabaseAdminClient() as any;
            const { data, error } = await sb.storage
                .from(options.bucket ?? "washa-design-assets")
                .download(path);
            if (error || !data) {
                return { error: error?.message || "تعذر التحقق من الأصل المخزن", status: 503 };
            }
            return Buffer.from(await data.arrayBuffer());
        } catch (error) {
            logDiagnosticWarning("StorageService.downloadStoredBuffer", error);
            return {
                error: error instanceof Error ? error.message : "تعذر التحقق من الأصل المخزن",
                status: 503,
            };
        }
    }

    static async removeStoredObject(
        path: string,
        options: { bucket?: string } = {}
    ): Promise<void> {
        try {
            const sb = getSupabaseAdminClient() as any;
            const { error } = await sb.storage
                .from(options.bucket ?? "washa-design-assets")
                .remove([path]);
            if (error) throw error;
        } catch (error) {
            // Cleanup is deliberately best-effort: a failed cleanup must not hide
            // the original storage or database error from the caller.
            logDiagnosticWarning("StorageService.removeStoredObject", error);
        }
    }

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
