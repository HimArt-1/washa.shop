import type { CustomDesignSize } from "@/types/database";

export type SmartStoreSizeInventory = Pick<
    CustomDesignSize,
    "track_inventory" | "stock_quantity" | "reserved_quantity" | "low_stock_threshold"
>;

export type SmartStoreStockStatus = "untracked" | "available" | "low" | "out";

type SupabaseLike = {
    from: (table: string) => any;
};

type SizeInventoryRow = {
    id: string;
    name?: string | null;
    size_id?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    track_inventory?: boolean | null;
    stock_quantity?: number | null;
    reserved_quantity?: number | null;
    low_stock_threshold?: number | null;
};

export function getSmartStoreAvailableQuantity(size: SmartStoreSizeInventory): number | null {
    if (!size.track_inventory) return null;
    return Math.max(0, Number(size.stock_quantity || 0) - Number(size.reserved_quantity || 0));
}

export function getSmartStoreStockStatus(size: SmartStoreSizeInventory): SmartStoreStockStatus {
    const available = getSmartStoreAvailableQuantity(size);
    if (available === null) return "untracked";
    if (available <= 0) return "out";
    if (available <= Number(size.low_stock_threshold || 0)) return "low";
    return "available";
}

export function isSmartStoreSizeOrderable(size: SmartStoreSizeInventory): boolean {
    return getSmartStoreStockStatus(size) !== "out";
}

function normalizeQuantity(quantity: number) {
    const value = Number(quantity);
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(value));
}

async function getSizeInventoryRow(sb: SupabaseLike, sizeId: string): Promise<SizeInventoryRow | null> {
    const { data } = await sb
        .from("custom_design_sizes")
        .select("id, name, is_active, track_inventory, stock_quantity, reserved_quantity, low_stock_threshold")
        .eq("id", sizeId)
        .single();

    return (data as SizeInventoryRow | null) ?? null;
}

export async function reserveSmartStoreSizeStock(
    sb: SupabaseLike,
    sizeId: string | null | undefined,
    quantity = 1
): Promise<{ success: true; tracked: boolean; available?: number } | { error: string }> {
    if (!sizeId) return { success: true, tracked: false };

    const qty = normalizeQuantity(quantity);

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const size = await getSizeInventoryRow(sb, sizeId);
        if (!size) return { error: "المقاس المحدد غير موجود." };
        if (size.is_active === false) return { error: "المقاس المحدد غير متاح حالياً." };
        if (!size.track_inventory) return { success: true, tracked: false };

        const stock = Number(size.stock_quantity || 0);
        const reserved = Number(size.reserved_quantity || 0);
        const available = Math.max(0, stock - reserved);

        if (available < qty) {
            return {
                error: available > 0
                    ? `المتوفر من المقاس "${size.name || "المحدد"}" هو ${available} فقط.`
                    : `المقاس "${size.name || "المحدد"}" غير متوفر حالياً.`,
            };
        }

        const { data, error } = await sb
            .from("custom_design_sizes")
            .update({ reserved_quantity: reserved + qty })
            .eq("id", sizeId)
            .eq("reserved_quantity", reserved)
            .select("reserved_quantity, stock_quantity")
            .single();

        if (!error && data) {
            const updatedReserved = Number(data.reserved_quantity || 0);
            const updatedStock = Number(data.stock_quantity || 0);
            return { success: true, tracked: true, available: Math.max(0, updatedStock - updatedReserved) };
        }
    }

    return { error: "تعذر حجز المخزون بسبب تحديث متزامن. حاول مرة أخرى." };
}

export async function releaseSmartStoreSizeReservation(
    sb: SupabaseLike,
    sizeId: string | null | undefined,
    quantity = 1
): Promise<{ success: true } | { error: string }> {
    if (!sizeId) return { success: true };

    const qty = normalizeQuantity(quantity);
    const size = await getSizeInventoryRow(sb, sizeId);
    if (!size || !size.track_inventory) return { success: true };

    const reserved = Number(size.reserved_quantity || 0);
    const nextReserved = Math.max(0, reserved - qty);

    const { error } = await sb
        .from("custom_design_sizes")
        .update({ reserved_quantity: nextReserved })
        .eq("id", sizeId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function consumeSmartStoreSizeReservation(
    sb: SupabaseLike,
    sizeId: string | null | undefined,
    quantity = 1
): Promise<{ success: true } | { error: string }> {
    if (!sizeId) return { success: true };

    const qty = normalizeQuantity(quantity);
    const size = await getSizeInventoryRow(sb, sizeId);
    if (!size || !size.track_inventory) return { success: true };

    const reserved = Number(size.reserved_quantity || 0);
    const stock = Number(size.stock_quantity || 0);

    const { error } = await sb
        .from("custom_design_sizes")
        .update({
            reserved_quantity: Math.max(0, reserved - qty),
            stock_quantity: Math.max(0, stock - qty),
        })
        .eq("id", sizeId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function restoreSmartStoreSizeStock(
    sb: SupabaseLike,
    sizeId: string | null | undefined,
    quantity = 1
): Promise<{ success: true } | { error: string }> {
    if (!sizeId) return { success: true };

    const qty = normalizeQuantity(quantity);
    const size = await getSizeInventoryRow(sb, sizeId);
    if (!size || !size.track_inventory) return { success: true };

    const stock = Number(size.stock_quantity || 0);
    const { error } = await sb
        .from("custom_design_sizes")
        .update({ stock_quantity: stock + qty })
        .eq("id", sizeId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function releaseSmartStoreReservationForOrder(
    sb: SupabaseLike,
    designOrderId: string,
    quantity = 1
): Promise<{ success: true } | { error: string }> {
    const { data, error } = await sb
        .from("custom_design_orders")
        .select("size_id")
        .eq("id", designOrderId)
        .single();

    if (error || !data) return { error: error?.message || "طلب التصميم غير موجود." };
    return releaseSmartStoreSizeReservation(sb, (data as SizeInventoryRow).size_id, quantity);
}

export async function consumeSmartStoreReservationForOrder(
    sb: SupabaseLike,
    designOrderId: string,
    quantity = 1
): Promise<{ success: true } | { error: string }> {
    const { data, error } = await sb
        .from("custom_design_orders")
        .select("size_id, status")
        .eq("id", designOrderId)
        .single();

    if (error || !data) return { error: error?.message || "طلب التصميم غير موجود." };

    const order = data as SizeInventoryRow;
    if (order.status === "cancelled") {
        return { error: "لا يمكن خصم مخزون طلب تصميم ملغي." };
    }

    const result = await consumeSmartStoreSizeReservation(sb, order.size_id, quantity);
    if ("error" in result) return result;

    if (order.status !== "completed") {
        const { error: updateError } = await sb
            .from("custom_design_orders")
            .update({ status: "completed" })
            .eq("id", designOrderId)
            .neq("status", "cancelled");

        if (updateError) return { error: updateError.message };
    }

    return { success: true };
}

export async function restoreSmartStoreStockForOrder(
    sb: SupabaseLike,
    designOrderId: string,
    quantity = 1
): Promise<{ success: true } | { error: string }> {
    const { data, error } = await sb
        .from("custom_design_orders")
        .select("size_id")
        .eq("id", designOrderId)
        .single();

    if (error || !data) return { error: error?.message || "طلب التصميم غير موجود." };
    return restoreSmartStoreSizeStock(sb, (data as SizeInventoryRow).size_id, quantity);
}
