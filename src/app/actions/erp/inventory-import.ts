"use server";

import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { ProductType } from "@/types/database";

const SIZE_KEYS = ["size_xs", "size_s", "size_m", "size_l", "size_xl", "size_xxl", "size_xxxl", "size_xxxxl"];
const ACCEPTED_TYPES: ProductType[] = ["apparel", "print", "nft", "digital", "original"];

export async function processSmartImport(payload: any[]) {
    try {
        const user = await getCurrentUserOrDevAdmin();
        if (!user) return { success: false, error: "غير مصرح" };

        const supabase = getSupabaseAdminClient();

        const { profile, isAdmin } = await resolveAdminAccess(user);
        if (!profile || !isAdmin) return { success: false, error: "صلاحيات غير كافية" };

        // Get or create default warehouse for import
        let { data: warehouse } = await supabase
            .from("warehouses")
            .select("id")
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

        if (!warehouse) {
            const { data: newWh, error: whErr } = await supabase
                .from("warehouses")
                .insert({ name: "المستودع الرئيسي", location: null, is_active: true })
                .select("id")
                .single();
            if (whErr) return { success: false, error: `فشل إنشاء المستودع: ${whErr.message}` };
            warehouse = newWh;
        }

        const warehouseId = warehouse.id;
        let insertedCount = 0;
        const errors: string[] = [];

        for (const row of payload) {
            try {
                if (!row.title) continue;

                const basePrice = row.price ? Number(row.price) : 0;
                let parsedType = row.type ? String(row.type).toLowerCase().trim() : "apparel";
                if (!ACCEPTED_TYPES.includes(parsedType as ProductType)) parsedType = "apparel";
                const isApparel = parsedType === "apparel";

                // Find or create product
                const { data: existing } = await supabase
                    .from("products")
                    .select("id, type")
                    .eq("title", row.title.trim())
                    .maybeSingle();

                let productId = existing?.id;

                if (!productId) {
                    const { data: newProd, error: insertErr } = await supabase
                        .from("products")
                        .insert({
                            title: row.title.trim(),
                            type: parsedType as ProductType,
                            price: basePrice > 0 ? basePrice : 100,
                            description: "مستورد تلقائياً",
                            is_featured: false,
                            in_stock: true,
                            artist_id: profile.id,
                            stock_quantity: isApparel ? 0 : (row.total ? Number(row.total) : 0),
                        } as any)
                        .select("id")
                        .single();

                    if (insertErr) throw insertErr;
                    productId = newProd.id;
                }

                if (isApparel) {
                    let totalImported = 0;

                    for (const sKey of SIZE_KEYS) {
                        const qtyValue = row[sKey];
                        if (qtyValue === undefined || qtyValue === null || qtyValue === "") continue;
                        const qty = parseInt(String(qtyValue), 10);
                        if (isNaN(qty) || qty <= 0) continue;

                        const sizeName = sKey.replace("size_", "").toUpperCase();

                        // Find or create SKU in product_skus
                        const { data: existingSku } = await supabase
                            .from("product_skus")
                            .select("id")
                            .eq("product_id", productId)
                            .ilike("size", sizeName)
                            .maybeSingle();

                        let skuId: string;

                        if (existingSku) {
                            skuId = existingSku.id;
                        } else {
                            const autoSku = `${String(row.title).substring(0, 3).toUpperCase()}-${sizeName}-${Date.now().toString().slice(-4)}`;
                            const { data: newSku, error: skuErr } = await supabase
                                .from("product_skus")
                                .insert({ product_id: productId, sku: autoSku, size: sizeName, color_code: null })
                                .select("id")
                                .single();
                            if (skuErr) throw skuErr;
                            skuId = newSku.id;
                        }

                        // Read current inventory level
                        const { data: currentLevel } = await supabase
                            .from("inventory_levels")
                            .select("quantity")
                            .eq("sku_id", skuId)
                            .eq("warehouse_id", warehouseId)
                            .maybeSingle();

                        const prevQty = currentLevel ? Number(currentLevel.quantity) : 0;
                        const newQty = prevQty + qty;

                        // Upsert inventory level
                        const { error: levelErr } = await supabase
                            .from("inventory_levels")
                            .upsert(
                                { sku_id: skuId, warehouse_id: warehouseId, quantity: newQty },
                                { onConflict: "sku_id,warehouse_id" }
                            );
                        if (levelErr) throw levelErr;

                        // Record transaction
                        await supabase.from("inventory_transactions").insert({
                            sku_id: skuId,
                            warehouse_id: warehouseId,
                            transaction_type: "addition",
                            quantity_change: qty,
                            previous_quantity: prevQty,
                            new_quantity: newQty,
                            notes: `استيراد ذكي — ${row.title}`,
                            created_by: profile.id,
                        });

                        totalImported += qty;
                    }

                    // Sync product.in_stock and stock_quantity
                    if (totalImported > 0) {
                        await supabase
                            .from("products")
                            .update({ in_stock: true, stock_quantity: totalImported })
                            .eq("id", productId);
                    }
                } else if (row.total) {
                    // Non-apparel: simple stock_quantity on product
                    const qty = Number(row.total);
                    if (qty > 0) {
                        await supabase
                            .from("products")
                            .update({ stock_quantity: qty, in_stock: true })
                            .eq("id", productId);
                    }
                }

                insertedCount++;
            } catch (err: any) {
                errors.push(`خطأ في [${row.title}]: ${err.message}`);
            }
        }

        revalidatePath("/dashboard/products-inventory");
        revalidatePath("/dashboard/products");
        revalidatePath("/dashboard/inventory");
        revalidatePath("/store");

        return { success: true, insertedCount, errors };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
