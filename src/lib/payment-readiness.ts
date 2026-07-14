export type PaymentMethodReadiness = {
    enabled: boolean;
    code: "ready" | "disabled" | "not_configured" | "invalid_configuration";
    message: string;
};

export type PaymentReadiness = {
    checkoutEnabled: boolean;
    bankTransfer: PaymentMethodReadiness;
    tap: PaymentMethodReadiness;
};

type PaymentEnvironment = Record<string, string | undefined>;

function clean(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed && !trimmed.startsWith("#") ? trimmed : undefined;
}

function validPublicAppUrl(environment: PaymentEnvironment) {
    const raw = clean(environment.NEXT_PUBLIC_APP_URL) || clean(environment.NEXT_PUBLIC_BASE_URL);
    if (!raw) return false;
    try {
        const url = new URL(raw);
        if (environment.NODE_ENV === "production") {
            return url.protocol === "https:"
                && !["localhost", "127.0.0.1", "::1"].includes(url.hostname);
        }
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

export function resolvePaymentReadiness(environment: PaymentEnvironment): PaymentReadiness {
    const bankName = clean(environment.BANK_TRANSFER_BANK_NAME);
    const accountName = clean(environment.BANK_TRANSFER_ACCOUNT_NAME);
    const iban = clean(environment.BANK_TRANSFER_IBAN)?.replace(/\s/g, "").toUpperCase();
    const bankConfigured = Boolean(bankName && accountName && iban);
    const bankIbanValid = Boolean(iban && /^SA\d{22}$/.test(iban));

    const bankTransfer: PaymentMethodReadiness = !bankConfigured
        ? {
            enabled: false,
            code: "not_configured",
            message: "التحويل البنكي غير متاح مؤقتاً لعدم اكتمال بيانات الحساب.",
        }
        : !bankIbanValid
            ? {
                enabled: false,
                code: "invalid_configuration",
                message: "التحويل البنكي متوقف مؤقتاً بسبب عدم صحة بيانات IBAN.",
            }
            : {
                enabled: true,
                code: "ready",
                message: "التحويل البنكي متاح.",
            };

    const tapCredentialsConfigured = Boolean(clean(environment.TAP_SECRET_KEY) && clean(environment.TAP_MERCHANT_ID));
    const tapCallbackConfigured = validPublicAppUrl(environment);
    const tapExplicitlyEnabled = clean(environment.TAP_CHECKOUT_ENABLED)?.toLowerCase() === "true";
    const tap: PaymentMethodReadiness = !tapCredentialsConfigured
        ? {
            enabled: false,
            code: "not_configured",
            message: "الدفع الإلكتروني عبر Tap غير مهيأ حالياً.",
        }
        : !tapCallbackConfigured
            ? {
                enabled: false,
                code: "invalid_configuration",
                message: "الدفع الإلكتروني عبر Tap متوقف حتى إعداد رابط الرجوع العام.",
            }
        : !tapExplicitlyEnabled
            ? {
                enabled: false,
                code: "disabled",
                message: "الدفع الإلكتروني عبر Tap متوقف مؤقتاً.",
            }
            : {
                enabled: true,
                code: "ready",
                message: "الدفع الإلكتروني عبر Tap متاح.",
            };

    return {
        checkoutEnabled: bankTransfer.enabled || tap.enabled,
        bankTransfer,
        tap,
    };
}

export function getPaymentReadiness() {
    return resolvePaymentReadiness(process.env);
}

export type CheckoutPaymentSelection = "bank_transfer" | "tap" | "pos_cash" | "pos_card";

export function resolveCheckoutPaymentMethod(
    selection: string,
    userRole?: string
): CheckoutPaymentSelection | null {
    if (selection === "bank_transfer" || selection === "tap") return selection;
    if ((selection === "pos_cash" || selection === "pos_card") && userRole === "booth") return selection;
    return null;
}

export function getRecordedOrderPaymentMethod(metadata: unknown) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const value = (metadata as Record<string, unknown>).payment_method;
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
