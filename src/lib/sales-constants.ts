export type PaymentMethod = "cash" | "card" | "mada" | "apple_pay" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "نقداً",
    card: "بطاقة ائتمان",
    mada: "مدى",
    apple_pay: "Apple Pay",
    other: "أخرى",
};
