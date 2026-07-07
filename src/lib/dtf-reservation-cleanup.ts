import { getSupabaseAdminClient } from "@/lib/supabase";
import { releaseSmartStoreSizeReservation } from "@/lib/smart-store-inventory";

type SupabaseLike = ReturnType<typeof getSupabaseAdminClient>;

export type DtfReservationCleanupOrder = {
    id: string;
    order_number: number | null;
    user_id: string | null;
    size_id: string | null;
    status: string | null;
    design_method: string | null;
    dtf_mockup_url: string | null;
    dtf_extracted_url: string | null;
    admin_notes?: string | null;
    created_at: string;
};

export type DtfReservationCleanupConfig = {
    guestTtlHours: number;
    ownedTtlHours: number;
    limit: number;
};

export type DtfReservationCleanupResult = {
    ok: boolean;
    dryRun: boolean;
    cutoffIso: string;
    guestTtlHours: number;
    ownedTtlHours: number;
    scanned: number;
    linked: number;
    eligible: number;
    cancelled: number;
    released: number;
    skipped: number;
    errors: Array<{ orderId?: string; message: string }>;
};

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_GUEST_TTL_HOURS = 48;
const DEFAULT_OWNED_TTL_HOURS = 168;
const DEFAULT_LIMIT = 100;

function readBoundedInteger(value: unknown, fallback: number, min: number, max: number) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

export function getDtfReservationCleanupConfig(env: Record<string, string | undefined> = process.env): DtfReservationCleanupConfig {
    return {
        guestTtlHours: readBoundedInteger(env.DTF_GUEST_RESERVATION_TTL_HOURS, DEFAULT_GUEST_TTL_HOURS, 6, 168),
        ownedTtlHours: readBoundedInteger(env.DTF_OWNED_RESERVATION_TTL_HOURS, DEFAULT_OWNED_TTL_HOURS, 24, 720),
        limit: readBoundedInteger(env.DTF_RESERVATION_CLEANUP_LIMIT, DEFAULT_LIMIT, 1, 500),
    };
}

export function getDtfReservationQueryCutoff(now: Date, config: DtfReservationCleanupConfig) {
    const earliestTtl = Math.min(config.guestTtlHours, config.ownedTtlHours);
    return new Date(now.getTime() - earliestTtl * HOUR_MS);
}

function isDtfStudioOrder(order: DtfReservationCleanupOrder) {
    return (
        order.status === "new" &&
        order.design_method === "studio" &&
        Boolean(order.dtf_mockup_url || order.dtf_extracted_url)
    );
}

function isExpiredReservation(order: DtfReservationCleanupOrder, now: Date, config: DtfReservationCleanupConfig) {
    const createdAt = new Date(order.created_at);
    if (!Number.isFinite(createdAt.getTime())) return false;

    const ttlHours = order.user_id ? config.ownedTtlHours : config.guestTtlHours;
    return now.getTime() - createdAt.getTime() >= ttlHours * HOUR_MS;
}

export function selectAbandonedDtfReservations(params: {
    orders: DtfReservationCleanupOrder[];
    linkedOrderIds: Set<string>;
    now: Date;
    config: DtfReservationCleanupConfig;
}) {
    return params.orders.filter((order) =>
        isDtfStudioOrder(order) &&
        isExpiredReservation(order, params.now, params.config) &&
        !params.linkedOrderIds.has(order.id)
    );
}

function buildCleanupNote(order: DtfReservationCleanupOrder, now: Date) {
    const existing = typeof order.admin_notes === "string" && order.admin_notes.trim()
        ? `${order.admin_notes.trim()}\n`
        : "";
    const orderLabel = order.order_number ? `#${order.order_number}` : order.id;
    return `${existing}إلغاء تلقائي: تحرير حجز DTF مهجور للطلب ${orderLabel} في ${now.toISOString()}.`;
}

type CleanupOptions = {
    dryRun?: boolean;
    now?: Date;
    supabase?: SupabaseLike;
    releaseReservation?: typeof releaseSmartStoreSizeReservation;
};

export async function cleanupAbandonedDtfReservations(options: CleanupOptions = {}): Promise<DtfReservationCleanupResult> {
    const now = options.now ?? new Date();
    const config = getDtfReservationCleanupConfig();
    const cutoff = getDtfReservationQueryCutoff(now, config);
    const supabase = options.supabase ?? getSupabaseAdminClient();
    const releaseReservation = options.releaseReservation ?? releaseSmartStoreSizeReservation;
    const errors: DtfReservationCleanupResult["errors"] = [];

    const { data: orders, error: ordersError } = await supabase
        .from("custom_design_orders")
        .select("id, order_number, user_id, size_id, status, design_method, dtf_mockup_url, dtf_extracted_url, admin_notes, created_at")
        .eq("status", "new")
        .eq("design_method", "studio")
        .lte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: true })
        .limit(config.limit);

    if (ordersError) {
        return {
            ok: false,
            dryRun: options.dryRun === true,
            cutoffIso: cutoff.toISOString(),
            guestTtlHours: config.guestTtlHours,
            ownedTtlHours: config.ownedTtlHours,
            scanned: 0,
            linked: 0,
            eligible: 0,
            cancelled: 0,
            released: 0,
            skipped: 0,
            errors: [{ message: ordersError.message || "Failed to fetch DTF reservation candidates" }],
        };
    }

    const candidates = (orders ?? []) as DtfReservationCleanupOrder[];
    if (candidates.length === 0) {
        return {
            ok: true,
            dryRun: options.dryRun === true,
            cutoffIso: cutoff.toISOString(),
            guestTtlHours: config.guestTtlHours,
            ownedTtlHours: config.ownedTtlHours,
            scanned: 0,
            linked: 0,
            eligible: 0,
            cancelled: 0,
            released: 0,
            skipped: 0,
            errors,
        };
    }

    const candidateIds = candidates.map((order) => order.id);
    const { data: linkedItems, error: linkedError } = await supabase
        .from("order_items")
        .select("custom_design_order_id")
        .in("custom_design_order_id", candidateIds);

    if (linkedError) {
        return {
            ok: false,
            dryRun: options.dryRun === true,
            cutoffIso: cutoff.toISOString(),
            guestTtlHours: config.guestTtlHours,
            ownedTtlHours: config.ownedTtlHours,
            scanned: candidates.length,
            linked: 0,
            eligible: 0,
            cancelled: 0,
            released: 0,
            skipped: candidates.length,
            errors: [{ message: linkedError.message || "Failed to check linked DTF order items" }],
        };
    }

    const linkedOrderIds = new Set(
        ((linkedItems ?? []) as Array<{ custom_design_order_id?: string | null }>)
            .map((item) => item.custom_design_order_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
    );
    const eligible = selectAbandonedDtfReservations({
        orders: candidates,
        linkedOrderIds,
        now,
        config,
    });

    if (options.dryRun) {
        return {
            ok: true,
            dryRun: true,
            cutoffIso: cutoff.toISOString(),
            guestTtlHours: config.guestTtlHours,
            ownedTtlHours: config.ownedTtlHours,
            scanned: candidates.length,
            linked: linkedOrderIds.size,
            eligible: eligible.length,
            cancelled: 0,
            released: 0,
            skipped: candidates.length - eligible.length,
            errors,
        };
    }

    let cancelled = 0;
    let released = 0;

    for (const order of eligible) {
        const { data: updated, error: updateError } = await supabase
            .from("custom_design_orders")
            .update({
                status: "cancelled",
                admin_notes: buildCleanupNote(order, now),
            })
            .eq("id", order.id)
            .eq("status", "new")
            .select("id, size_id")
            .maybeSingle();

        if (updateError || !updated) {
            errors.push({
                orderId: order.id,
                message: updateError?.message || "Order was not cancelled, likely changed concurrently",
            });
            continue;
        }

        const releaseResult = await releaseReservation(supabase, (updated as { size_id?: string | null }).size_id, 1);
        if ("error" in releaseResult) {
            const { data: restored, error: restoreError } = await supabase
                .from("custom_design_orders")
                .update({
                    status: "new",
                    admin_notes: order.admin_notes ?? null,
                })
                .eq("id", order.id)
                .eq("status", "cancelled")
                .select("id")
                .maybeSingle();

            if (restoreError || !restored) {
                cancelled += 1;
                errors.push({
                    orderId: order.id,
                    message: `${releaseResult.error}; failed to restore reservation for retry`,
                });
                continue;
            }

            errors.push({
                orderId: order.id,
                message: `${releaseResult.error}; reservation restored for retry`,
            });
            continue;
        }

        cancelled += 1;
        released += 1;
    }

    return {
        ok: errors.length === 0,
        dryRun: false,
        cutoffIso: cutoff.toISOString(),
        guestTtlHours: config.guestTtlHours,
        ownedTtlHours: config.ownedTtlHours,
        scanned: candidates.length,
        linked: linkedOrderIds.size,
        eligible: eligible.length,
        cancelled,
        released,
        skipped: candidates.length - eligible.length,
        errors,
    };
}
