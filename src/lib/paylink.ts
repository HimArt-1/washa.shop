// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Paylink Client
//  بوابة الدفع — Mada, Visa, Apple Pay, STC Pay, Tabby, Tamara
//  https://developer.paylink.sa
// ═══════════════════════════════════════════════════════════

const PAYLINK_BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://restapi.paylink.sa"
        : "https://restapi.paylink.sa"; // same for sandbox via test credentials

export const PAYLINK_API_ID = process.env.PAYLINK_API_ID;
export const PAYLINK_SECRET_KEY = process.env.PAYLINK_SECRET_KEY;
export const PAYLINK_ENABLED = !!(PAYLINK_API_ID && PAYLINK_SECRET_KEY);

/** Fetch a short-lived Bearer token from Paylink */
export async function getPaylinkToken(): Promise<string> {
    if (!PAYLINK_API_ID || !PAYLINK_SECRET_KEY) {
        throw new Error("[Paylink] بيانات الاعتماد غير معرّفة في متغيرات البيئة.");
    }

    const res = await fetch(`${PAYLINK_BASE_URL}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
            apiId: PAYLINK_API_ID,
            secretKey: PAYLINK_SECRET_KEY,
            persistToken: false,
        }),
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Paylink] فشل المصادقة: ${res.status} — ${text}`);
    }

    const json = await res.json();
    if (!json.id_token) {
        throw new Error("[Paylink] لم يتم إرجاع id_token من المصادقة.");
    }

    return json.id_token as string;
}

export interface PaylinkProduct {
    title: string;
    price: number;
    qty: number;
    description?: string;
    isDigital?: boolean;
    imageSrc?: string;
    specificVat?: number;
}

export interface CreateInvoiceOptions {
    orderNumber: string;
    amount: number;
    callBackUrl: string;
    cancelUrl?: string;
    clientName: string;
    clientEmail?: string;
    clientMobile: string;
    currency?: string;
    products: PaylinkProduct[];
    note?: string;
}

export interface PaylinkInvoiceResponse {
    transactionNo: string;
    url: string;
    mobileUrl: string;
    orderStatus: string;
    success: boolean;
    paymentErrors?: string | null;
}

/** Create a Paylink invoice and return the payment URL */
export async function createPaylinkInvoice(
    opts: CreateInvoiceOptions
): Promise<PaylinkInvoiceResponse> {
    const token = await getPaylinkToken();

    const res = await fetch(`${PAYLINK_BASE_URL}/api/addInvoice`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            orderNumber: opts.orderNumber,
            amount: opts.amount,
            callBackUrl: opts.callBackUrl,
            cancelUrl: opts.cancelUrl || opts.callBackUrl,
            clientName: opts.clientName,
            clientEmail: opts.clientEmail || "",
            clientMobile: opts.clientMobile,
            currency: opts.currency || "SAR",
            products: opts.products,
            note: opts.note || "",
            supportedCardBrands: ["mada", "visaMastercard", "amex", "tabby", "tamara", "stcpay"],
            displayPending: true,
        }),
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Paylink] فشل إنشاء الفاتورة: ${res.status} — ${text}`);
    }

    const json = await res.json();
    return json as PaylinkInvoiceResponse;
}

/** Get invoice details by transactionNo — used for verification */
export async function getPaylinkInvoice(transactionNo: string) {
    const token = await getPaylinkToken();

    const res = await fetch(`${PAYLINK_BASE_URL}/api/getInvoice/${transactionNo}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
        cache: "no-store",
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Paylink] فشل جلب الفاتورة: ${res.status} — ${text}`);
    }

    return res.json();
}
