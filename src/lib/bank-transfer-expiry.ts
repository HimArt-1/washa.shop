import "server-only";

import { restoreStockForOrder } from "@/lib/inventory";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function expireBankTransferReservations(options?: { dryRun?: boolean }) {
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();
    const abandonedBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [expiredQuery, recoveryQuery, abandonedQuery] = await Promise.all([
        supabase
            .from("orders")
            .select("id, coupon_id, metadata")
            .eq("status", "pending")
            .eq("payment_status", "pending")
            .eq("metadata->>payment_method", "bank_transfer")
            .eq("metadata->>inventory_reserved", "true")
            .lt("metadata->>bank_transfer_expires_at", now)
            .limit(100),
        supabase
            .from("orders")
            .select("id, coupon_id, metadata")
            .eq("status", "cancelled")
            .eq("payment_status", "pending")
            .eq("metadata->>payment_method", "bank_transfer")
            .eq("metadata->>inventory_reserved", "true")
            .in("metadata->>bank_transfer_status", [
                "releasing_expired_reservation",
                "releasing_cancelled_reservation",
                "reservation_release_failed",
                "coupon_release_failed",
            ])
            .limit(100),
        supabase
            .from("orders")
            .select("id, coupon_id, metadata")
            .eq("status", "pending")
            .eq("payment_status", "pending")
            .eq("metadata->>payment_method", "bank_transfer")
            .eq("metadata->>creation_state", "creating")
            .lt("created_at", abandonedBefore)
            .limit(100),
    ]);

    if (expiredQuery.error) throw new Error(expiredQuery.error.message);
    if (recoveryQuery.error) throw new Error(recoveryQuery.error.message);
    if (abandonedQuery.error) throw new Error(abandonedQuery.error.message);
    const orders = [...(expiredQuery.data || []), ...(recoveryQuery.data || [])];
    if (options?.dryRun) return { ok: true, found: orders.length + (abandonedQuery.data?.length || 0), expired: 0, failed: 0 };

    let expired = 0;
    let failed = 0;
    for (const order of abandonedQuery.data || []) {
        const restored = await restoreStockForOrder(order.id);
        const { error: couponReleaseError } = await supabase.rpc(
            "release_order_coupon_use" as never,
            { p_order_id: order.id } as never
        );
        if (!restored.success || couponReleaseError) {
            failed += 1;
            continue;
        }
        const { error: deleteError } = await supabase.from("orders").delete().eq("id", order.id);
        if (deleteError) failed += 1;
    }
    for (const order of orders || []) {
        const metadata = order.metadata && typeof order.metadata === "object"
            ? order.metadata as Record<string, unknown>
            : {};
        const isRecovery = metadata.bank_transfer_status !== "awaiting_receipt";
        if (!isRecovery) {
            const { data: claimed, error: claimError } = await supabase.rpc(
                "claim_expired_bank_transfer" as never,
                { p_order_id: order.id } as never
            );
            if (claimError || claimed !== true) continue;
        }

        let couponReleased = metadata.coupon_reserved !== true;
        if (metadata.coupon_reserved === true && order.coupon_id) {
            const { error: couponError } = await supabase.rpc(
                "release_order_coupon_use" as never,
                { p_order_id: order.id } as never
            );
            if (couponError) {
                failed += 1;
                await supabase.from("orders").update({
                    metadata: { ...metadata, bank_transfer_status: "coupon_release_failed" },
                }).eq("id", order.id);
                continue;
            }
            couponReleased = true;
        }

        const restored = await restoreStockForOrder(order.id);
        if (!restored.success) {
            failed += 1;
            await supabase.from("orders").update({
                metadata: {
                    ...metadata,
                    coupon_reserved: !couponReleased,
                    bank_transfer_status: "reservation_release_failed",
                },
            }).eq("id", order.id);
            continue;
        }

        const { error: finalUpdateError } = await supabase.from("orders").update({
            status: "cancelled",
            metadata: {
                ...metadata,
                bank_transfer_status: "expired",
                inventory_reserved: false,
                coupon_reserved: false,
                reservation_released_at: now,
            },
            updated_at: now,
        }).eq("id", order.id);
        if (finalUpdateError) {
            failed += 1;
            continue;
        }
        expired += 1;
    }

    return { ok: failed === 0, found: orders.length + (abandonedQuery.data?.length || 0), expired, failed };
}
