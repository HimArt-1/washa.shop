import type { ShippingAddress } from "@/types/database";

export type ShippingLifecycle =
    | "ready_to_book"
    | "pending_torod"
    | "in_transit"
    | "delivered"
    | "exception"
    | "blocked";

export type ShippingIssueSeverity = "info" | "warning" | "critical";

export type ShippingIssue = {
    code:
        | "missing_address"
        | "missing_phone"
        | "pending_torod"
        | "torod_exception"
        | "missing_waybill"
        | "cod_pending"
        | "shipping_api_error";
    label: string;
    severity: ShippingIssueSeverity;
};

export type ShippingHistoryEntry = {
    status: string;
    timestamp: string;
    description?: string;
    description_ar?: string;
    source?: string;
    raw_payload?: Record<string, unknown>;
};

export type ShippingOpsInput = {
    status?: string | null;
    payment_status?: string | null;
    tracking_number?: string | null;
    waybill_url?: string | null;
    torod_order_id?: string | null;
    torod_last_status?: string | null;
    shipping_address?: Partial<ShippingAddress> | null;
    metadata?: Record<string, unknown> | null;
};

const TOROD_EXCEPTION_STATUSES = new Set([
    "failed",
    "rto",
    "damage",
    "damaged",
    "lost",
    "cancelled",
    "booking_failed",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function text(value: unknown) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return undefined;
}

export function normalizeTorodStatus(status?: string | null) {
    return status?.trim().toLowerCase().replace(/\s+/g, "_") || "";
}

export function isTorodExceptionStatus(status?: string | null) {
    return TOROD_EXCEPTION_STATUSES.has(normalizeTorodStatus(status));
}

export function getShippingHistory(metadata?: Record<string, unknown> | null): ShippingHistoryEntry[] {
    const rawHistory = Array.isArray(metadata?.shipping_history) ? metadata.shipping_history : [];

    return rawHistory
        .map((entry) => {
            const record = asRecord(entry);
            if (!record) return null;

            const rawPayload = asRecord(record.raw_payload);
            const status = text(record.status) || text(rawPayload?.status);
            const timestamp = text(record.timestamp) || text(rawPayload?.date_time) || text(rawPayload?.dateTime);

            if (!status || !timestamp) return null;

            return {
                status,
                timestamp,
                description: text(record.description) || text(rawPayload?.description) || text(rawPayload?.torod_description),
                description_ar: text(record.description_ar) || text(rawPayload?.torod_description_ar),
                source: text(record.source),
                raw_payload: rawPayload ?? undefined,
            } satisfies ShippingHistoryEntry;
        })
        .filter(Boolean) as ShippingHistoryEntry[];
}

export function getLatestShippingHistory(metadata?: Record<string, unknown> | null) {
    const history = getShippingHistory(metadata);
    return history.length > 0 ? history[history.length - 1] : null;
}

export function hasCompleteShippingAddress(address?: Partial<ShippingAddress> | null) {
    return Boolean(address?.line1?.trim() && address?.city?.trim() && address?.phone?.trim());
}

export function getShippingIssues(order: ShippingOpsInput): ShippingIssue[] {
    const issues: ShippingIssue[] = [];
    const latestEvent = getLatestShippingHistory(order.metadata);
    const torodStatus = order.torod_last_status || latestEvent?.status;
    const metadata = order.metadata ?? {};

    if (!order.shipping_address?.line1?.trim() || !order.shipping_address?.city?.trim()) {
        issues.push({
            code: "missing_address",
            label: "العنوان غير مكتمل",
            severity: "critical",
        });
    }

    if (!order.shipping_address?.phone?.trim()) {
        issues.push({
            code: "missing_phone",
            label: "رقم الجوال مفقود",
            severity: "critical",
        });
    }

    if (order.torod_order_id && !order.tracking_number) {
        issues.push({
            code: "pending_torod",
            label: "طلب طرود قائم بدون رقم تتبع",
            severity: "warning",
        });
    }

    if (isTorodExceptionStatus(torodStatus)) {
        issues.push({
            code: "torod_exception",
            label: torodStatus ? `استثناء طرود: ${torodStatus}` : "استثناء في الشحن",
            severity: "critical",
        });
    }

    if (order.tracking_number && !order.waybill_url) {
        issues.push({
            code: "missing_waybill",
            label: "رقم تتبع بدون بوليصة",
            severity: "warning",
        });
    }

    if (order.payment_status === "pending" && (order.status === "processing" || order.status === "shipped")) {
        issues.push({
            code: "cod_pending",
            label: "تحصيل COD مطلوب",
            severity: "info",
        });
    }

    if (asRecord(metadata.shipping_last_error)) {
        issues.push({
            code: "shipping_api_error",
            label: "آخر محاولة شحن فشلت",
            severity: "warning",
        });
    }

    return issues;
}

export function deriveShippingLifecycle(order: ShippingOpsInput): ShippingLifecycle {
    const latestEvent = getLatestShippingHistory(order.metadata);
    const torodStatus = order.torod_last_status || latestEvent?.status;

    if (order.status === "delivered") return "delivered";
    if (isTorodExceptionStatus(torodStatus)) return "exception";
    if (!hasCompleteShippingAddress(order.shipping_address) && order.status === "processing") return "blocked";
    if (order.torod_order_id && !order.tracking_number) return "pending_torod";
    if (order.tracking_number || order.status === "shipped") return "in_transit";
    if (order.status === "processing") return "ready_to_book";

    return "blocked";
}
