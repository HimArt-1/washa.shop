import { describe, expect, it } from "vitest";

import {
    assertInternalPaymentAuthorization,
    authorizeInternalPaymentConfirmation,
} from "@/lib/internal-payment-authorization";

describe("internal payment confirmation authorization", () => {
    it("accepts only the module-owned authorization capability", () => {
        expect(() => assertInternalPaymentAuthorization(authorizeInternalPaymentConfirmation())).not.toThrow();
        expect(() => assertInternalPaymentAuthorization(Symbol("forged"))).toThrow(
            "Unauthorized payment confirmation attempt"
        );
        expect(() => assertInternalPaymentAuthorization(undefined)).toThrow();
    });
});
