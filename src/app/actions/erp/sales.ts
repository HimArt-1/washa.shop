"use server";

import { createClient } from "@supabase/supabase-js";
import { Database, SalesMethodType } from "@/types/database";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";

function getAdminSb() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

async function verifyAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return { user: null, isAdmin: false };
    const supabase = getAdminSb();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_id", user.id)
        .single();
    return { user, isAdmin: profile?.role === "admin" };
}

export async function getSalesRecords(method?: SalesMethodType) {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();
    let query = supabase
        .from("sales_records")
        .select("*, sku:product_skus(sku, size, color_code, product:products(title))")
        .order("created_at", { ascending: false });

    if (method) query = query.eq("sales_method", method);

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { records: data };
}

export async function recordManualSale(
    skuId: string,
    quantity: number,
    totalPrice: number,
    warehouseId: string,
    notes?: string
) {
    const { user, isAdmin } = await verifyAdmin();
    if (!isAdmin) return { error: "غير مصرح" };

    const supabase = getAdminSb();

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('clerk_id', user!.id)
            .single();

        // 1. Record Sale
        const unitPrice = totalPrice / quantity;
        const { data: sale, error: saleError } = await supabase.from("sales_records")
            .insert({
                sales_method: 'booth_manual',
                sku_id: skuId,
                quantity: quantity,
                unit_price: unitPrice,
                total_price: totalPrice,
                status: 'completed',
                notes: notes ?? null,
                created_by: profile?.id ?? null,
            })
            .select()
            .single();

        if (saleError) throw saleError;

        // 2. Adjust Inventory (Deduct)
        const { data: currentLevel } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", warehouseId)
            .single();

        const previousQuantity = currentLevel ? currentLevel.quantity : 0;
        const newQuantity = previousQuantity - quantity;

        const { error: upsertError } = await supabase.from("inventory_levels")
            .upsert({
                sku_id: skuId,
                warehouse_id: warehouseId,
                quantity: newQuantity,
            }, { onConflict: "sku_id,warehouse_id" });

        if (upsertError) throw upsertError;

        // Record Transaction
        await supabase.from("inventory_transactions")
            .insert({
                sku_id: skuId,
                warehouse_id: warehouseId,
                transaction_type: 'sale',
                quantity_change: -quantity,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                reference_id: sale.id,
                notes: `POS Hand Sale`,
                created_by: profile?.id ?? null,
            });

        return { success: true, sale };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("Sale error", err);
        await reportAdminOperationalAlert({
            dispatchKey: `erp:record_manual_sale_failed:${skuId}:${warehouseId}`,
            bucketMs: 15 * 60 * 1000,
            category: "orders",
            severity: "warning",
            title: "فشل تسجيل بيع يدوي",
            message: "تعذر تسجيل عملية بيع يدوية من واجهة ERP.",
            source: "erp.sales.record_manual",
            link: "/dashboard/sales",
            resourceType: "sale",
            resourceId: skuId,
            metadata: {
                sku_id: skuId,
                warehouse_id: warehouseId,
                quantity,
                total_price: totalPrice,
                error: err.message || "Unknown sale error",
            },
            stack: err.stack ?? null,
        });
        return { error: err.message || "حدث خطأ أثناء تسجيل المبيعات" };
    }
}
