"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { Database } from "@/types/database";
import { generateNextSKU, getUnitSerialsForPrint } from "@/lib/product-identifiers";

// Create Admin Supabase Client
function getAdminSb() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

// Helper to verify admin role
async function verifyAdmin() {
    const user = await currentUser();
    if (!user) return { user: null, isAdmin: false };

    const supabase = getAdminSb();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_id", user.id)
        .single();

    return { user, isAdmin: profile?.role === "admin" };
}

// ─── SKUs ───────────────────────────────────────────────

export async function getSKUs() {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();
    const { data, error } = await supabase
        .from("product_skus")
        .select("*, product:products(title, image_url)")
        .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { skus: data };
}

export async function createSKU(input: {
    product_id: string;
    sku?: string;
    size?: string | null;
    color_code?: string | null;
}) {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    let skuValue = input.sku?.trim();
    if (!skuValue) {
        const product = await getAdminSb()
            .from("products")
            .select("type")
            .eq("id", input.product_id)
            .single();
        const productType = product.data?.type || "original";
        const gen = await generateNextSKU(productType, input.size, input.color_code);
        if ("error" in gen) return { error: gen.error };
        skuValue = gen.sku;
    }

    const supabase = getAdminSb();
    const { data, error } = await supabase.from("product_skus")
        .insert({ product_id: input.product_id, sku: skuValue!, size: input.size ?? null, color_code: input.color_code ?? null })
        .select()
        .single();

    if (error) return { error: error.message };
    return { sku: data };
}

export async function getUnitSerials(skuId: string, count: number) {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };
    return getUnitSerialsForPrint(skuId, count);
}

// ─── Warehouses ─────────────────────────────────────────

export async function getWarehouses() {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();
    const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) return { error: error.message };
    return { warehouses: data };
}

export async function createWarehouse(name: string, location?: string) {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();
    const { data, error } = await supabase.from("warehouses")
        .insert({ name, location: location ?? null, is_active: true })
        .select()
        .single();

    if (error) return { error: error.message };
    return { warehouse: data };
}

// ─── Inventory Management ───────────────────────────────

export async function getInventoryLevels(warehouseId?: string) {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();
    let query = supabase
        .from("inventory_levels")
        .select("*, sku:product_skus(sku, size, color_code, product:products(title, image_url)), warehouse:warehouses(name)");

    if (warehouseId) query = query.eq("warehouse_id", warehouseId);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { inventory: data };
}

/**
 * Adjusts inventory level and records the transaction.
 */
export async function adjustInventory(
    skuId: string,
    warehouseId: string,
    quantityChange: number,
    transactionType: 'addition' | 'sale' | 'adjustment' | 'transfer' | 'return',
    notes?: string
) {
    const { user, isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();

    try {
        // Find existing level
        const { data: currentLevel } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", warehouseId)
            .single();

        const previousQuantity = currentLevel ? currentLevel.quantity : 0;
        const newQuantity = previousQuantity + quantityChange;

        // Upsert new level
        const { error: upsertError } = await supabase.from("inventory_levels")
            .upsert({
                sku_id: skuId,
                warehouse_id: warehouseId,
                quantity: newQuantity,
            }, { onConflict: "sku_id,warehouse_id" });

        if (upsertError) throw upsertError;

        // Fetch user profile id for audit created_by
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('clerk_id', user!.id)
            .single();

        // Record transaction
        const { error: txError } = await supabase.from("inventory_transactions")
            .insert({
                sku_id: skuId,
                warehouse_id: warehouseId,
                transaction_type: transactionType,
                quantity_change: quantityChange,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                notes: notes ?? null,
                created_by: profile?.id ?? null,
            });

        if (txError) throw txError;

        return { success: true, newQuantity };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("Inventory error", err);
        return { error: err.message || "حدث خطأ" };
    }
}

// ─── Enhanced Inventory with Sales Data ─────────────────

export async function getInventoryWithSales(warehouseId?: string) {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { inventory: [], stats: null };

    const supabase = getAdminSb();

    // Fetch inventory levels with product & warehouse info
    let query = supabase
        .from("inventory_levels")
        .select("*, sku:product_skus(id, sku, size, color_code, product_id, product:products(id, title, image_url, price, type, stock_quantity)), warehouse:warehouses(name)");

    if (warehouseId) query = query.eq("warehouse_id", warehouseId);

    const { data: inventory, error } = await query.order("updated_at", { ascending: false });
    if (error) {
        console.error("[getInventoryWithSales]", error.message);
        return { inventory: [], stats: null };
    }

    // Fetch sales counts per product from order_items
    const productIds = Array.from(new Set((inventory || []).map((i: any) => i.sku?.product_id).filter(Boolean)));
    let salesMap: Record<string, number> = {};

    if (productIds.length > 0) {
        const { data: salesData } = await supabase
            .from("order_items")
            .select("product_id, quantity")
            .in("product_id", productIds);

        if (salesData) {
            for (const item of salesData) {
                const pid = item.product_id as string;
                if (pid) salesMap[pid] = (salesMap[pid] || 0) + (item.quantity || 1);
            }
        }
    }

    // Enrich inventory with sales count
    const enriched = (inventory || []).map((item: any) => ({
        ...item,
        sold_count: salesMap[item.sku?.product_id] || 0,
    }));

    // Calculate stats
    const totalItems = enriched.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
    const totalProducts = new Set(enriched.map((i: any) => i.sku?.product_id)).size;
    const lowStock = enriched.filter((i: any) => i.quantity > 0 && i.quantity <= 5).length;
    const outOfStock = enriched.filter((i: any) => i.quantity === 0).length;
    const estimatedValue = enriched.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (Number(i.sku?.product?.price) || 0)), 0);
    const totalSold = enriched.reduce((sum: number, i: any) => sum + (i.sold_count || 0), 0);

    return {
        inventory: enriched,
        stats: { totalItems, totalProducts, lowStock, outOfStock, estimatedValue, totalSold },
    };
}

/**
 * Quick inline adjust — increment or decrement by a given amount
 */
export async function quickAdjustInventory(
    skuId: string,
    warehouseId: string,
    delta: number,
) {
    return adjustInventory(skuId, warehouseId, delta, delta > 0 ? "addition" : "adjustment", "تعديل سريع");
}
