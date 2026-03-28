import { getSupabaseAdminClient } from "@/lib/supabase";
import { createAdminNotification } from "@/app/actions/notifications";
import { logDiagnosticWarning } from "../utils/api-error";
import { StorageService } from "./storage.service";
import { z } from "zod";
import { CUSTOM_PALETTE_ID, submitOrderSchema } from "../validators/submit-order.schema";

import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignSize,
    CustomDesignStyle,
    Database,
    DesignPricingSnapshot,
} from "@/types/database";

export type SubmitOrderPayload = z.infer<typeof submitOrderSchema>;
type OrderInsert = Database["public"]["Tables"]["custom_design_orders"]["Insert"];

export class DtfOrderService {

    private static buildPricingSnapshot(garment: CustomDesignGarment | null): DesignPricingSnapshot | null {
        if (!garment) return null;
        return {
            garment_id: garment.id,
            garment_name: garment.name,
            captured_at: new Date().toISOString(),
            base_price: garment.base_price,
            price_chest_large: garment.price_chest_large,
            price_chest_small: garment.price_chest_small,
            price_back_large: garment.price_back_large,
            price_back_small: garment.price_back_small,
            price_shoulder_large: garment.price_shoulder_large,
            price_shoulder_small: garment.price_shoulder_small,
        };
    }

    private static buildCustomColorsPayload(customPalette: string | null | undefined) {
        if (!customPalette) return [];
        return [{ name: "custom-palette", prompt: customPalette }];
    }

    /**
     * Handles the complex backend logic for creating a DTF studio order.
     * Encapsulates logic for parallel database checks, storage uploads, insertions, and notifications.
     */
    static async createOrder(payload: SubmitOrderPayload, userProfile: any | null): Promise<{ error?: string; status?: number; data?: any }> {
        const {
            garmentId, garmentType, colorId, garmentColor, colorHex,
            sizeId, garmentSize, styleId, style, techniqueId, technique,
            paletteId, palette, customPalette, prompt, calligraphyText,
            mockupDataUrl, extractedDataUrl
        } = payload;

        const sb = getSupabaseAdminClient();

        const [
            garmentRes,
            colorRes,
            sizeRes,
            styleRes,
            techniqueRes,
            paletteRes,
        ] = await Promise.all([
            garmentId
                ? sb.from("custom_design_garments").select("*").eq("id", garmentId).eq("is_active", true).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            colorId
                ? sb.from("custom_design_colors").select("*").eq("id", colorId).eq("is_active", true).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            sizeId
                ? sb.from("custom_design_sizes").select("*").eq("id", sizeId).eq("is_active", true).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            styleId
                ? sb.from("custom_design_styles").select("*").eq("id", styleId).eq("is_active", true).in("catalog_scope", ["dtf_studio", "shared"]).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            techniqueId
                ? sb.from("custom_design_art_styles").select("*").eq("id", techniqueId).eq("is_active", true).in("catalog_scope", ["dtf_studio", "shared"]).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            paletteId && paletteId !== CUSTOM_PALETTE_ID
                ? sb.from("custom_design_color_packages").select("*").eq("id", paletteId).eq("is_active", true).in("catalog_scope", ["dtf_studio", "shared"]).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
        ]);

        const optionFetchError =
            garmentRes.error || colorRes.error || sizeRes.error ||
            styleRes.error || techniqueRes.error || paletteRes.error;

        if (optionFetchError) {
            logDiagnosticWarning("dtf-order-options-fetch", optionFetchError);
            return { error: "تعذر التحقق من إعدادات المتجر الذكي", status: 500 };
        }

        const garmentRow = (garmentRes.data as CustomDesignGarment | null) ?? null;
        const colorRow = (colorRes.data as CustomDesignColor | null) ?? null;
        const sizeRow = (sizeRes.data as CustomDesignSize | null) ?? null;
        const styleRow = (styleRes.data as CustomDesignStyle | null) ?? null;
        const artStyleRow = (techniqueRes.data as CustomDesignArtStyle | null) ?? null;
        const colorPackageRow = (paletteRes.data as CustomDesignColorPackage | null) ?? null;

        if (garmentId && !garmentRow) {
            return { error: "القطعة المحددة غير متاحة أو غير مفعلة", status: 400 };
        }
        if (colorId && !colorRow) {
            return { error: "اللون المحدد غير متاح أو غير مفعل", status: 400 };
        }
        if (sizeId && !sizeRow) {
            return { error: "المقاس المحدد غير متاح أو غير مفعل", status: 400 };
        }
        if (styleId && !styleRow) {
            return { error: "أسلوب التصميم المحدد غير متاح أو غير مفعل", status: 400 };
        }
        if (techniqueId && !artStyleRow) {
            return { error: "التقنية المحددة غير متاحة أو غير مفعلة", status: 400 };
        }
        if (paletteId && paletteId !== CUSTOM_PALETTE_ID && !colorPackageRow) {
            return { error: "لوحة الألوان المحددة غير متاحة أو غير مفعلة", status: 400 };
        }
        if (paletteId === CUSTOM_PALETTE_ID && !customPalette?.trim()) {
            return { error: "الرجاء كتابة وصف لوحة الألوان المخصصة", status: 400 };
        }

        if (colorRow && garmentRow && colorRow.garment_id !== garmentRow.id) {
            return { error: "اللون المحدد لا يتبع القطعة المختارة", status: 400 };
        }
        if (sizeRow && garmentRow && sizeRow.garment_id !== garmentRow.id) {
            return { error: "المقاس المحدد لا يتبع القطعة المختارة", status: 400 };
        }
        if (sizeRow && colorRow && sizeRow.color_id && sizeRow.color_id !== colorRow.id) {
            return { error: "المقاس المحدد لا يتبع اللون المختار", status: 400 };
        }

        const resolvedGarmentName = garmentRow?.name || garmentType;
        const resolvedColorName = colorRow?.name || garmentColor;
        const resolvedColorHex = colorRow?.hex_code || colorHex || "#111111";
        const resolvedSizeName = sizeRow?.name || garmentSize;
        const resolvedStyleName = styleRow?.name || style;
        const resolvedTechniqueName = artStyleRow?.name || technique;
        const resolvedPaletteName = colorPackageRow?.name || palette;
        const resolvedPaletteLabel = customPalette || resolvedPaletteName;

        if (!resolvedGarmentName || !resolvedColorName || !resolvedSizeName || !resolvedStyleName || !resolvedTechniqueName) {
            return { error: "إعدادات الطلب غير مكتملة", status: 400 };
        }

        if (!resolvedPaletteLabel) {
            return { error: "لم يتم تحديد لوحة الألوان للتصميم", status: 400 };
        }

        const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const mockupResult = await StorageService.uploadBase64Image(
            mockupDataUrl,
            `design-orders/dtf-${slug}/mockup.png`
        );

        if ("error" in mockupResult) {
            return { error: mockupResult.error, status: 500 };
        }

        let extractedUrl: string | null = null;
        if (extractedDataUrl) {
            const extractedResult = await StorageService.uploadBase64Image(
                extractedDataUrl,
                `design-orders/dtf-${slug}/extracted.png`
            );

            if (!("error" in extractedResult)) {
                extractedUrl = extractedResult.url;
            }
        }

        let userId: string | null = null;
        let customerName: string | null = null;
        let customerEmail: string | null = null;

        if (userProfile) {
            try {
                const { data: profile } = await sb
                    .from("profiles")
                    .select("id")
                    .eq("clerk_id", userProfile.id)
                    .single();

                if (profile) userId = profile.id;
                customerName = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(" ") || null;
                customerEmail = userProfile.emailAddresses?.[0]?.emailAddress ?? null;
            } catch (err) {
                 logDiagnosticWarning("fetch-user-profile", err);
            }
        }

        const designDesc = calligraphyText
            ? `مخطوطة: "${calligraphyText}"`
            : prompt || "تصميم من استوديو DTF";

        const aiPrompt = [
            "[طلب من استوديو DTF]",
            `القطعة: ${resolvedGarmentName} — اللون: ${resolvedColorName} — المقاس: ${resolvedSizeName}`,
            `أسلوب التصميم: ${resolvedStyleName}`,
            `التقنية: ${resolvedTechniqueName}`,
            `لوحة الألوان: ${resolvedPaletteLabel}`,
            `الوصف: ${designDesc}`,
            `رابط الموكب: ${mockupResult.url}`,
            extractedUrl ? `رابط ملف DTF: ${extractedUrl}` : null,
        ].filter(Boolean).join("\n");

        const orderPayload: OrderInsert = {
            user_id: userId,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: null,
            garment_id: garmentRow?.id ?? null,
            garment_name: resolvedGarmentName,
            garment_image_url: garmentRow?.image_url ?? null,
            color_id: colorRow?.id ?? null,
            color_name: resolvedColorName,
            color_hex: resolvedColorHex,
            color_image_url: colorRow?.image_url ?? null,
            size_id: sizeRow?.id ?? null,
            size_name: resolvedSizeName,
            design_method: "studio",
            text_prompt: designDesc,
            reference_image_url: null,
            preset_id: null,
            preset_name: null,
            preset_fully_aligned: false,
            style_id: styleRow?.id ?? null,
            style_name: resolvedStyleName,
            style_image_url: styleRow?.image_url ?? null,
            art_style_id: artStyleRow?.id ?? null,
            art_style_name: resolvedTechniqueName,
            art_style_image_url: artStyleRow?.image_url ?? null,
            color_package_id: colorPackageRow?.id ?? null,
            color_package_name: resolvedPaletteName || null,
            custom_colors: DtfOrderService.buildCustomColorsPayload(customPalette),
            studio_item_id: null,
            ai_prompt: aiPrompt,
            print_position: "chest",
            print_size: "large",
            pricing_snapshot: DtfOrderService.buildPricingSnapshot(garmentRow),
            dtf_mockup_url: mockupResult.url,
            dtf_extracted_url: extractedUrl,
            dtf_style_label: resolvedStyleName,
            dtf_technique_label: resolvedTechniqueName,
            dtf_palette_label: resolvedPaletteLabel || null,
        };

        const { data: orderRow, error: insertError } = await sb
            .from("custom_design_orders")
            .insert(orderPayload)
            .select("id, order_number")
            .single();

        if (insertError || !orderRow) {
            logDiagnosticWarning("dtf-order-insert", insertError);
            return { error: insertError?.message || "فشل إنشاء الطلب", status: 500 };
        }

        await createAdminNotification({
            type: "order_alert",
            category: "design",
            severity: "info",
            title: `طلب DTF Studio جديد 🎨 #${orderRow.order_number}`,
            message: `${resolvedGarmentName} · ${resolvedColorName} · ${resolvedStyleName}`,
            link: `/dashboard/design-orders/${orderRow.id}`,
        }).catch((error) => logDiagnosticWarning("notify-admin", error));

        return {
            status: 200,
            data: {
                orderId: orderRow.id,
                orderNumber: orderRow.order_number,
                mockupUrl: mockupResult.url,
            }
        };
    }
}
