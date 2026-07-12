"use server";

import { createClient } from "@supabase/supabase-js";
import {
    consumeSmartStoreReservationForOrder,
    restoreSmartStoreStockForOrder,
} from "./smart-store-inventory";
import { emitInventoryStockAlert } from "@/lib/operational-event-alerts";

function getClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

function normalizeVariantValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function normalizeColorVariantValue(value: unknown) {
    const normalized = normalizeVariantValue(value);
    if (!normalized) return null;
    return normalized.startsWith("#") ? normalized : `#${normalized}`;
}

function getSkuQuantity(sku: any) {
    const levels = Array.isArray(sku?.inventory_levels) ? sku.inventory_levels : [];
    return levels.reduce((sum: number, level: any) => sum + (Number(level?.quantity) || 0), 0);
}

/** التحقق من توفر المخزون — batch query لتقليل الـ round-trips */
export async function checkStockAvailability(
    items: { product_id: string | null; quantity: number; size?: string | null; color_code?: string | null }[]
): Promise<{ ok: boolean; error?: string; product?: string }> {
    const supabase = getClient();

    const productItems = items.filter((i) => i.product_id);
    if (!productItems.length) return { ok: true };

    const ids = productItems.map((i) => i.product_id as string);

    const { data: products, error } = await supabase
        .from("products")
        .select(`
            id, title, stock_quantity, in_stock,
            product_skus(
                id, size, color_code, is_active,
                inventory_levels(quantity)
            )
        `)
        .in("id", ids);

    if (error) return { ok: false, error: "خطأ في التحقق من المخزون" };

    const productMap = new Map((products || []).map((p) => [p.id, p]));

    for (const item of productItems) {
        const product = productMap.get(item.product_id!);
        if (!product) return { ok: false, error: "منتج غير موجود", product: item.product_id! };
        if (!product.in_stock) return { ok: false, error: `المنتج "${product.title}" غير متوفر`, product: product.title };

        const rawSkus = Array.isArray((product as any).product_skus) ? (product as any).product_skus : [];
        const skus = rawSkus.filter((sku: any) => sku.is_active !== false);
        if (rawSkus.length > 0) {
            if (skus.length === 0) {
                return { ok: false, error: `لا توجد خيارات نشطة للمنتج "${product.title}"`, product: product.title };
            }
            const hasSizeVariants = skus.some((sku: any) => normalizeVariantValue(sku.size));
            const hasColorVariants = skus.some((sku: any) => normalizeColorVariantValue(sku.color_code));
            const requestedSize = normalizeVariantValue(item.size);
            const requestedColor = normalizeColorVariantValue(item.color_code);

            if (hasSizeVariants && !requestedSize) {
                return { ok: false, error: `اختر مقاس المنتج "${product.title}"`, product: product.title };
            }

            if (hasColorVariants && !requestedColor) {
                return { ok: false, error: `اختر لون المنتج "${product.title}"`, product: product.title };
            }

            if (!hasColorVariants && requestedColor) {
                return { ok: false, error: `اللون المحدد غير متاح للمنتج "${product.title}"`, product: product.title };
            }

            const matchingSkus = skus.filter((sku: any) => {
                const skuSize = normalizeVariantValue(sku.size);
                const skuColor = normalizeColorVariantValue(sku.color_code);
                return (!hasSizeVariants || skuSize === requestedSize)
                    && (!hasColorVariants || skuColor === requestedColor);
            });

            if (matchingSkus.length === 0) {
                return { ok: false, error: `الخيار المحدد غير متاح للمنتج "${product.title}"`, product: product.title };
            }

            const available = matchingSkus.reduce((sum: number, sku: any) => sum + getSkuQuantity(sku), 0);
            if (available < item.quantity) {
                const optionLabel = [
                    item.size ? `المقاس ${item.size}` : null,
                    item.color_code ? `اللون ${item.color_code}` : null,
                ].filter(Boolean).join("، ");
                return {
                    ok: false,
                    error: `الكمية المطلوبة من "${product.title}" ${optionLabel ? `(${optionLabel}) ` : ""}تتجاوز المخزون (${available})`,
                    product: product.title,
                };
            }

            continue;
        }

        if (item.color_code) {
            return { ok: false, error: `اللون المحدد غير متاح للمنتج "${product.title}"`, product: product.title };
        }

        if (product.stock_quantity != null && product.stock_quantity < item.quantity) {
            return {
                ok: false,
                error: `الكمية المطلوبة من "${product.title}" تتجاوز المخزون (${product.stock_quantity})`,
                product: product.title,
            };
        }
    }
    return { ok: true };
}

/**
 * خصم مستوى المخزون بـ optimistic locking (3 محاولات).
 * يضمن عدم التعارض بين طلبين متزامنين على نفس الـ SKU.
 */
async function safeDecrementInventoryLevel(
    supabase: ReturnType<typeof getClient>,
    skuId: string,
    warehouseId: string,
    qty: number,
    orderId: string,
    itemSize: string | null,
    itemColor: string | null
): Promise<{ newQuantity: number; prevQuantity: number } | { error: string }> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const { data: level } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", warehouseId)
            .maybeSingle();

        const prevQty = level ? Number(level.quantity) : 0;

        if (prevQty < qty) {
            const optionLabel = [
                itemSize ? `المقاس ${itemSize}` : null,
                itemColor ? `اللون ${itemColor}` : null,
            ].filter(Boolean).join("، ");
            return { error: `المخزون غير كافٍ${optionLabel ? ` — ${optionLabel}` : ""} متاح: ${prevQty}، مطلوب: ${qty}` };
        }

        const newQty = prevQty - qty;

        // Optimistic lock: only update if quantity hasn't changed since we read it
        const { data: updated, error: updateErr } = await supabase
            .from("inventory_levels")
            .update({ quantity: newQty })
            .eq("sku_id", skuId)
            .eq("warehouse_id", warehouseId)
            .eq("quantity", prevQty)
            .select("quantity")
            .maybeSingle();

        if (!updateErr && updated) {
            // Record transaction
            const { error: transactionError } = await supabase.from("inventory_transactions").insert({
                sku_id: skuId,
                warehouse_id: warehouseId,
                transaction_type: "sale",
                quantity_change: -qty,
                previous_quantity: prevQty,
                new_quantity: newQty,
                reference_id: orderId,
                notes: `Online Sale Order #${orderId}`,
                operation_key: `${orderId}:${skuId}:sale`,
            } as never);
            if (transactionError) {
                await supabase
                    .from("inventory_levels")
                    .update({ quantity: prevQty })
                    .eq("sku_id", skuId)
                    .eq("warehouse_id", warehouseId)
                    .eq("quantity", newQty);
                return { error: "تعذر تسجيل حركة المخزون؛ تم التراجع عن الخصم" };
            }
            return { newQuantity: newQty, prevQuantity: prevQty };
        }
        // Concurrent write detected — retry
    }
    return { error: "فشل تحديث المخزون بعد 3 محاولات — تعارض متزامن" };
}

/** خصم المخزون عند تأكيد الطلب وتسجيله في سجل المبيعات */
export async function decrementStockForOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getClient();

    const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, size, color_code, unit_price, total_price, custom_design_order_id")
        .eq("order_id", orderId);

    if (!items?.length) return { success: true };

    const hasProductItems = items.some((item) => item.product_id);
    const { data: defaultWh } = hasProductItems
        ? await supabase.from("warehouses").select("id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle()
        : { data: null };
    if (hasProductItems && !defaultWh) return { success: false, error: "لا يوجد مستودع مسجل" };

    for (const item of items) {
        // ─── Smart Store (Custom Design) ────────────────────────────────
        if (!item.product_id && item.custom_design_order_id) {
            const { data: existingSale } = await supabase
                .from("sales_records")
                .select("id")
                .eq("order_id", orderId)
                .eq("sales_method", "custom_design")
                .eq("status", "completed")
                .maybeSingle();
            if (existingSale) continue;
            const result = await consumeSmartStoreReservationForOrder(supabase, item.custom_design_order_id, item.quantity);
            if ("error" in result) return { success: false, error: result.error };
            const { error: smartSaleError } = await supabase.from("sales_records").insert({
                sales_method: "custom_design",
                order_id: orderId,
                sku_id: null,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                status: "completed",
                notes: `Smart Store custom design #${item.custom_design_order_id}`,
            });
            if (smartSaleError) {
                await restoreSmartStoreStockForOrder(supabase, item.custom_design_order_id, item.quantity);
                return { success: false, error: "تعذر تسجيل حجز التصميم المخصص" };
            }
            continue;
        }

        if (!item.product_id) continue;
        if (!defaultWh) return { success: false, error: "لا يوجد مستودع مسجل" };

        // ─── Find SKU ────────────────────────────────────────────────────
        let skuQuery = supabase.from("product_skus").select("id, color_code").eq("product_id", item.product_id).eq("is_active", true);
        if (item.size) skuQuery = skuQuery.ilike("size", item.size);

        const { data: skuRows } = await skuQuery;
        const requestedColor = normalizeColorVariantValue(item.color_code);
        const skus = requestedColor
            ? (skuRows || []).filter((sku: any) => normalizeColorVariantValue(sku.color_code) === requestedColor)
            : skuRows;
        const skuId = skus && skus.length > 0 ? skus[0].id : null;

        // ─── Legacy fallback (no SKU) ────────────────────────────────────
        if (!skuId) {
            const legacySaleNote = `Legacy product #${item.product_id}`;
            const { data: existingLegacySale } = await supabase
                .from("sales_records")
                .select("id")
                .eq("order_id", orderId)
                .eq("notes", legacySaleNote)
                .eq("status", "completed")
                .maybeSingle();
            if (existingLegacySale) continue;
            const { data: product } = await supabase
                .from("products")
                .select("title, stock_quantity")
                .eq("id", item.product_id)
                .single();
            if (product && product.stock_quantity != null) {
                const newQty = Math.max(0, product.stock_quantity - item.quantity);
                await supabase
                    .from("products")
                    .update({ stock_quantity: newQty, in_stock: newQty > 0 })
                    .eq("id", item.product_id);
                const { error: legacySaleError } = await supabase.from("sales_records").insert({
                    sales_method: "online_store",
                    order_id: orderId,
                    sku_id: null,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    status: "completed",
                    notes: legacySaleNote,
                });
                if (legacySaleError) {
                    await supabase
                        .from("products")
                        .update({ stock_quantity: product.stock_quantity, in_stock: true })
                        .eq("id", item.product_id);
                    return { success: false, error: "تعذر تسجيل حجز مخزون المنتج" };
                }
                if (newQty <= 5) {
                    const stockTitle = newQty <= 0 ? "نفاد المخزون" : "تنبيه مخزون منخفض";
                    void emitInventoryStockAlert({
                        dispatchKey: `inventory:product:${item.product_id}:stock:${newQty <= 0 ? "out" : "low"}`,
                        title: stockTitle,
                        productTitle: product.title,
                        quantity: newQty,
                        metadata: {
                            product_id: item.product_id,
                            order_id: orderId,
                            source: "legacy_product_stock",
                        },
                    });
                }
            }
            continue;
        }

        // ─── ERP Decrement (with optimistic lock) ────────────────────────
        const { data: existingInventorySale } = await supabase
            .from("inventory_transactions")
            .select("id")
            .eq("reference_id", orderId)
            .eq("sku_id", skuId)
            .eq("transaction_type", "sale")
            .maybeSingle();
        if (existingInventorySale) continue;
        const result = await safeDecrementInventoryLevel(
            supabase,
            skuId,
            defaultWh.id,
            item.quantity,
            orderId,
            item.size,
            item.color_code
        );

        if ("error" in result) return { success: false, error: result.error };

        const { newQuantity } = result;

        // Record in sales ledger
        await supabase.from("sales_records").insert({
            sales_method: "online_store",
            order_id: orderId,
            sku_id: skuId,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            status: "completed",
            notes: "Automated Online Purchase",
        });

        // Sync product.in_stock if ERP hits zero
        if (newQuantity <= 0) {
            await supabase.from("products").update({ in_stock: false }).eq("id", item.product_id);
        }

        // Low stock alert
        if (newQuantity <= 5) {
            const { data: skuDetails } = await supabase
                .from("product_skus")
                .select("sku, products(title)")
                .eq("id", skuId)
                .single();
            if (skuDetails?.products) {
                const title = Array.isArray(skuDetails.products)
                    ? (skuDetails.products[0] as any)?.title
                    : (skuDetails.products as any)?.title;
                const stockTitle = newQuantity <= 0 ? "نفاد المخزون" : "تنبيه مخزون منخفض";
                void emitInventoryStockAlert({
                    dispatchKey: `inventory:sku:${skuId}:stock:${newQuantity <= 0 ? "out" : "low"}`,
                    title: stockTitle,
                    productTitle: title,
                    sku: skuDetails.sku,
                    size: item.size,
                    metadata: {
                        sku_id: skuId,
                        product_id: item.product_id,
                        order_id: orderId,
                        color_code: item.color_code ?? null,
                        source: "erp_inventory_level",
                    },
                    quantity: newQuantity,
                });
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
        .select("product_id, quantity, size, color_code, custom_design_order_id")
        .eq("order_id", orderId);

    if (!items?.length) return { success: true };

    const hasProductItems = items.some((item) => item.product_id);
    const { data: defaultWh } = hasProductItems
        ? await supabase.from("warehouses").select("id").eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle()
        : { data: null };

    for (const item of items) {
        // ─── Smart Store ─────────────────────────────────────────────────
        if (!item.product_id && item.custom_design_order_id) {
            const { data: completedSale } = await supabase
                .from("sales_records")
                .select("id")
                .eq("order_id", orderId)
                .eq("sales_method", "custom_design")
                .eq("status", "completed")
                .maybeSingle();
            if (!completedSale) continue;
            const result = await restoreSmartStoreStockForOrder(supabase, item.custom_design_order_id, item.quantity);
            if ("error" in result) return { success: false, error: result.error };
            await supabase
                .from("sales_records")
                .update({ status: "refunded" })
                .eq("order_id", orderId)
                .is("sku_id", null);
            continue;
        }

        if (!item.product_id) continue;
        if (!defaultWh) continue;

        // ─── Find SKU ────────────────────────────────────────────────────
        let skuQuery = supabase.from("product_skus").select("id, color_code").eq("product_id", item.product_id);
        if (item.size) skuQuery = skuQuery.ilike("size", item.size);

        const { data: skuRows } = await skuQuery;
        const requestedColor = normalizeColorVariantValue(item.color_code);
        const skus = requestedColor
            ? (skuRows || []).filter((sku: any) => normalizeColorVariantValue(sku.color_code) === requestedColor)
            : skuRows;
        const skuId = skus && skus.length > 0 ? skus[0].id : null;

        // ─── Legacy fallback ─────────────────────────────────────────────
        if (!skuId) {
            const legacySaleNote = `Legacy product #${item.product_id}`;
            const { data: completedLegacySale } = await supabase
                .from("sales_records")
                .select("id")
                .eq("order_id", orderId)
                .eq("notes", legacySaleNote)
                .eq("status", "completed")
                .maybeSingle();
            if (!completedLegacySale) continue;
            const { data: product } = await supabase
                .from("products")
                .select("stock_quantity")
                .eq("id", item.product_id)
                .single();
            if (product && product.stock_quantity != null) {
                const newQty = (product.stock_quantity || 0) + item.quantity;
                await supabase
                    .from("products")
                    .update({ stock_quantity: newQty, in_stock: true })
                    .eq("id", item.product_id);
                await supabase
                    .from("sales_records")
                    .update({ status: "refunded" })
                    .eq("id", completedLegacySale.id);
            }
            continue;
        }

        // ─── ERP Restore ─────────────────────────────────────────────────
        const [{ data: saleTransaction }, { data: returnTransaction }] = await Promise.all([
            supabase.from("inventory_transactions").select("id").eq("reference_id", orderId).eq("sku_id", skuId).eq("transaction_type", "sale").maybeSingle(),
            supabase.from("inventory_transactions").select("id").eq("reference_id", orderId).eq("sku_id", skuId).eq("transaction_type", "return").maybeSingle(),
        ]);
        if (!saleTransaction || returnTransaction) continue;
        const { data: level } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", defaultWh.id)
            .maybeSingle();

        const prevQty = level ? Number(level.quantity) : 0;
        const newQty = prevQty + item.quantity;

        await supabase.from("inventory_levels").upsert(
            { sku_id: skuId, warehouse_id: defaultWh.id, quantity: newQty },
            { onConflict: "sku_id,warehouse_id" }
        );

        const { error: returnTransactionError } = await supabase.from("inventory_transactions").insert({
            sku_id: skuId,
            warehouse_id: defaultWh.id,
            transaction_type: "return",
            quantity_change: item.quantity,
            previous_quantity: prevQty,
            new_quantity: newQty,
            reference_id: orderId,
            notes: `Online Order Return #${orderId}`,
            operation_key: `${orderId}:${skuId}:return`,
        } as never);
        if (returnTransactionError) {
            await supabase.from("inventory_levels").update({ quantity: prevQty })
                .eq("sku_id", skuId)
                .eq("warehouse_id", defaultWh.id)
                .eq("quantity", newQty);
            return { success: false, error: "تعذر تسجيل إعادة المخزون؛ تم التراجع عن الإعادة" };
        }

        // Restore product.in_stock
        await supabase.from("products").update({ in_stock: true }).eq("id", item.product_id);

        await supabase
            .from("sales_records")
            .update({ status: "refunded" })
            .eq("order_id", orderId)
            .eq("sku_id", skuId);
    }

    return { success: true };
}
