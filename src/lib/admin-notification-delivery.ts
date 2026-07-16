import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
    DispatchDeliveryError,
    DispatchPersistenceError,
    runIdempotentDispatch,
} from "@/lib/idempotent-dispatch";
import {
    getConfiguredAdminNotificationChannels,
    sendAdminNotificationChannel,
    type AdminNotificationChannel,
} from "@/lib/notifications";

const RECOVERY_STALE_MS = 10 * 60 * 1000;
const RECOVERY_BASE_DELAY_MS = 5 * 60 * 1000;
const RECOVERY_MAX_ATTEMPTS = 5;
const MAX_DISPATCH_KEY_LENGTH = 240;

type RecoverableDispatchOptions = {
    dispatchKey: string;
    eventType: string;
    resourceType?: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
};

function getDeliveryAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Admin notification recovery is not configured");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function buildChannelDispatchKey(baseKey: string, channel: AdminNotificationChannel) {
    const fullKey = `${baseKey}:${channel}`;
    const hash = createHash("sha256").update(fullKey).digest("hex").slice(0, 12);
    const suffix = `:${channel}:${hash}`;
    return `${baseKey.slice(0, MAX_DISPATCH_KEY_LENGTH - suffix.length)}${suffix}`;
}

export async function runRecoverableAdminWebhookDispatch(
    options: RecoverableDispatchOptions,
    message: string
) {
    const channels = getConfiguredAdminNotificationChannels();
    const attempts = await Promise.all(channels.map(async (channel) => {
        let channelResult: Awaited<ReturnType<typeof sendAdminNotificationChannel>> | null = null;
        try {
            const dispatch = await runIdempotentDispatch(
                {
                    ...options,
                    dispatchKey: buildChannelDispatchKey(options.dispatchKey, channel),
                    channel: `webhook_admin:${channel}`,
                    metadata: {
                        ...(options.metadata || {}),
                        delivery_channel: channel,
                        delivery_message: message,
                    },
                },
                async () => {
                    channelResult = await sendAdminNotificationChannel(channel, message);
                    if (!channelResult.ok) {
                        throw new DispatchDeliveryError(
                            `${channel} admin notification failed${channelResult.status ? ` (${channelResult.status})` : ""}`
                        );
                    }
                }
            );
            return {
                dispatch,
                channelResult: channelResult || { channel, ok: true },
            };
        } catch (error) {
            if (error instanceof DispatchPersistenceError && error.stage === "claim") {
                channelResult = await sendAdminNotificationChannel(channel, message);
                return {
                    dispatch: null,
                    channelResult,
                };
            }
            if (!(error instanceof DispatchDeliveryError)) throw error;
            return {
                dispatch: null,
                channelResult: channelResult || {
                    channel,
                    ok: false,
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }));

    return {
        dispatches: attempts.flatMap((attempt) => attempt.dispatch ? [attempt.dispatch] : []),
        channelResults: attempts.map((attempt) => attempt.channelResult),
    };
}

export async function runRecoverableAdminPushDispatch(
    options: RecoverableDispatchOptions,
    payload: { title: string; body: string; url?: string },
    targetEndpoints?: string[]
) {
    const dispatchOptions = {
        ...options,
        channel: "push_admin",
        metadata: {
            ...(options.metadata || {}),
            delivery_title: payload.title,
            delivery_body: payload.body,
            delivery_url: payload.url || null,
            ...(targetEndpoints?.length ? { failed_endpoints: targetEndpoints } : {}),
        },
    };
    const deliver = async () => {
        const { sendPushToAdmins } = await import("@/lib/push");
        const delivery = await sendPushToAdmins(
            payload.title,
            payload.body,
            payload.url,
            targetEndpoints
        );
        if (delivery.failed > 0) {
            throw new DispatchDeliveryError(
                `Admin push delivery failed for ${delivery.failed} subscription(s)`,
                { failed_endpoints: delivery.failedEndpoints || targetEndpoints || [] }
            );
        }
    };

    try {
        return await runIdempotentDispatch(
            dispatchOptions,
            deliver
        );
    } catch (error) {
        if (error instanceof DispatchPersistenceError && error.stage === "claim") {
            await deliver();
            return {
                success: true as const,
                skipped: false as const,
                fallback: "direct_after_dispatch_persistence_failure" as const,
            };
        }
        throw error;
    }
}

type RecoverableAdminDispatch = {
    id: string;
    dispatch_key: string;
    event_type: string;
    channel: string;
    resource_type: string | null;
    resource_id: string | null;
    status: "failed" | "processing";
    attempt_count: number;
    updated_at: string;
    metadata: Record<string, unknown> | null;
};

function isReadyForRecovery(dispatch: RecoverableAdminDispatch, now: number) {
    const metadata = dispatch.metadata || {};
    if (metadata.recovery_terminal === true) return false;
    const updatedAt = new Date(dispatch.updated_at).getTime();
    const ageMs = Number.isFinite(updatedAt) ? now - updatedAt : Number.POSITIVE_INFINITY;
    if (dispatch.status === "processing") return ageMs >= RECOVERY_STALE_MS;
    const attemptCount = Math.max(1, Number(dispatch.attempt_count) || 1);
    if (attemptCount >= RECOVERY_MAX_ATTEMPTS) return true;
    return ageMs >= RECOVERY_BASE_DELAY_MS * (2 ** Math.max(0, attemptCount - 1));
}

export async function recoverFailedAdminNotificationDeliveries(limit = 50) {
    const supabase = getDeliveryAdminClient();
    const normalizedLimit = Number.isFinite(limit) ? Math.floor(limit) : 50;
    const safeLimit = Math.max(1, Math.min(100, normalizedLimit));
    const { data, error } = await supabase
        .from("event_dispatches")
        .select("id, dispatch_key, event_type, channel, resource_type, resource_id, status, attempt_count, updated_at, metadata")
        .in("channel", ["webhook_admin:telegram", "webhook_admin:discord", "push_admin"])
        .in("status", ["failed", "processing"])
        .order("updated_at", { ascending: true })
        .limit(Math.min(300, safeLimit * 3));
    if (error) throw new Error(error.message);

    const dispatches = ((data || []) as RecoverableAdminDispatch[])
        .filter((dispatch) => isReadyForRecovery(dispatch, Date.now()))
        .slice(0, safeLimit);
    if (!dispatches.length) {
        return { ok: true, inspected: 0, recovered: 0, failed: 0, terminal: 0, skipped: 0 };
    }

    async function markTerminal(
        dispatch: RecoverableAdminDispatch,
        reason: string,
        status: "abandoned" | "delivery_unknown" = "abandoned"
    ) {
        const { data: updated, error: updateError } = await supabase
            .from("event_dispatches")
            .update({
                status,
                metadata: {
                    ...(dispatch.metadata || {}),
                    recovery_terminal: true,
                    recovery_terminal_reason: reason,
                    recovery_terminal_at: new Date().toISOString(),
                },
                last_error: reason,
                updated_at: new Date().toISOString(),
            })
            .eq("id", dispatch.id)
            .eq("status", dispatch.status)
            .eq("attempt_count", dispatch.attempt_count)
            .eq("updated_at", dispatch.updated_at)
            .select("id")
            .maybeSingle();
        if (updateError) throw new Error(updateError.message);
        return Boolean(updated?.id);
    }

    const results = await Promise.allSettled(dispatches.map(async (dispatch) => {
        if (dispatch.status === "processing") {
            const marked = await markTerminal(
                dispatch,
                "Admin notification delivery outcome is unknown after a stale processing lease",
                "delivery_unknown"
            );
            return marked ? "terminal" as const : "skipped" as const;
        }
        if (Math.max(1, Number(dispatch.attempt_count) || 1) >= RECOVERY_MAX_ATTEMPTS) {
            const marked = await markTerminal(dispatch, "Admin notification recovery attempts exhausted");
            return marked ? "terminal" as const : "skipped" as const;
        }

        const metadata = dispatch.metadata || {};
        if (dispatch.channel.startsWith("webhook_admin:")) {
            const channel = metadata.delivery_channel;
            const message = metadata.delivery_message;
            if ((channel !== "telegram" && channel !== "discord") || typeof message !== "string") {
                const marked = await markTerminal(dispatch, "Admin webhook recovery payload is unavailable");
                return marked ? "terminal" as const : "skipped" as const;
            }
            if (!getConfiguredAdminNotificationChannels().includes(channel)) {
                const marked = await markTerminal(
                    dispatch,
                    `Admin webhook channel ${channel} is no longer configured`
                );
                return marked ? "terminal" as const : "skipped" as const;
            }
            const dispatchResult = await runIdempotentDispatch(
                {
                    dispatchKey: dispatch.dispatch_key,
                    eventType: dispatch.event_type,
                    channel: dispatch.channel,
                    resourceType: dispatch.resource_type || undefined,
                    resourceId: dispatch.resource_id,
                    metadata,
                },
                async () => {
                    const delivery = await sendAdminNotificationChannel(
                        channel as AdminNotificationChannel,
                        message
                    );
                    if (!delivery.ok) throw new Error(`${channel} admin notification recovery failed`);
                }
            );
            return dispatchResult.skipped ? "skipped" as const : "recovered" as const;
        }

        const title = metadata.delivery_title;
        const body = metadata.delivery_body;
        const url = typeof metadata.delivery_url === "string" ? metadata.delivery_url : undefined;
        if (typeof title !== "string" || typeof body !== "string") {
            const marked = await markTerminal(dispatch, "Admin push recovery payload is unavailable");
            return marked ? "terminal" as const : "skipped" as const;
        }
        const failedEndpoints = Array.isArray(metadata.failed_endpoints)
            ? metadata.failed_endpoints.filter((endpoint): endpoint is string => typeof endpoint === "string")
            : undefined;
        const dispatchResult = await runRecoverableAdminPushDispatch(
            {
                dispatchKey: dispatch.dispatch_key,
                eventType: dispatch.event_type,
                resourceType: dispatch.resource_type || undefined,
                resourceId: dispatch.resource_id,
                metadata,
            },
            { title, body, url },
            failedEndpoints?.length ? failedEndpoints : undefined
        );
        return dispatchResult.skipped ? "skipped" as const : "recovered" as const;
    }));
    const failed = results.filter((result) => result.status === "rejected").length;
    const terminal = results.filter(
        (result) => result.status === "fulfilled" && result.value === "terminal"
    ).length;
    const skipped = results.filter(
        (result) => result.status === "fulfilled" && result.value === "skipped"
    ).length;
    return {
        ok: failed === 0 && terminal === 0,
        inspected: results.length,
        recovered: results.length - failed - terminal - skipped,
        failed,
        terminal,
        skipped,
    };
}
