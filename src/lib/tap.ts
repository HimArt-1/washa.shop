import { createHmac, timingSafeEqual } from "node:crypto";

const TAP_API_URL = "https://api.tap.company/v2";
const secretKey = process.env.TAP_SECRET_KEY?.trim();
const merchantId = process.env.TAP_MERCHANT_ID?.trim();

export const TAP_ENABLED = Boolean(secretKey && merchantId);

export type TapCharge = {
    id: string;
    object?: string;
    status: string;
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, unknown>;
    transaction?: { url?: string; created?: string };
    reference?: { order?: string; gateway?: string; payment?: string };
    customer?: {
        id?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: { country_code?: string; number?: string };
    };
    response?: { code?: string; message?: string };
};

export type CreateTapChargeInput = {
    amount: number;
    orderId: string;
    orderNumber: string;
    customer: {
        name: string;
        email?: string | null;
        phone: string;
    };
    redirectUrl: string;
    postUrl: string;
};

function tapHeaders() {
    if (!secretKey) throw new Error("TAP_SECRET_KEY is not configured");
    return {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "lang_code": "ar",
    };
}

function splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
        first_name: parts[0] || "عميل",
        last_name: parts.slice(1).join(" ") || "وشّى",
    };
}

export function normalizeTapPhone(phone: string) {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("00966")) return { country_code: "966", number: digits.slice(5) };
    if (digits.startsWith("966")) return { country_code: "966", number: digits.slice(3) };
    if (digits.startsWith("0")) return { country_code: "966", number: digits.slice(1) };
    return { country_code: "966", number: digits };
}

async function tapRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${TAP_API_URL}${path}`, {
        ...init,
        headers: { ...tapHeaders(), ...init?.headers },
        cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as (T & { errors?: Array<{ description?: string }>; message?: string }) | null;
    if (!response.ok || !payload) {
        const message = payload?.errors?.[0]?.description || payload?.message || `Tap API error (${response.status})`;
        throw new Error(message);
    }
    return payload;
}

export async function createTapCharge(input: CreateTapChargeInput) {
    if (!merchantId) throw new Error("TAP_MERCHANT_ID is not configured");
    const amount = Math.round(input.amount * 100) / 100;
    const phone = normalizeTapPhone(input.customer.phone);

    return tapRequest<TapCharge>("/charges/", {
        method: "POST",
        body: JSON.stringify({
            amount,
            currency: "SAR",
            customer_initiated: true,
            threeDSecure: true,
            save_card: false,
            description: `طلب وشّى #${input.orderNumber}`,
            metadata: {
                udf1: input.orderId,
                udf2: input.orderNumber,
                udf3: "store_order",
            },
            reference: {
                transaction: input.orderId,
                order: input.orderNumber,
                // Tap reuses the same response for this value for 24 hours,
                // preventing double-clicks and network retries from charging twice.
                idempotent: `store-${input.orderId}`,
            },
            customer: {
                ...splitName(input.customer.name),
                ...(input.customer.email ? { email: input.customer.email } : {}),
                phone,
            },
            merchant: { id: merchantId },
            source: { id: "src_all" },
            redirect: { url: input.redirectUrl },
            post: { url: input.postUrl },
        }),
    });
}

export function retrieveTapCharge(chargeId: string) {
    if (!/^chg_[A-Za-z0-9]+$/.test(chargeId)) throw new Error("Invalid Tap charge ID");
    return tapRequest<TapCharge>(`/charges/${encodeURIComponent(chargeId)}`);
}

export function moneyMatches(left: unknown, right: unknown) {
    const a = Number(left);
    const b = Number(right);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 0.01;
}

export function getTapOrderId(charge: TapCharge) {
    const value = charge.metadata?.udf1;
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getTapOrderNumber(charge: TapCharge) {
    const metadataValue = charge.metadata?.udf2;
    if (typeof metadataValue === "string" && metadataValue.trim()) return metadataValue.trim();
    return charge.reference?.order?.trim() || null;
}

export function assertTapChargeMatchesOrder(
    charge: TapCharge,
    order: { id: string; order_number: string; total: unknown },
) {
    if (charge.status !== "CAPTURED") return { ok: false as const, status: 409, error: "عملية الدفع لم تكتمل بنجاح" };
    if (charge.currency !== "SAR") return { ok: false as const, status: 409, error: "عملة عملية الدفع غير مطابقة" };
    if (!moneyMatches(charge.amount, order.total)) return { ok: false as const, status: 409, error: "مبلغ عملية الدفع غير مطابق للطلب" };
    if (getTapOrderId(charge) !== order.id) return { ok: false as const, status: 409, error: "عملية الدفع لا تخص هذا الطلب" };
    if (getTapOrderNumber(charge) !== order.order_number) return { ok: false as const, status: 409, error: "رقم الطلب في عملية الدفع غير مطابق" };
    return { ok: true as const, amount: Number(charge.amount), customerEmail: charge.customer?.email || null };
}

export function buildTapWebhookHash(charge: TapCharge, key = secretKey) {
    if (!key) throw new Error("TAP_SECRET_KEY is not configured");
    const amount = Number(charge.amount).toFixed(charge.currency === "SAR" ? 2 : 3);
    const value = [
        "x_id", charge.id,
        "x_amount", amount,
        "x_currency", charge.currency,
        "x_gateway_reference", charge.reference?.gateway || "",
        "x_payment_reference", charge.reference?.payment || "",
        "x_status", charge.status,
        "x_created", charge.transaction?.created || "",
    ].join("");
    return createHmac("sha256", key).update(value).digest("hex");
}

export function verifyTapWebhookHash(charge: TapCharge, receivedHash: string | null) {
    if (!receivedHash || !/^[a-fA-F0-9]{64}$/.test(receivedHash)) return false;
    const expected = buildTapWebhookHash(charge);
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(receivedHash, "hex"));
}
