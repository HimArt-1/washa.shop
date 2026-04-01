"use server";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — المتجر الذكي Server Actions
//  CRUD operations for custom design garments, colors, etc.
// ═══════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminNotification } from "./notifications";
import { createUserNotification } from "./user-notifications";
import type {
    CreativeCatalogScope,
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
    GarmentStudioMockup,
} from "@/types/database";
import {
    DTF_STUDIO_PALETTE_CATALOG,
    DTF_STUDIO_STYLE_CATALOG,
    DTF_STUDIO_TECHNIQUE_CATALOG,
} from "@/lib/dtf-studio-catalog";
import { sendAdminDesignOrderNotificationEmail } from "@/lib/email";
import { getDesignOrderAccess } from "@/lib/design-order-access";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import {
    buildDesignMetadataFromInput,
    type PrintPosition,
    type PrintSize,
} from "@/lib/design-intelligence";
import {
    buildPricingSnapshot,
    buildSmartStoreImagePath,
    calculateFinalDesignPrice,
    DESIGN_RESULT_MAX_SIZE,
    EMPTY_GARMENT_PRICING,
    generateAiPrompt,
    getDesignResultAllowedTypes,
    getDesignResultPath,
    getDesignStatusTransitionError,
    getGarmentPricingRecord,
    getOptionalUrl,
    getPricingSnapshotForOrder,
    getSmartStoreMetadataFormValues,
    hasOrderDeliverables,
    normalizeArtStyleRow,
    normalizeColorPackageRow,
    normalizePresetRow,
    normalizePricingSnapshot,
    normalizeStudioItemRow,
    normalizeStyleRow,
    parseCompatibilityRelationValue,
    parseCompatibilityTypeValue,
    parseDesignMethodValue,
    parseNumericInput,
    parsePositiveAmount,
    parsePrintPositionValue,
    parsePrintSizeValue,
    resolveDesignCreativeSelections,
    resolveDesignOrderSelections,
    sanitizeHttpUrl,
    sanitizePlainText,
    SMART_STORE_IMAGE_MAX_SIZE,
    SMART_STORE_IMAGE_TYPES,
    type DesignResultField,
    uploadSmartStoreBinary,
} from "@/lib/smart-store-core";
import {
    smartStoreAdditionalDesignOrderSchema,
    smartStoreUpsertArtStyleSchema,
    smartStoreUpsertColorPackageSchema,
    smartStoreUpsertColorSchema,
    smartStoreUpsertDesignPresetSchema,
    smartStoreUpsertGarmentSchema,
    smartStoreUpsertSizeSchema,
    smartStoreUpsertStudioItemSchema,
    smartStoreUpsertStyleSchema,
    smartStoreSubmitDesignOrderSchema,
} from "@/lib/smart-store-validations";


function getSmartStoreSb() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }
    return createClient<Database>(url, key, { auth: { persistSession: false } });
}

function getFirstValidationError(error: { issues: Array<{ message: string }> }) {
    return error.issues[0]?.message || "البيانات المدخلة غير صحيحة.";
}

const DESIGN_ORDER_MISSING_COLUMN_REGEX =
    /Could not find the '([^']+)' column of 'custom_design_orders' in the schema cache/i;

type DesignOrderInsertRow = Database["public"]["Tables"]["custom_design_orders"]["Insert"];

function getMissingDesignOrderColumn(errorMessage: string | null | undefined) {
    if (!errorMessage) return null;
    return errorMessage.match(DESIGN_ORDER_MISSING_COLUMN_REGEX)?.[1] ?? null;
}

async function insertDesignOrderWithSchemaFallback(
    sb: ReturnType<typeof getSmartStoreSb>,
    payload: DesignOrderInsertRow
) {
    let insertPayload: DesignOrderInsertRow = { ...payload };
    const removedColumns = new Set<string>();

    while (true) {
        const result = await sb
            .from("custom_design_orders")
            .insert(insertPayload)
            .select("id, order_number, tracker_token")
            .single();

        if (!result.error || result.data) {
            return result;
        }

        const missingColumn = getMissingDesignOrderColumn(result.error.message);
        if (!missingColumn || !(missingColumn in insertPayload) || removedColumns.has(missingColumn)) {
            return result;
        }

        removedColumns.add(missingColumn);
        console.warn("[submitDesignOrder] Retrying without unsupported column:", missingColumn);

        const nextPayload = { ...(insertPayload as Record<string, unknown>) };
        delete nextPayload[missingColumn];
        insertPayload = nextPayload as DesignOrderInsertRow;
    }
}

async function requireSmartStoreAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const sb = getSmartStoreSb();
    const { data: profile } = await sb
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden");
    }

    return { sb, profile, user };
}

async function getCurrentProfileId() {
    const user = await currentUser();
    if (!user) return null;

    const sb = getSmartStoreSb();
    const { data: profile } = await sb
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    return profile?.id ?? null;
}

function sanitizePublicDesignOrder(order: CustomDesignOrder): CustomDesignOrder {
    return {
        ...order,
        tracker_token: "",
        user_id: null,
        parent_order_id: null,
        garment_id: null,
        color_id: null,
        size_id: null,
        style_id: null,
        art_style_id: null,
        color_package_id: null,
        studio_item_id: null,
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        ai_prompt: "",
        admin_notes: null,
        assigned_to: null,
        pricing_snapshot: null,
    };
}

// ─── Public Reads ────────────────────────────────────────

export async function getActiveGarments(): Promise<CustomDesignGarment[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_garments")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignGarment[]) ?? [];
}

export async function getGarmentColors(garmentId: string): Promise<CustomDesignColor[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_colors")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("is_active", true)
        .order("sort_order");
    return (data as CustomDesignColor[]) ?? [];
}

export async function getColorSizes(garmentId: string, colorId?: string): Promise<CustomDesignSize[]> {
    const sb = getSmartStoreSb();
    let query = sb
        .from("custom_design_sizes")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("is_active", true);
    if (colorId) query = query.eq("color_id", colorId);
    const { data } = await query.order("name");
    return (data as CustomDesignSize[]) ?? [];
}

export async function getDesignStyles(): Promise<CustomDesignStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_styles")
        .select("*")
        .in("catalog_scope", ["design_piece", "shared"])
        .eq("is_active", true)
        .order("sort_order");
    return ((data as CustomDesignStyle[]) ?? []).map(normalizeStyleRow);
}

export async function getArtStyles(): Promise<CustomDesignArtStyle[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_art_styles")
        .select("*")
        .in("catalog_scope", ["design_piece", "shared"])
        .eq("is_active", true)
        .order("sort_order");
    return ((data as CustomDesignArtStyle[]) ?? []).map(normalizeArtStyleRow);
}

export async function getColorPackages(): Promise<CustomDesignColorPackage[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_color_packages")
        .select("*")
        .in("catalog_scope", ["design_piece", "shared"])
        .eq("is_active", true)
        .order("sort_order");
    return ((data as CustomDesignColorPackage[]) ?? []).map(normalizeColorPackageRow);
}

export async function getStudioItems(): Promise<CustomDesignStudioItem[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_studio_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
    return ((data as CustomDesignStudioItem[]) ?? []).map(normalizeStudioItemRow);
}

export async function getDesignPresets(): Promise<CustomDesignPreset[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_presets")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order");
    return ((data as CustomDesignPreset[]) ?? []).map(normalizePresetRow);
}

export async function getDesignCompatibilities(): Promise<CustomDesignOptionCompatibility[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_option_compatibilities")
        .select("*")
        .order("score", { ascending: false });
    return (data as CustomDesignOptionCompatibility[]) ?? [];
}

// ─── Admin: Get All (including inactive) ─────────────────

export async function getAllGarments(): Promise<CustomDesignGarment[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb
        .from("custom_design_garments")
        .select("*")
        .order("sort_order");
    return (data as CustomDesignGarment[]) ?? [];
}

export async function getAllColors(garmentId?: string): Promise<CustomDesignColor[]> {
    const { sb } = await requireSmartStoreAdmin();
    let query = sb.from("custom_design_colors").select("*");
    if (garmentId) query = query.eq("garment_id", garmentId);
    const { data } = await query.order("sort_order");
    return (data as CustomDesignColor[]) ?? [];
}

export async function getAllSizes(garmentId?: string): Promise<CustomDesignSize[]> {
    const { sb } = await requireSmartStoreAdmin();
    let query = sb.from("custom_design_sizes").select("*");
    if (garmentId) query = query.eq("garment_id", garmentId);
    const { data } = await query.order("name");
    return (data as CustomDesignSize[]) ?? [];
}

export async function getAllStyles(): Promise<CustomDesignStyle[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb.from("custom_design_styles").select("*").order("sort_order");
    return ((data as CustomDesignStyle[]) ?? []).map(normalizeStyleRow);
}

export async function getAllArtStyles(): Promise<CustomDesignArtStyle[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb.from("custom_design_art_styles").select("*").order("sort_order");
    return ((data as CustomDesignArtStyle[]) ?? []).map(normalizeArtStyleRow);
}

export async function getAllColorPackages(): Promise<CustomDesignColorPackage[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb.from("custom_design_color_packages").select("*").order("sort_order");
    return ((data as CustomDesignColorPackage[]) ?? []).map(normalizeColorPackageRow);
}

export async function getAllStudioItems(): Promise<CustomDesignStudioItem[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb.from("custom_design_studio_items").select("*").order("sort_order");
    return ((data as CustomDesignStudioItem[]) ?? []).map(normalizeStudioItemRow);
}

export async function getAllDesignPresets(): Promise<CustomDesignPreset[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb
        .from("custom_design_presets")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("sort_order");
    return ((data as CustomDesignPreset[]) ?? []).map(normalizePresetRow);
}

export async function getAllDesignCompatibilities(): Promise<CustomDesignOptionCompatibility[]> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb
        .from("custom_design_option_compatibilities")
        .select("*")
        .order("score", { ascending: false });
    return (data as CustomDesignOptionCompatibility[]) ?? [];
}

// ─── Admin: Upsert ───────────────────────────────────────

export async function upsertGarment(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertGarmentSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        slug: formData.get("slug"),
        image_url: formData.get("image_url"),
        sort_order: formData.get("sort_order"),
        is_active: formData.get("is_active"),
        base_price: formData.get("base_price"),
        price_chest_large: formData.get("price_chest_large"),
        price_chest_small: formData.get("price_chest_small"),
        price_back_large: formData.get("price_back_large"),
        price_back_small: formData.get("price_back_small"),
        price_shoulder_large: formData.get("price_shoulder_large"),
        price_shoulder_small: formData.get("price_shoulder_small"),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url ?? null,
        sort_order: data.sort_order,
        is_active: data.is_active,
        base_price: data.base_price,
        price_chest_large: data.price_chest_large,
        price_chest_small: data.price_chest_small,
        price_back_large: data.price_back_large,
        price_back_small: data.price_back_small,
        price_shoulder_large: data.price_shoulder_large,
        price_shoulder_small: data.price_shoulder_small,
    };

    if (data.id) {
        const { data: row, error } = await sb
            .from("custom_design_garments")
            .update(payload)
            .eq("id", data.id)
            .select("*")
            .single();
        if (error) return { error: error.message };
        return { success: true as const, row: row as CustomDesignGarment };
    }
    const { data: row, error } = await sb.from("custom_design_garments").insert(payload).select("*").single();
    if (error) return { error: error.message };
    return { success: true as const, row: row as CustomDesignGarment };
}

export async function upsertColor(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertColorSchema.safeParse({
        id: formData.get("id"),
        garment_id: formData.get("garment_id"),
        name: formData.get("name"),
        hex_code: formData.get("hex_code"),
        image_url: formData.get("image_url"),
        sort_order: formData.get("sort_order"),
        is_active: formData.get("is_active"),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        garment_id: data.garment_id,
        name: data.name,
        hex_code: data.hex_code,
        image_url: data.image_url ?? null,
        sort_order: data.sort_order,
        is_active: data.is_active,
    };

    if (data.id) {
        const { data: row, error } = await sb
            .from("custom_design_colors")
            .update(payload)
            .eq("id", data.id)
            .select("*")
            .single();
        if (error) return { error: error.message };
        return { success: true as const, row: row as CustomDesignColor };
    }
    const { data: row, error } = await sb.from("custom_design_colors").insert(payload).select("*").single();
    if (error) return { error: error.message };
    return { success: true as const, row: row as CustomDesignColor };
}

export async function upsertSize(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertSizeSchema.safeParse({
        id: formData.get("id"),
        garment_id: formData.get("garment_id"),
        color_id: formData.get("color_id"),
        name: formData.get("name"),
        image_front_url: formData.get("image_front_url"),
        image_back_url: formData.get("image_back_url"),
        is_active: formData.get("is_active"),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        garment_id: data.garment_id,
        color_id: data.color_id ?? null,
        name: data.name,
        image_front_url: data.image_front_url ?? null,
        image_back_url: data.image_back_url ?? null,
        is_active: data.is_active,
    };

    if (data.id) {
        const { error } = await sb.from("custom_design_sizes").update(payload).eq("id", data.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_sizes").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertStyle(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertStyleSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        description: formData.get("description"),
        image_url: formData.get("image_url"),
        catalog_scope: formData.get("catalog_scope"),
        sort_order: formData.get("sort_order"),
        is_active: formData.get("is_active"),
        ...getSmartStoreMetadataFormValues(formData),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        name: data.name,
        description: data.description ?? null,
        image_url: data.image_url ?? null,
        catalog_scope: data.catalog_scope,
        metadata: buildDesignMetadataFromInput(data),
        sort_order: data.sort_order,
        is_active: data.is_active,
    };

    if (data.id) {
        const { error } = await sb.from("custom_design_styles").update(payload).eq("id", data.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_styles").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertArtStyle(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertArtStyleSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        description: formData.get("description"),
        image_url: formData.get("image_url"),
        catalog_scope: formData.get("catalog_scope"),
        sort_order: formData.get("sort_order"),
        is_active: formData.get("is_active"),
        ...getSmartStoreMetadataFormValues(formData),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        name: data.name,
        description: data.description ?? null,
        image_url: data.image_url ?? null,
        catalog_scope: data.catalog_scope,
        metadata: buildDesignMetadataFromInput(data),
        sort_order: data.sort_order,
        is_active: data.is_active,
    };

    if (data.id) {
        const { error } = await sb.from("custom_design_art_styles").update(payload).eq("id", data.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_art_styles").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertColorPackage(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertColorPackageSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        colors: formData.get("colors"),
        image_url: formData.get("image_url"),
        catalog_scope: formData.get("catalog_scope"),
        sort_order: formData.get("sort_order"),
        is_active: formData.get("is_active"),
        ...getSmartStoreMetadataFormValues(formData),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        name: data.name,
        colors: data.colors,
        image_url: data.image_url ?? null,
        catalog_scope: data.catalog_scope,
        metadata: buildDesignMetadataFromInput(data),
        sort_order: data.sort_order,
        is_active: data.is_active,
    };

    if (data.id) {
        const { error } = await sb.from("custom_design_color_packages").update(payload).eq("id", data.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_color_packages").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

type CreativeCatalogRestoreSummary = {
    styles: number;
    artStyles: number;
    colorPackages: number;
};

async function syncDtfCreativeEntries<TEntry extends { name: string; sort_order: number; metadata: Record<string, unknown> }>(
    sb: ReturnType<typeof getSmartStoreSb>,
    table: "custom_design_styles" | "custom_design_art_styles" | "custom_design_color_packages",
    entries: TEntry[],
    buildPayload: (entry: TEntry) => Record<string, unknown>
) {
    const { data, error } = await sb.from(table).select("id, name, catalog_scope");
    if (error) {
        throw new Error(error.message);
    }

    const rows = ((data as Array<{ id: string; name: string; catalog_scope: CreativeCatalogScope }>) ?? []);
    const canonicalNames = new Set(entries.map((entry) => entry.name));

    for (const entry of entries) {
        const existing = rows.find((row) => row.name === entry.name) ?? null;
        const payload = {
            ...buildPayload(entry),
            catalog_scope: "dtf_studio" as const,
            sort_order: entry.sort_order,
            is_active: true,
        };

        if (existing) {
            const { error: updateError } = await sb.from(table).update(payload as any).eq("id", existing.id);
            if (updateError) {
                throw new Error(updateError.message);
            }
        } else {
            const { error: insertError } = await sb.from(table).insert(payload as any);
            if (insertError) {
                throw new Error(insertError.message);
            }
        }
    }

    const dtfOnlyIdsToDisable = rows
        .filter((row) => row.catalog_scope === "dtf_studio" && !canonicalNames.has(row.name))
        .map((row) => row.id);

    if (dtfOnlyIdsToDisable.length > 0) {
        const { error: cleanupError } = await sb
            .from(table)
            .update({ is_active: false })
            .in("id", dtfOnlyIdsToDisable);
        if (cleanupError) {
            throw new Error(cleanupError.message);
        }
    }
}

export async function restoreDtfStudioCreativeCatalog() {
    const { sb } = await requireSmartStoreAdmin();

    try {
        await syncDtfCreativeEntries(sb, "custom_design_styles", DTF_STUDIO_STYLE_CATALOG, (entry) => ({
            name: entry.name,
            description: entry.description,
            metadata: entry.metadata,
        }));

        await syncDtfCreativeEntries(sb, "custom_design_art_styles", DTF_STUDIO_TECHNIQUE_CATALOG, (entry) => ({
            name: entry.name,
            description: entry.description,
            metadata: entry.metadata,
        }));

        await syncDtfCreativeEntries(sb, "custom_design_color_packages", DTF_STUDIO_PALETTE_CATALOG, (entry) => ({
            name: entry.name,
            colors: entry.colors,
            metadata: entry.metadata,
        }));

        revalidatePath("/dashboard/smart-store");
        revalidatePath("/design/washa-ai");
        revalidatePath("/design/washa-ai/app");
        revalidatePath("/api/washa-dtf-studio/config");

        const summary: CreativeCatalogRestoreSummary = {
            styles: DTF_STUDIO_STYLE_CATALOG.length,
            artStyles: DTF_STUDIO_TECHNIQUE_CATALOG.length,
            colorPackages: DTF_STUDIO_PALETTE_CATALOG.length,
        };

        return { success: true, summary };
    } catch (error) {
        return { error: error instanceof Error ? error.message : "تعذر استعادة كتالوج DTF الآن." };
    }
}

export async function upsertStudioItem(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertStudioItemSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        description: formData.get("description"),
        price: formData.get("price"),
        main_image_url: formData.get("main_image_url"),
        mockup_image_url: formData.get("mockup_image_url"),
        model_image_url: formData.get("model_image_url"),
        sort_order: formData.get("sort_order"),
        is_active: formData.get("is_active"),
        ...getSmartStoreMetadataFormValues(formData),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        main_image_url: data.main_image_url ?? null,
        mockup_image_url: data.mockup_image_url ?? null,
        model_image_url: data.model_image_url ?? null,
        metadata: buildDesignMetadataFromInput(data),
        sort_order: data.sort_order,
        is_active: data.is_active,
    };

    if (data.id) {
        const { error } = await sb.from("custom_design_studio_items").update(payload).eq("id", data.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_studio_items").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertDesignPreset(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const validated = smartStoreUpsertDesignPresetSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
        slug: formData.get("slug"),
        description: formData.get("description"),
        story: formData.get("story"),
        badge: formData.get("badge"),
        image_url: formData.get("image_url"),
        garment_id: formData.get("garment_id"),
        design_method: formData.get("design_method"),
        style_id: formData.get("style_id"),
        art_style_id: formData.get("art_style_id"),
        color_package_id: formData.get("color_package_id"),
        studio_item_id: formData.get("studio_item_id"),
        print_position: formData.get("print_position"),
        print_size: formData.get("print_size"),
        sort_order: formData.get("sort_order"),
        is_featured: formData.get("is_featured"),
        is_active: formData.get("is_active"),
        ...getSmartStoreMetadataFormValues(formData),
    });
    if (!validated.success) {
        return { error: getFirstValidationError(validated.error) };
    }

    const data = validated.data;

    const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        story: data.story ?? null,
        badge: data.badge ?? null,
        image_url: data.image_url ?? null,
        garment_id: data.garment_id ?? null,
        design_method: data.design_method ?? null,
        style_id: data.style_id ?? null,
        art_style_id: data.art_style_id ?? null,
        color_package_id: data.color_package_id ?? null,
        studio_item_id: data.studio_item_id ?? null,
        print_position: data.print_position ?? null,
        print_size: data.print_size ?? null,
        metadata: buildDesignMetadataFromInput(data),
        sort_order: data.sort_order,
        is_featured: data.is_featured,
        is_active: data.is_active,
    };

    if (data.id) {
        const { error } = await sb.from("custom_design_presets").update(payload).eq("id", data.id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("custom_design_presets").insert(payload);
        if (error) return { error: error.message };
    }
    return { success: true };
}

export async function upsertDesignCompatibility(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const id = formData.get("id") as string | null;
    const sourceType = parseCompatibilityTypeValue(formData.get("source_type"));
    const targetType = parseCompatibilityTypeValue(formData.get("target_type"));
    const sourceId = (formData.get("source_id") as string | null)?.trim() || null;
    const targetId = (formData.get("target_id") as string | null)?.trim() || null;
    const relation = parseCompatibilityRelationValue(formData.get("relation")) ?? "recommended";

    if (!sourceType || !targetType || !sourceId || !targetId) {
        return { error: "يجب تحديد المصدر والهدف قبل الحفظ." };
    }

    if (sourceType === targetType && sourceId === targetId) {
        return { error: "لا يمكن ربط العنصر بنفسه داخل خريطة التوافق." };
    }

    const payload = {
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        relation,
        score: Math.max(0, Math.min(100, Number(formData.get("score") ?? 50))),
        reason: ((formData.get("reason") as string | null) || "").trim() || null,
    };

    if (id) {
        const { error } = await sb
            .from("custom_design_option_compatibilities")
            .update(payload)
            .eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb
            .from("custom_design_option_compatibilities")
            .insert(payload);
        if (error) return { error: error.message };
    }

    return { success: true };
}

// ─── Admin: Delete ───────────────────────────────────────

export async function deleteGarment(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_garments").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteColor(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_colors").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteSize(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_sizes").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteStyle(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_styles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteArtStyle(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_art_styles").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteColorPackage(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_color_packages").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteStudioItem(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_studio_items").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteDesignPreset(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("custom_design_presets").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteDesignCompatibility(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb
        .from("custom_design_option_compatibilities")
        .delete()
        .eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Garment × Studio Mockups — موكبات التصاميم الجاهزة
// ═══════════════════════════════════════════════════════════

export async function getAllGarmentStudioMockups(): Promise<GarmentStudioMockup[]> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("garment_studio_mockups")
        .select("*")
        .order("sort_order");
    return (data as GarmentStudioMockup[]) ?? [];
}

export async function getStudioMockupForGarment(
    garmentId: string,
    studioItemId: string
): Promise<GarmentStudioMockup | null> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("garment_studio_mockups")
        .select("*")
        .eq("garment_id", garmentId)
        .eq("studio_item_id", studioItemId)
        .single();
    return (data as GarmentStudioMockup) ?? null;
}

export async function upsertGarmentStudioMockup(formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const id = formData.get("id") as string | null;
    const garmentId = sanitizePlainText(formData.get("garment_id"), 120);
    const studioItemId = sanitizePlainText(formData.get("studio_item_id"), 120);
    if (!garmentId || !studioItemId) {
        return { error: "يجب تحديد القطعة وعنصر الاستوديو." };
    }

    const payload = {
        garment_id: garmentId,
        studio_item_id: studioItemId,
        mockup_front_url: getOptionalUrl(formData, "mockup_front_url"),
        mockup_back_url: getOptionalUrl(formData, "mockup_back_url"),
        mockup_model_url: getOptionalUrl(formData, "mockup_model_url"),
        sort_order: parseNumericInput(formData.get("sort_order")),
    };

    if (id) {
        const { error } = await sb.from("garment_studio_mockups").update(payload).eq("id", id);
        if (error) return { error: error.message };
    } else {
        const { error } = await sb.from("garment_studio_mockups").insert(payload);
        if (error) {
            if (error.code === "23505") {
                return { error: "يوجد موكب مسبقاً لهذه القطعة مع هذا التصميم. عدّله بدلاً من إضافته." };
            }
            return { error: error.message };
        }
    }
    return { success: true };
}

export async function deleteGarmentStudioMockup(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb.from("garment_studio_mockups").delete().eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Design Orders — طلبات التصميم
// ═══════════════════════════════════════════════════════════

// ─── Get AI Prompt Template ─────────────────────────────

export async function getDesignPromptTemplate(): Promise<string> {
    const sb = getSmartStoreSb();
    const { data } = await sb
        .from("custom_design_settings")
        .select("ai_prompt_template")
        .eq("id", "default")
        .single();
    const template = data?.ai_prompt_template;
    if (template && template.trim().length > 0) return template;

    // Default fallback template
    return `Create a professional design for a {{garment_name}} garment by WASHA (وشّى).

Garment: {{garment_name}}
Base Color: {{color_name}} ({{color_hex}})
Design Style: {{style_name}}
Art Style: {{art_style_name}}
Color Palette: {{colors}}

Customer Description:
{{user_prompt}}

Requirements:
- Maintain WASHA brand identity (luxury Arabic streetwear)
- High resolution, print-ready quality
- Clean design suitable for garment printing
- Incorporate the specified art style and color palette
- Arabic calligraphy or motifs where appropriate`;
}

export async function updateDesignPromptTemplate(template: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb
        .from("custom_design_settings")
        .update({ ai_prompt_template: template })
        .eq("id", "default");
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Submit Design Order (Public) ───────────────────────

export async function submitDesignOrder(orderData: {
    garment_id?: string | null;
    garment_name: string;
    garment_image_url?: string;
    color_id?: string | null;
    color_name: string;
    color_hex: string;
    color_image_url?: string;
    size_id?: string | null;
    size_name: string;
    design_method: "from_text" | "from_image" | "studio";
    text_prompt?: string;
    reference_image_url?: string;
    preset_id?: string;
    preset_name?: string;
    preset_fully_aligned?: boolean;
    style_id?: string | null;
    style_name?: string;
    style_image_url?: string;
    art_style_id?: string | null;
    art_style_name?: string;
    art_style_image_url?: string;
    color_package_id?: string | null;
    color_package_name?: string;
    studio_item_id?: string | null;
    custom_colors?: any[];
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    print_position?: string;
    print_size?: string;
}) {
    const validatedOrderData = smartStoreSubmitDesignOrderSchema.safeParse(orderData);
    if (!validatedOrderData.success) {
        return { error: getFirstValidationError(validatedOrderData.error) };
    }

    const input = validatedOrderData.data;
    const sb = getSmartStoreSb();
    const designMethod = parseDesignMethodValue(input.design_method);
    const printPosition = parsePrintPositionValue(input.print_position ?? null);
    const printSize = parsePrintSizeValue(input.print_size ?? null);

    if (!designMethod || !printPosition || !printSize) {
        return { error: "بيانات الطلب الأساسية غير مكتملة أو غير صالحة." };
    }
    const resolvedSelections = await resolveDesignOrderSelections(sb, input);
    if ("error" in resolvedSelections) {
        return resolvedSelections;
    }
    const resolvedCreativeSelections = await resolveDesignCreativeSelections(sb, input);
    if ("error" in resolvedCreativeSelections) {
        return resolvedCreativeSelections;
    }

    const {
        garmentId,
        garmentName,
        garmentImageUrl,
        colorId,
        colorName,
        colorHex,
        colorImageUrl,
        sizeId,
        sizeName,
        pricingSnapshot,
    } = resolvedSelections;
    const {
        styleId,
        styleName,
        styleImageUrl,
        artStyleId,
        artStyleName,
        artStyleImageUrl,
        colorPackageId,
        colorPackageName,
        studioItemId,
        studioItemName,
        studioItemImageUrl,
    } = resolvedCreativeSelections;

    // 1. Get prompt template
    const template = await getDesignPromptTemplate();

    // 2. Build colors string
    const colorsStr = colorPackageName
        ? colorPackageName
        : input.custom_colors && input.custom_colors.length > 0
            ? input.custom_colors.join(", ")
            : `${colorName} (${colorHex})`;

    // Sanitize externally-provided URLs so we don't store unsafe schemes (e.g. javascript:).
    const safeReferenceImageUrl = sanitizeHttpUrl(input.reference_image_url);
    const inputTextPrompt = sanitizePlainText(input.text_prompt, 3000);
    const effectiveTextPrompt = designMethod === "studio"
        ? (studioItemName ?? inputTextPrompt ?? null)
        : inputTextPrompt;
    const effectiveReferenceImageUrl = safeReferenceImageUrl ?? (designMethod === "studio" ? studioItemImageUrl : null);

    // 3. User prompt or image note
    // If studio, handle separately
    let userPrompt = "—";
    if (designMethod === "from_text") {
        userPrompt = effectiveTextPrompt ?? "—";
    } else if (designMethod === "from_image") {
        userPrompt = `[صورة مرجعية مرفقة: ${effectiveReferenceImageUrl ?? "—"}]`;
    } else if (designMethod === "studio") {
        userPrompt = `[تصميم من ستيديو وشّى: ${studioItemName ?? effectiveTextPrompt ?? "—"}]`;
    }

    // Lookup authenticated user if they exist
    let userId: string | null = null;
    let finalCustomerName = sanitizePlainText(input.customer_name, 120);
    let finalCustomerEmail = sanitizePlainText(input.customer_email, 200);
    let finalCustomerPhone = sanitizePlainText(input.customer_phone, 40);

    const user = await currentUser();
    if (user) {
        const { data: profile } = await sb.from("profiles").select("id").eq("clerk_id", user.id).single();
        if (profile) userId = profile.id;

        if (!finalCustomerName) {
            finalCustomerName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "عميل مسجل";
        }
        if (!finalCustomerEmail) {
            finalCustomerEmail = user.emailAddresses?.[0]?.emailAddress;
        }
        if (!finalCustomerPhone) {
            finalCustomerPhone = user.phoneNumbers?.[0]?.phoneNumber;
        }
    }

    // 4. Generate AI prompt
    const aiPrompt = generateAiPrompt(template, {
        garment_name: garmentName,
        color_name: colorName,
        color_hex: colorHex,
        style_name: styleName || "—",
        art_style_name: artStyleName || "—",
        colors: colorsStr,
        user_prompt: userPrompt,
    });

    // 5. Insert order
    const payload = {
        user_id: userId,
        garment_id: garmentId,
        garment_name: garmentName,
        garment_image_url: garmentImageUrl,
        color_id: colorId,
        color_name: colorName,
        color_hex: colorHex,
        color_image_url: colorImageUrl,
        size_id: sizeId,
        size_name: sizeName,
        design_method: designMethod,
        text_prompt: effectiveTextPrompt,
        reference_image_url: effectiveReferenceImageUrl,
        preset_id: sanitizePlainText(input.preset_id, 120),
        preset_name: sanitizePlainText(input.preset_name, 120),
        preset_fully_aligned: input.preset_fully_aligned === true,
        style_id: styleId,
        style_name: styleName || "—",
        style_image_url: styleImageUrl,
        art_style_id: artStyleId,
        art_style_name: artStyleName || "—",
        art_style_image_url: artStyleImageUrl,
        color_package_id: colorPackageId,
        color_package_name: colorPackageName,
        custom_colors: Array.isArray(input.custom_colors) ? input.custom_colors : [],
        studio_item_id: studioItemId,
        ai_prompt: aiPrompt,
        customer_name: finalCustomerName || null,
        customer_email: finalCustomerEmail || null,
        customer_phone: finalCustomerPhone || null,
        print_position: printPosition,
        print_size: printSize,
        pricing_snapshot: pricingSnapshot,
    };

    const { data, error } = await insertDesignOrderWithSchemaFallback(sb, payload);

    if (error || !data) return { error: error?.message || "فشل إنشاء الطلب" };

    // Notify all admins about the new design order via in-app notification
    await createAdminNotification({
        type: "order_alert",
        category: "design",
        severity: "info",
        title: "طلب تصميم جديد 🎨",
        message: `طلب تصميم جديد #${data.order_number} — ${garmentName} (${colorName}) من ${finalCustomerName || "عميل"}`,
        link: "/dashboard/design-orders",
    });

    // Fire email notification asynchronously so it doesn't block the user
    sendAdminDesignOrderNotificationEmail(
        data.order_number,
        finalCustomerName || '',
        finalCustomerEmail || '',
        finalCustomerPhone || '',
        garmentName,
        colorName,
        input.design_method,
        data.id
    ).catch(err => console.error("Failed to send design order email async", err));

    return {
        success: true,
        orderId: data.id,
        orderNumber: data.order_number,
        trackerToken: data.tracker_token,
    };
}

// ─── Admin: Get Design Orders ───────────────────────────

export async function getDesignOrders(page = 1, status: CustomDesignOrderStatus | "all" = "all", method: "studio" | "from_text" | "from_image" | "all" = "all") {
    const { sb } = await requireSmartStoreAdmin();
    const perPage = 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = sb.from("custom_design_orders").select("*", { count: "exact" });
    if (status !== "all") {
        query = query.eq("status", status);
    }
    if (method !== "all") {
        query = query.eq("design_method", method);
    }
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) {
        console.error("getDesignOrders error:", error);
        return { data: [], count: 0, totalPages: 0 };
    }
    return {
        data: (data as CustomDesignOrder[]) ?? [],
        count: count ?? 0,
        totalPages: count ? Math.ceil(count / perPage) : 0,
    };
}

// ─── Admin: Get Single Order ────────────────────────────

export async function getDesignOrder(id: string): Promise<CustomDesignOrder | null> {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb.from("custom_design_orders").select("*").eq("id", id).single();
    return (data as CustomDesignOrder) ?? null;
}

// ─── Admin: Update Status ───────────────────────────────

export async function updateDesignOrderStatus(id: string, status: CustomDesignOrderStatus) {
    const { sb } = await requireSmartStoreAdmin();
    const { data: currentOrder } = await sb
        .from("custom_design_orders")
        .select("id, status, user_id, order_number, result_design_url, result_mockup_url, result_pdf_url, modification_design_url, skip_results")
        .eq("id", id)
        .single();
    const order = currentOrder as Pick<
        CustomDesignOrder,
        "id" | "status" | "user_id" | "order_number" | "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url" | "skip_results"
    > | null;
    if (!order) return { error: "الطلب غير موجود." };

    const transitionError = getDesignStatusTransitionError(order.status, status);
    if (transitionError) {
        return { error: transitionError };
    }

    if (status === "awaiting_review" && !order.skip_results && !hasOrderDeliverables(order)) {
        return { error: "لا يمكن إرسال الطلب للمراجعة قبل رفع نتيجة واحدة على الأقل." };
    }

    const { error, data: updatedOrder } = await sb.from("custom_design_orders")
        .update({ status })
        .eq("id", id)
        .eq("status", order.status)
        .select("user_id, order_number")
        .single();
    if (error || !updatedOrder) return { error: error?.message || "فشل تحديث الحالة" };

    // If awaiting_review and there's a user, notify them
    if (status === "awaiting_review" && updatedOrder.user_id) {
        await createUserNotification({
            userId: updatedOrder.user_id,
            title: "تصميم مخصص 🎨",
            message: `تصميمك (الطلب #${updatedOrder.order_number}) جاهز الآن للمراجعة والتأكيد! يمكنك الاعتماد والتحويل للسلة أو طلب الإلغاء.`,
            type: "order_update",
            link: `/account/orders?design=${id}`,
        });
    }

    return { success: true };
}

// ─── Admin: Upload Results ──────────────────────────────

export async function uploadDesignResult(id: string, field: DesignResultField, url: string) {
    const { sb } = await requireSmartStoreAdmin();
    const safeUrl = sanitizeHttpUrl(url);
    if (!safeUrl) {
        return { error: "رابط النتيجة غير صالح." };
    }

    const { error } = await sb.from("custom_design_orders").update({ [field]: safeUrl }).eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

export async function uploadDesignResultFile(id: string, field: DesignResultField, formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return { error: "لم يتم اختيار ملف صالح" };
    }

    if (file.size <= 0) {
        return { error: "الملف فارغ" };
    }

    if (file.size > DESIGN_RESULT_MAX_SIZE) {
        return { error: "حجم الملف كبير جدًا. الحد الأقصى 8 ميجابايت" };
    }

    const allowedTypes = getDesignResultAllowedTypes(field);
    if (!allowedTypes.includes(file.type)) {
        return {
            error:
                field === "result_pdf_url"
                    ? "نوع الملف غير مدعوم. المطلوب PDF فقط"
                    : "نوع الملف غير مدعوم. المسموح: JPG, PNG, WebP",
        };
    }

    const objectPath = getDesignResultPath(id, file);
    const upload = await uploadSmartStoreBinary(sb, file, objectPath);
    if ("error" in upload) {
        return { error: upload.error };
    }
    const publicUrl = upload.url;

    const { error: updateError } = await sb
        .from("custom_design_orders")
        .update({ [field]: publicUrl })
        .eq("id", id);

    if (updateError) {
        console.error("[uploadDesignResultFile:update]", updateError);
        return { error: updateError.message };
    }

    revalidatePath(`/dashboard/design-orders/${id}`);
    revalidatePath("/dashboard/design-orders");
    revalidatePath("/dashboard/smart-store");

    return { success: true, url: publicUrl };
}

export async function uploadSmartStoreImage(folder: string, formData: FormData) {
    const { sb } = await requireSmartStoreAdmin();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return { success: false as const, error: "لم يتم اختيار ملف" };
    }

    if (file.size <= 0) {
        return { success: false as const, error: "الملف فارغ" };
    }

    if (file.size > SMART_STORE_IMAGE_MAX_SIZE) {
        return { success: false as const, error: "حجم الملف يجب أن لا يتجاوز 8 ميجابايت" };
    }

    if (!SMART_STORE_IMAGE_TYPES.includes(file.type)) {
        return { success: false as const, error: "نوع الملف غير مدعوم (PNG, JPG, WebP, GIF)" };
    }

    const upload = await uploadSmartStoreBinary(sb, file, buildSmartStoreImagePath(folder, file));
    if ("error" in upload) {
        return { success: false as const, error: upload.error };
    }

    return { success: true as const, url: upload.url };
}

export async function uploadDesignReferenceImage(formData: FormData) {
    const sb = getSmartStoreSb();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return { success: false as const, error: "لم يتم اختيار ملف" };
    }

    if (file.size <= 0) {
        return { success: false as const, error: "الملف فارغ" };
    }

    if (file.size > SMART_STORE_IMAGE_MAX_SIZE) {
        return { success: false as const, error: "حجم الملف يجب أن لا يتجاوز 8 ميجابايت" };
    }

    if (!SMART_STORE_IMAGE_TYPES.includes(file.type)) {
        return { success: false as const, error: "نوع الملف غير مدعوم (PNG, JPG, WebP, GIF)" };
    }

    const upload = await uploadSmartStoreBinary(sb, file, buildSmartStoreImagePath("design-references", file));
    if ("error" in upload) {
        return { success: false as const, error: upload.error };
    }

    return { success: true as const, url: upload.url };
}

// ─── Admin: Skip Results ────────────────────────────────

export async function skipDesignResults(id: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { data: order } = await sb
        .from("custom_design_orders")
        .select("status")
        .eq("id", id)
        .single();
    const currentOrder = order as Pick<CustomDesignOrder, "status"> | null;
    if (!currentOrder) return { error: "الطلب غير موجود." };
    if (currentOrder.status === "completed" || currentOrder.status === "cancelled") {
        return { error: "لا يمكن تجاوز النتائج لهذا الطلب في حالته الحالية." };
    }

    const { error } = await sb
        .from("custom_design_orders")
        .update({ skip_results: true, status: "completed" })
        .eq("id", id)
        .eq("status", currentOrder.status);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Update Notes ────────────────────────────────

export async function updateDesignOrderNotes(id: string, notes: string) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb
        .from("custom_design_orders")
        .update({ admin_notes: sanitizePlainText(notes, 5000) })
        .eq("id", id);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Admin: Send to Customer Cart ───────────────────────

export async function sendDesignOrderToCustomer(id: string, finalPrice: number) {
    const { sb } = await requireSmartStoreAdmin();
    const normalizedFinalPrice = parsePositiveAmount(finalPrice);
    if (!normalizedFinalPrice) {
        return { error: "السعر النهائي يجب أن يكون أكبر من صفر." };
    }

    const { data: currentOrder } = await sb
        .from("custom_design_orders")
        .select("status, user_id, order_number, is_sent_to_customer, print_position, print_size, result_design_url, result_mockup_url, result_pdf_url, modification_design_url, skip_results")
        .eq("id", id)
        .single();
    const order = currentOrder as Pick<
        CustomDesignOrder,
        "status" | "user_id" | "order_number" | "is_sent_to_customer" | "print_position" | "print_size" | "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url" | "skip_results"
    > | null;
    if (!order) return { error: "الطلب غير موجود." };
    if (order.is_sent_to_customer) {
        return { error: "تم إرسال هذا الطلب للعميل بالفعل." };
    }
    if (order.status === "completed" || order.status === "cancelled") {
        return { error: "لا يمكن إرسال هذا الطلب للعميل في حالته الحالية." };
    }
    if (!order.skip_results && !hasOrderDeliverables(order)) {
        return { error: "ارفع نتيجة واحدة على الأقل قبل إرسال الطلب للعميل." };
    }
    if (!parsePrintPositionValue(order.print_position) || !parsePrintSizeValue(order.print_size)) {
        return { error: "مواصفات الطباعة على الطلب غير مكتملة." };
    }

    // Update the database to lock in the final price and mark it as sent
    const { error, data: updatedOrder } = await sb.from("custom_design_orders")
        .update({
            final_price: normalizedFinalPrice,
            is_sent_to_customer: true,
            status: "awaiting_review",
        })
        .eq("id", id)
        .eq("is_sent_to_customer", false)
        .eq("status", order.status)
        .select("user_id, order_number")
        .single();

    if (error || !updatedOrder) return { error: error?.message || "فشل التحديث" };

    // Notify the user that their order is priced and ready for checkout
    if (updatedOrder.user_id) {
        await createUserNotification({
            userId: updatedOrder.user_id,
            title: "تصميم مخصص جاهز للدفع 🛍️",
            message: `تم تسعير طلبك #${updatedOrder.order_number} ليصبح جاهزاً للإضافة للسلة والدفع. يرجى مراجعته واعتماده.`,
            type: "order_update",
            link: `/account/orders?design=${id}`,
        });
    }

    return { success: true };
}

// ═══════════════════════════════════════════════════════════
//  Public Order Actions — تتبع الطلب
// ═══════════════════════════════════════════════════════════

export async function getDesignOrderPublic(id: string, trackerToken?: string | null): Promise<CustomDesignOrder | null> {
    const { order } = await getDesignOrderAccess(id, trackerToken);
    return order ? sanitizePublicDesignOrder(order) : null;
}

export async function getUserDesignOrders(): Promise<CustomDesignOrder[]> {
    const profileId = await getCurrentProfileId();
    if (!profileId) return [];

    const sb = getSmartStoreSb();

    const { data } = await sb.from("custom_design_orders")
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

    return (data as CustomDesignOrder[]) ?? [];
}

export async function approveDesignOrder(id: string) {
    return confirmDesignOrder(id);
}

export async function rejectDesignOrder(id: string, reason: string) {
    const { sb } = await requireSmartStoreAdmin();
    const text = (reason || "").trim();
    if (!text) return { error: "يجب ذكر سبب الرفض" };

    const { error } = await sb
        .from("custom_design_orders")
        .update({ status: "cancelled", admin_notes: `رفض — السبب: ${text}` })
        .eq("id", id)
        .eq("status", "new");
    if (error) return { error: error.message };
    return { success: true };
}

export async function cancelDesignOrderByCustomer(id: string) {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { error: "يجب تسجيل الدخول" };

    const sb = getSmartStoreSb();
    const { error, data: order } = await sb
        .from("custom_design_orders")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("user_id", profileId)
        .in("status", ["new", "in_progress", "awaiting_review"])
        .select("user_id, order_number")
        .single();
    if (error) return { error: error.message };

    if (order) {
        await createAdminNotification({
            title: "إلغاء تصميم مخصص ❌",
            message: `قام العميل بإلغاء طلب التصميم المخصص #${order.order_number}.`,
            type: "order_alert",
            category: "design",
            severity: "warning",
            link: "/dashboard/smart-store",
        });
    }

    return { success: true };
}

// ─── طلب تعديل التصميم (من العميل) ───────────────────────

export async function submitModificationRequest(orderId: string, requestText: string) {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { error: "يجب تسجيل الدخول" };

    const sb = getSmartStoreSb();
    const text = (requestText || "").trim();
    if (!text) return { error: "يرجى كتابة تفاصيل التعديل المطلوب" };

    const { error } = await sb
        .from("custom_design_orders")
        .update({
            status: "modification_requested",
            modification_request: text,
        })
        .eq("id", orderId)
        .eq("user_id", profileId)
        .in("status", ["awaiting_review"]);
    if (error) return { error: error.message };

    const { data: order } = await sb
        .from("custom_design_orders")
        .select("order_number")
        .eq("id", orderId)
        .eq("user_id", profileId)
        .single();
    if (order) {
        await createAdminNotification({
            title: "طلب تعديل التصميم ✏️",
            message: `العميل طلب تعديلاً على الطلب #${order.order_number}. راجع طلب التعديل.`,
            type: "order_alert",
            category: "design",
            severity: "warning",
            link: "/dashboard/design-orders",
        });
    }

    return { success: true };
}

// ─── Get Garment Pricing ─────────────────────────────────

export async function getGarmentPricing(garmentName: string, garmentId?: string | null) {
    const sb = getSmartStoreSb();
    return getGarmentPricingRecord(sb, garmentName, garmentId);
}

// ─── Confirm: Save Placement + Price ─────────────────────

export async function confirmDesignOrder(id: string, position?: string | null, size?: string | null, _clientPrice?: number | null) {
    const profileId = await getCurrentProfileId();
    if (!profileId) return { error: "يجب تسجيل الدخول" };

    const sb = getSmartStoreSb();
    const { data: currentOrder } = await sb
        .from("custom_design_orders")
        .select("order_number, garment_id, garment_name, status, print_position, print_size, is_sent_to_customer, final_price, result_design_url, result_mockup_url, result_pdf_url, modification_design_url, skip_results, pricing_snapshot")
        .eq("id", id)
        .eq("user_id", profileId)
        .single();
    const order = currentOrder as Pick<
        CustomDesignOrder,
        "order_number" | "garment_id" | "garment_name" | "status" | "print_position" | "print_size" | "is_sent_to_customer" | "final_price" | "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url" | "skip_results" | "pricing_snapshot"
    > | null;
    if (!order) return { error: "الطلب غير موجود." };
    if (order.status !== "awaiting_review") {
        return { error: "لا يمكن تأكيد الطلب في حالته الحالية." };
    }
    if (!order.skip_results && !hasOrderDeliverables(order)) {
        return { error: "لا توجد نتائج مرفوعة لهذا الطلب بعد." };
    }

    let finalPosition: PrintPosition | null = null;
    let finalSize: PrintSize | null = null;

    if (order.is_sent_to_customer) {
        finalPosition = parsePrintPositionValue(order.print_position);
        finalSize = parsePrintSizeValue(order.print_size);
    } else {
        finalPosition = parsePrintPositionValue(position ?? null) ?? parsePrintPositionValue(order.print_position);
        finalSize = parsePrintSizeValue(size ?? null) ?? parsePrintSizeValue(order.print_size);
    }

    if (!finalPosition || !finalSize) {
        return { error: "بيانات موقع أو حجم الطباعة غير مكتملة." };
    }

    const pricingSnapshot = order.is_sent_to_customer
        ? normalizePricingSnapshot(order.pricing_snapshot)
        : getPricingSnapshotForOrder(
            order,
            await getGarmentPricingRecord(sb, order.garment_name, order.garment_id)
        );

    const finalPrice = order.is_sent_to_customer
        ? parsePositiveAmount(order.final_price)
        : calculateFinalDesignPrice(pricingSnapshot ?? EMPTY_GARMENT_PRICING, finalPosition, finalSize);

    if (!finalPrice) {
        return { error: "تعذر احتساب السعر النهائي لهذا الطلب." };
    }

    const { error, data: updatedOrder } = await sb
        .from("custom_design_orders")
        .update({
            status: "completed",
            print_position: finalPosition,
            print_size: finalSize,
            final_price: finalPrice,
            pricing_snapshot: pricingSnapshot ?? order.pricing_snapshot ?? null,
        })
        .eq("id", id)
        .eq("user_id", profileId)
        .eq("status", "awaiting_review")
        .select("order_number")
        .single();
    if (error) return { error: error.message };

    if (updatedOrder) {
        await createAdminNotification({
            title: "تأكيد تصميم مخصّص للسلة 🛒",
            message: `قام العميل للتو بمراجعة وتأكيد التصميم للطلب #${updatedOrder.order_number} وأضافه للسلة.`,
            type: "system_alert",
            category: "design",
            severity: "info",
            link: "/dashboard/smart-store",
        });
    }

    return { success: true };
}

// ─── Submit Additional Design (على نفس الطلب) ─────────────

export async function submitAdditionalDesignOrder(
    parentOrderId: string,
    data: {
        print_position: string;
        print_size: string;
        style_id?: string | null;
        style_name: string;
        style_image_url?: string | null;
        art_style_id?: string | null;
        art_style_name: string;
        art_style_image_url?: string | null;
        color_package_id?: string | null;
        color_package_name?: string | null;
        custom_colors?: string[];
    }
) {
    const validatedData = smartStoreAdditionalDesignOrderSchema.safeParse(data);
    if (!validatedData.success) {
        return { error: getFirstValidationError(validatedData.error) };
    }

    const input = validatedData.data;
    const profileId = await getCurrentProfileId();
    if (!profileId) return { error: "يجب تسجيل الدخول" };

    const sb = getSmartStoreSb();
    const printPosition = parsePrintPositionValue(input.print_position);
    const printSize = parsePrintSizeValue(input.print_size);

    if (!printPosition || !printSize) {
        return { error: "بيانات التصميم الإضافي غير مكتملة." };
    }
    const resolvedCreativeSelections = await resolveDesignCreativeSelections(sb, input);
    if ("error" in resolvedCreativeSelections) {
        return resolvedCreativeSelections;
    }
    const {
        styleId,
        styleName,
        styleImageUrl,
        artStyleId,
        artStyleName,
        artStyleImageUrl,
        colorPackageId,
        colorPackageName,
    } = resolvedCreativeSelections;

    if (!styleName || !artStyleName) {
        return { error: "بيانات التصميم الإضافي غير مكتملة." };
    }

    const { data: parent, error: fetchErr } = await sb
        .from("custom_design_orders")
        .select("*")
        .eq("id", parentOrderId)
        .eq("user_id", profileId)
        .single();

    if (fetchErr || !parent) return { error: "الطلب الأساسي غير موجود" };
    const p = parent as CustomDesignOrder;
    const parentPricingSnapshot = normalizePricingSnapshot(p.pricing_snapshot) ?? buildPricingSnapshot(
        p.garment_id ?? null,
        p.garment_name,
        await getGarmentPricingRecord(sb, p.garment_name, p.garment_id ?? null)
    );

    if (p.status !== "completed") return { error: "يجب تأكيد التصميم الأساسي أولاً" };
    if (p.print_position === printPosition) return { error: "اختر موقعاً مختلفاً عن التصميم الأساسي" };

    const template = await getDesignPromptTemplate();
    const colorsStr = colorPackageName
        ? colorPackageName
        : input.custom_colors && input.custom_colors.length > 0
            ? input.custom_colors.join(", ")
            : `${p.color_name} (${p.color_hex})`;

    const userPrompt = p.design_method === "from_text"
        ? (p.text_prompt ?? "—")
        : p.design_method === "from_image"
            ? `[صورة مرجعية: ${p.reference_image_url ?? "—"}]`
            : `[تصميم إضافي: ${p.text_prompt ?? "—"}]`;

    const aiPrompt = generateAiPrompt(template, {
        garment_name: p.garment_name,
        color_name: p.color_name,
        color_hex: p.color_hex,
        style_name: styleName,
        art_style_name: artStyleName,
        colors: colorsStr,
        user_prompt: userPrompt,
    });

    const payload = {
        user_id: p.user_id,
        parent_order_id: parentOrderId,
        garment_id: p.garment_id ?? null,
        garment_name: p.garment_name,
        garment_image_url: sanitizeHttpUrl(p.garment_image_url),
        color_id: p.color_id ?? null,
        color_name: p.color_name,
        color_hex: p.color_hex,
        color_image_url: sanitizeHttpUrl(p.color_image_url),
        size_id: p.size_id ?? null,
        size_name: p.size_name,
        design_method: p.design_method,
        text_prompt: p.text_prompt,
        reference_image_url: sanitizeHttpUrl(p.reference_image_url),
        preset_id: p.preset_id ?? null,
        preset_name: p.preset_name ?? null,
        preset_fully_aligned: p.preset_fully_aligned === true,
        style_id: styleId,
        style_name: styleName,
        style_image_url: styleImageUrl,
        art_style_id: artStyleId,
        art_style_name: artStyleName,
        art_style_image_url: artStyleImageUrl,
        color_package_id: colorPackageId,
        color_package_name: colorPackageName,
        custom_colors: Array.isArray(input.custom_colors) ? input.custom_colors : [],
        studio_item_id: p.studio_item_id ?? null,
        ai_prompt: aiPrompt,
        customer_name: p.customer_name,
        customer_email: p.customer_email,
        customer_phone: p.customer_phone,
        print_position: printPosition,
        print_size: printSize,
        pricing_snapshot: parentPricingSnapshot,
    };

    const { data: inserted, error } = await sb
        .from("custom_design_orders")
        .insert(payload)
        .select("id, order_number, tracker_token")
        .single();

    if (error || !inserted) return { error: error?.message || "فشل إنشاء الطلب الإضافي" };

    await createAdminNotification({
        type: "order_alert",
        category: "design",
        severity: "info",
        title: "تصميم إضافي على الطلب 🎨",
        message: `طلب تصميم إضافي #${inserted.order_number} — ${p.garment_name} (موقع: ${printPosition}) مرتبط بالطلب #${p.order_number}`,
        link: "/dashboard/design-orders",
    });

    return {
        success: true,
        orderId: inserted.id,
        orderNumber: inserted.order_number,
        trackerToken: inserted.tracker_token,
    };
}

// ─── Assign Design Order to Admin ────────────────────────

export async function assignDesignOrder(orderId: string, adminProfileId: string | null) {
    const { sb } = await requireSmartStoreAdmin();
    const { error } = await sb
        .from("custom_design_orders")
        .update({ assigned_to: adminProfileId })
        .eq("id", orderId);
    if (error) return { error: error.message };
    return { success: true };
}

// ─── Design Order Stats ──────────────────────────────────

export async function getDesignOrderStats() {
    const { sb } = await requireSmartStoreAdmin();

    const [newRes, inProgRes, awaitRes, modRes, compRes, cancelRes, revenueRes] = await Promise.all([
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "new"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "modification_requested"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
        sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
        sb.from("custom_design_orders").select("final_price").eq("status", "completed").not("final_price", "is", null),
    ]);

    const revenue = (revenueRes.data || []).reduce((sum: number, r) => sum + (r.final_price || 0), 0);

    return {
        new: newRes.count ?? 0,
        in_progress: inProgRes.count ?? 0,
        awaiting_review: awaitRes.count ?? 0,
        modification_requested: modRes.count ?? 0,
        completed: compRes.count ?? 0,
        cancelled: cancelRes.count ?? 0,
        revenue,
    };
}

export async function getDesignOperationsSnapshot() {
    try {
        const { sb } = await requireSmartStoreAdmin();
        const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const activeStatuses: CustomDesignOrderStatus[] = [
            "new",
            "in_progress",
            "awaiting_review",
            "modification_requested",
        ];

        const results = await Promise.allSettled([
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "new"),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "modification_requested"),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).in("status", activeStatuses).is("assigned_to", null),
            sb.from("custom_design_orders").select("id", { count: "exact", head: true }).eq("status", "completed").eq("is_sent_to_customer", false),
            sb.from("custom_design_orders").select("final_price").eq("status", "completed").not("final_price", "is", null),
            sb.from("custom_design_orders").select("id, created_at").in("status", activeStatuses),
            sb.from("custom_design_orders").select("id, created_at, updated_at").eq("status", "completed"),
            sb.from("custom_design_orders")
                .select("*")
                .eq("status", "new")
                .order("created_at", { ascending: false })
                .limit(5),
            sb.from("custom_design_orders")
                .select("*")
                .in("status", ["awaiting_review", "modification_requested"])
                .order("updated_at", { ascending: false })
                .limit(5),
            sb.from("custom_design_orders")
                .select("*")
                .in("status", activeStatuses)
                .is("assigned_to", null)
                .order("created_at", { ascending: true })
                .limit(5),
            sb.from("custom_design_orders")
                .select("*")
                .eq("status", "completed")
                .order("updated_at", { ascending: false })
                .limit(5),
        ]);

        const getCount = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && typeof result.value.count === "number" ? result.value.count : 0;

        const getData = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && Array.isArray(result.value.data) ? result.value.data : [];

        results.forEach((res, idx) => {
            if (res.status === "rejected") {
                console.error(`Design snapshot query ${idx} failed:`, res.reason);
                return;
            }

            if (res.value?.error) {
                console.error(`Design snapshot query ${idx} returned DB error:`, res.value.error);
            }
        });

        const revenue = getData(results[10]).reduce((sum: number, row: { final_price?: number | null }) => {
            return sum + (row.final_price || 0);
        }, 0);

        const activeAges = getData(results[11]).map((order: { created_at: string }) => {
            return (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
        });
        const completionDurations = getData(results[12]).map((order: { created_at: string; updated_at: string }) => {
            return (new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
        });

        const avgActiveHours = activeAges.length
            ? Math.round(activeAges.reduce((sum: number, value: number) => sum + value, 0) / activeAges.length)
            : 0;
        const avgCompletionHours = completionDurations.length
            ? Math.round(completionDurations.reduce((sum: number, value: number) => sum + value, 0) / completionDurations.length)
            : 0;

        return {
            stats: {
                total: getCount(results[0]),
                new: getCount(results[1]),
                in_progress: getCount(results[2]),
                awaiting_review: getCount(results[3]),
                modification_requested: getCount(results[4]),
                completed: getCount(results[5]),
                cancelled: getCount(results[6]),
                createdToday: getCount(results[7]),
                unassignedActive: getCount(results[8]),
                readyToSend: getCount(results[9]),
                revenue,
                avgActiveHours,
                avgCompletionHours,
                activeLoad:
                    getCount(results[1]) +
                    getCount(results[2]) +
                    getCount(results[3]) +
                    getCount(results[4]),
            },
            intakeQueue: getData(results[13]) as CustomDesignOrder[],
            reviewQueue: getData(results[14]) as CustomDesignOrder[],
            assignmentBacklog: getData(results[15]) as CustomDesignOrder[],
            recentlyCompleted: getData(results[16]) as CustomDesignOrder[],
        };
    } catch (err) {
        console.error("[getDesignOperationsSnapshot]", err);
        return {
            stats: {
                total: 0,
                new: 0,
                in_progress: 0,
                awaiting_review: 0,
                modification_requested: 0,
                completed: 0,
                cancelled: 0,
                createdToday: 0,
                unassignedActive: 0,
                readyToSend: 0,
                revenue: 0,
                avgActiveHours: 0,
                avgCompletionHours: 0,
                activeLoad: 0,
            },
            intakeQueue: [] as CustomDesignOrder[],
            reviewQueue: [] as CustomDesignOrder[],
            assignmentBacklog: [] as CustomDesignOrder[],
            recentlyCompleted: [] as CustomDesignOrder[],
        };
    }
}

// ─── Get Admin List ──────────────────────────────────────

export async function getAdminList() {
    const { sb } = await requireSmartStoreAdmin();
    const { data } = await sb
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("role", "admin")
        .order("display_name");
    return (data as { id: string; display_name: string; avatar_url: string | null }[]) ?? [];
}


// ─── Renew Tracker Token ─────────────────────────────────

export async function renewTrackerToken(orderId: string): Promise<{ newExpiry: string } | { error: string }> {
    const { sb } = await requireSmartStoreAdmin();

    const { data, error } = await sb.rpc("renew_tracker_token", { p_order_id: orderId });

    if (error) {
        console.error("[renewTrackerToken]", error);
        return { error: error.message };
    }

    revalidatePath(`/dashboard/design-orders/${orderId}`);
    return { newExpiry: data as string };
}
