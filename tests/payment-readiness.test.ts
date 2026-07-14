import { describe, expect, it } from "vitest";

import { getRecordedOrderPaymentMethod, resolveCheckoutPaymentMethod, resolvePaymentReadiness } from "@/lib/payment-readiness";

describe("checkout payment readiness", () => {
    it("enables bank transfer only with a complete Saudi bank configuration", () => {
        expect(resolvePaymentReadiness({
            BANK_TRANSFER_BANK_NAME: "بنك الاختبار",
            BANK_TRANSFER_ACCOUNT_NAME: "وشّى",
            BANK_TRANSFER_IBAN: "SA0380000000608010167519",
        }).bankTransfer.enabled).toBe(true);

        expect(resolvePaymentReadiness({
            BANK_TRANSFER_BANK_NAME: "بنك الاختبار",
            BANK_TRANSFER_ACCOUNT_NAME: "وشّى",
        }).bankTransfer).toMatchObject({ enabled: false, code: "not_configured" });
    });

    it("enables Tap only with both credentials and the explicit checkout switch", () => {
        expect(resolvePaymentReadiness({
            TAP_SECRET_KEY: "sk_test",
            TAP_MERCHANT_ID: "merchant",
            TAP_CHECKOUT_ENABLED: "true",
            NEXT_PUBLIC_APP_URL: "https://washa.shop",
        }).tap.enabled).toBe(true);

        expect(resolvePaymentReadiness({
            TAP_SECRET_KEY: "sk_test",
            TAP_MERCHANT_ID: "merchant",
            NEXT_PUBLIC_APP_URL: "https://washa.shop",
        }).tap).toMatchObject({ enabled: false, code: "disabled" });
    });

    it("requires a valid public callback URL before enabling Tap", () => {
        expect(resolvePaymentReadiness({
            TAP_SECRET_KEY: "sk_test",
            TAP_MERCHANT_ID: "merchant",
            TAP_CHECKOUT_ENABLED: "true",
        }).tap).toMatchObject({ enabled: false, code: "invalid_configuration" });

        expect(resolvePaymentReadiness({
            TAP_SECRET_KEY: "sk_test",
            TAP_MERCHANT_ID: "merchant",
            TAP_CHECKOUT_ENABLED: "true",
            NEXT_PUBLIC_APP_URL: "not-a-url",
        }).tap.enabled).toBe(false);

        expect(resolvePaymentReadiness({
            NODE_ENV: "production",
            TAP_SECRET_KEY: "sk_live",
            TAP_MERCHANT_ID: "merchant",
            TAP_CHECKOUT_ENABLED: "true",
            NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        }).tap.enabled).toBe(false);
    });

    it("reports checkout unavailable when neither public payment method is ready", () => {
        expect(resolvePaymentReadiness({}).checkoutEnabled).toBe(false);
    });

    it("preserves Tap as the server order payment method", () => {
        expect(resolveCheckoutPaymentMethod("tap")).toBe("tap");
        expect(resolveCheckoutPaymentMethod("bank_transfer")).toBe("bank_transfer");
        expect(resolveCheckoutPaymentMethod("pos_card", "booth")).toBe("pos_card");
        expect(resolveCheckoutPaymentMethod("pos_card", "subscriber")).toBeNull();
    });

    it("reads the trusted payment method recorded on an order", () => {
        expect(getRecordedOrderPaymentMethod({ payment_method: "tap" })).toBe("tap");
        expect(getRecordedOrderPaymentMethod({ payment_method: "bank_transfer" })).toBe("bank_transfer");
        expect(getRecordedOrderPaymentMethod(null)).toBeNull();
    });
});
