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

    return { user, isAdmin: (profile as any)?.role === "admin" };
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
        const productType = (product.data as any)?.type || "original";
        const gen = await generateNextSKU(productType, input.size, input.color_code);
        if ("error" in gen) return { error: gen.error };
        skuValue = gen.sku;
    }

    const supabase = getAdminSb();
    const { data, error } = await (supabase.from("product_skus") as any)
        .insert([{ ...input, sku: skuValue }])
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
    const { data, error } = await (supabase.from("warehouses") as any)
        .insert([{ name, location }])
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
        const { data: currentLevel } = await (supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", warehouseId)
            .single() as any);

        const previousQuantity = currentLevel ? currentLevel.quantity : 0;
        const newQuantity = previousQuantity + quantityChange;

        // Upsert new level
        const { error: upsertError } = await (supabase.from("inventory_levels") as any)
            .upsert({
                sku_id: skuId,
                warehouse_id: warehouseId,
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            }, { onConflict: "sku_id,warehouse_id" });

        if (upsertError) throw upsertError;

        // Fetch user profile id for audit created_by
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('clerk_id', user!.id)
            .single();

        // Record transaction
        const { error: txError } = await (supabase.from("inventory_transactions") as any)
            .insert([{
                sku_id: skuId,
                warehouse_id: warehouseId,
                transaction_type: transactionType,
                quantity_change: quantityChange,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                notes: notes,
                created_by: (profile as any)?.id
            }]);

        if (txError) throw txError;

        return { success: true, newQuantity };
    } catch (e: any) {
        console.error("Inventory error", e);
        return { error: e.message || "حدث خطأ" };
    }
}
