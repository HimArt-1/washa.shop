import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetSupabaseAdminClient,
    mockUploadBase64Image,
    mockGetGarmentPricingRecord,
    mockReserveSmartStoreSizeStock,
    mockReleaseSmartStoreSizeReservation,
    mockInsertOrder,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockUploadBase64Image: vi.fn(),
    mockGetGarmentPricingRecord: vi.fn(),
    mockReserveSmartStoreSizeStock: vi.fn(),
    mockReleaseSmartStoreSizeReservation: vi.fn(),
    mockInsertOrder: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/app/api/washa-dtf-studio/services/storage.service", () => ({
    StorageService: {
        uploadBase64Image: mockUploadBase64Image,
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
});
