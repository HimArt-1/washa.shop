type PaylinkGatewayRequest = {
    orderNumber?: unknown;
    clientEmail?: unknown;
    amount?: unknown;
};

export type PaylinkInvoiceLike = {
    orderStatus?: unknown;
    amount?: unknown;
    transactionNo?: unknown;
    transaction_no?: unknown;
    orderNumber?: unknown;
    gatewayOrderRequest?: PaylinkGatewayRequest | null;
};

export type PaylinkOrderSnapshot = {
    order_number: string;
    total: number | string;
    metadata?: unknown;
};

type ValidationOptions = {
    expectedTransactionNo?: string | null;
};

const MONEY_TOLERANCE = 0.01;

function normalizeText(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function normalizeMoney(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.round(value * 100) / 100;
    }

    if (typeof value === "string" && value.trim()) {
        const normalized = Number(value.replace(/,/g, "").trim());
        if (Number.isFinite(normalized)) {
            return Math.round(normalized * 100) / 100;
        }
    }

    return null;
}

export function moneyMatches(expected: unknown, actual: unknown) {
    const expectedAmount = normalizeMoney(expected);
    const actualAmount = normalizeMoney(actual);

    if (expectedAmount === null || actualAmount === null) {
        return false;
    }

    return Math.abs(expectedAmount - actualAmount) <= MONEY_TOLERANCE;
}

export function getPaylinkInvoiceOrderNumber(invoice: PaylinkInvoiceLike | null | undefined) {
    return normalizeText(invoice?.gatewayOrderRequest?.orderNumber) || normalizeText(invoice?.orderNumber);
}

export function getPaylinkInvoiceTransactionNo(invoice: PaylinkInvoiceLike | null | undefined) {
    return normalizeText(invoice?.transactionNo) || normalizeText(invoice?.transaction_no);
}

export function getPaylinkInvoiceAmount(invoice: PaylinkInvoiceLike | null | undefined) {
    return normalizeMoney(invoice?.amount) ?? normalizeMoney(invoice?.gatewayOrderRequest?.amount);
}

export function getPaylinkClientEmail(invoice: PaylinkInvoiceLike | null | undefined) {
    return normalizeText(invoice?.gatewayOrderRequest?.clientEmail);
}

export function isPaylinkInvoicePaid(invoice: PaylinkInvoiceLike | null | undefined) {
    return normalizeText(invoice?.orderStatus)?.toLowerCase() === "paid";
}

export function getStoredPaylinkTransactionNos(metadata: unknown) {
    const metadataRecord = asRecord(metadata);
    const paylink = asRecord(metadataRecord?.paylink);
    if (!paylink) return [];

    const transactionNos: string[] = [];
    const seen = new Set<string>();
    const add = (value: unknown) => {
        const transactionNo = normalizeText(value);
        if (!transactionNo || seen.has(transactionNo)) return;
        seen.add(transactionNo);
        transactionNos.push(transactionNo);
    };

    add(paylink.transactionNo);
    add(paylink.transaction_no);

    const transactions = Array.isArray(paylink.transactions)
        ? paylink.transactions
        : Array.isArray(paylink.invoices)
            ? paylink.invoices
            : [];

    for (let index = transactions.length - 1; index >= 0; index -= 1) {
        const transaction = asRecord(transactions[index]);
        if (!transaction) continue;
        add(transaction.transactionNo);
        add(transaction.transaction_no);
    }

    return transactionNos;
}

export function getStoredPaylinkTransactionNo(metadata: unknown) {
    return getStoredPaylinkTransactionNos(metadata)[0] ?? null;
}

export function assertPaylinkInvoiceMatchesOrder(
    invoice: PaylinkInvoiceLike,
    order: PaylinkOrderSnapshot,
    options: ValidationOptions = {}
): {
    ok: true;
    amount: number;
    orderNumber: string;
    clientEmail: string | null;
    transactionNo: string | null;
} | {
    ok: false;
    status: number;
    error: string;
} {
    if (!isPaylinkInvoicePaid(invoice)) {
        return {
            ok: false,
            status: 402,
            error: `حالة الدفع: ${normalizeText(invoice.orderStatus) || "غير مكتمل"}`,
        };
    }

    const invoiceOrderNumber = getPaylinkInvoiceOrderNumber(invoice);
    if (!invoiceOrderNumber || invoiceOrderNumber !== order.order_number) {
        return {
            ok: false,
            status: 409,
            error: "فاتورة Paylink لا تطابق رقم الطلب",
        };
    }

    const amount = getPaylinkInvoiceAmount(invoice);
    if (amount === null || !moneyMatches(order.total, amount)) {
        return {
            ok: false,
            status: 409,
            error: "مبلغ فاتورة Paylink لا يطابق إجمالي الطلب",
        };
    }

    const expectedTransactionNo = normalizeText(options.expectedTransactionNo);
    const invoiceTransactionNo = getPaylinkInvoiceTransactionNo(invoice);
    if (expectedTransactionNo && invoiceTransactionNo && expectedTransactionNo !== invoiceTransactionNo) {
        return {
            ok: false,
            status: 409,
            error: "رقم معاملة Paylink لا يطابق الفاتورة",
        };
    }

    const storedTransactionNos = getStoredPaylinkTransactionNos(order.metadata);
    const effectiveTransactionNo = invoiceTransactionNo || expectedTransactionNo;
    if (
        storedTransactionNos.length > 0 &&
        effectiveTransactionNo &&
        !storedTransactionNos.includes(effectiveTransactionNo)
    ) {
        return {
            ok: false,
            status: 409,
            error: "رقم معاملة Paylink لا يطابق الطلب المسجل",
        };
    }

    return {
        ok: true,
        amount,
        orderNumber: invoiceOrderNumber,
        clientEmail: getPaylinkClientEmail(invoice),
        transactionNo: effectiveTransactionNo,
    };
}
