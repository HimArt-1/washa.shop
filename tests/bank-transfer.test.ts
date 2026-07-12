import { describe, expect, it } from "vitest";
import { buildBankTransferWhatsAppUrl, WASHA_WHATSAPP_NUMBER } from "@/lib/bank-transfer";

describe("bank transfer WhatsApp confirmation", () => {
    it("builds a WhatsApp message with order and receipt instructions", () => {
        const url = new URL(buildBankTransferWhatsAppUrl({
            orderNumber: "WSH-20260712-1001",
            total: 313,
            customerName: "عميل وشّى",
            customerPhone: "0500000000",
            items: [{ title: "قميص فني", quantity: 2, size: "L" }],
        }));

        expect(url.hostname).toBe("wa.me");
        expect(url.pathname).toBe(`/${WASHA_WHATSAPP_NUMBER}`);
        expect(url.searchParams.get("text")).toContain("WSH-20260712-1001");
        expect(url.searchParams.get("text")).toContain("٣١٣٫٠٠");
        expect(url.searchParams.get("text")).toContain("قميص فني × 2");
        expect(url.searchParams.get("text")).toContain("سأرفق إيصال التحويل");
    });
});
