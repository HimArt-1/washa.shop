"use server";

import { createClient } from "@supabase/supabase-js";
import { sendAdminNotification } from "./notifications";

function getClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

/** التحقق من توفر المخزون قبل إنشاء الطلب */
export async function checkStockAvailability(
    items: { product_id: string | null; quantity: number }[]
): Promise<{ ok: boolean; error?: string; product?: string }> {
    const supabase = getClient();
    for (const item of items) {
        if (!item.product_id) continue; // تصاميم مخصصة لا مخزون لها
        const { data: product } = await supabase
            .from("products")
            .select("id, title, stock_quantity, in_stock")
            .eq("id", item.product_id)
            .single();
        if (!product) return { ok: false, error: "منتج غير موجود", product: item.product_id };
        if (!product.in_stock) return { ok: false, error: `المنتج "${product.title}" غير متوفر`, product: product.title };
        if (product.stock_quantity != null && product.stock_quantity < item.quantity) {
            return { ok: false, error: `الكمية المطلوبة من "${product.title}" تتجاوز المخزون (${product.stock_quantity})`, product: product.title };
        }
    }
    return { ok: true };
}

/** خصم المخزون عند تأكيد الطلب وتسجيله في سجل المبيعات */
export async function decrementStockForOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getClient();

    // 1. Get order details to record in sales ledger
    const { data: order } = await supabase
        .from("orders")
        .select("buyer_id, total")
        .eq("id", orderId)
        .single();

    const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, size, unit_price, total_price")
        .eq("order_id", orderId);

    if (!items?.length) return { success: true };

    // Get the main warehouse (fallback to first available)
    const { data: defaultWh } = await supabase.from("warehouses").select("id").limit(1).single();
    if (!defaultWh) return { success: false, error: "لا يوجد مستودع مسجل" };

    for (const item of items) {
        if (!item.product_id) continue;

        // Find matching SKU based on size
        let skuQuery = supabase.from("product_skus").select("id").eq("product_id", item.product_id);
        if (item.size) {
            skuQuery = skuQuery.ilike("size", item.size); // Match size if exists
        }

        const { data: skus } = await skuQuery;
        const skuId = skus && skus.length > 0 ? skus[0].id : null;

        // Fallback: If no strict SKU found, decrement from product table (legacy)
        if (!skuId) {
            const { data: product } = await supabase.from("products").select("title, stock_quantity").eq("id", item.product_id).single();
            if (product && product.stock_quantity != null) {
                const newQty = Math.max(0, product.stock_quantity - item.quantity);
                await supabase.from("products").update({ stock_quantity: newQty, in_stock: newQty > 0 }).eq("id", item.product_id);
                
                // Low stock alert
                if (newQty <= 5) {
                    void sendAdminNotification(`⚠️ <b>تنبيه مخزون منخفض:</b> المنتج "${product.title}" أوشك على النفاد. الكمية المتبقية: ${newQty}`);
                }
            }
            continue; // No SKU, skip the ERP ledger
        }

        // ERP: Deduct from inventory_levels
        const { data: level } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", defaultWh.id)
            .single();

        const previousQuantity = level ? level.quantity : 0;
        const newQuantity = previousQuantity - item.quantity;

        await supabase.from("inventory_levels").upsert({
            sku_id: skuId,
            warehouse_id: defaultWh.id,
            quantity: newQuantity,
            updated_at: new Date().toISOString()
        }, { onConflict: "sku_id,warehouse_id" });

        // ERP: Record Transaction
        await supabase.from("inventory_transactions").insert([{
            sku_id: skuId,
            warehouse_id: defaultWh.id,
            transaction_type: 'sale',
            quantity_change: -item.quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reference_id: orderId,
            notes: `Online Sale Order #${orderId}`
        }]);

        // ERP: Record Sales Ledger
        await supabase.from("sales_records").insert([{
            sales_method: 'online_store',
            order_id: orderId,
            sku_id: skuId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            status: 'completed',
            notes: `Automated Online Purchase`
        }]);

        // Low stock alert for SKU
        if (newQuantity <= 5) {
            const { data: skuDetails } = await supabase.from("product_skus").select("sku, products(title)").eq("id", skuId).single();
            if (skuDetails && skuDetails.products) {
                const title = Array.isArray(skuDetails.products) ? (skuDetails.products[0] as any)?.title : (skuDetails.products as any)?.title;
                void sendAdminNotification(`⚠️ <b>تنبيه مخزون منخفض:</b> المنتج "${title}" (المقاس: ${item.size || '-'}) أوشك على النفاد. المتبقي: ${newQuantity}`);
            }
        }
    }
    return { success: true };
}

/** استرجاع المخزون عند إلغاء الطلب */
export async function restoreStockForOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getClient();
    const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, size")
        .eq("order_id", orderId);

    if (!items?.length) return { success: true };

    const { data: defaultWh } = await supabase.from("warehouses").select("id").limit(1).single();
    if (!defaultWh) return { success: true }; // Cannot restore to ERP if no warehouse

    for (const item of items) {
        if (!item.product_id) continue;

        let skuQuery = supabase.from("product_skus").select("id").eq("product_id", item.product_id);
        if (item.size) {
            skuQuery = skuQuery.ilike("size", item.size);
        }

        const { data: skus } = await skuQuery;
        const skuId = skus && skus.length > 0 ? skus[0].id : null;

        if (!skuId) {
            const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).single();
            if (product && product.stock_quantity != null) {
                const newQty = (product.stock_quantity || 0) + item.quantity;
                await supabase.from("products").update({ stock_quantity: newQty, in_stock: true }).eq("id", item.product_id);
            }
            continue;
        }

        // ERP Restore
        const { data: level } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", defaultWh.id)
            .single();

        const previousQuantity = level ? level.quantity : 0;
        const newQuantity = previousQuantity + item.quantity;

        await supabase.from("inventory_levels").upsert({
            sku_id: skuId,
            warehouse_id: defaultWh.id,
            quantity: newQuantity,
            updated_at: new Date().toISOString()
        }, { onConflict: "sku_id,warehouse_id" });

        await supabase.from("inventory_transactions").insert([{
            sku_id: skuId,
            warehouse_id: defaultWh.id,
            transaction_type: 'return',
            quantity_change: item.quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reference_id: orderId,
            notes: `Online Order Return #${orderId}`
        }]);

        // Update Sales Ledger status
        await supabase.from("sales_records")
            .update({ status: 'refunded', updated_at: new Date().toISOString() })
            .eq("order_id", orderId)
            .eq("sku_id", skuId);
    }
    return { success: true };
}
