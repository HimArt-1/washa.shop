"use server";

import { createClient } from "@supabase/supabase-js";
import { Database, SalesMethodType } from "@/types/database";
import { reportAdminOperationalAlert } from "@/lib/admin-operational-alerts";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";

// ─── Payment Methods ──────────────────────────────────────────
export type PaymentMethod = "cash" | "card" | "mada" | "apple_pay" | "other";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "نقداً",
    card: "بطاقة ائتمان",
    mada: "مدى",
    apple_pay: "Apple Pay",
    other: "أخرى",
};

// ─── Supabase Admin Client ────────────────────────────────────
function getAdminSb() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
    );
}

// ─── RBAC: booth + admin + dev + financial_manager ────────────
const SALES_ROLES = ["admin", "dev", "booth", "financial_manager"] as const;

async function verifySalesAccess() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return { user: null, profile: null, hasAccess: false };
    const supabase = getAdminSb();
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, display_name")
        .eq("clerk_id", user.id)
        .single();
    const hasAccess = SALES_ROLES.includes(profile?.role as any);
    return { user, profile, hasAccess };
}

// ─── Get Sales Records ────────────────────────────────────────
export async function getSalesRecords(method?: SalesMethodType) {
    const { hasAccess } = await verifySalesAccess();
    if (!hasAccess) return { error: "غير مصرح" };

    const supabase = getAdminSb();
    let query = supabase
        .from("sales_records")
        .select("*, sku:product_skus(sku, size, color_code, product:products(title, image_url, price))")
        .order("created_at", { ascending: false });

    if (method) query = query.eq("sales_method", method);

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { records: data };
}

// ─── Record Manual Sale (POS Booth) ──────────────────────────
export async function recordManualSale(
    skuId: string,
    quantity: number,
    totalPrice: number,
    warehouseId: string,
    paymentMethod: PaymentMethod,
    notes?: string
) {
    const { profile, hasAccess } = await verifySalesAccess();
    if (!hasAccess) return { error: "غير مصرح — يجب أن تكون موظف بوث أو مدير" };

    const supabase = getAdminSb();

    try {
        const paymentLabel = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
        const fullNotes = `💳 طريقة الدفع: ${paymentLabel}${notes ? `\n📝 ${notes}` : ""}`;

        // 1. Validate SKU
        const { data: sku } = await supabase
            .from("product_skus")
            .select("id, sku, product:products(title, price)")
            .eq("id", skuId)
            .single();

        if (!sku) return { error: "المنتج المحدد غير موجود" };

        // 2. Check inventory availability
        const { data: currentLevel } = await supabase
            .from("inventory_levels")
            .select("quantity")
            .eq("sku_id", skuId)
            .eq("warehouse_id", warehouseId)
            .single();

        const previousQuantity = currentLevel?.quantity ?? 0;
        if (previousQuantity < quantity) {
            return { error: `المخزون غير كافٍ. المتوفر: ${previousQuantity} قطعة فقط` };
        }

        const newQuantity = previousQuantity - quantity;
        const unitPrice = totalPrice / quantity;

        // 3. Record Sale
        const { data: sale, error: saleError } = await supabase
            .from("sales_records")
            .insert({
                sales_method: "booth_manual",
                sku_id: skuId,
                quantity,
                unit_price: unitPrice,
                total_price: totalPrice,
                status: "completed",
                notes: fullNotes,
                created_by: profile?.id ?? null,
            })
            .select()
            .single();

        if (saleError) throw saleError;

        // 4. Deduct Inventory
        const { error: upsertError } = await supabase
            .from("inventory_levels")
            .upsert(
                { sku_id: skuId, warehouse_id: warehouseId, quantity: newQuantity },
                { onConflict: "sku_id,warehouse_id" }
            );

        if (upsertError) throw upsertError;

        // 5. Log Inventory Transaction
        await supabase.from("inventory_transactions").insert({
            sku_id: skuId,
            warehouse_id: warehouseId,
            transaction_type: "sale",
            quantity_change: -quantity,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            reference_id: sale.id,
            notes: `POS Booth — ${paymentLabel} — بواسطة: ${profile?.display_name ?? "غير محدد"}`,
            created_by: profile?.id ?? null,
        });

        return {
            success: true,
            sale: {
                ...sale,
                sku,
                payment_method: paymentMethod,
                payment_label: paymentLabel,
                seller_name: profile?.display_name ?? null,
            },
        };
    } catch (e: unknown) {
        const err = e as Error;
        console.error("Sale error", err);
        await reportAdminOperationalAlert({
            dispatchKey: `erp:record_manual_sale_failed:${skuId}:${warehouseId}`,
            bucketMs: 15 * 60 * 1000,
            category: "orders",
            severity: "warning",
            title: "فشل تسجيل بيع يدوي (POS)",
            message: `تعذر تسجيل عملية بيع يدوية — ${err.message}`,
            source: "erp.sales.record_manual",
            link: "/dashboard/sales",
            resourceType: "sale",
            resourceId: skuId,
            metadata: { skuId, warehouseId, quantity, totalPrice, paymentMethod, error: err.message },
            stack: err.stack ?? null,
        });
        return { error: err.message || "حدث خطأ أثناء تسجيل المبيعات" };
    }
}
