import { createClient } from "@supabase/supabase-js";

const DEFAULT_STALE_PROCESSING_MS = 10 * 60 * 1000;
const MAX_DISPATCH_KEY_LENGTH = 240;
const MAX_EVENT_TYPE_LENGTH = 80;
const MAX_CHANNEL_LENGTH = 80;
const MAX_RESOURCE_TYPE_LENGTH = 80;
const MAX_RESOURCE_ID_LENGTH = 120;
const MAX_ERROR_LENGTH = 1000;

type DispatchStatus = "processing" | "sent" | "failed" | "abandoned" | "delivery_unknown";

interface EventDispatchRow {
    id: string;
    status: DispatchStatus;
    updated_at: string;
    attempt_count: number;
}

interface DispatchOptions {
    dispatchKey: string;
    eventType: string;
    channel: string;
    resourceType?: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
    staleAfterMs?: number;
}

export class DispatchDeliveryError extends Error {
    readonly dispatchMetadata: Record<string, unknown>;

    constructor(message: string, dispatchMetadata: Record<string, unknown> = {}) {
        super(message);
        this.name = "DispatchDeliveryError";
        this.dispatchMetadata = dispatchMetadata;
    }
}

export class DispatchPersistenceError extends Error {
    readonly stage: "claim" | "ack";

    constructor(stage: "claim" | "ack", message: string) {
        super(message);
        this.name = "DispatchPersistenceError";
        this.stage = stage;
    }
}

function getDispatchClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("Dispatch tracking requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    }

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

function normalizeText(value: string, maxLength: number) {
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeOptions(options: DispatchOptions) {
    const dispatchKey = normalizeText(options.dispatchKey, MAX_DISPATCH_KEY_LENGTH);
    const eventType = normalizeText(options.eventType, MAX_EVENT_TYPE_LENGTH);
    const channel = normalizeText(options.channel, MAX_CHANNEL_LENGTH);
    const resourceType = options.resourceType
        ? normalizeText(options.resourceType, MAX_RESOURCE_TYPE_LENGTH)
        : null;
    const resourceId = options.resourceId
        ? normalizeText(options.resourceId, MAX_RESOURCE_ID_LENGTH)
        : null;

    if (!dispatchKey || !eventType || !channel) {
        throw new Error("Dispatch options are invalid");
    }

    return {
        dispatchKey,
        eventType,
        channel,
        resourceType,
        resourceId,
        metadata: options.metadata ?? {},
        staleAfterMs: options.staleAfterMs ?? DEFAULT_STALE_PROCESSING_MS,
    };
}

async function markDispatch(
    dispatchId: string,
    attemptCount: number,
    patch: Record<string, unknown>
) {
    const supabase = getDispatchClient();
    const { data, error } = await supabase
        .from("event_dispatches")
        .update({
            ...patch,
            updated_at: new Date().toISOString(),
        })
        .eq("id", dispatchId)
        .eq("status", "processing")
        .eq("attempt_count", attemptCount)
        .select("id")
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to persist dispatch result: ${error.message}`);
    }
    return Boolean(data?.id);
}

async function claimDispatch(options: ReturnType<typeof normalizeOptions>) {
    const supabase = getDispatchClient();
    const nowIso = new Date().toISOString();
    const insertPayload = {
        dispatch_key: options.dispatchKey,
        event_type: options.eventType,
        channel: options.channel,
        resource_type: options.resourceType,
        resource_id: options.resourceId,
        status: "processing",
        attempt_count: 1,
        metadata: options.metadata,
        last_error: null,
        sent_at: null,
        updated_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
        .from("event_dispatches")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();

    if (inserted?.id) {
        return { acquired: true as const, dispatchId: inserted.id, attemptCount: 1 };
    }

    if (insertError && insertError.code !== "23505") {
        throw insertError;
    }

    const { data: existingData, error: existingError } = await supabase
        .from("event_dispatches")
        .select("id, status, updated_at, attempt_count")
        .eq("dispatch_key", options.dispatchKey)
        .maybeSingle();

    if (existingError) {
        throw existingError;
    }

    const existing = existingData as EventDispatchRow | null;

    if (!existing) {
        return { acquired: false as const, reason: "missing" };
    }

    const ageMs = Date.now() - new Date(existing.updated_at).getTime();
    const isStaleProcessing = existing.status === "processing" && ageMs > options.staleAfterMs;
    const canRetry = existing.status === "failed";

    if (!canRetry) {
        return {
            acquired: false as const,
            reason: isStaleProcessing ? "stale_processing" : existing.status,
        };
    }

    const { data: reclaimed, error: reclaimError } = await supabase
        .from("event_dispatches")
        .update({
            status: "processing",
            attempt_count: (existing.attempt_count || 1) + 1,
            metadata: options.metadata,
            last_error: null,
            updated_at: nowIso,
        })
        .eq("id", existing.id)
        .eq("status", existing.status)
        .eq("updated_at", existing.updated_at)
        .select("id")
        .maybeSingle();

    if (reclaimError) {
        throw reclaimError;
    }

    if (!reclaimed?.id) {
        return { acquired: false as const, reason: "race" };
    }

    return {
        acquired: true as const,
        dispatchId: reclaimed.id,
        attemptCount: (existing.attempt_count || 1) + 1,
    };
}

export async function runIdempotentDispatch(
    options: DispatchOptions,
    task: () => Promise<void>
) {
    const normalized = normalizeOptions(options);
    let claim: Awaited<ReturnType<typeof claimDispatch>>;
    try {
        claim = await claimDispatch(normalized);
    } catch (error) {
        throw new DispatchPersistenceError(
            "claim",
            error instanceof Error ? error.message : "Failed to persist dispatch claim"
        );
    }

    if (!claim.acquired || !claim.dispatchId || !claim.attemptCount) {
        return { success: true as const, skipped: true as const, reason: claim.reason ?? "duplicate" };
    }

    try {
        await task();
    } catch (error) {
        try {
            await markDispatch(claim.dispatchId, claim.attemptCount, {
                status: "failed",
                metadata: error instanceof DispatchDeliveryError
                    ? { ...normalized.metadata, ...error.dispatchMetadata }
                    : normalized.metadata,
                last_error: error instanceof Error
                    ? error.message.slice(0, MAX_ERROR_LENGTH)
                    : "Unknown dispatch error",
            });
        } catch (persistenceError) {
            console.error("[idempotent-dispatch.failure-ack]", persistenceError);
        }
        throw error;
    }

    let marked: boolean;
    try {
        marked = await markDispatch(claim.dispatchId, claim.attemptCount, {
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
        });
    } catch (acknowledgementError) {
        try {
            const unknownMarked = await markDispatch(claim.dispatchId, claim.attemptCount, {
                status: "delivery_unknown",
                sent_at: null,
                last_error: acknowledgementError instanceof Error
                    ? acknowledgementError.message.slice(0, MAX_ERROR_LENGTH)
                    : "Dispatch acknowledgement failed",
            });
            if (!unknownMarked) {
                return { success: true as const, skipped: true as const, reason: "lease_lost" };
            }
        } catch (unknownStateError) {
            console.error("[idempotent-dispatch.unknown-ack]", unknownStateError);
        }
        throw new DispatchPersistenceError(
            "ack",
            acknowledgementError instanceof Error
                ? acknowledgementError.message
                : "Failed to persist dispatch acknowledgement"
        );
    }
    if (!marked) {
        return { success: true as const, skipped: true as const, reason: "lease_lost" };
    }
    return { success: true as const, skipped: false as const };
}
