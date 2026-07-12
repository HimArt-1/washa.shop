import {
    formatBytes,
    getExtensionForContentType,
    normalizeContentType,
    sanitizeStorageFileName,
} from "@/lib/storage/image-optimization";

export const IMMUTABLE_STORAGE_CACHE_CONTROL = "31536000";

export type SupabaseUploadBody = Buffer | ArrayBuffer | Uint8Array | Blob | string;

export type SupabaseStorageLike = {
    storage: {
        from: (bucket: string) => {
            upload: (
                path: string,
                body: SupabaseUploadBody,
                options: {
                    cacheControl?: string;
                    contentType?: string;
                    upsert?: boolean;
                    metadata?: Record<string, string>;
                }
            ) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
            getPublicUrl: (path: string) => { data: { publicUrl: string } };
            remove?: (paths: string[]) => Promise<{ error: { message: string } | null }>;
        };
    };
};

export interface UploadFileOptions {
    supabase: SupabaseStorageLike;
    bucket: string;
    folder: string;
    file: SupabaseUploadBody | File;
    originalFileName?: string;
    contentType?: string;
    metadata?: Record<string, string>;
    returnPublicUrl?: boolean;
}

export interface UploadedFileResult {
    bucket: string;
    path: string;
    publicUrl?: string;
    contentType: string;
    size: number;
    cacheControl: string;
}

export class StorageUploadError extends Error {
    constructor(
        message: string,
        public readonly causeMessage?: string
    ) {
        super(message);
        this.name = "StorageUploadError";
    }
}

export function sanitizeStorageFolder(folder: string | undefined, fallback = "uploads") {
    const cleaned = (folder || fallback)
        .trim()
        .replace(/[^a-zA-Z0-9/_-]+/g, "-")
        .replace(/\/+/g, "/")
        .replace(/^\/|\/$/g, "");
    return cleaned || fallback;
}

export function joinStoragePath(...parts: string[]) {
    return parts
        .map((part) => part.trim())
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/")
        .replace(/^\/|\/$/g, "");
}

export function splitStoragePath(path: string) {
    const normalized = path.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    const slashIndex = normalized.lastIndexOf("/");
    if (slashIndex < 0) {
        return { folder: "uploads", fileName: normalized || "file" };
    }
    return {
        folder: normalized.slice(0, slashIndex),
        fileName: normalized.slice(slashIndex + 1) || "file",
    };
}

export function createImmutableObjectPath(folder: string, originalFileName: string | undefined, extension: string) {
    const safeFolder = sanitizeStorageFolder(folder);
    const safeBaseName = sanitizeStorageFileName(originalFileName, "asset");
    const objectId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return joinStoragePath(safeFolder, `${Date.now()}-${objectId}-${safeBaseName}.${extension}`);
}

function isBlobLike(file: UploadFileOptions["file"]): file is Blob {
    return typeof Blob !== "undefined" && file instanceof Blob;
}

async function uploadInputToBuffer(file: UploadFileOptions["file"]) {
    if (Buffer.isBuffer(file)) return Buffer.from(file);
    if (file instanceof ArrayBuffer) return Buffer.from(file);
    if (ArrayBuffer.isView(file)) return Buffer.from(file.buffer, file.byteOffset, file.byteLength);
    if (typeof file === "string") return Buffer.from(file);
    if (isBlobLike(file)) return Buffer.from(await file.arrayBuffer());
    throw new StorageUploadError("نوع الملف غير مدعوم");
}

function getUploadFileName(file: UploadFileOptions["file"], originalFileName?: string) {
    if (originalFileName) return originalFileName;
    if (typeof File !== "undefined" && file instanceof File) return file.name;
    return "asset";
}

function getUploadContentType(file: UploadFileOptions["file"], contentType?: string) {
    if (contentType) return normalizeContentType(contentType);
    if (isBlobLike(file) && file.type) return normalizeContentType(file.type);
    return "application/octet-stream";
}

function compactMetadata(metadata?: Record<string, string>) {
    const entries = Object.entries(metadata ?? {}).filter(([, value]) => value.trim());
    return entries.length ? Object.fromEntries(entries) : undefined;
}

export async function uploadFile(options: UploadFileOptions): Promise<UploadedFileResult> {
    const buffer = await uploadInputToBuffer(options.file);
    if (buffer.byteLength <= 0) {
        throw new StorageUploadError("الملف فارغ");
    }

    const contentType = getUploadContentType(options.file, options.contentType);
    const originalFileName = getUploadFileName(options.file, options.originalFileName);
    const extension = getExtensionForContentType(contentType, originalFileName.split(".").pop()?.toLowerCase() || "bin");
    const path = createImmutableObjectPath(options.folder, originalFileName, extension);
    const bucket = options.supabase.storage.from(options.bucket);
    const { data, error } = await bucket.upload(path, buffer, {
        cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
        upsert: false,
        contentType,
        metadata: compactMetadata(options.metadata),
    });

    if (error || !data?.path) {
        throw new StorageUploadError("تعذر رفع الملف إلى التخزين", error?.message);
    }

    if (process.env.NODE_ENV !== "production") {
        console.info("[storage-upload:file]", {
            bucket: options.bucket,
            folder: sanitizeStorageFolder(options.folder),
            size: formatBytes(buffer.byteLength),
            contentType,
            cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
        });
    }

    const result: UploadedFileResult = {
        bucket: options.bucket,
        path: data.path,
        contentType,
        size: buffer.byteLength,
        cacheControl: IMMUTABLE_STORAGE_CACHE_CONTROL,
    };

    if (options.returnPublicUrl !== false) {
        result.publicUrl = bucket.getPublicUrl(data.path).data.publicUrl;
    }

    return result;
}
