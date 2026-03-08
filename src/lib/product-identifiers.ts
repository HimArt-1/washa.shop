/**
 * وشّى | WASHA — Product Identifiers
 * نظام معرفات المنتجات والـ SKU — قوالب قابلة للتخصيص وتوليد ذري
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function getAdminSb() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export interface IdentifierTemplateConfig {
    product_code_template: string;
    sku_template: string;
    prefix: string;
    type_map: Record<string, string>;
    default_size: string;
    default_color: string;
}

const DEFAULT_CONFIG: IdentifierTemplateConfig = {
    product_code_template: "{PREFIX}-{SEQ:5}",
    sku_template: "{PREFIX}-{TYPE}-{SEQ:5}-{SIZE}-{COLOR}",
    prefix: "WSH",
    type_map: { print: "P", apparel: "T", digital: "D", nft: "N", original: "O" },
    default_size: "NA",
    default_color: "NA",
};

/**
 * جلب إعدادات قالب المعرفات من site_settings
 */
export async function getIdentifierConfig(): Promise<IdentifierTemplateConfig> {
    const supabase = getAdminSb();
    const { data } = await (supabase as any)
        .from("site_settings")
        .select("value")
        .eq("key", "product_identifiers")
        .maybeSingle();
    const val = (data as { value?: Record<string, unknown> } | null)?.value;
    if (!val) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...(val as Partial<IdentifierTemplateConfig>) };
}

/**
 * توليد رمز SKU فريد عبر دالة PostgreSQL (تسلسل ذري)
 * يُستخدم عند إنشاء منتج أو إضافة SKU يدوياً
 */
export async function generateNextSKU(
    productType: string,
    size?: string | null,
    color?: string | null
): Promise<{ sku: string } | { error: string }> {
    const supabase = getAdminSb() as any;
    const { data, error } = await supabase.rpc("generate_sku", {
        p_product_type: productType || "original",
        p_size: size || null,
        p_color: color || null,
    });
    if (error) return { error: error.message };
    return { sku: data as string };
}

/**
 * الحصول على معرفات وحدات لطباعة ملصقات (معرف فريد لكل قطعة)
 * مثال: 100 قطعة → WSH-P-00001-NA-NA-00001 ... WSH-P-00001-NA-NA-00100
 */
export async function getUnitSerialsForPrint(
    skuId: string,
    count: number
): Promise<{ codes: string[] } | { error: string }> {
    if (count < 1 || count > 999) return { error: "الكمية يجب أن تكون بين 1 و 999" };
    const supabase = getAdminSb() as any;
    const { data, error } = await supabase.rpc("get_next_unit_serials", {
        p_sku_id: skuId,
        p_count: count,
    });
    if (error) return { error: error.message };
    const codes = (data || []).map((r: { unit_code: string }) => r.unit_code);
    return { codes };
}

/**
 * توليد معرف منتج (للتحقق من وجود الدالة)
 */
export async function generateNextProductCode(): Promise<{ code: string } | { error: string }> {
    const supabase = getAdminSb() as any;
    const { data, error } = await supabase.rpc("generate_product_code");
    if (error) return { error: error.message };
    return { code: data as string };
}
