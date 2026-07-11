import sharp, { type Metadata } from "sharp";

export type ImageOptimizationProfile =
    | "thumbnail"
    | "display"
    | "product"
    | "mockup"
    | "original";

export type ImageInput = File | Blob | Buffer | ArrayBuffer | Uint8Array;

export interface ImageOptimizationOptions {
    profile?: ImageOptimizationProfile;
    fileName?: string;
    contentType?: string;
}

export interface OptimizedImageResult {
    blob: Blob;
    buffer: Buffer;
    file?: File;
    originalSize: number;
    optimizedSize: number;
    savedBytes: number;
    compressionRatio: number;
    originalType: string;
    outputType: string;
    extension: string;
    width?: number;
    height?: number;
    originalWidth?: number;
    originalHeight?: number;
    durationMs: number;
    wasOptimized: boolean;
    fallbackUsed: boolean;
}

export class ImageOptimizationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ImageOptimizationError";
    }
}

type ImageProfileSettings = {
    maxDimension: number | null;
    quality: number;
    targetBytes: number | null;
    outputType: "image/webp" | "original";
};

export const IMAGE_OPTIMIZATION_PROFILES: Record<ImageOptimizationProfile, ImageProfileSettings> = {
    thumbnail: {
        maxDimension: 512,
        quality: 75,
        targetBytes: 200 * 1024,
        outputType: "image/webp",
    },
    display: {
        maxDimension: 1600,
        quality: 82,
        targetBytes: 600 * 1024,
        outputType: "image/webp",
    },
    product: {
        maxDimension: 1800,
        quality: 84,
        targetBytes: 800 * 1024,
        outputType: "image/webp",
    },
    mockup: {
        maxDimension: 2000,
        quality: 85,
        targetBytes: 1024 * 1024,
        outputType: "image/webp",
    },
    original: {
        maxDimension: null,
        quality: 100,
        targetBytes: null,
        outputType: "original",
    },
};

const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;
const IMAGE_MIME_PREFIX = "image/";
const SVG_MIME = "image/svg+xml";
const GIF_MIME = "image/gif";

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
};

const SHARP_FORMAT_CONTENT_TYPE: Record<string, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    avif: "image/avif",
    heif: "image/heif",
    tiff: "image/tiff",
};

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function normalizeContentType(contentType?: string | null) {
    const normalized = contentType?.trim().toLowerCase() ?? "";
    if (normalized === "image/jpg") return "image/jpeg";
    return normalized;
}

export function getExtensionForContentType(contentType: string, fallback = "bin") {
    return CONTENT_TYPE_EXTENSION[normalizeContentType(contentType)] ?? fallback;
}

export function sanitizeStorageFileName(fileName: string | undefined, fallback = "image") {
    const rawName = fileName?.trim() || fallback;
    const withoutPath = rawName.split(/[\\/]/).pop() || fallback;
    const withoutExtension = withoutPath.replace(/\.[^.]+$/, "");
    const cleaned = withoutExtension
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-_.]+|[-_.]+$/g, "")
        .slice(0, 80);

    return cleaned || fallback;
}

export function isImageContentType(contentType: string | undefined | null) {
    return normalizeContentType(contentType).startsWith(IMAGE_MIME_PREFIX);
}

export function isAutoOptimizableImageType(contentType: string | undefined | null) {
    const normalized = normalizeContentType(contentType);
    return Boolean(normalized && normalized.startsWith(IMAGE_MIME_PREFIX) && normalized !== SVG_MIME && normalized !== GIF_MIME);
}

function isBlobLike(input: ImageInput): input is Blob {
    return typeof Blob !== "undefined" && input instanceof Blob;
}

async function imageInputToBuffer(input: ImageInput): Promise<Buffer> {
    if (Buffer.isBuffer(input)) return Buffer.from(input);
    if (input instanceof ArrayBuffer) return Buffer.from(input);
    if (ArrayBuffer.isView(input)) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    if (isBlobLike(input)) return Buffer.from(await input.arrayBuffer());
    throw new ImageOptimizationError("نوع ملف الصورة غير مدعوم");
}

function getInputContentType(input: ImageInput, contentType?: string) {
    if (contentType) return normalizeContentType(contentType);
    if (isBlobLike(input) && input.type) return normalizeContentType(input.type);
    return "";
}

function getInputFileName(input: ImageInput, fileName?: string) {
    if (fileName) return fileName;
    if (typeof File !== "undefined" && input instanceof File) return input.name;
    return "image";
}

function buildResult(params: {
    buffer: Buffer;
    originalBuffer: Buffer;
    originalType: string;
    outputType: string;
    extension: string;
    durationMs: number;
    wasOptimized: boolean;
    fallbackUsed: boolean;
    width?: number;
    height?: number;
    originalWidth?: number;
    originalHeight?: number;
    fileName?: string;
}): OptimizedImageResult {
    const optimizedSize = params.buffer.byteLength;
    const originalSize = params.originalBuffer.byteLength;
    const savedBytes = Math.max(0, originalSize - optimizedSize);
    const compressionRatio = originalSize > 0 ? optimizedSize / originalSize : 1;
    const blob = new Blob([new Uint8Array(params.buffer)], { type: params.outputType });
    const safeBaseName = sanitizeStorageFileName(params.fileName, "image");
    const result: OptimizedImageResult = {
        blob,
        buffer: params.buffer,
        originalSize,
        optimizedSize,
        savedBytes,
        compressionRatio,
        originalType: params.originalType,
        outputType: params.outputType,
        extension: params.extension,
        width: params.width,
        height: params.height,
        originalWidth: params.originalWidth,
        originalHeight: params.originalHeight,
        durationMs: params.durationMs,
        wasOptimized: params.wasOptimized,
        fallbackUsed: params.fallbackUsed,
    };

    if (typeof File !== "undefined") {
        result.file = new File([new Uint8Array(params.buffer)], `${safeBaseName}.${params.extension}`, {
            type: params.outputType,
            lastModified: Date.now(),
        });
    }

    return result;
}

function warnOptimizationFallback(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
        console.warn("[image-optimization] Falling back to the original image after optimization failure.", error);
    }
}

export async function optimizeImage(input: ImageInput, options: ImageOptimizationOptions = {}): Promise<OptimizedImageResult> {
    const startedAt = Date.now();
    const profile = options.profile ?? "display";
    const settings = IMAGE_OPTIMIZATION_PROFILES[profile];
    const originalBuffer = await imageInputToBuffer(input);
    const declaredType = getInputContentType(input, options.contentType);
    const fileName = getInputFileName(input, options.fileName);

    if (originalBuffer.byteLength <= 0) {
        throw new ImageOptimizationError("ملف الصورة فارغ");
    }

    if (originalBuffer.byteLength > MAX_IMAGE_INPUT_BYTES) {
        throw new ImageOptimizationError(`حجم الصورة كبير جدًا. الحد الأقصى ${formatBytes(MAX_IMAGE_INPUT_BYTES)}`);
    }

    if (declaredType && !isImageContentType(declaredType)) {
        throw new ImageOptimizationError("الملف ليس صورة");
    }

    if (declaredType && (profile === "original" || declaredType === SVG_MIME || declaredType === GIF_MIME)) {
        const extension = getExtensionForContentType(declaredType, "img");
        return buildResult({
            buffer: originalBuffer,
            originalBuffer,
            originalType: declaredType,
            outputType: declaredType,
            extension,
            durationMs: Date.now() - startedAt,
            wasOptimized: false,
            fallbackUsed: false,
            fileName,
        });
    }

    let metadata: Metadata;
    try {
        metadata = await sharp(originalBuffer, { animated: false }).metadata();
    } catch (error) {
        if (declaredType && ["image/heic", "image/heif", "image/x-icon", "image/vnd.microsoft.icon"].includes(declaredType)) {
            return buildResult({
                buffer: originalBuffer,
                originalBuffer,
                originalType: declaredType,
                outputType: declaredType,
                extension: getExtensionForContentType(declaredType, "img"),
                durationMs: Date.now() - startedAt,
                wasOptimized: false,
                fallbackUsed: true,
                fileName,
            });
        }
        throw new ImageOptimizationError(error instanceof Error ? "تعذر قراءة الصورة الفعلية" : "ملف الصورة غير صالح");
    }

    const detectedType = metadata.format ? SHARP_FORMAT_CONTENT_TYPE[metadata.format] : undefined;
    const originalType = normalizeContentType(declaredType || detectedType || "application/octet-stream");
    const originalExtension = getExtensionForContentType(originalType, metadata.format || "bin");
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    if (!isImageContentType(originalType)) {
        throw new ImageOptimizationError("الملف ليس صورة");
    }

    if (
        profile === "original" ||
        originalType === SVG_MIME ||
        originalType === GIF_MIME ||
        metadata.format === "svg" ||
        metadata.format === "gif"
    ) {
        return buildResult({
            buffer: originalBuffer,
            originalBuffer,
            originalType,
            outputType: originalType,
            extension: originalExtension,
            durationMs: Date.now() - startedAt,
            wasOptimized: false,
            fallbackUsed: false,
            width: originalWidth,
            height: originalHeight,
            originalWidth,
            originalHeight,
            fileName,
        });
    }

    try {
        const maxDimension = settings.maxDimension ?? Math.max(originalWidth ?? 0, originalHeight ?? 0);
        let quality = settings.quality;
        const minQuality = 50;
        let optimizedBuffer: Buffer | null = null;

        while (quality >= minQuality) {
            optimizedBuffer = await sharp(originalBuffer, { animated: false })
                .rotate()
                .resize({
                    width: maxDimension || undefined,
                    height: maxDimension || undefined,
                    fit: "inside",
                    withoutEnlargement: true,
                })
                .webp({
                    quality,
                    effort: 5,
                    smartSubsample: true,
                })
                .toBuffer();

            if (!settings.targetBytes || optimizedBuffer.byteLength <= settings.targetBytes || quality === minQuality) {
                break;
            }

            quality -= 7;
        }

        if (!optimizedBuffer || optimizedBuffer.byteLength <= 0) {
            throw new Error("Sharp returned an empty image");
        }

        if (optimizedBuffer.byteLength >= originalBuffer.byteLength) {
            return buildResult({
                buffer: originalBuffer,
                originalBuffer,
                originalType,
                outputType: originalType,
                extension: originalExtension,
                durationMs: Date.now() - startedAt,
                wasOptimized: false,
                fallbackUsed: false,
                width: originalWidth,
                height: originalHeight,
                originalWidth,
                originalHeight,
                fileName,
            });
        }

        const optimizedMetadata = await sharp(optimizedBuffer).metadata();
        return buildResult({
            buffer: optimizedBuffer,
            originalBuffer,
            originalType,
            outputType: "image/webp",
            extension: "webp",
            durationMs: Date.now() - startedAt,
            wasOptimized: true,
            fallbackUsed: false,
            width: optimizedMetadata.width,
            height: optimizedMetadata.height,
            originalWidth,
            originalHeight,
            fileName,
        });
    } catch (error) {
        warnOptimizationFallback(error);
        return buildResult({
            buffer: originalBuffer,
            originalBuffer,
            originalType,
            outputType: originalType,
            extension: originalExtension,
            durationMs: Date.now() - startedAt,
            wasOptimized: false,
            fallbackUsed: true,
            width: originalWidth,
            height: originalHeight,
            originalWidth,
            originalHeight,
            fileName,
        });
    }
}
