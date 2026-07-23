import { getSupabaseAdminClient } from "@/lib/supabase";
import { logDiagnosticWarning } from "../utils/api-error";
import { StorageService } from "./storage.service";
import { z } from "zod";
import { CUSTOM_PALETTE_ID, submitOrderSchema } from "../validators/submit-order.schema";
import {
    calculateFinalDesignPrice,
    calculatePlacementPrice,
    getGarmentPricingRecord,
    parsePrintPositionValue,
    parsePrintSizeValue,
} from "@/lib/smart-store-core";
import { sendAdminDesignOrderNotificationEmail } from "@/lib/email";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";
import { runRecoverableAdminWebhookDispatch } from "@/lib/admin-notification-delivery";
import { escapeAdminNotificationHtml } from "@/lib/notifications";
import {
    releaseSmartStoreSizeReservation,
    reserveSmartStoreSizeStock,
} from "@/lib/smart-store-inventory";
import type { PrintPosition, PrintSize } from "@/lib/design-intelligence";
import { logDtfTrace } from "../utils/trace";
import {
    DesignRevisionService,
    type ApprovedRevision,
} from "./design-revision.service";

import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignSize,
    CustomDesignStyle,
    Database,
    DesignPricingSnapshotDtf,
} from "@/types/database";

export type SubmitOrderPayload = z.infer<typeof submitOrderSchema>;

export const WASHA_AI_TERMS_VERSION = "washa-ai-terms-v1";

export type WashaAiTermsAcceptance = {
    version: typeof WASHA_AI_TERMS_VERSION;
    acceptedAt: string;
    surface: "dev-v3";
};

type CustomDesignOrderInsert = Database["public"]["Tables"]["custom_design_orders"]["Insert"];

const DEFAULT_DTF_PRINT_POSITION: PrintPosition = "chest";
const DEFAULT_DTF_PRINT_SIZE: PrintSize = "large";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getPrintPositionLabel(position: PrintPosition) {
    if (position === "back") return "الظهر";
    if (position === "shoulder_right") return "لوقو صغير في الصدر (يمين)";
    if (position === "shoulder_left") return "لوقو صغير في الصدر (يسار)";
    return "الصدر";
}

function getPrintSizeLabel(size: PrintSize) {
    return size === "small" ? "مقاس صغير" : "مقاس كبير";
}

export class DtfOrderService {
    private static async dispatchDesignOrderCreatedSideEffects(params: {
        orderId: string;
        orderNumber: number;
        customerName: string;
        customerEmail: string | null;
        customerPhone: string | null;
        garmentName: string;
        colorName: string;
    }) {
        const metadata = {
            design_order_id: params.orderId,
            order_number: params.orderNumber,
            customer_email: params.customerEmail,
            garment_name: params.garmentName,
            color_name: params.colorName,
            source: "washa_ai_dtf_studio",
        };

        const results = await Promise.allSettled([
            runIdempotentDispatch(
                {
                    dispatchKey: `dtf_design_order:${params.orderId}:admin_email:new_order`,
                    eventType: "design_order_created",
                    channel: "email_admin",
                    resourceType: "design_order",
                    resourceId: params.orderId,
                    metadata,
                },
                async () => {
                    const result = await sendAdminDesignOrderNotificationEmail(
                        params.orderNumber,
                        params.customerName,
                        params.customerEmail || "",
                        params.customerPhone || "",
                        params.garmentName,
                        params.colorName,
                        "studio",
                        params.orderId
                    );
                    if (result.success === false) {
                        throw new Error("Failed to send admin DTF design order email");
                    }
                }
            ),
            runRecoverableAdminWebhookDispatch(
                {
                    dispatchKey: `dtf_design_order:${params.orderId}:webhook_admin:new_order`,
                    eventType: "design_order_created",
                    resourceType: "design_order",
                    resourceId: params.orderId,
                    metadata,
                },
                [
                    "🎨 <b>طلب تصميم جديد</b>",
                    `الطلب: #${escapeAdminNotificationHtml(params.orderNumber)}`,
                    `العميل: ${escapeAdminNotificationHtml(params.customerName)}`,
                    `البريد: ${escapeAdminNotificationHtml(params.customerEmail)}`,
                    `الجوال: ${escapeAdminNotificationHtml(params.customerPhone)}`,
                    `المنتج: ${escapeAdminNotificationHtml(params.garmentName)} (${escapeAdminNotificationHtml(params.colorName)})`,
                    `المصدر: WASHA AI DTF Studio`,
                ].join("\n")
            ),
        ]);

        for (const result of results) {
            if (result.status === "rejected") {
                console.error("[DtfOrderService.dispatchDesignOrderCreatedSideEffects]", result.reason);
            }
        }
    }

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
            normalized.includes("design_request_id") ||
            normalized.includes("design_master_asset_id") ||
            normalized.includes("design_revision_id") ||
            normalized.includes("master_checksum") ||
            normalized.includes("placement_data") ||
            normalized.includes("asset_schema_version") ||
            normalized.includes("washa_design_") ||
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
        printPositionLabel: string;
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
            customPosition: params.printPositionLabel,
        };
    }

    /**
     * Validates the DTF selections, uploads the rendered assets,
     * and returns a ready-to-store custom cart item.
     */
    static async prepareCartItem(
        payload: SubmitOrderPayload,
        userProfile: any | null,
        options?: {
            traceId?: string;
            profileId?: string | null;
            termsAcceptance?: WashaAiTermsAcceptance | null;
            deferSideEffects?: (task: () => Promise<void>) => void;
        }
    ): Promise<{ error?: string; status?: number; data?: any }> {
        const traceId = options?.traceId ?? crypto.randomUUID();
        const serviceStartedAt = Date.now();
        let reservedSizeId: string | null = null;
        try {
            const {
                garmentId, garmentType, colorId, garmentColor, colorHex,
                sizeId, garmentSize, styleId, style, techniqueId, technique,
                paletteId, palette, customPalette, prompt, calligraphyText,
                printOptionId, printPosition, printSize, printPositionLabel,
                mockupDataUrl, extractedDataUrl,
                designRequestId, sourceAssetId, sourceChecksum,
                masterAssetId, masterChecksum, placementData
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
                design_request_id: designRequestId ?? null,
                source_asset_id: sourceAssetId ?? null,
                master_asset_id: masterAssetId ?? null,
                terms_version: options?.termsAcceptance?.version ?? null,
                authenticated: Boolean(userProfile),
            });

            const sb = getSupabaseAdminClient();
            const safePrintOptionId = printOptionId && UUID_REGEX.test(printOptionId) ? printOptionId : null;

            const optionFetchStartedAt = Date.now();
            const [
                garmentRes,
                colorRes,
                sizeRes,
                styleRes,
                techniqueRes,
                paletteRes,
                positionRes,
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
                safePrintOptionId
                    ? sb.from("custom_design_positions").select("id, name, print_position, print_size").eq("id", safePrintOptionId).eq("is_active", true).maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
            ]);

            const optionFetchError =
                garmentRes.error || colorRes.error || sizeRes.error ||
                styleRes.error || techniqueRes.error || paletteRes.error || positionRes.error;

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
            const positionRow = positionRes.data as { name?: string | null; print_position?: string | null; print_size?: string | null } | null;
            const selectedPrintPosition =
                parsePrintPositionValue(positionRow?.print_position ?? null) ??
                parsePrintPositionValue(printPosition ?? null) ??
                DEFAULT_DTF_PRINT_POSITION;
            const selectedPrintSize =
                parsePrintSizeValue(positionRow?.print_size ?? null) ??
                parsePrintSizeValue(printSize ?? null) ??
                DEFAULT_DTF_PRINT_SIZE;
            const selectedPrintPositionLabel =
                (printPositionLabel?.trim() || positionRow?.name?.trim()) ||
                `${getPrintPositionLabel(selectedPrintPosition)} — ${getPrintSizeLabel(selectedPrintSize)}`;

            if (garmentId && !garmentRow) {
                return { error: "القطعة المحددة غير متاحة أو غير مفعلة", status: 400 };
            }
            if (colorId && !colorRow) {
                return { error: "اللون المحدد غير متاح أو غير مفعل", status: 400 };
            }
            if (sizeId && !sizeRow) {
                return { error: "المقاس المحدد غير متاح أو غير مفعل", status: 400 };
            }
            if (styleId && !styleRow && !style?.trim()) {
                return { error: "أسلوب التصميم المحدد غير متاح أو غير مفعل", status: 400 };
            }
            if (techniqueId && !artStyleRow && !technique?.trim()) {
                return { error: "التقنية المحددة غير متاحة أو غير مفعلة", status: 400 };
            }
            if (paletteId && paletteId !== CUSTOM_PALETTE_ID && !colorPackageRow && !palette?.trim()) {
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
            const resolvedColorPackageId =
                colorPackageRow?.id ??
                (paletteId && UUID_REGEX.test(paletteId) ? paletteId : null);

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

            const reservedStock = await reserveSmartStoreSizeStock(sb, sizeRow?.id ?? null, 1);
            if ("error" in reservedStock) {
                return { error: reservedStock.error, status: 409 };
            }
            reservedSizeId = reservedStock.tracked ? (sizeRow?.id ?? null) : null;

            const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            let approvedRevision: ApprovedRevision | null = null;
            let mockupUrl: string;
            let extractedUrl: string | null = null;
            if (
                designRequestId
                && placementData
                && (
                    (sourceAssetId && sourceChecksum)
                    || (masterAssetId && masterChecksum)
                )
            ) {
                if (!options?.profileId) {
                    if (reservedSizeId) await releaseSmartStoreSizeReservation(sb, reservedSizeId, 1);
                    return { error: "تعذر ربط اعتماد التصميم بحساب المستخدم.", status: 401 };
                }
                approvedRevision = await DesignRevisionService.approve({
                    profileId: options.profileId,
                    designRequestId,
                    sourceAssetId: sourceAssetId ?? null,
                    sourceChecksum: sourceChecksum ?? null,
                    masterAssetId: masterAssetId ?? null,
                    masterChecksum: masterChecksum ?? null,
                    placement: placementData,
                    productVariant: {
                        garmentId: garmentRow?.id ?? null,
                        garmentName: resolvedGarmentName,
                        sizeId: sizeRow?.id ?? null,
                        sizeName: resolvedSizeName,
                        printOptionId: safePrintOptionId,
                        printPosition: selectedPrintPosition,
                        printSize: selectedPrintSize,
                    },
                    garmentColor: {
                        colorId: colorRow?.id ?? null,
                        colorName: resolvedColorName,
                        colorHex: resolvedColorHex,
                    },
                });
                mockupUrl = selectedPrintPosition === "back"
                    ? approvedRevision.backPreviewUrl || approvedRevision.frontPreviewUrl || ""
                    : approvedRevision.frontPreviewUrl || approvedRevision.backPreviewUrl || "";
                if (!mockupUrl) {
                    if (reservedSizeId) await releaseSmartStoreSizeReservation(sb, reservedSizeId, 1);
                    return { error: "معاينة التصميم المعتمدة غير متوفرة.", status: 409 };
                }
                extractedUrl = approvedRevision.printAssetUrl;
            } else {
                if (!mockupDataUrl) {
                    if (reservedSizeId) await releaseSmartStoreSizeReservation(sb, reservedSizeId, 1);
                    return { error: "صورة الموكب القديمة غير متوفرة.", status: 400 };
                }
                const mockupUploadStartedAt = Date.now();
                const legacyMockupResult = await StorageService.uploadBase64Image(
                    mockupDataUrl,
                    `design-orders/dtf-${slug}/mockup.png`
                );
                logDtfTrace("dtf.submit-order.service", traceId, "legacy_mockup_upload_completed", {
                    duration_ms: Date.now() - mockupUploadStartedAt,
                    success: !("error" in legacyMockupResult),
                    status: "error" in legacyMockupResult ? legacyMockupResult.status : 200,
                });
                if ("error" in legacyMockupResult) {
                    logDiagnosticWarning("dtf-cart-mockup-upload", legacyMockupResult.error);
                    if (reservedSizeId) await releaseSmartStoreSizeReservation(sb, reservedSizeId, 1);
                    return { error: legacyMockupResult.error, status: legacyMockupResult.status };
                }
                mockupUrl = legacyMockupResult.url;

                if (extractedDataUrl) {
                    const extractedUploadStartedAt = Date.now();
                    const extractedResult = await StorageService.uploadBase64Image(
                        extractedDataUrl,
                        `design-orders/dtf-${slug}/extracted.png`
                    );
                    logDtfTrace("dtf.submit-order.service", traceId, "legacy_extracted_upload_completed", {
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
            }
            const mockupResult = { url: mockupUrl };

            const pricingStartedAt = Date.now();
            const pricing = await getGarmentPricingRecord(sb, resolvedGarmentName, garmentRow?.id ?? null);
            const designPrice = calculatePlacementPrice(
                pricing,
                selectedPrintPosition,
                selectedPrintSize
            );
            const finalPrice = calculateFinalDesignPrice(
                pricing,
                selectedPrintPosition,
                selectedPrintSize
            );
            const cartItem = DtfOrderService.buildCartItem({
                id: slug,
                garmentName: resolvedGarmentName,
                colorName: resolvedColorName,
                sizeName: resolvedSizeName || null,
                mockupUrl: mockupResult.url,
                extractedUrl,
                finalPrice,
                printPositionLabel: selectedPrintPositionLabel,
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
            const dtfPricingSnapshot: DesignPricingSnapshotDtf = {
                base_price: pricing.base_price,
                design_price: designPrice,
                final_price: finalPrice,
                dtf: true,
                ...(approvedRevision?.pipeline === "prompt_native"
                    ? { washa_ai_version: "v3" as const }
                    : {}),
                ...(options?.termsAcceptance
                    ? {
                        terms_acceptance: {
                            version: options.termsAcceptance.version,
                            accepted_at: options.termsAcceptance.acceptedAt,
                            surface: options.termsAcceptance.surface,
                        },
                    }
                    : {}),
            };
            const designOrderInsertPayload: CustomDesignOrderInsert = {
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
                reference_image_url: approvedRevision?.sourceAssetUrl
                    ?? approvedRevision?.masterAssetUrl
                    ?? extractedUrl
                    ?? mockupResult.url,
                preset_id: null,
                preset_name: null,
                preset_fully_aligned: false,
                style_id: styleRow?.id ?? null,
                style_name: resolvedStyleName,
                style_image_url: styleRow?.image_url ?? null,
                art_style_id: artStyleRow?.id ?? null,
                art_style_name: resolvedTechniqueName,
                art_style_image_url: artStyleRow?.image_url ?? null,
                color_package_id: resolvedColorPackageId,
                color_package_name: resolvedPaletteLabel,
                custom_colors: DtfOrderService.buildCustomColorsPayload(customPalette),
                studio_item_id: null,
                ai_prompt: aiPrompt,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                print_position: selectedPrintPosition,
                print_size: selectedPrintSize,
                pricing_snapshot: dtfPricingSnapshot,
                dtf_mockup_url: mockupResult.url,
                dtf_extracted_url: extractedUrl,
                dtf_style_label: resolvedStyleName,
                dtf_technique_label: resolvedTechniqueName,
                dtf_palette_label: resolvedPaletteLabel,
                design_request_id: approvedRevision ? designRequestId : null,
                design_source_asset_id: approvedRevision?.sourceAssetId ?? null,
                source_checksum: approvedRevision?.sourceChecksum ?? null,
                design_master_asset_id: approvedRevision?.masterAssetId ?? null,
                design_revision_id: approvedRevision?.designRevisionId ?? null,
                master_checksum: approvedRevision?.masterChecksum ?? null,
                placement_data: approvedRevision ? placementData : null,
                mockup_source_type: approvedRevision?.mockupSourceType ?? null,
                preview_front_url: approvedRevision?.frontPreviewUrl ?? null,
                preview_back_url: approvedRevision?.backPreviewUrl ?? null,
                print_asset_path: approvedRevision?.printAssetPath ?? null,
                asset_schema_version: approvedRevision ? 2 : 0,
                production_readiness_status: approvedRevision
                    ? approvedRevision.productionReadinessStatus
                    : "legacy_unverified",
            };
            const { data: insertedOrder, error: insertOrderError } = await sb
                .from("custom_design_orders")
                .insert(designOrderInsertPayload)
                .select("id, order_number, tracker_token")
                .single();

            logDtfTrace("dtf.submit-order.service", traceId, "design_order_insert_completed", {
                duration_ms: Date.now() - orderInsertStartedAt,
                success: !insertOrderError,
            });

            if (insertOrderError) {
                logDiagnosticWarning("dtf-design-order-insert", insertOrderError);
                if (reservedSizeId) await releaseSmartStoreSizeReservation(sb, reservedSizeId, 1);
                return DtfOrderService.resolveServerErrorMessage(insertOrderError);
            }

            if (insertedOrder?.id && insertedOrder.order_number) {
                const dispatchSideEffects = () =>
                    DtfOrderService.dispatchDesignOrderCreatedSideEffects({
                        orderId: insertedOrder.id,
                        orderNumber: insertedOrder.order_number,
                        customerName,
                        customerEmail,
                        customerPhone,
                        garmentName: resolvedGarmentName,
                        colorName: resolvedColorName,
                    });
                if (options?.deferSideEffects) {
                    options.deferSideEffects(dispatchSideEffects);
                } else {
                    await dispatchSideEffects();
                }
            }

            logDtfTrace("dtf.submit-order.service", traceId, "prepare_succeeded", {
                total_duration_ms: Date.now() - serviceStartedAt,
                order_id: insertedOrder?.id ?? null,
            });
            return {
                status: 200,
                data: {
                    cartItem: {
                        ...cartItem,
                        customDesignOrderId: insertedOrder?.id ?? undefined,
                        customDesignTrackerToken: insertedOrder?.tracker_token ?? undefined,
                    },
                    orderId: insertedOrder?.id ?? null,
                    orderNumber: insertedOrder?.order_number ?? null,
                    trackerToken: insertedOrder?.tracker_token ?? null,
                    mockupUrl: mockupResult.url,
                    extractedUrl,
                    designRequestId: approvedRevision ? designRequestId : null,
                    sourceAssetId: approvedRevision?.sourceAssetId ?? null,
                    sourceChecksum: approvedRevision?.sourceChecksum ?? null,
                    designRevisionId: approvedRevision?.designRevisionId ?? null,
                    masterAssetId: approvedRevision?.masterAssetId ?? null,
                    masterChecksum: approvedRevision?.masterChecksum ?? null,
                    productionReadinessStatus:
                        approvedRevision?.productionReadinessStatus ?? "legacy_unverified",
                    pricing: {
                        basePrice: pricing.base_price,
                        designPrice,
                        finalPrice,
                        printPosition: selectedPrintPosition,
                        printSize: selectedPrintSize,
                        printPositionLabel: selectedPrintPositionLabel,
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
                        paletteId: resolvedColorPackageId,
                        paletteName: resolvedPaletteLabel || null,
                        customColors: DtfOrderService.buildCustomColorsPayload(customPalette),
                        designMethod: "studio",
                        prompt: calligraphyText ? `مخطوطة: "${calligraphyText}"` : prompt || "تصميم من استوديو DTF",
                    },
                }
            };
        } catch (error) {
            if (reservedSizeId) {
                await releaseSmartStoreSizeReservation(getSupabaseAdminClient(), reservedSizeId, 1);
            }
            logDiagnosticWarning("dtf-cart-unhandled", error);
            logDtfTrace("dtf.submit-order.service", traceId, "prepare_failed", {
                total_duration_ms: Date.now() - serviceStartedAt,
                error_message: error instanceof Error ? error.message : String(error ?? ""),
            });
            return DtfOrderService.resolveServerErrorMessage(error);
        }
    }
}
