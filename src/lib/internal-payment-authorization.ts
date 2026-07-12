import "server-only";

const INTERNAL_PAYMENT_AUTHORIZATION = Symbol("washa.internal-payment-authorization");

export type InternalPaymentAuthorization = typeof INTERNAL_PAYMENT_AUTHORIZATION;

export function authorizeInternalPaymentConfirmation(): InternalPaymentAuthorization {
    return INTERNAL_PAYMENT_AUTHORIZATION;
}

export function assertInternalPaymentAuthorization(value: unknown): asserts value is InternalPaymentAuthorization {
    if (value !== INTERNAL_PAYMENT_AUTHORIZATION) {
        throw new Error("Unauthorized payment confirmation attempt");
    }
}
