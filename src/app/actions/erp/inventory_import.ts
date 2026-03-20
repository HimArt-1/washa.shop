"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";

interface ImportPayload {
    warehouseId: string;
    items: {
        title: string;
        sizes: { [size: string]: number };
    }[];
    columns: string[]; // List of size names
}

async function reportInventoryImportAlert(params: {
    dispatchKey: string;
    title: string;
    message: string;
    severity: "warning" | "critical";
    metadata?: Record<string, unknown>;
    bucketMs?: number;
    stack?: string | null;
}) {
    await reportAdminOperationalAlert({
        dispatchKey: params.dispatchKey,
        bucketMs: params.bucketMs,
        category: "system",
        severity: params.severity,
        title: params.title,
        message: params.message,
        link: "/dashboard/products-inventory",
        source: "erp.inventory_import",
        metadata: params.metadata,
        stack: params.stack,
    });
}

async function requireInventoryImportAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        return { error: "غير مصرح" as const };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        return { error: "إعدادات المخزون غير مكتملة" as const };
    }

    const supabase = createClient(
        url,
        key,
        { auth: { persistSession: false } }
    );
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (profile?.role !== "admin") {
        await reportAdminOperationalAlert({
            dispatchKey: `inventory_import:unauthorized:${user.id}`,
            bucketMs: 30 * 60 * 1000,
            category: "security",
            severity: "warning",
            title: "محاولة غير مصرح بها لاستيراد المخزون",
            message: "تم رفض محاولة تشغيل استيراد المخزون من مستخدم لا يحمل صلاحية admin.",
            link: "/dashboard/products-inventory",
            source: "erp.inventory_import.auth",
            metadata: {
                clerk_id: user.id,
                role: profile?.role ?? null,
            },
        });
        return { error: "صلاحيات غير كافية" as const };
    }

    return { supabase, profile };
}

export async function inventoryImportAction(payload: ImportPayload) {
    console.log("Starting Smart Inventory Import...", payload.items.length, "items");
    
    try {
        const adminAccess = await requireInventoryImportAdmin();
        if ("error" in adminAccess) {
            return {
                success: false,
                message: adminAccess.error ?? "صلاحيات غير كافية",
                logs: [] as string[],
            };
        }

        const supabaseAdmin = adminAccess.supabase;
        const warehouseId = payload.warehouseId.trim();
        const items = Array.isArray(payload.items) ? payload.items : [];
        const columns = Array.from(
            new Set((Array.isArray(payload.columns) ? payload.columns : []).map((column) => column.trim()).filter(Boolean))
        );

        if (!warehouseId) {
            return { success: false, message: "يجب تحديد المستودع", logs: [] as string[] };
        }

        if (!items.length || !columns.length) {
            return { success: false, message: "ملف الاستيراد لا يحتوي على بيانات صالحة", logs: [] as string[] };
        }
        
        let productsCreated = 0;
        let skusCreated = 0;
        let inventoryUpdates = 0;
        const partialIssues: string[] = [];

        // Iterate over imported rows
        for (const item of items) {
            const productTitle = item.title.trim() || 'منتج مستورد بدون اسم';
            
            // 1) Find or Create Product
            let { data: existingProduct, error: productError } = await supabaseAdmin
                .from('products')
                .select('id, title, sizes')
                .ilike('title', productTitle)
                .limit(1)
                .single();

            let productId = existingProduct?.id;
            let currentProductSizes = existingProduct?.sizes || [];

            if (!productId || productError?.code === 'PGRST116') { // PGRST116 = Not found
                // Create New Product
                const { data: newProduct, error: createError } = await supabaseAdmin
                    .from('products')
                    .insert({
                        title: productTitle,
                        description: 'تمت إضافته عبر الاستيراد الذكي',
                        price: 0,
                        type: 'apparel',
                        is_featured: false,
                        in_stock: true,
                        store_name: 'WUSHA',
                        stock_quantity: 0,
                        shipping_time: '1-3 Days',
                        sizes: columns // Set initial available sizes
                    })
                    .select('id')
                    .single();

                if (createError) throw new Error(`Product Creation failed for ${productTitle}: ${createError.message}`);
                productId = newProduct.id;
                productsCreated++;
            } else {
                // Ensure the product has these sizes in its `sizes` array if they aren't there
                const missingSizes = columns.filter(c => !currentProductSizes.includes(c));
                if (missingSizes.length > 0) {
                    const { error: updateSizesError } = await supabaseAdmin
                        .from('products')
                        .update({ sizes: [...currentProductSizes, ...missingSizes] })
                        .eq('id', productId);
                    if (updateSizesError) {
                        throw new Error(`Product size sync failed for ${productTitle}: ${updateSizesError.message}`);
                    }
                }
            }

            // 2) Process each size quantity in the row
            for (const sizeName of columns) {
                const qty = item.sizes[sizeName] || 0;
                
                // Only process if quantity is valid and non-zero
                // Actually, let's process 0s if they specifically requested it, but usually better to skip
                if (qty === 0) continue; 

                // Generate a predictable SKU format
                // WSH-{PRODUCT_ID_PREFIX}-{SIZE}
                const skuCode = `WSH-${productId.substring(0, 5).toUpperCase()}-${sizeName.toUpperCase()}`;

                // Find or Create SKU
                let { data: skuData, error: skuSearchError } = await supabaseAdmin
                    .from('skus')
                    .select('id')
                    .eq('product_id', productId)
                    .eq('size', sizeName)
                    .limit(1)
                    .single();

                let skuId = skuData?.id;

                if (!skuId || skuSearchError?.code === 'PGRST116') {
                    // Try to insert
                    const { data: newSku, error: skuInsertError } = await supabaseAdmin
                        .from('skus')
                        .insert({
                            product_id: productId,
                            sku: skuCode,
                            size: sizeName,
                            color_code: 'N/A'
                        })
                        .select('id')
                        .single();

                    if (skuInsertError) {
                        console.error("SKU Insert Error:", skuInsertError);
                        const { data: existingSkuAfterFailure, error: existingSkuAfterFailureError } = await supabaseAdmin
                            .from('skus')
                            .select('id')
                            .eq('product_id', productId)
                            .eq('size', sizeName)
                            .limit(1)
                            .single();

                        if (existingSkuAfterFailure && !existingSkuAfterFailureError) {
                            skuId = existingSkuAfterFailure.id;
                        } else {
                            partialIssues.push(`تعذر إنشاء SKU للمقاس ${sizeName} في المنتج ${productTitle}`);
                            continue;
                        }
                    }
                    if (!skuId) {
                        skuId = newSku?.id;
                        if (skuId) {
                            skusCreated++;
                        }
                    }
                }

                if (!skuId) {
                    partialIssues.push(`لم يتم العثور على SKU صالح للمقاس ${sizeName} في المنتج ${productTitle}`);
                    continue;
                }

                // 3) Add Inventory
                // Check if an inventory record exists for this warehouse
                let { data: invData, error: invSearchError } = await supabaseAdmin
                    .from('inventory')
                    .select('id, quantity')
                    .eq('sku_id', skuId)
                    .eq('warehouse_id', warehouseId)
                    .limit(1)
                    .single();

                if (invData && !invSearchError) {
                    // Update existing
                    const { error: inventoryUpdateError } = await supabaseAdmin
                        .from('inventory')
                        .update({ quantity: invData.quantity + qty })
                        .eq('id', invData.id);
                    if (inventoryUpdateError) {
                        throw new Error(`Inventory update failed for ${productTitle}/${sizeName}: ${inventoryUpdateError.message}`);
                    }
                        
                    // Log the movement
                    const { error: movementInsertError } = await supabaseAdmin.from('inventory_movements').insert({
                        sku_id: skuId,
                        warehouse_id: warehouseId,
                        movement_type: 'addition', // It's an import addition
                        quantity: qty,
                        notes: `استيراد ذكي: إضافة ${qty}`
                    });
                    if (movementInsertError) {
                        throw new Error(`Inventory movement log failed for ${productTitle}/${sizeName}: ${movementInsertError.message}`);
                    }
                } else {
                    // Insert new inventory record
                    const { error: inventoryInsertError } = await supabaseAdmin
                        .from('inventory')
                        .insert({
                            sku_id: skuId,
                            warehouse_id: warehouseId,
                            quantity: qty,
                            reorder_point: 5,
                            status: 'available'
                        });
                    if (inventoryInsertError) {
                        throw new Error(`Inventory insert failed for ${productTitle}/${sizeName}: ${inventoryInsertError.message}`);
                    }
                        
                    // Log the movement
                    const { error: movementInsertError } = await supabaseAdmin.from('inventory_movements').insert({
                        sku_id: skuId,
                        warehouse_id: warehouseId,
                        movement_type: 'initial',
                        quantity: qty,
                        notes: `استيراد ذكي: رصيد افتتاحي ${qty}`
                    });
                    if (movementInsertError) {
                        throw new Error(`Initial inventory movement log failed for ${productTitle}/${sizeName}: ${movementInsertError.message}`);
                    }
                }
                
                inventoryUpdates++;
            }
        }

        revalidatePath('/dashboard/products-inventory');
        revalidatePath('/dashboard/products');

        if (partialIssues.length > 0) {
            await reportInventoryImportAlert({
                dispatchKey: `inventory_import:partial_issues:${warehouseId}`,
                bucketMs: 30 * 60 * 1000,
                title: "استيراد المخزون اكتمل مع تحذيرات",
                message: `اكتمل استيراد المخزون لكن مع ${partialIssues.length} مشكلة جزئية تحتاج مراجعة.`,
                severity: "warning",
                metadata: {
                    warehouse_id: warehouseId,
                    imported_rows: items.length,
                    products_created: productsCreated,
                    skus_created: skusCreated,
                    inventory_updates: inventoryUpdates,
                    issues: partialIssues.slice(0, 10),
                },
            });
        }
        
        return {
            success: true,
            message: partialIssues.length > 0
                ? `تم الاستيراد مع تحذيرات. تم إنشاء ${productsCreated} منتج جديد، توليد ${skusCreated} رمز SKU، وتنفيذ ${inventoryUpdates} عملية تحديث للمخزون.`
                : `تم الاستيراد بنجاح! تم إنشاء ${productsCreated} منتج جديد، توليد ${skusCreated} رمز SKU، وتنفيذ ${inventoryUpdates} عملية تحديث للمخزون.`,
            logs: partialIssues,
        };

    } catch (err: unknown) {
        console.error("Import error:", err);
        await reportInventoryImportAlert({
            dispatchKey: `inventory_import:failed:${payload.warehouseId || "unknown"}`,
            bucketMs: 15 * 60 * 1000,
            title: "فشل استيراد المخزون",
            message: "فشل مسار استيراد المخزون قبل إكمال جميع التحديثات المطلوبة.",
            severity: "critical",
            metadata: {
                warehouse_id: payload.warehouseId || null,
                item_count: Array.isArray(payload.items) ? payload.items.length : 0,
                column_count: Array.isArray(payload.columns) ? payload.columns.length : 0,
                error: err instanceof Error ? err.message : String(err),
            },
            stack: err instanceof Error ? err.stack ?? null : null,
        });
        return {
            success: false,
            message: "حدث خطأ غير متوقع",
            logs: [err instanceof Error ? err.message : "Unknown import error"],
        };
    }
}
