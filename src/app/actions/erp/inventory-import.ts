"use server";

import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { ProductType } from "@/types/database";

export async function processSmartImport(payload: any[]) {
    try {
        const user = await getCurrentUserOrDevAdmin();
        if (!user) return { success: false, error: "غير مصرح" };

        const supabase = getSupabaseAdminClient();

        const { profile, isAdmin } = await resolveAdminAccess(user);
        if (!profile || !isAdmin) return { success: false, error: "صلاحيات غير كافية" };

        let insertedCount = 0;
        let errors: string[] = [];

        // Sizes mapped in the UI:
        const sizeKeys = ["size_xs", "size_s", "size_m", "size_l", "size_xl", "size_xxl", "size_xxxl", "size_xxxxl"];

        for (const row of payload) {
            try {
                if (!row.title) continue;

                const basePrice = row.price ? Number(row.price) : 0;
                let parsedType = row.type ? String(row.type).toLowerCase().trim() : "apparel";
                const acceptedTypes: ProductType[] = ["apparel", "print", "nft", "digital", "original"];
                if (!acceptedTypes.includes(parsedType as ProductType)) parsedType = "apparel";
                
                let isApparel = parsedType === "apparel";

                // Check if product exists (by exact title)
                const { data: existing } = await supabase
                    .from("products")
                    .select("id, type")
                    .eq("title", row.title.trim())
                    .single();

                let productId = existing?.id;

                if (!productId) {
                    // Create new Product
                    const { data: newProd, error: insertErr } = await supabase
                        .from("products")
                        .insert({
                            title: row.title.trim(),
                            type: parsedType as ProductType,
                            price: basePrice > 0 ? basePrice : 100, // Safe default
                            description: "مستورد تلقائياً",
                            is_featured: false,
                            in_stock: true,
                            artist_id: profile.id, // Assign to current admin by default
                            store_name: row.store || "WUSHA",
                            base_stock_quantity: isApparel ? 0 : (row.total ? Number(row.total) : 0)
                        } as any)
                        .select("id")
                        .single();

                    if (insertErr) throw insertErr;
                    productId = newProd.id;
                }

                // Inventory SKUs Parsing (Only if Apparel)
                if (isApparel) {
                    for (const sKey of sizeKeys) {
                        const qtyValue = row[sKey];
                        if (qtyValue !== undefined && qtyValue !== null && qtyValue !== "") {
                            const qty = parseInt(qtyValue.toString(), 10);
                            if (!isNaN(qty) && qty > 0) {
                                const friendlySizeName = sKey.replace("size_", "").toUpperCase();
                                
                                // Fetch existing SKU for this size if exists
                                const { data: existingSku } = await supabase
                                    .from("skus" as any)
                                    .select("id, stock_quantity")
                                    .eq("product_id", productId)
                                    .eq("size", friendlySizeName)
                                    .single();

                                if (existingSku) {
                                     // Add to existing stock instead of overwrite (Optional logic based on client needs, but adding is safer for restocks)
                                    await supabase
                                        .from("skus" as any)
                                        .update({ stock_quantity: (existingSku as any).stock_quantity + qty })
                                        .eq("id", (existingSku as any).id);
                                } else {
                                    // Generate distinct internal identifier
                                    const autoSkuStr = `${row.title.substring(0, 3).toUpperCase()}-${friendlySizeName}-${Date.now().toString().slice(-4)}`;
                                    await supabase
                                        .from("skus" as any)
                                        .insert({
                                            product_id: productId,
                                            size: friendlySizeName,
                                            sku: autoSkuStr,
                                            stock_quantity: qty,
                                            color_code: "default",
                                            barcode_url: null
                                        });
                                }
                            }
                        }
                    }

                    // Recalculate dynamic max stock via RPC or direct summation 
                    const { data: updatedSkus } = await supabase
                         .from("skus" as any)
                         .select("stock_quantity")
                         .eq("product_id", productId);
                    
                    const totalApparelStock = updatedSkus?.reduce((sum: number, item: any) => sum + (item.stock_quantity || 0), 0) || 0;
                    
                    await supabase
                        .from("products")
                        .update({ stock_quantity: totalApparelStock })
                        .eq("id", productId);
                }

                insertedCount++;
            } catch (err: any) {
                errors.push(`خطأ في المنتج [${row.title}]: ${err.message}`);
            }
        }

        revalidatePath("/dashboard/products-inventory");
        revalidatePath("/dashboard/products");
        revalidatePath("/dashboard/inventory");
        
        return { success: true, insertedCount, errors };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
