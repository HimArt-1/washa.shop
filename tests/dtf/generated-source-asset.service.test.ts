import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const {
    mockGetSupabaseAdminClient,
    mockUploadImmutableBuffer,
    mockDownloadStoredBuffer,
    mockRemoveStoredObject,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockUploadImmutableBuffer: vi.fn(),
    mockDownloadStoredBuffer: vi.fn(),
    mockRemoveStoredObject: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/app/api/washa-dtf-studio/services/storage.service", () => ({
    StorageService: {
        uploadImmutableBuffer: mockUploadImmutableBuffer,
        downloadStoredBuffer: mockDownloadStoredBuffer,
        removeStoredObject: mockRemoveStoredObject,
        getPrivateAssetUrl: vi.fn((_kind: string, id: string) =>
            `https://washa.shop/assets/source/${id}`
        ),
    },
}));

import { GeneratedSourceAssetService } from "@/app/api/washa-dtf-studio/services/generated-source-asset.service";
import { sha256Hex } from "@/lib/washa-artwork/validation";

describe("GeneratedSourceAssetService", () => {
    beforeEach(() => {
        mockGetSupabaseAdminClient.mockReset();
        mockUploadImmutableBuffer.mockReset();
        mockDownloadStoredBuffer.mockReset();
        mockRemoveStoredObject.mockReset();
    });

    it("returns the committed winner and removes its loser upload after a concurrent checksum conflict", async () => {
        const buffer = await sharp({
            create: {
                width: 96,
                height: 96,
                channels: 4,
                background: { r: 22, g: 44, b: 66, alpha: 1 },
            },
        }).png().toBuffer();
        const checksum = sha256Hex(buffer);
        const winner = {
            id: "11111111-1111-4111-8111-111111111111",
            storage_bucket: "washa-design-assets",
            permanent_storage_path: "design-sources/profile/winner/provider-output.png",
            permanent_url: "https://washa.shop/assets/source/winner",
            sha256_checksum: checksum,
            width: 96,
            height: 96,
            mime_type: "image/png",
            background_mode: "opaque",
            provider: "openai",
            generation_model: "gpt-image-1.5",
            prompt: "artwork",
            generation_parameters: { pipeline: "prompt_native" },
            inspection_report: {
                detectedFormat: "png",
                width: 96,
                height: 96,
                hasAlphaChannel: true,
                transparentPixelRatio: 0,
            },
            created_at: "2026-07-22T00:00:00.000Z",
        };
        let lookupCount = 0;
        mockGetSupabaseAdminClient.mockReturnValue({
            from(table: string) {
                expect(table).toBe("washa_design_source_assets");
                const query = {
                    select() { return this; },
                    eq() { return this; },
                    async maybeSingle() {
                        lookupCount += 1;
                        return { data: null, error: null };
                    },
                    async single() {
                        return { data: winner, error: null };
                    },
                    async insert() {
                        return {
                            error: {
                                code: "23505",
                                message: "duplicate source checksum",
                            },
                        };
                    },
                };
                return query;
            },
        });
        mockUploadImmutableBuffer.mockResolvedValue({
            bucket: "washa-design-assets",
            path: "design-sources/profile/loser/provider-output.png",
            url: "https://washa.shop/assets/source/loser",
            size: buffer.byteLength,
            mimeType: "image/png",
        });
        mockDownloadStoredBuffer.mockResolvedValue(buffer);

        const result = await GeneratedSourceAssetService.capture({
            profileId: "profile",
            buffer,
            declaredMimeType: "image/png",
            provider: "openai",
            model: "gpt-image-1.5",
            prompt: "artwork",
            generationParameters: { pipeline: "prompt_native" },
        });

        expect(lookupCount).toBe(1);
        expect(result.source.id).toBe(winner.id);
        expect(result.source.checksum).toBe(checksum);
        expect(result.buffer.equals(buffer)).toBe(true);
        expect(mockRemoveStoredObject).toHaveBeenCalledWith(
            "design-sources/profile/loser/provider-output.png",
            { bucket: "washa-design-assets" }
        );
    });
});
