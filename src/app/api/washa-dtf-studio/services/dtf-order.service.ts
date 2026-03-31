import { getSupabaseAdminClient } from "@/lib/supabase";
import { logDiagnosticWarning } from "../utils/api-error";
import { StorageService } from "./storage.service";
import { z } from "zod";
import { CUSTOM_PALETTE_ID, submitOrderSchema } from "../validators/submit-order.schema";
import {
    calculateFinalDesignPrice,
    calculatePlacementPrice,
    type GarmentPricing,
} from "@/lib/smart-store-core";
import type { PrintPosition, PrintSize } from "@/lib/design-intelligence";
import { logDtfTrace } from "../utils/trace";

import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignSize,
    CustomDesignStyle,
} from "@/types/database";

export type SubmitOrderPayload = z.infer<typeof submitOrderSchema>;

const DEFAULT_DTF_PRINT_POSITION: PrintPosition = "chest";
const DEFAULT_DTF_PRINT_SIZE: PrintSize = "large";

export class DtfOrderService {
    private static resolveServerErrorMessage(error: unknown): { error: string; status: number } {
        const rawMessage = error instanceof Error ? error.message : String(error ?? "");
        const normalized = rawMessage.toLowerCase();

        if (normalized.includes("supabase_service_role_key")) {
            return {
                error: "إعدادات Supabase الإدارية غير مكتملة على الخادم.",
                status: 500,
            };
        }

        const indicatesMissingDtfMigration =
            normalized.includes("schema cache") ||
            normalized.includes("could not find the") ||
            normalized.includes("custom_design_orders_design_method_check") ||
            normalized.includes("catalog_scope") ||
            normalized.includes("dtf_mockup_url") ||
            normalized.includes("dtf_extracted_url") ||
            normalized.includes("dtf_style_label") ||
            normalized.includes("dtf_technique_label") ||
            normalized.includes("dtf_palette_label") ||
            normalized.includes("pricing_snapshot") ||
            normalized.includes("garment_id") ||
            normalized.includes("color_id") ||
            normalized.includes("size_id") ||
            normalized.includes("style_id") ||
            normalized.includes("art_style_id") ||
            normalized.includes("color_package_id");

        if (indicatesMissingDtfMigration) {
            return {
                error: "قاعدة البيانات في هذه البيئة لا تحتوي أحدث migrations الخاصة بـ DTF Studio. طبّق migrations الأخيرة ثم أعد المحاولة.",
                status: 500,
            };
        }

        return {
            error: rawMessage || "تعذر إكمال طلب استوديو DTF على الخادم",
            status: 500,
        };
    }

    private static getGarmentPricing(garment: CustomDesignGarment | null): GarmentPricing {
        return {
            base_price: garment?.base_price ?? 0,
            price_chest_large: garment?.price_chest_large ?? 0,
            price_chest_small: garment?.price_chest_small ?? 0,
            price_back_large: garment?.price_back_large ?? 0,
            price_back_small: garment?.price_back_small ?? 0,
            price_shoulder_large: garment?.price_shoulder_large ?? 0,
            price_shoulder_small: garment?.price_shoulder_small ?? 0,
        };
    }

    private static buildCustomColorsPayload(customPalette: string | null | undefined) {
        if (!customPalette) return [];
        return [{ name: "custom-palette", prompt: customPalette }];
    }

    private static buildDtfAiPrompt(params: {
        garmentName: string;
        colorName: string;
        styleName: string;
        techniqueName: string;
        paletteLabel: string;
        prompt: string | null;
        calligraphyText: string | null;
    }) {
        const basePrompt = params.calligraphyText?.trim()
            ? `مخطوطة مطلوبة: "${params.calligraphyText.trim()}"`
            : (params.prompt?.trim() || "تصميم DTF من الاستوديو");

        return [
            `DTF Studio Request`,
            `Garment: ${params.garmentName}`,
            `Color: ${params.colorName}`,
            `Style: ${params.styleName}`,
            `Technique: ${params.techniqueName}`,
            `Palette: ${params.paletteLabel}`,
            `Prompt: ${basePrompt}`,
            `Output: print-ready high-quality design asset`,
        ].join("\n");
    }

    private static buildCartItem(params: {
        id: string;
        garmentName: string;
        colorName: string;
        sizeName: string | null;
        mockupUrl: string;
        extractedUrl: string | null;
        finalPrice: number;
    }) {
        return {
            id: `dtf-${params.id}`,
            title: `تصميم DTF مخصص — ${params.garmentName} ${params.colorName}`.trim(),
            price: params.finalPrice,
            image_url: params.mockupUrl,
            artist_name: "وشّى DTF Studio",
            quantity: 1,
            size: params.sizeName,
            type: "custom_design" as const,
            maxQuantity: 1,
            customDesignUrl: params.extractedUrl || params.mockupUrl,
            customGarment: `${params.garmentName} (${params.colorName})`,
            customPosition: "الصدر — مقاس كبير",
        };
    }

    /**
     * Validates the DTF selections, uploads the rendered assets,
     * and returns a ready-to-store custom cart item.
     */
    static async prepareCartItem(
        payload: SubmitOrderPayload,
        userProfile: any | null,
        options?: { traceId?: string }
    ): Promise<{ error?: string; status?: number; data?: any }> {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const serviceStartedAt = Date.now();
        try {
            const {
                garmentId, garmentType, colorId, garmentColor, colorHex,
                sizeId, garmentSize, styleId, style, techniqueId, technique,
                paletteId, palette, customPalette, prompt, calligraphyText,
                mockupDataUrl, extractedDataUrl
            } = payload;

            logDtfTrace("dtf.submit-order.service", traceId, "prepare_started", {
                has_garment_id: Boolean(garmentId),
                has_color_id: Boolean(colorId),
                has_size_id: Boolean(sizeId),
                has_style_id: Boolean(styleId),
                has_technique_id: Boolean(techniqueId),
                has_palette_id: Boolean(paletteId),
                has_mockup_data_url: Boolean(mockupDataUrl),
                has_extracted_data_url: Boolean(extractedDataUrl),
                authenticated: Boolean(userProfile),
            });

            const sb = getSupabaseAdminClient();

            const optionFetchStartedAt = Date.now();
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

            logDtfTrace("dtf.submit-order.service", traceId, "options_fetched", {
                duration_ms: Date.now() - optionFetchStartedAt,
                has_error: Boolean(optionFetchError),
            });

            if (optionFetchError) {
                logDiagnosticWarning("dtf-order-options-fetch", optionFetchError);
                return DtfOrderService.resolveServerErrorMessage(optionFetchError);
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
                logDtfTrace("dtf.submit-order.service", traceId, "resolved_data_incomplete", {
                    resolved_garment_name: resolvedGarmentName || null,
                    resolved_color_name: resolvedColorName || null,
                    resolved_size_name: resolvedSizeName || null,
                    resolved_style_name: resolvedStyleName || null,
                    resolved_technique_name: resolvedTechniqueName || null,
                });
                return { error: "إعدادات الطلب غير مكتملة", status: 400 };
            }

            if (!resolvedPaletteLabel) {
                logDtfTrace("dtf.submit-order.service", traceId, "resolved_palette_missing");
                return { error: "لم يتم تحديد لوحة الألوان للتصميم", status: 400 };
            }

            const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const mockupUploadStartedAt = Date.now();
            const mockupResult = await StorageService.uploadBase64Image(
                mockupDataUrl,
                `design-orders/dtf-${slug}/mockup.png`
            );
            logDtfTrace("dtf.submit-order.service", traceId, "mockup_upload_completed", {
                duration_ms: Date.now() - mockupUploadStartedAt,
                success: !("error" in mockupResult),
                status: "error" in mockupResult ? mockupResult.status : 200,
            });

            if ("error" in mockupResult) {
                logDiagnosticWarning("dtf-cart-mockup-upload", mockupResult.error);
                return { error: mockupResult.error, status: mockupResult.status };
            }

            let extractedUrl: string | null = null;
            if (extractedDataUrl) {
                const extractedUploadStartedAt = Date.now();
                const extractedResult = await StorageService.uploadBase64Image(
                    extractedDataUrl,
                    `design-orders/dtf-${slug}/extracted.png`
                );
                logDtfTrace("dtf.submit-order.service", traceId, "extracted_upload_completed", {
                    duration_ms: Date.now() - extractedUploadStartedAt,
                    success: !("error" in extractedResult),
                    status: "error" in extractedResult ? extractedResult.status : 200,
                });

                if (!("error" in extractedResult)) {
                    extractedUrl = extractedResult.url;
                } else {
                    logDiagnosticWarning("dtf-cart-extracted-upload", extractedResult.error);
                }
            }

            const pricingStartedAt = Date.now();
            const pricing = DtfOrderService.getGarmentPricing(garmentRow);
            const designPrice = calculatePlacementPrice(
                pricing,
                DEFAULT_DTF_PRINT_POSITION,
                DEFAULT_DTF_PRINT_SIZE
            );
            const finalPrice = calculateFinalDesignPrice(
                pricing,
                DEFAULT_DTF_PRINT_POSITION,
                DEFAULT_DTF_PRINT_SIZE
            );
            const cartItem = DtfOrderService.buildCartItem({
                id: slug,
                garmentName: resolvedGarmentName,
                colorName: resolvedColorName,
                sizeName: resolvedSizeName || null,
                mockupUrl: mockupResult.url,
                extractedUrl,
                finalPrice,
            });
            logDtfTrace("dtf.submit-order.service", traceId, "cart_item_built", {
                duration_ms: Date.now() - pricingStartedAt,
                base_price: pricing.base_price,
                design_price: designPrice,
                final_price: finalPrice,
            });

            let userId: string | null = null;
            if (userProfile) {
                const profileLookupStartedAt = Date.now();
                try {
                    const { data: profile } = await sb
                        .from("profiles")
                        .select("id")
                        .eq("clerk_id", userProfile.id)
                        .maybeSingle();
                    userId = profile?.id ?? null;
                } catch (err) {
                    logDiagnosticWarning("fetch-user-profile", err);
                }
                logDtfTrace("dtf.submit-order.service", traceId, "profile_lookup_completed", {
                    duration_ms: Date.now() - profileLookupStartedAt,
                });
            }

            const customerName = userProfile
                ? ([userProfile.firstName, userProfile.lastName].filter(Boolean).join(" ").trim() || "عميل DTF")
                : "عميل DTF";
            const customerEmail = userProfile?.emailAddresses?.[0]?.emailAddress ?? null;
            const customerPhone = userProfile?.phoneNumbers?.[0]?.phoneNumber ?? null;

            const aiPrompt = DtfOrderService.buildDtfAiPrompt({
                garmentName: resolvedGarmentName,
                colorName: resolvedColorName,
                styleName: resolvedStyleName,
                techniqueName: resolvedTechniqueName,
                paletteLabel: resolvedPaletteLabel,
                prompt: prompt ?? null,
                calligraphyText: calligraphyText ?? null,
            });

            const orderInsertStartedAt = Date.now();
            const { data: insertedOrder, error: insertOrderError } = await sb
                .from("custom_design_orders")
                .insert({
                    user_id: userId,
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
                    text_prompt: calligraphyText?.trim() ? `مخطوطة: ${calligraphyText.trim()}` : (prompt || "تصميم DTF من الاستوديو"),
                    reference_image_url: extractedUrl ?? mockupResult.url,
                    style_id: styleRow?.id ?? null,
                    style_name: resolvedStyleName,
                    style_image_url: styleRow?.image_url ?? null,
                    art_style_id: artStyleRow?.id ?? null,
                    art_style_name: resolvedTechniqueName,
                    art_style_image_url: artStyleRow?.image_url ?? null,
                    color_package_id: colorPackageRow?.id ?? (paletteId ?? null),
                    color_package_name: resolvedPaletteLabel,
                    custom_colors: DtfOrderService.buildCustomColorsPayload(customPalette),
                    ai_prompt: aiPrompt,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    print_position: DEFAULT_DTF_PRINT_POSITION,
                    print_size: DEFAULT_DTF_PRINT_SIZE,
                    pricing_snapshot: {
                        base_price: pricing.base_price,
                        design_price: designPrice,
                        final_price: finalPrice,
                        dtf: true,
                    },
                    dtf_mockup_url: mockupResult.url,
                    dtf_extracted_url: extractedUrl,
                    dtf_style_label: resolvedStyleName,
                    dtf_technique_label: resolvedTechniqueName,
                    dtf_palette_label: resolvedPaletteLabel,
                })
                .select("id, order_number, tracker_token")
                .single();

            logDtfTrace("dtf.submit-order.service", traceId, "design_order_insert_completed", {
                duration_ms: Date.now() - orderInsertStartedAt,
                success: !insertOrderError,
            });

            if (insertOrderError) {
                logDiagnosticWarning("dtf-design-order-insert", insertOrderError);
                return DtfOrderService.resolveServerErrorMessage(insertOrderError);
            }

            logDtfTrace("dtf.submit-order.service", traceId, "prepare_succeeded", {
                total_duration_ms: Date.now() - serviceStartedAt,
                order_id: insertedOrder?.id ?? null,
            });
            return {
                status: 200,
                data: {
                    cartItem,
                    orderId: insertedOrder?.id ?? null,
                    orderNumber: insertedOrder?.order_number ?? null,
                    trackerToken: insertedOrder?.tracker_token ?? null,
                    mockupUrl: mockupResult.url,
                    extractedUrl,
                    pricing: {
                        basePrice: pricing.base_price,
                        designPrice,
                        finalPrice,
                        printPosition: DEFAULT_DTF_PRINT_POSITION,
                        printSize: DEFAULT_DTF_PRINT_SIZE,
                    },
                    metadata: {
                        garmentId: garmentRow?.id ?? null,
                        garmentName: resolvedGarmentName,
                        colorId: colorRow?.id ?? null,
                        colorName: resolvedColorName,
                        colorHex: resolvedColorHex,
                        sizeId: sizeRow?.id ?? null,
                        sizeName: resolvedSizeName,
                        styleId: styleRow?.id ?? null,
                        styleName: resolvedStyleName,
                        techniqueId: artStyleRow?.id ?? null,
                        techniqueName: resolvedTechniqueName,
                        paletteId: colorPackageRow?.id ?? paletteId ?? null,
                        paletteName: resolvedPaletteLabel || null,
                        customColors: DtfOrderService.buildCustomColorsPayload(customPalette),
                        designMethod: "studio",
                        prompt: calligraphyText ? `مخطوطة: "${calligraphyText}"` : prompt || "تصميم من استوديو DTF",
                    },
                }
            };
        } catch (error) {
            logDiagnosticWarning("dtf-cart-unhandled", error);
            logDtfTrace("dtf.submit-order.service", traceId, "prepare_failed", {
                total_duration_ms: Date.now() - serviceStartedAt,
                error_message: error instanceof Error ? error.message : String(error ?? ""),
            });
            return DtfOrderService.resolveServerErrorMessage(error);
        }
    }
}
