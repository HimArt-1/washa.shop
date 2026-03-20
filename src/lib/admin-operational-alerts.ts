import { createClient } from "@supabase/supabase-js";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";
import type {
    AdminNotificationCategory,
    AdminNotificationSeverity,
    AdminNotificationType,
} from "@/types/database";

type OpsLogType = "error" | "warning" | "info" | "security";

const MAX_DISPATCH_KEY_LENGTH = 240;
const MAX_TITLE_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 500;
const MAX_SOURCE_LENGTH = 200;
const MAX_LINK_LENGTH = 512;
const MAX_STACK_LENGTH = 5000;

function getOpsAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        return null;
    }

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function normalizeText(value: string, maxLength: number) {
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeLink(value?: string | null) {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_LINK_LENGTH) return null;
    if (!normalized.startsWith("/") || normalized.startsWith("//")) return null;
    return normalized;
}

function deriveLogType(
    category: AdminNotificationCategory,
    severity: AdminNotificationSeverity
): OpsLogType {
    if (category === "security") return "security";
    if (severity === "critical") return "error";
    if (severity === "warning") return "warning";
    return "info";
}

function deriveNotificationType(category: AdminNotificationCategory): AdminNotificationType {
    switch (category) {
        case "orders":
        case "payments":
        case "design":
            return "order_alert";
        case "support":
        case "security":
        case "applications":
        case "system":
        default:
            return "system_alert";
    }
}

function buildDispatchKey(baseKey: string, bucketMs?: number) {
    const normalized = normalizeText(baseKey, MAX_DISPATCH_KEY_LENGTH);
    if (!normalized) {
        throw new Error("dispatchKey is required");
    }

    if (!bucketMs || bucketMs <= 0) {
        return normalized;
    }

    const bucket = Math.floor(Date.now() / bucketMs);
    return `${normalized}:${bucket}`.slice(0, MAX_DISPATCH_KEY_LENGTH);
}

export async function reportAdminOperationalAlert(params: {
    dispatchKey: string;
    title: string;
    message: string;
    category: AdminNotificationCategory;
    severity: AdminNotificationSeverity;
    type?: AdminNotificationType;
    link?: string | null;
    source?: string;
    metadata?: Record<string, unknown>;
    stack?: string | null;
    logType?: OpsLogType;
    resourceType?: string;
    resourceId?: string | null;
    bucketMs?: number;
}) {
    const supabase = getOpsAdminClient();
    if (!supabase) return;

    const title = normalizeText(params.title, MAX_TITLE_LENGTH);
    const message = normalizeText(params.message, MAX_MESSAGE_LENGTH);
    if (!title || !message) return;

    const source = params.source
        ? normalizeText(params.source, MAX_SOURCE_LENGTH)
        : "admin.operational_alert";
    const link = normalizeLink(params.link);
    const type = params.type ?? deriveNotificationType(params.category);
    const logType = params.logType ?? deriveLogType(params.category, params.severity);
    const metadata =
        params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
            ? params.metadata
            : {};

    try {
        await supabase.from("system_logs").insert({
            type: logType,
            source,
            message,
            stack: params.stack ? String(params.stack).slice(0, MAX_STACK_LENGTH) : null,
            metadata,
            user_id: null,
        });
    } catch (error) {
        console.error("[admin-operational-alerts.log]", error);
    }

    try {
        const notificationDispatchKey = buildDispatchKey(params.dispatchKey, params.bucketMs);

        await runIdempotentDispatch(
            {
                dispatchKey: notificationDispatchKey,
                eventType: `admin_alert_${params.category}_${params.severity}`,
                channel: "admin_notification",
                resourceType: params.resourceType ?? params.category,
                resourceId: params.resourceId ?? null,
                metadata,
            },
            async () => {
                const { error } = await supabase.from("admin_notifications").insert({
                    type,
                    category: params.category,
                    severity: params.severity,
                    title,
                    message,
                    link,
                    metadata,
                });

                if (error) {
                    throw new Error(error.message);
                }
            }
        );

        if (params.severity === "critical") {
            await runIdempotentDispatch(
                {
                    dispatchKey: `${notificationDispatchKey}:push`,
                    eventType: `admin_alert_push_${params.category}_${params.severity}`,
                    channel: "push",
                    resourceType: params.resourceType ?? params.category,
                    resourceId: params.resourceId ?? null,
                    metadata: {
                        ...metadata,
                        escalation: "admin_push",
                    },
                },
                async () => {
                    const { sendPushToAdmins } = await import("@/lib/push");
                    await sendPushToAdmins(
                        title,
                        message,
                        link ?? "/dashboard/notifications"
                    );
                }
            );
        }
    } catch (error) {
        console.error("[admin-operational-alerts.notification]", error);
    }
}
