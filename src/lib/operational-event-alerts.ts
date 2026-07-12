import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import type { AdminNotificationCategory, AdminNotificationSeverity } from "@/types/database";

const EVENT_BUCKET_MS = 2 * 60 * 1000;
const ISSUE_BUCKET_MS = 15 * 60 * 1000;

function formatCurrency(value: number | null | undefined) {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;
}

function trimText(value: unknown, fallback = "غير محدد") {
    const text = String(value ?? "").trim().replace(/\s+/g, " ");
    return text || fallback;
}

function paymentProviderLabel(provider?: string | null) {
    switch ((provider || "").toLowerCase()) {
        case "stripe":
            return "Stripe";
        case "paylink":
            return "Paylink";
        case "tap":
            return "Tap";
        case "pos_cash":
            return "نقطة بيع كاش";
        case "pos_card":
            return "نقطة بيع شبكة";
        case "cod":
            return "الدفع عند الاستلام";
        default:
            return trimText(provider, "غير محدد");
    }
}

function severityForPriority(priority?: string | null): AdminNotificationSeverity {
    return priority === "high" ? "critical" : "warning";
}

async function emitLiveEvent(params: {
    dispatchKey: string;
    category: AdminNotificationCategory;
    severity: AdminNotificationSeverity;
    title: string;
    message: string;
    source: string;
    link: string;
    resourceType: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
    bucketMs?: number;
}) {
    await reportAdminOperationalAlert({
        ...params,
        bucketMs: params.bucketMs ?? EVENT_BUCKET_MS,
    });
}

export async function emitOrderCreatedAlert(params: {
    orderId: string;
    orderNumber: string;
    total: number;
    paymentLabel: string;
    customerName?: string | null;
}) {
    await emitLiveEvent({
        dispatchKey: `order:${params.orderId}:event:created`,
        category: "orders",
        severity: "info",
        title: "طلب جديد",
        message: `طلب #${params.orderNumber} بقيمة ${formatCurrency(params.total)}. طريقة الدفع: ${trimText(params.paymentLabel)}.`,
        source: "orders.event.created",
        link: "/dashboard/orders/command-center",
        resourceType: "order",
        resourceId: params.orderId,
        metadata: {
            order_id: params.orderId,
            order_number: params.orderNumber,
            total: params.total,
            payment_label: params.paymentLabel,
            customer_name: params.customerName ?? null,
        },
    });
}

export async function emitPaymentInvoiceCreatedAlert(params: {
    orderId: string;
    orderNumber: string;
    amount: number;
    provider: string;
    transactionNo?: string | null;
    customerName?: string | null;
}) {
    await emitLiveEvent({
        dispatchKey: `payment_invoice:${params.provider}:${params.transactionNo || params.orderId}:created`,
        category: "payments",
        severity: "info",
        title: "إنشاء طلب دفع",
        message: `تم إنشاء رابط دفع ${paymentProviderLabel(params.provider)} للطلب #${params.orderNumber} بقيمة ${formatCurrency(params.amount)}.`,
        source: "payments.event.invoice_created",
        link: "/dashboard/analytics",
        resourceType: "payment_invoice",
        resourceId: params.transactionNo || params.orderId,
        metadata: {
            order_id: params.orderId,
            order_number: params.orderNumber,
            amount: params.amount,
            provider: params.provider,
            transaction_no: params.transactionNo ?? null,
            customer_name: params.customerName ?? null,
        },
    });
}

export async function emitPaymentReceivedAlert(params: {
    orderId: string;
    orderNumber: string;
    total: number;
    provider?: string | null;
    webhookEventId?: string | null;
}) {
    await emitLiveEvent({
        dispatchKey: `order:${params.orderId}:event:payment_received`,
        category: "payments",
        severity: "info",
        title: "تم استلام الدفع",
        message: `تم تأكيد دفع الطلب #${params.orderNumber} بقيمة ${formatCurrency(params.total)} عبر ${paymentProviderLabel(params.provider)}.`,
        source: "payments.event.received",
        link: "/dashboard/orders/command-center",
        resourceType: "order",
        resourceId: params.orderId,
        metadata: {
            order_id: params.orderId,
            order_number: params.orderNumber,
            total: params.total,
            provider: params.provider ?? null,
            webhook_event_id: params.webhookEventId ?? null,
        },
    });
}

export async function emitPaymentCollectionIssueAlert(params: {
    dispatchKey: string;
    title?: string;
    orderId?: string | null;
    orderNumber?: string | null;
    amount?: number | null;
    provider: string;
    reason: string;
    severity?: AdminNotificationSeverity;
    metadata?: Record<string, unknown>;
}) {
    const reference = params.orderNumber ? `للطلب #${params.orderNumber}` : "لطلب غير محدد";
    const amountPart = typeof params.amount === "number" ? ` بقيمة ${formatCurrency(params.amount)}` : "";

    await emitLiveEvent({
        dispatchKey: params.dispatchKey,
        category: "payments",
        severity: params.severity ?? "warning",
        title: params.title ?? "تعثر تحصيل يحتاج متابعة",
        message: `تعثر تحصيل ${paymentProviderLabel(params.provider)} ${reference}${amountPart}. السبب: ${trimText(params.reason)}.`,
        source: "payments.event.collection_issue",
        link: "/dashboard/analytics",
        resourceType: "order",
        resourceId: params.orderId ?? null,
        bucketMs: ISSUE_BUCKET_MS,
        metadata: {
            order_id: params.orderId ?? null,
            order_number: params.orderNumber ?? null,
            amount: params.amount ?? null,
            provider: params.provider,
            reason: params.reason,
            ...(params.metadata || {}),
        },
    });
}

export async function emitShippingEventAlert(params: {
    orderId: string;
    orderNumber?: string | null;
    status: string;
    trackingNumber?: string | null;
    courierName?: string | null;
    torodOrderId?: string | null;
    message?: string;
    severity?: AdminNotificationSeverity;
    source?: string;
    metadata?: Record<string, unknown>;
}) {
    const status = trimText(params.status);
    const title = params.severity === "critical" || params.severity === "warning"
        ? "تنبيه شحن يحتاج متابعة"
        : "تحديث شحنة";

    await emitLiveEvent({
        dispatchKey: `shipping:${params.orderId}:${status}:event`,
        category: "orders",
        severity: params.severity ?? "info",
        title,
        message: params.message ?? `تحديث شحنة الطلب ${params.orderNumber ? `#${params.orderNumber}` : params.orderId}: ${status}.`,
        source: params.source ?? "shipping.event.status",
        link: "/dashboard/shipping",
        resourceType: "order",
        resourceId: params.orderId,
        metadata: {
            order_id: params.orderId,
            order_number: params.orderNumber ?? null,
            shipping_status: status,
            tracking_number: params.trackingNumber ?? null,
            courier_name: params.courierName ?? null,
            torod_order_id: params.torodOrderId ?? null,
            ...(params.metadata || {}),
        },
    });
}

export async function emitSupportTicketCreatedAlert(params: {
    ticketId: string;
    subject: string;
    priority: string;
    customerName?: string | null;
    customerEmail?: string | null;
}) {
    await emitLiveEvent({
        dispatchKey: `support_ticket:${params.ticketId}:event:created`,
        category: "support",
        severity: severityForPriority(params.priority),
        title: "تذكرة دعم جديدة",
        message: `تذكرة دعم جديدة: ${trimText(params.subject)}. الأولوية: ${trimText(params.priority)}.`,
        source: "support.event.ticket_created",
        link: `/dashboard/support/${params.ticketId}`,
        resourceType: "support_ticket",
        resourceId: params.ticketId,
        metadata: {
            ticket_id: params.ticketId,
            subject: params.subject,
            priority: params.priority,
            customer_name: params.customerName ?? null,
            customer_email: params.customerEmail ?? null,
        },
    });
}

export async function emitInventoryStockAlert(params: {
    dispatchKey: string;
    title: string;
    productTitle?: string | null;
    sku?: string | null;
    size?: string | null;
    quantity: number;
    threshold?: number;
    severity?: AdminNotificationSeverity;
    metadata?: Record<string, unknown>;
}) {
    const product = trimText(params.productTitle, "منتج غير محدد");
    const skuPart = params.sku ? `، SKU: ${params.sku}` : "";
    const sizePart = params.size ? `، المقاس: ${params.size}` : "";

    await emitLiveEvent({
        dispatchKey: params.dispatchKey,
        category: "system",
        severity: params.severity ?? (params.quantity <= 0 ? "critical" : "warning"),
        title: params.title,
        message: `${product}${skuPart}${sizePart}. الكمية المتبقية: ${params.quantity}.`,
        source: "inventory.event.stock",
        link: "/dashboard/products-inventory",
        resourceType: "inventory_level",
        resourceId: params.sku ?? product,
        bucketMs: ISSUE_BUCKET_MS,
        metadata: {
            product_title: params.productTitle ?? null,
            sku: params.sku ?? null,
            size: params.size ?? null,
            quantity: params.quantity,
            threshold: params.threshold ?? 5,
            ...(params.metadata || {}),
        },
    });
}
