import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const {
    mockGetSupabaseAdminClient,
    mockDownloadStoredBuffer,
    mockUploadImmutableBuffer,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockDownloadStoredBuffer: vi.fn(),
    mockUploadImmutableBuffer: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/app/api/washa-dtf-studio/services/storage.service", () => ({
    StorageService: {
        downloadStoredBuffer: mockDownloadStoredBuffer,
        uploadImmutableBuffer: mockUploadImmutableBuffer,
        getPrivateAssetUrl: vi.fn((_kind: string, id: string) => `https://washa.shop/assets/${id}`),
    },
}));

import { DesignRevisionService } from "@/app/api/washa-dtf-studio/services/design-revision.service";
import { sha256Hex } from "@/lib/washa-artwork/validation";

function selectChain(row: unknown) {
    return {
        eq() { return this; },
        order() { return this; },
        limit() { return this; },
        async single() { return { data: row, error: null }; },
        async maybeSingle() { return { data: row, error: null }; },
    };
}

function mutationChain() {
    const result = { error: null };
    return {
        eq() { return this; },
        then(resolve: (value: typeof result) => unknown) {
            return Promise.resolve(resolve(result));
        },
    };
}

async function transparentMaster() {
    const mark = await sharp({
        create: {
            width: 48,
            height: 48,
            channels: 4,
            background: { r: 190, g: 40, b: 60, alpha: 1 },
        },
    }).png().toBuffer();
    return sharp({
        create: {
            width: 96,
            height: 96,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).composite([{ input: mark, left: 24, top: 24 }]).png().toBuffer();
}

describe("DesignRevisionService", () => {
    beforeEach(async () => {
        vi.stubEnv("WASHA_DTF_MIN_ARTWORK_DIMENSION", "64");
        mockGetSupabaseAdminClient.mockReset();
        mockDownloadStoredBuffer.mockReset();
        mockUploadImmutableBuffer.mockReset();

        const masterBuffer = await transparentMaster();
        let productionBuffer: Buffer | null = null;
        const checksum = sha256Hex(masterBuffer);
        const inserts: Record<string, unknown[]> = {
            washa_design_asset_derivatives: [],
            washa_design_revisions: [],
        };
        const requestUpdates: unknown[] = [];
        const request = {
            id: "11111111-1111-4111-8111-111111111111",
            profile_id: "profile_1",
            master_asset_id: "22222222-2222-4222-8222-222222222222",
            selected_product_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            selected_color_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            selected_color_hex: "#111111",
            production_readiness_status: "ready",
            generation_status: "ready",
            reference_mockup_id: "33333333-3333-4333-8333-333333333333",
            generated_garment_mockup_id: null,
            front_preview_url: "https://cdn.example/mockup-front.webp",
            back_preview_url: null,
            mockup_source_type: "reference",
            selected_side: "front",
            placement_data: {
                side: "front",
                x: 0.5,
                y: 0.5,
                scale: 0.8,
                rotation: 0,
                printWidthCm: 1,
                printHeightCm: 1,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "33333333-3333-4333-8333-333333333333",
                printAreaId: "front_default",
                transformVersion: 1,
            },
        };
        const master = {
            id: "22222222-2222-4222-8222-222222222222",
            profile_id: "profile_1",
            permanent_storage_path: "design-masters/profile/master/design-master.png",
            permanent_url: "https://cdn.example/design-master.png",
            storage_bucket: "washa-design-assets",
            sha256_checksum: checksum,
            width: 96,
            height: 96,
            mime_type: "image/png",
            alpha_channel_status: "verified",
            prompt: "isolated artwork",
            generation_model: "gpt-image-1",
            provider: "openai",
            generation_parameters: { background: "transparent" },
        };

        mockGetSupabaseAdminClient.mockReturnValue({
            from(table: string) {
                if (table === "washa_design_requests") {
                    return {
                        select: () => selectChain(request),
                        update: (payload: unknown) => {
                            requestUpdates.push(payload);
                            return mutationChain();
                        },
                    };
                }
                if (table === "washa_design_master_assets") {
                    return { select: () => selectChain(master) };
                }
                if (table === "washa_design_revisions") {
                    return {
                        select: () => selectChain({ revision_number: 1 }),
                        insert: async (payload: unknown) => {
                            inserts.washa_design_revisions.push(payload);
                            return { error: null };
                        },
                    };
                }
                if (table === "washa_design_asset_derivatives") {
                    return {
                        insert: async (payload: unknown) => {
                            inserts.washa_design_asset_derivatives.push(payload);
                            return { error: null };
                        },
                    };
                }
                throw new Error(`Unexpected table: ${table}`);
            },
            __inserts: inserts,
            __requestUpdates: requestUpdates,
            __master: master,
        });
        mockDownloadStoredBuffer.mockImplementation(async (path: string) =>
            path.includes("print-production.png") && productionBuffer
                ? productionBuffer
                : masterBuffer
        );
        mockUploadImmutableBuffer.mockImplementation(async (buffer: Buffer) => {
            productionBuffer = buffer;
            return {
                bucket: "washa-design-assets",
                path: "design-masters/master/revisions/revision/print-production.png",
                url: "https://cdn.example/print-production.png",
                size: buffer.byteLength,
                mimeType: "image/png",
            };
        });
    });

    it("creates an immutable revision and print derivative from the stored master checksum", async () => {
        const sb = mockGetSupabaseAdminClient();
        const result = await DesignRevisionService.approve({
            profileId: "profile_1",
            designRequestId: "11111111-1111-4111-8111-111111111111",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: sb.__master.sha256_checksum,
            placement: {
                side: "front",
                x: 0.5,
                y: 0.5,
                scale: 0.8,
                rotation: 0,
                printWidthCm: 1,
                printHeightCm: 1,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "33333333-3333-4333-8333-333333333333",
                printAreaId: "front_default",
                transformVersion: 1,
            },
            productVariant: {
                garmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                printPosition: "chest",
            },
            garmentColor: {
                colorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                colorHex: "#111111",
            },
        });

        expect(result).toMatchObject({
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: sb.__master.sha256_checksum,
            printAssetUrl: "https://cdn.example/print-production.png",
            mockupSourceType: "reference",
        });
        expect(mockUploadImmutableBuffer).toHaveBeenCalledWith(
            expect.any(Buffer),
            expect.stringContaining("/print-production.png"),
            expect.objectContaining({
                mimeType: "image/png",
                metadata: expect.objectContaining({
                    sourceMasterAssetId: "22222222-2222-4222-8222-222222222222",
                    sourceChecksum: sb.__master.sha256_checksum,
                    derivativeType: "print_production",
                }),
            })
        );
        expect(sb.__inserts.washa_design_revisions[0]).toMatchObject({
            revision_number: 2,
            master_asset_id: "22222222-2222-4222-8222-222222222222",
            master_sha256_checksum: sb.__master.sha256_checksum,
            print_asset_url: "https://cdn.example/print-production.png",
        });
        expect(sb.__requestUpdates).toHaveLength(1);
    });

    it("blocks approval when the submitted checksum differs from the stored master", async () => {
        await expect(DesignRevisionService.approve({
            profileId: "profile_1",
            designRequestId: "11111111-1111-4111-8111-111111111111",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: "b".repeat(64),
            placement: {
                side: "front",
                x: 0.5,
                y: 0.5,
                scale: 0.8,
                rotation: 0,
                printWidthCm: 1,
                printHeightCm: 1,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "33333333-3333-4333-8333-333333333333",
                printAreaId: "front_default",
                transformVersion: 1,
            },
            productVariant: {
                garmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                printPosition: "chest",
            },
            garmentColor: {
                colorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                colorHex: "#111111",
            },
        })).rejects.toThrow("checksum");
        expect(mockDownloadStoredBuffer).not.toHaveBeenCalled();
        expect(mockUploadImmutableBuffer).not.toHaveBeenCalled();
    });

    it("blocks approval when placement no longer matches the saved customer preview", async () => {
        const sb = mockGetSupabaseAdminClient();
        await expect(DesignRevisionService.approve({
            profileId: "profile_1",
            designRequestId: "11111111-1111-4111-8111-111111111111",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: sb.__master.sha256_checksum,
            placement: {
                side: "front",
                x: 0.65,
                y: 0.5,
                scale: 0.8,
                rotation: 0,
                printWidthCm: 1,
                printHeightCm: 1,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "33333333-3333-4333-8333-333333333333",
                printAreaId: "front_default",
                transformVersion: 1,
            },
            productVariant: {},
            garmentColor: {},
        })).rejects.toThrow("placement");
        expect(mockUploadImmutableBuffer).not.toHaveBeenCalled();
    });
});
