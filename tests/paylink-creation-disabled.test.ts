import { afterEach, describe, expect, it, vi } from "vitest";

describe("legacy Paylink creation guard", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        vi.resetModules();
    });

    it("rejects before making a network request when legacy creation is disabled", async () => {
        vi.stubEnv("LEGACY_PAYMENT_CREATION_ENABLED", "false");
        vi.stubEnv("PAYLINK_API_ID", "test-id");
        vi.stubEnv("PAYLINK_SECRET_KEY", "test-secret");
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const { createPaylinkInvoice } = await import("@/lib/paylink");

        await expect(createPaylinkInvoice({
            orderNumber: "FUL-TEST",
            amount: 10,
            callBackUrl: "https://example.com/return",
            clientName: "Wusha Operations",
            clientMobile: "0500000000",
            products: [{ title: "Test", price: 10, qty: 1 }],
        })).rejects.toThrow("إنشاء مدفوعات جديدة متوقف");

        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
