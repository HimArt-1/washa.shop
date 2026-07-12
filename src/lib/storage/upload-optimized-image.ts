import {
    formatBytes,
    type ImageInput,
    type ImageOptimizationProfile,
    optimizeImage,
    sanitizeStorageFileName,
} from "@/lib/storage/image-optimization";
import {
    IMMUTABLE_STORAGE_CACHE_CONTROL,
    StorageUploadError,
    type SupabaseStorageLike,
    createImmutableObjectPath,
    joinStoragePath,
    sanitizeStorageFolder,
} from "@/lib/storage/upload-file";

export interface UploadOptimizedImageOptions {
    supabase: SupabaseStorageLike;
    bucket: string;
    folder: string;
    file: ImageInput;
    originalFileName?: string;
    contentType?: string;
    profile?: ImageOptimizationProfile;
    createThumbnail?: boolean;
    returnPublicUrl?: boolean;
    metadata?: Record<string, string>;
    uploadOriginal?: boolean;
}

export interface UploadedOptimizedImageResult {
    bucket: string;
    path: string;
    publicUrl?: string;
    thumbnailPath?: string;
    thumbnailPublicUrl?: string;
    originalPath?: string;
    originalPublicUrl?: string;
    originalSize: number;
    optimizedSize: number;
    savedBytes: number;
    compressionRatio: number;
    contentType: string;
    extension: string;
    width?: number;
    height?: number;
    durationMs: number;
    wasOptimized: boolean;
    fallbackUsed: boolean;
    cacheControl: string;
}

function compactMetadata(metadata?: Record<string, string>) {
    const entries = Object.entries(metadata ?? {}).filter(([, value]) => value.trim());
    return entries.length ? Object.fromEntries(entries) : undefined;
}

function fileNameFromInput(file: ImageInput, originalFileName?: string) {
    if (originalFileName) return originalFileName;
    if (typeof File !== "undefined" && file instanceof File) return file.name;
    return "image";
}

function contentTypeFromInput(file: ImageInput, contentType?: string) {
    if (contentType) return contentType;
    if (typeof Blob !== "undefined" && file instanceof Blob && file.type) return file.type;
    return undefined;
}

function basenameFromPath(path: string) {
    const name = path.split("/").pop() || "image.webp";
    return name.replace(/\.[^.]+$/, "");
}

async function removeUploadedPath(supabase: SupabaseStorageLike, bucket: string, path: string) {
    const bucketClient = supabase.storage.from(bucket);
    if (!bucketClient.remove) return;

    try {
        await bucketClient.remove([path]);
    } catch (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("[storage-upload:image] Failed to clean up partial upload.", error);
        }
    }
}

export async function uploadOptimizedImage(options: UploadOptimizedImageOptions): Promise<UploadedOptimizedImageResult> {
    const profile = options.profile ?? "display";
    const originalFileName = fileNameFromInput(options.file, options.originalFileName);
    const contentType = contentTypeFromInput(options.file, options.contentType);
    const optimized = await optimizeImage(options.file, {
        profile,
        fileName: originalFileName,
        contentType,
    });

    if (optimized.optimizedSize <= 0) {
        throw new StorageUploadError("الصورة الناتجة فارغة");
    }

    const folder = sanitizeStorageFolder(options.folder);
    const path = createImmutableObjectPath(folder, originalFileName, optimized.extension);
    const bucketClient = options.supabase.storage.from(options.bucket);
    const uploadOptions = {
        cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
        upsert: false,
        contentType: optimized.outputType,
        metadata: compactMetadata(options.metadata),
    };

    const { data, error } = await bucketClient.upload(path, optimized.buffer, uploadOptions);
    if (error || !data?.path) {
        throw new StorageUploadError("تعذر رفع الصورة إلى التخزين", error?.message);
    }

    let thumbnailPath: string | undefined;
    let thumbnailPublicUrl: string | undefined;
    let originalPath: string | undefined;
    let originalPublicUrl: string | undefined;

    try {
        if (options.createThumbnail && optimized.outputType !== "image/svg+xml" && optimized.outputType !== "image/gif") {
            const thumbnail = await optimizeImage(options.file, {
                profile: "thumbnail",
                fileName: originalFileName,
                contentType,
            });
            const thumbBaseName = sanitizeStorageFileName(basenameFromPath(data.path), "image");
            const thumbPath = joinStoragePath(folder, "_thumbs", `${thumbBaseName}.${thumbnail.extension}`);
            const thumbUpload = await bucketClient.upload(thumbPath, thumbnail.buffer, {
                cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
                upsert: false,
                contentType: thumbnail.outputType,
                metadata: compactMetadata({ ...options.metadata, derivative: "thumbnail" }),
            });

            if (thumbUpload.error || !thumbUpload.data?.path) {
                throw new StorageUploadError("تعذر رفع الصورة المصغرة", thumbUpload.error?.message);
            }

            thumbnailPath = thumbUpload.data.path;
            if (options.returnPublicUrl !== false) {
                thumbnailPublicUrl = bucketClient.getPublicUrl(thumbUpload.data.path).data.publicUrl;
            }
        }

        if (options.uploadOriginal) {
            const original = await optimizeImage(options.file, {
                profile: "original",
                fileName: originalFileName,
                contentType,
            });
            const originalBaseName = sanitizeStorageFileName(basenameFromPath(data.path), "image");
            const rawPath = joinStoragePath(folder, "_originals", `${originalBaseName}.${original.extension}`);
            const rawUpload = await bucketClient.upload(rawPath, original.buffer, {
                cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
                upsert: false,
                contentType: original.outputType,
                metadata: compactMetadata({ ...options.metadata, derivative: "original" }),
            });

            if (rawUpload.error || !rawUpload.data?.path) {
                throw new StorageUploadError("تعذر رفع الصورة الأصلية", rawUpload.error?.message);
            }

            originalPath = rawUpload.data.path;
            if (options.returnPublicUrl !== false) {
                originalPublicUrl = bucketClient.getPublicUrl(rawUpload.data.path).data.publicUrl;
            }
        }
    } catch (error) {
        await removeUploadedPath(options.supabase, options.bucket, data.path);
        throw error;
    }

    if (process.env.NODE_ENV !== "production") {
        console.info("[storage-upload:image]", {
            bucket: options.bucket,
            folder,
            profile,
            original: formatBytes(optimized.originalSize),
            optimized: formatBytes(optimized.optimizedSize),
            saved: `${Math.round((1 - optimized.compressionRatio) * 100)}%`,
            durationMs: optimized.durationMs,
            wasOptimized: optimized.wasOptimized,
            fallbackUsed: optimized.fallbackUsed,
            thumbnail: Boolean(thumbnailPath),
        });
    }

    const result: UploadedOptimizedImageResult = {
        bucket: options.bucket,
        path: data.path,
        thumbnailPath,
        originalPath,
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        savedBytes: optimized.savedBytes,
        compressionRatio: optimized.compressionRatio,
        contentType: optimized.outputType,
        extension: optimized.extension,
        width: optimized.width,
        height: optimized.height,
        durationMs: optimized.durationMs,
        wasOptimized: optimized.wasOptimized,
        fallbackUsed: optimized.fallbackUsed,
        cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
    };

    if (options.returnPublicUrl !== false) {
        result.publicUrl = bucketClient.getPublicUrl(data.path).data.publicUrl;
        result.thumbnailPublicUrl = thumbnailPublicUrl;
        result.originalPublicUrl = originalPublicUrl;
    }

    return result;
}

export { StorageUploadError };
