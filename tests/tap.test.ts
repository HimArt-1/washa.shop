import { describe, expect, it } from "vitest";
import { assertTapChargeMatchesOrder, buildTapWebhookHash, normalizeTapPhone } from "@/lib/tap";

const charge = {
    id: "chg_TEST123",
    status: "CAPTURED",
    amount: 125.5,
    currency: "SAR",
    metadata: { udf1: "order-id", udf2: "WSH-100" },
    reference: { order: "WSH-100", gateway: "gw-1", payment: "pay-1" },
    transaction: { created: "1698392202943" },
};

describe("Tap payment security", () => {
    it("normalizes Saudi phone numbers", () => {
        expect(normalizeTapPhone("+966 50 123 4567")).toEqual({ country_code: "966", number: "501234567" });
        expect(normalizeTapPhone("0501234567")).toEqual({ country_code: "966", number: "501234567" });
    });

    it("accepts only a captured matching SAR charge", () => {
        expect(assertTapChargeMatchesOrder(charge, { id: "order-id", order_number: "WSH-100", total: 125.5 })).toMatchObject({ ok: true });
        expect(assertTapChargeMatchesOrder({ ...charge, amount: 1 }, { id: "order-id", order_number: "WSH-100", total: 125.5 })).toMatchObject({ ok: false });
        expect(assertTapChargeMatchesOrder({ ...charge, status: "FAILED" }, { id: "order-id", order_number: "WSH-100", total: 125.5 })).toMatchObject({ ok: false, error: "فشلت عملية الدفع في Tap. جرّب وسيلة دفع أخرى." });
        expect(assertTapChargeMatchesOrder({ ...charge, status: "CANCELLED" }, { id: "order-id", order_number: "WSH-100", total: 125.5 })).toMatchObject({ ok: false, error: "تم إلغاء عملية الدفع في Tap قبل اكتمالها." });
    });

    it("builds the documented HMAC SHA-256 hash deterministically", () => {
        expect(buildTapWebhookHash(charge, "sk_test_example")).toBe("53a919c3af22cefff991ea63f5c107835df5dc722f3ca33d61aa35e965f37d0b");
    });
});
