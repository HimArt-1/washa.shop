import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetSupabaseAdminClient,
    mockUploadBase64Image,
    mockGetGarmentPricingRecord,
    mockReserveSmartStoreSizeStock,
    mockReleaseSmartStoreSizeReservation,
    mockInsertOrder,
    mockApproveRevision,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockUploadBase64Image: vi.fn(),
    mockGetGarmentPricingRecord: vi.fn(),
    mockReserveSmartStoreSizeStock: vi.fn(),
    mockReleaseSmartStoreSizeReservation: vi.fn(),
    mockInsertOrder: vi.fn(),
    mockApproveRevision: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/app/api/washa-dtf-studio/services/storage.service", () => ({
    StorageService: {
        uploadBase64Image: mockUploadBase64Image,
    },
}));

vi.mock("@/app/api/washa-dtf-studio/services/design-revision.service", () => ({
    DesignRevisionService: {
        approve: mockApproveRevision,
    },
}));

vi.mock("@/lib/smart-store-core", async () => {
    const actual = await vi.importActual<typeof import("@/lib/smart-store-core")>(
        "@/lib/smart-store-core"
    );

    return {
        ...actual,
        getGarmentPricingRecord: mockGetGarmentPricingRecord,
    };
});

vi.mock("@/lib/smart-store-inventory", () => ({
    reserveSmartStoreSizeStock: mockReserveSmartStoreSizeStock,
    releaseSmartStoreSizeReservation: mockReleaseSmartStoreSizeReservation,
}));

vi.mock("@/lib/email", () => ({
    sendAdminDesignOrderNotificationEmail: vi.fn(),
}));

vi.mock("@/lib/idempotent-dispatch", () => ({
    runIdempotentDispatch: vi.fn(),
}));

vi.mock("@/lib/admin-notification-delivery", () => ({
    runRecoverableAdminWebhookDispatch: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/api-error", () => ({
    logDiagnosticWarning: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/utils/trace", () => ({
    logDtfTrace: vi.fn(),
}));

import { DtfOrderService } from "@/app/api/washa-dtf-studio/services/dtf-order.service";
import { CUSTOM_PALETTE_ID } from "@/app/api/washa-dtf-studio/validators/submit-order.schema";

describe("DtfOrderService", () => {
    beforeEach(() => {
        mockGetSupabaseAdminClient.mockReset();
        mockUploadBase64Image.mockReset();
        mockGetGarmentPricingRecord.mockReset();
        mockReserveSmartStoreSizeStock.mockReset();
        mockReleaseSmartStoreSizeReservation.mockReset();
        mockInsertOrder.mockReset();
        mockApproveRevision.mockReset();

        mockInsertOrder.mockImplementation((payload) => ({
            select: () => ({
                single: async () => ({
                    data: {
                        id: null,
                        order_number: null,
                        tracker_token: null,
                    },
                    error: null,
                    payload,
                }),
            }),
        }));
        mockGetSupabaseAdminClient.mockReturnValue({
            from: (table: string) => {
                if (table !== "custom_design_orders") {
                    throw new Error(`Unexpected table in minimal custom-palette repro: ${table}`);
                }
                return { insert: mockInsertOrder };
            },
        });
        mockUploadBase64Image.mockResolvedValue({
            url: "https://example.com/mockup.webp",
        });
        mockGetGarmentPricingRecord.mockResolvedValue({
            base_price: 79,
            price_chest_large: 0,
            price_chest_small: 0,
            price_back_large: 40,
            price_back_small: 20,
            price_shoulder_large: 15,
            price_shoulder_small: 10,
        });
        mockReserveSmartStoreSizeStock.mockResolvedValue({
            success: true,
            tracked: false,
        });
        mockReleaseSmartStoreSizeReservation.mockResolvedValue({
            success: true,
        });
        mockApproveRevision.mockResolvedValue({
            designRevisionId: "77777777-7777-4777-8777-777777777777",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterAssetUrl: "https://cdn.example/design-master.png",
            masterChecksum: "a".repeat(64),
            printAssetPath: "design-masters/master/revisions/revision/print-production.png",
            printAssetUrl: "https://cdn.example/print-production.png",
            frontPreviewUrl: "https://cdn.example/mockup-front.webp",
            backPreviewUrl: null,
            mockupSourceType: "reference",
            pipeline: "prompt_native",
        });
    });

    it("stores a custom palette description without writing its UI sentinel into the UUID column", async () => {
        const result = await DtfOrderService.prepareCartItem({
            garmentType: "تيشيرت",
            garmentColor: "أسود",
            garmentSize: "XL",
            designMethod: "text",
            style: "بوب آرت",
            technique: "رسم رقمي",
            paletteId: CUSTOM_PALETTE_ID,
            palette: "مخصص",
            customPalette: "أحمر دافئ مع أزرق داكن",
            printPosition: "back",
            printSize: "large",
            mockupDataUrl: "data:image/png;base64,AAAA",
        }, null, { traceId: "trace_custom_palette" });

        expect(result.error).toBeUndefined();
        expect(mockInsertOrder).toHaveBeenCalledOnce();
        expect(mockInsertOrder).toHaveBeenCalledWith(expect.objectContaining({
            color_package_id: null,
            color_package_name: "أحمر دافئ مع أزرق داكن",
            custom_colors: [
                {
                    name: "custom-palette",
                    prompt: "أحمر دافئ مع أزرق داكن",
                },
            ],
        }));
    });

    it("approves the immutable master revision without re-uploading a browser mockup or extracted image", async () => {
        const result = await DtfOrderService.prepareCartItem({
            garmentType: "تيشيرت",
            garmentColor: "أسود",
            garmentSize: "XL",
            designMethod: "text",
            style: "بوب آرت",
            technique: "رسم رقمي",
            paletteId: CUSTOM_PALETTE_ID,
            palette: "مخصص",
            customPalette: "أحمر دافئ مع أزرق داكن",
            printPosition: "chest",
            printSize: "large",
            designRequestId: "11111111-1111-4111-8111-111111111111",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: "a".repeat(64),
            placementData: {
                side: "front",
                x: 0.5,
                y: 0.5,
                scale: 0.8,
                rotation: 0,
                printWidthCm: 30,
                printHeightCm: 40,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "33333333-3333-4333-8333-333333333333",
                printAreaId: "front_default",
                transformVersion: 1,
            },
        }, null, {
            traceId: "trace_single_source",
            profileId: "profile_1",
        });

        expect(result.error).toBeUndefined();
        expect(mockApproveRevision).toHaveBeenCalledWith(expect.objectContaining({
            profileId: "profile_1",
            designRequestId: "11111111-1111-4111-8111-111111111111",
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            masterChecksum: "a".repeat(64),
        }));
        expect(mockUploadBase64Image).not.toHaveBeenCalled();
        expect(mockInsertOrder).toHaveBeenCalledWith(expect.objectContaining({
            dtf_mockup_url: "https://cdn.example/mockup-front.webp",
            dtf_extracted_url: "https://cdn.example/print-production.png",
            reference_image_url: "https://cdn.example/design-master.png",
            design_request_id: "11111111-1111-4111-8111-111111111111",
            design_master_asset_id: "22222222-2222-4222-8222-222222222222",
            design_revision_id: "77777777-7777-4777-8777-777777777777",
            master_checksum: "a".repeat(64),
            asset_schema_version: 1,
            production_readiness_status: "ready",
            pricing_snapshot: expect.objectContaining({
                dtf: true,
                washa_ai_version: "v3",
            }),
        }));
        expect(result.data).toMatchObject({
            masterAssetId: "22222222-2222-4222-8222-222222222222",
            designRevisionId: "77777777-7777-4777-8777-777777777777",
            masterChecksum: "a".repeat(64),
        });
    });
});
