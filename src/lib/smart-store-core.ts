import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignOptionCompatibility,
    CustomDesignOrder,
    CustomDesignOrderStatus,
    CustomDesignPreset,
    CustomDesignSize,
    CustomDesignStudioItem,
    CustomDesignStyle,
    Database,
    DesignPricingSnapshotClassic,
} from "@/types/database";
import {
    type DesignMethod,
    type PrintPosition,
    type PrintSize,
    type SmartStoreOptionType,
    normalizeColorTokens,
    normalizeDesignMetadata,
} from "@/lib/design-intelligence";

export type SmartStoreSb = SupabaseClient<Database>;

export type DesignResultField =
    | "result_design_url"
    | "result_mockup_url"
    | "result_pdf_url"
    | "modification_design_url";

export type GarmentPricing = {
    base_price: number;
    price_chest_large: number;
    price_chest_small: number;
    price_back_large: number;
    price_back_small: number;
    price_shoulder_large: number;
    price_shoulder_small: number;
};

export type ResolvedDesignOrderSelections = {
    garmentId: string | null;
    garmentName: string;
    garmentImageUrl: string | null;
    colorId: string | null;
    colorName: string;
    colorHex: string;
    colorImageUrl: string | null;
    sizeId: string | null;
    sizeName: string;
    pricingSnapshot: DesignPricingSnapshotClassic;
};

export type ResolvedDesignCreativeSelections = {
    styleId: string | null;
    styleName: string | null;
    styleImageUrl: string | null;
    artStyleId: string | null;
    artStyleName: string | null;
    artStyleImageUrl: string | null;
    colorPackageId: string | null;
    colorPackageName: string | null;
    studioItemId: string | null;
    studioItemName: string | null;
    studioItemImageUrl: string | null;
};

const DESIGN_RESULT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DESIGN_RESULT_PDF_TYPES = ["application/pdf"];
export const DESIGN_RESULT_MAX_SIZE = 8 * 1024 * 1024;
export const SMART_STORE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const SMART_STORE_IMAGE_MAX_SIZE = 8 * 1024 * 1024;

const DESIGN_ORDER_STATUS_TRANSITIONS: Record<CustomDesignOrderStatus, CustomDesignOrderStatus[]> = {
    new: ["in_progress", "cancelled"],
    in_progress: ["awaiting_review", "cancelled"],
    awaiting_review: ["completed", "in_progress"],
    completed: [],
    cancelled: [],
    modification_requested: ["in_progress", "cancelled"],
};

export const EMPTY_GARMENT_PRICING: GarmentPricing = {
    base_price: 0,
    price_chest_large: 0,
    price_chest_small: 0,
    price_back_large: 0,
    price_back_small: 0,
    price_shoulder_large: 0,
    price_shoulder_small: 0,
};

export function getDesignResultAllowedTypes(field: DesignResultField) {
    return field === "result_pdf_url" ? DESIGN_RESULT_PDF_TYPES : DESIGN_RESULT_IMAGE_TYPES;
}

export function getDesignResultPath(orderId: string, file: File) {
    const ext = file.name.split(".").pop()?.trim().toLowerCase() || (file.type === "application/pdf" ? "pdf" : "png");
    return `design-orders/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export function sanitizeSmartStoreFolder(folder: string) {
    return folder
        .trim()
        .replace(/[^a-zA-Z0-9/_-]/g, "-")
        .replace(/\/+/g, "/")
        .replace(/^\/|\/$/g, "");
}

export function sanitizeHttpUrl(url: unknown): string | null {
    if (typeof url !== "string") return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (trimmed.length > 2048 || /[\u0000-\u001F\u007F]/.test(trimmed)) return null;

    if (trimmed.startsWith("/")) return trimmed;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return trimmed;
    } catch {
        return null;
    }
}

export function buildSmartStoreImagePath(folder: string, file: File) {
    const ext = file.name.split(".").pop()?.trim().toLowerCase() || "png";
    const safeFolder = sanitizeSmartStoreFolder(folder) || "uploads";
    return `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export function sanitizePlainText(value: unknown, maxLength = 500): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, maxLength);
}

export function sanitizeHexColor(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return null;
    return trimmed;
}

export function parseNumberish(value: unknown, fallback = 0) {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNumericInput(value: FormDataEntryValue | null, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    return parseNumberish(typeof value === "string" ? value.trim() : value ?? fallback, fallback);
}

export function parsePositiveAmount(value: unknown): number | null {
    const parsed = parseNumberish(value, Number.NaN);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100) / 100;
}

export function getOptionalUrl(formData: FormData, key: string) {
    return sanitizeHttpUrl(formData.get(key));
}

export function getSmartStoreMetadataFormValues(formData: FormData) {
    return {
        creative_direction: formData.get("creative_direction"),
        energy: formData.get("energy"),
        complexity: formData.get("complexity"),
        luxury_tier: formData.get("luxury_tier"),
        story_hook: formData.get("story_hook"),
        palette_family: formData.get("palette_family"),
        keywords: formData.get("keywords"),
        moods: formData.get("moods"),
        audiences: formData.get("audiences"),
        placements: formData.get("placements"),
        recommended_methods: formData.get("recommended_methods"),
        notes: formData.get("notes"),
    };
}

export function hasOrderDeliverables(
    order: Pick<
        CustomDesignOrder,
        "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url"
    >
) {
    return Boolean(
        order.result_design_url ||
        order.result_mockup_url ||
        order.result_pdf_url ||
        order.modification_design_url
    );
}

export function getDesignStatusTransitionError(
    currentStatus: CustomDesignOrderStatus,
    nextStatus: CustomDesignOrderStatus
) {
    if (currentStatus === nextStatus) return null;
    const allowedTransitions = DESIGN_ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (allowedTransitions.includes(nextStatus)) return null;
    return `لا يمكن نقل الطلب من حالة ${currentStatus} إلى ${nextStatus}.`;
}

export function calculatePlacementPrice(pricing: GarmentPricing, position: PrintPosition, size: PrintSize) {
    if (position === "shoulder_right" || position === "shoulder_left") {
        return size === "large" ? pricing.price_shoulder_large : pricing.price_shoulder_small;
    }

    if (position === "back") {
        return size === "large" ? pricing.price_back_large : pricing.price_back_small;
    }

    return size === "large" ? pricing.price_chest_large : pricing.price_chest_small;
}

export function calculateFinalDesignPrice(pricing: GarmentPricing, position: PrintPosition, size: PrintSize) {
    return Math.round((pricing.base_price + calculatePlacementPrice(pricing, position, size)) * 100) / 100;
}

export function normalizeGarmentPricing(value: Partial<GarmentPricing> | null | undefined): GarmentPricing {
    return {
        base_price: parseNumberish(value?.base_price, 0),
        price_chest_large: parseNumberish(value?.price_chest_large, 0),
        price_chest_small: parseNumberish(value?.price_chest_small, 0),
        price_back_large: parseNumberish(value?.price_back_large, 0),
        price_back_small: parseNumberish(value?.price_back_small, 0),
        price_shoulder_large: parseNumberish(value?.price_shoulder_large, 0),
        price_shoulder_small: parseNumberish(value?.price_shoulder_small, 0),
    };
}

export function buildPricingSnapshot(
    garmentId: string | null,
    garmentName: string,
    pricing: GarmentPricing
): DesignPricingSnapshotClassic {
    return {
        garment_id: garmentId,
        garment_name: garmentName,
        captured_at: new Date().toISOString(),
        ...normalizeGarmentPricing(pricing),
    };
}

export function normalizePricingSnapshot(value: unknown): DesignPricingSnapshotClassic | null {
    if (!value || typeof value !== "object") return null;
    const snapshot = value as Record<string, unknown>;
    const garmentName = sanitizePlainText(snapshot.garment_name, 120);
    const capturedAt = sanitizePlainText(snapshot.captured_at, 120);

    if (!garmentName || !capturedAt) {
        return null;
    }

    return {
        garment_id: sanitizePlainText(snapshot.garment_id, 120),
        garment_name: garmentName,
        captured_at: capturedAt,
        ...normalizeGarmentPricing(snapshot as Partial<GarmentPricing>),
    };
}

export async function getGarmentPricingRecord(
    sb: SmartStoreSb,
    garmentName: string,
    garmentId?: string | null
): Promise<GarmentPricing> {
    const pricingSelect = "base_price, price_chest_large, price_chest_small, price_back_large, price_back_small, price_shoulder_large, price_shoulder_small";
    const safeGarmentId = sanitizePlainText(garmentId, 120);
    const safeGarmentName = sanitizePlainText(garmentName, 120);

    if (safeGarmentId) {
        const { data, error } = await sb
            .from("custom_design_garments")
            .select(pricingSelect)
            .eq("id", safeGarmentId)
            .single();
        if (data) {
            return normalizeGarmentPricing(data);
        }
        if (error) {
            console.error("[getGarmentPricingRecord:id]", error);
        }
    }

    if (!safeGarmentName) {
        return EMPTY_GARMENT_PRICING;
    }

    const { data, error } = await sb
        .from("custom_design_garments")
        .select(pricingSelect)
        .eq("name", safeGarmentName)
        .single();

    if (error || !data) {
        if (error) {
            console.error("[getGarmentPricingRecord:name]", error);
        }
        return EMPTY_GARMENT_PRICING;
    }

    return normalizeGarmentPricing(data);
}

export async function getGarmentRecordById(
    sb: SmartStoreSb,
    garmentId: string
): Promise<CustomDesignGarment | null> {
    const { data, error } = await sb
        .from("custom_design_garments")
        .select("*")
        .eq("id", garmentId)
        .single();

    if (error) {
        console.error("[getGarmentRecordById]", error);
    }

    return (data as CustomDesignGarment) ?? null;
}

export async function getColorRecordById(
    sb: SmartStoreSb,
    colorId: string
): Promise<CustomDesignColor | null> {
    const { data, error } = await sb
        .from("custom_design_colors")
        .select("*")
        .eq("id", colorId)
        .single();

    if (error) {
        console.error("[getColorRecordById]", error);
    }

    return (data as CustomDesignColor) ?? null;
}

export async function getSizeRecordById(
    sb: SmartStoreSb,
    sizeId: string
): Promise<CustomDesignSize | null> {
    const { data, error } = await sb
        .from("custom_design_sizes")
        .select("*")
        .eq("id", sizeId)
        .single();

    if (error) {
        console.error("[getSizeRecordById]", error);
    }

    return (data as CustomDesignSize) ?? null;
}

export async function getStyleRecordById(
    sb: SmartStoreSb,
    styleId: string
): Promise<CustomDesignStyle | null> {
    const { data, error } = await sb
        .from("custom_design_styles")
        .select("*")
        .eq("id", styleId)
        .single();

    if (error) {
        console.error("[getStyleRecordById]", error);
    }

    return (data as CustomDesignStyle) ?? null;
}

export async function getArtStyleRecordById(
    sb: SmartStoreSb,
    artStyleId: string
): Promise<CustomDesignArtStyle | null> {
    const { data, error } = await sb
        .from("custom_design_art_styles")
        .select("*")
        .eq("id", artStyleId)
        .single();

    if (error) {
        console.error("[getArtStyleRecordById]", error);
    }

    return (data as CustomDesignArtStyle) ?? null;
}

export async function getColorPackageRecordById(
    sb: SmartStoreSb,
    colorPackageId: string
): Promise<CustomDesignColorPackage | null> {
    const { data, error } = await sb
        .from("custom_design_color_packages")
        .select("*")
        .eq("id", colorPackageId)
        .single();

    if (error) {
        console.error("[getColorPackageRecordById]", error);
    }

    return (data as CustomDesignColorPackage) ?? null;
}

export async function getStudioItemRecordById(
    sb: SmartStoreSb,
    studioItemId: string
): Promise<CustomDesignStudioItem | null> {
    const { data, error } = await sb
        .from("custom_design_studio_items")
        .select("*")
        .eq("id", studioItemId)
        .single();

    if (error) {
        console.error("[getStudioItemRecordById]", error);
    }

    return (data as CustomDesignStudioItem) ?? null;
}

export async function resolveDesignOrderSelections(
    sb: SmartStoreSb,
    orderData: {
        garment_id?: string | null;
        garment_name?: string | null;
        garment_image_url?: string | null;
        color_id?: string | null;
        color_name?: string | null;
        color_hex?: string | null;
        color_image_url?: string | null;
        size_id?: string | null;
        size_name?: string | null;
    }
): Promise<ResolvedDesignOrderSelections | { error: string }> {
    const safeGarmentId = sanitizePlainText(orderData.garment_id, 120);
    const safeColorId = sanitizePlainText(orderData.color_id, 120);
    const safeSizeId = sanitizePlainText(orderData.size_id, 120);

    const [initialColorRecord, initialSizeRecord] = await Promise.all([
        safeColorId ? getColorRecordById(sb, safeColorId) : Promise.resolve(null),
        safeSizeId ? getSizeRecordById(sb, safeSizeId) : Promise.resolve(null),
    ]);

    if (safeColorId && !initialColorRecord) {
        return { error: "اللون المحدد غير موجود." };
    }

    if (safeSizeId && !initialSizeRecord) {
        return { error: "المقاس المحدد غير موجود." };
    }

    let colorRecord = initialColorRecord;
    const sizeRecord = initialSizeRecord;
    let effectiveColorId = colorRecord?.id ?? sizeRecord?.color_id ?? safeColorId ?? null;

    if (!colorRecord && effectiveColorId) {
        colorRecord = await getColorRecordById(sb, effectiveColorId);
        if (!colorRecord) {
            return { error: "اللون المحدد غير موجود." };
        }
    }

    let effectiveGarmentId = safeGarmentId ?? colorRecord?.garment_id ?? sizeRecord?.garment_id ?? null;
    let garmentRecord = effectiveGarmentId ? await getGarmentRecordById(sb, effectiveGarmentId) : null;

    if (effectiveGarmentId && !garmentRecord) {
        return { error: "القطعة المحددة غير موجودة." };
    }

    if (colorRecord?.garment_id) {
        if (effectiveGarmentId && colorRecord.garment_id !== effectiveGarmentId) {
            return { error: "اللون المحدد لا يتبع القطعة المختارة." };
        }
        if (!effectiveGarmentId) {
            effectiveGarmentId = colorRecord.garment_id;
            garmentRecord = await getGarmentRecordById(sb, effectiveGarmentId);
            if (!garmentRecord) {
                return { error: "القطعة المحددة غير موجودة." };
            }
        }
    }

    if (sizeRecord?.garment_id) {
        if (effectiveGarmentId && sizeRecord.garment_id !== effectiveGarmentId) {
            return { error: "المقاس المحدد لا يتبع القطعة المختارة." };
        }
        if (!effectiveGarmentId) {
            effectiveGarmentId = sizeRecord.garment_id;
            garmentRecord = await getGarmentRecordById(sb, effectiveGarmentId);
            if (!garmentRecord) {
                return { error: "القطعة المحددة غير موجودة." };
            }
        }
    }

    if (sizeRecord?.color_id) {
        if (effectiveColorId && sizeRecord.color_id !== effectiveColorId) {
            return { error: "المقاس المحدد لا يتبع اللون المختار." };
        }
        effectiveColorId = sizeRecord.color_id;
        if (!colorRecord) {
            colorRecord = await getColorRecordById(sb, effectiveColorId);
            if (!colorRecord) {
                return { error: "اللون المحدد غير موجود." };
            }
        }
    }

    const garmentName = garmentRecord?.name ?? sanitizePlainText(orderData.garment_name, 120);
    const garmentImageUrl = garmentRecord?.image_url ?? sanitizeHttpUrl(orderData.garment_image_url);
    const colorName = colorRecord?.name ?? sanitizePlainText(orderData.color_name, 120);
    const colorHex = colorRecord?.hex_code ?? sanitizeHexColor(orderData.color_hex);
    const colorImageUrl = colorRecord?.image_url ?? sanitizeHttpUrl(orderData.color_image_url);
    const sizeName = sizeRecord?.name ?? sanitizePlainText(orderData.size_name, 80);

    if (!garmentName || !colorName || !colorHex || !sizeName) {
        return { error: "بيانات الطلب الأساسية غير مكتملة أو غير صالحة." };
    }

    const pricingSnapshot = buildPricingSnapshot(
        effectiveGarmentId ?? null,
        garmentName,
        garmentRecord
            ? normalizeGarmentPricing(garmentRecord)
            : await getGarmentPricingRecord(sb, garmentName, effectiveGarmentId)
    );

    return {
        garmentId: effectiveGarmentId ?? null,
        garmentName,
        garmentImageUrl,
        colorId: colorRecord?.id ?? effectiveColorId ?? null,
        colorName,
        colorHex,
        colorImageUrl,
        sizeId: sizeRecord?.id ?? safeSizeId ?? null,
        sizeName,
        pricingSnapshot,
    };
}

export async function resolveDesignCreativeSelections(
    sb: SmartStoreSb,
    orderData: {
        style_id?: string | null;
        style_name?: string | null;
        style_image_url?: string | null;
        art_style_id?: string | null;
        art_style_name?: string | null;
        art_style_image_url?: string | null;
        color_package_id?: string | null;
        color_package_name?: string | null;
        studio_item_id?: string | null;
    }
): Promise<ResolvedDesignCreativeSelections | { error: string }> {
    const safeStyleId = sanitizePlainText(orderData.style_id, 120);
    const safeArtStyleId = sanitizePlainText(orderData.art_style_id, 120);
    const safeColorPackageId = sanitizePlainText(orderData.color_package_id, 120);
    const safeStudioItemId = sanitizePlainText(orderData.studio_item_id, 120);

    const [styleRecord, artStyleRecord, colorPackageRecord, studioItemRecord] = await Promise.all([
        safeStyleId ? getStyleRecordById(sb, safeStyleId) : Promise.resolve(null),
        safeArtStyleId ? getArtStyleRecordById(sb, safeArtStyleId) : Promise.resolve(null),
        safeColorPackageId ? getColorPackageRecordById(sb, safeColorPackageId) : Promise.resolve(null),
        safeStudioItemId ? getStudioItemRecordById(sb, safeStudioItemId) : Promise.resolve(null),
    ]);

    if (safeStyleId && !styleRecord) {
        return { error: "النمط المحدد غير موجود." };
    }

    if (safeArtStyleId && !artStyleRecord) {
        return { error: "الأسلوب المحدد غير موجود." };
    }

    if (safeColorPackageId && !colorPackageRecord) {
        return { error: "باقة الألوان المحددة غير موجودة." };
    }

    if (safeStudioItemId && !studioItemRecord) {
        return { error: "عنصر الستيديو المحدد غير موجود." };
    }

    return {
        styleId: styleRecord?.id ?? safeStyleId ?? null,
        styleName: styleRecord?.name ?? sanitizePlainText(orderData.style_name, 120),
        styleImageUrl: styleRecord?.image_url ?? sanitizeHttpUrl(orderData.style_image_url),
        artStyleId: artStyleRecord?.id ?? safeArtStyleId ?? null,
        artStyleName: artStyleRecord?.name ?? sanitizePlainText(orderData.art_style_name, 120),
        artStyleImageUrl: artStyleRecord?.image_url ?? sanitizeHttpUrl(orderData.art_style_image_url),
        colorPackageId: colorPackageRecord?.id ?? safeColorPackageId ?? null,
        colorPackageName: colorPackageRecord?.name ?? sanitizePlainText(orderData.color_package_name, 120),
        studioItemId: studioItemRecord?.id ?? safeStudioItemId ?? null,
        studioItemName: studioItemRecord?.name ?? null,
        studioItemImageUrl: studioItemRecord?.mockup_image_url ?? studioItemRecord?.main_image_url ?? null,
    };
}

export function getPricingSnapshotForOrder(
    order: Pick<CustomDesignOrder, "pricing_snapshot" | "garment_id" | "garment_name">,
    fallbackPricing: GarmentPricing
): DesignPricingSnapshotClassic {
    const snapshot = normalizePricingSnapshot(order.pricing_snapshot);
    if (snapshot) {
        return snapshot;
    }

    return buildPricingSnapshot(order.garment_id ?? null, order.garment_name, fallbackPricing);
}

export async function uploadSmartStoreBinary(
    sb: SmartStoreSb,
    file: File,
    path: string
) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await sb.storage
        .from("smart-store")
        .upload(path, buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
        });

    if (error || !data?.path) {
        console.error("[uploadSmartStoreBinary]", error);
        return { error: error?.message || "فشل رفع الملف" } as const;
    }

    const { data: publicUrlData } = sb.storage.from("smart-store").getPublicUrl(data.path);
    return { url: publicUrlData.publicUrl } as const;
}

export function normalizeStyleRow(row: CustomDesignStyle): CustomDesignStyle {
    return {
        ...row,
        metadata: normalizeDesignMetadata(row.metadata),
    };
}

export function normalizeArtStyleRow(row: CustomDesignArtStyle): CustomDesignArtStyle {
    return {
        ...row,
        metadata: normalizeDesignMetadata(row.metadata),
    };
}

export function normalizeColorPackageRow(row: CustomDesignColorPackage): CustomDesignColorPackage {
    return {
        ...row,
        colors: normalizeColorTokens(row.colors),
        metadata: normalizeDesignMetadata(row.metadata),
    };
}

export function normalizeStudioItemRow(row: CustomDesignStudioItem): CustomDesignStudioItem {
    return {
        ...row,
        metadata: normalizeDesignMetadata(row.metadata),
    };
}

export function normalizePresetRow(row: CustomDesignPreset): CustomDesignPreset {
    return {
        ...row,
        metadata: normalizeDesignMetadata(row.metadata),
    };
}

export function parseDesignMethodValue(value: FormDataEntryValue | null): DesignMethod | null {
    return value === "from_text" || value === "from_image" || value === "studio" ? value : null;
}

export function parsePrintPositionValue(value: FormDataEntryValue | null): PrintPosition | null {
    return value === "chest" || value === "back" || value === "shoulder_right" || value === "shoulder_left" ? value : null;
}

export function parsePrintSizeValue(value: FormDataEntryValue | null): PrintSize | null {
    return value === "large" || value === "small" ? value : null;
}

export function parseCompatibilityTypeValue(value: FormDataEntryValue | null): SmartStoreOptionType | null {
    return value === "garment" ||
        value === "style" ||
        value === "art_style" ||
        value === "color_package" ||
        value === "studio_item" ||
        value === "preset"
        ? value
        : null;
}

export function parseCompatibilityRelationValue(
    value: FormDataEntryValue | null
): CustomDesignOptionCompatibility["relation"] | null {
    return value === "recommended" || value === "signature" || value === "avoid" ? value : null;
}

export function generateAiPrompt(template: string, data: Record<string, string>): string {
    let prompt = template;
    for (const [key, value] of Object.entries(data)) {
        prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "—");
    }
    return prompt;
}
