import crypto from "node:crypto";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import {
    ImageOptimizationError,
    optimizeImage,
    sanitizeStorageFileName,
} from "@/lib/storage/image-optimization";
import { uploadFile } from "@/lib/storage/upload-file";
import { StorageUploadError, uploadOptimizedImage } from "@/lib/storage/upload-optimized-image";

async function createNoisyImage(width: number, height: number, format: "png" | "jpeg") {
    const channels = 3;
    const input = crypto.randomBytes(width * height * channels);
    const image = sharp(input, { raw: { width, height, channels } });
    return format === "png" ? image.png().toBuffer() : image.jpeg({ quality: 100 }).toBuffer();
}

function createStorageMock(options?: { failUpload?: boolean }) {
    const uploads: Array<{
        path: string;
        body: unknown;
        options: { cacheControl?: string; contentType?: string; upsert?: boolean };
    }> = [];
    const removed: string[][] = [];

    const bucket = {
        upload: vi.fn(async (path: string, body: unknown, uploadOptions: { cacheControl?: string; contentType?: string; upsert?: boolean }) => {
            uploads.push({ path, body, options: uploadOptions });
            if (options?.failUpload) return { data: null, error: { message: "upload failed" } };
            return { data: { path }, error: null };
        }),
        getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.example.test/${path}` } })),
        remove: vi.fn(async (paths: string[]) => {
            removed.push(paths);
            return { error: null };
        }),
    };

    return {
        client: {
            storage: {
                from: vi.fn(() => bucket),
            },
        },
        bucket,
        uploads,
        removed,
    };
}

describe("image optimization", () => {
    it("converts a large PNG to WebP", async () => {
        const png = await createNoisyImage(1200, 900, "png");
        const result = await optimizeImage(png, {
            contentType: "image/png",
            fileName: "large.png",
            profile: "display",
        });

        expect(result.outputType).toBe("image/webp");
        expect(result.extension).toBe("webp");
        expect(result.wasOptimized).toBe(true);
        expect(result.optimizedSize).toBeLessThan(result.originalSize);
        expect(result.width).toBeLessThanOrEqual(1600);
        expect(result.height).toBeLessThanOrEqual(1600);
    });

    it("resizes a large JPEG without upscaling smaller images", async () => {
        const jpeg = await createNoisyImage(2200, 1400, "jpeg");
        const large = await optimizeImage(jpeg, {
            contentType: "image/jpeg",
            fileName: "large.jpg",
            profile: "display",
        });
        expect(large.outputType).toBe("image/webp");
        expect(large.width).toBeLessThanOrEqual(1600);
        expect(large.height).toBeLessThanOrEqual(1600);

        const smallPng = await createNoisyImage(120, 80, "png");
        const small = await optimizeImage(smallPng, {
            contentType: "image/png",
            fileName: "small.png",
            profile: "display",
        });
        expect(small.width).toBeLessThanOrEqual(120);
        expect(small.height).toBeLessThanOrEqual(80);
    });

    it("preserves SVG and GIF instead of rasterizing them", async () => {
        const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24"/></svg>`);
        const svgResult = await optimizeImage(svg, {
            contentType: "image/svg+xml",
            fileName: "icon.svg",
            profile: "thumbnail",
        });
        expect(svgResult.outputType).toBe("image/svg+xml");
        expect(svgResult.wasOptimized).toBe(false);

        const gif = Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
        const gifResult = await optimizeImage(gif, {
            contentType: "image/gif",
            fileName: "animated.gif",
            profile: "thumbnail",
        });
        expect(gifResult.outputType).toBe("image/gif");
        expect(gifResult.wasOptimized).toBe(false);
    });

    it("rejects empty and non-image inputs", async () => {
        await expect(optimizeImage(Buffer.alloc(0), { contentType: "image/png" })).rejects.toBeInstanceOf(ImageOptimizationError);
        await expect(optimizeImage(Buffer.from("not an image"), { contentType: "application/pdf" })).rejects.toBeInstanceOf(ImageOptimizationError);
    });

    it("sanitizes unsafe file names", () => {
        expect(sanitizeStorageFileName("../user name صورة.png")).toBe("user-name");
        expect(sanitizeStorageFileName("////")).toBe("image");
    });
});

describe("optimized storage upload", () => {
    it("uploads immutable display and thumbnail images with long cache control", async () => {
        const png = await createNoisyImage(900, 700, "png");
        const storage = createStorageMock();

        const result = await uploadOptimizedImage({
            supabase: storage.client,
            bucket: "smart-store",
            folder: "styles",
            file: png,
            originalFileName: "style.png",
            contentType: "image/png",
            profile: "display",
            createThumbnail: true,
        });

        expect(result.path).toMatch(/^styles\/.+\.webp$/);
        expect(result.thumbnailPath).toMatch(/^styles\/_thumbs\/.+\.webp$/);
        expect(storage.uploads).toHaveLength(2);
        for (const upload of storage.uploads) {
            expect(upload.options.cacheControl).toBe("31536000");
            expect(upload.options.upsert).toBe(false);
            expect(upload.options.contentType).toBe("image/webp");
        }
    });

    it("generates unique names for repeated uploads", async () => {
        const png = await createNoisyImage(500, 400, "png");
        const firstStorage = createStorageMock();
        const secondStorage = createStorageMock();

        const first = await uploadOptimizedImage({
            supabase: firstStorage.client,
            bucket: "products",
            folder: "products",
            file: png,
            originalFileName: "shirt.png",
            contentType: "image/png",
            profile: "product",
        });
        const second = await uploadOptimizedImage({
            supabase: secondStorage.client,
            bucket: "products",
            folder: "products",
            file: png,
            originalFileName: "shirt.png",
            contentType: "image/png",
            profile: "product",
        });

        expect(first.path).not.toBe(second.path);
        expect(first.extension).toBe(second.extension);
    });

    it("throws a clear upload error and keeps file uploads immutable", async () => {
        const png = await createNoisyImage(320, 240, "png");
        const failingStorage = createStorageMock({ failUpload: true });

        await expect(uploadOptimizedImage({
            supabase: failingStorage.client,
            bucket: "artworks",
            folder: "uploads",
            file: png,
            originalFileName: "art.png",
            contentType: "image/png",
        })).rejects.toBeInstanceOf(StorageUploadError);

        const fileStorage = createStorageMock();
        const upload = await uploadFile({
            supabase: fileStorage.client,
            bucket: "smart-store",
            folder: "design-orders/order-1",
            file: Buffer.from("%PDF-1.4"),
            originalFileName: "print.pdf",
            contentType: "application/pdf",
        });

        expect(upload.path).toMatch(/^design-orders\/order-1\/.+\.pdf$/);
        expect(fileStorage.uploads[0]?.options.cacheControl).toBe("31536000");
        expect(fileStorage.uploads[0]?.options.upsert).toBe(false);
        expect(fileStorage.uploads[0]?.options.contentType).toBe("application/pdf");
    });
});
