import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    DTF_PALETTE_PROMPT_OVERRIDES,
    DTF_STYLE_PROMPT_OVERRIDES,
    DTF_TECHNIQUE_PROMPT_OVERRIDES,
} from "@/lib/dtf-studio-catalog";
import {
    applyPositionPricing,
    normalizeArtStyleRow,
    normalizeColorPackageRow,
    normalizeStyleRow,
} from "@/lib/smart-store-core";
import {
    getSmartStoreAvailableQuantity,
    getSmartStoreStockStatus,
    type SmartStoreStockStatus,
} from "@/lib/smart-store-inventory";
import type {
    DesignColorToken,
    DesignIntelligenceMetadata,
    PrintPosition,
    PrintSize,
} from "@/lib/design-intelligence";
import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignSize,
    CustomDesignStyle,
    CustomDesignPosition,
} from "@/types/database";
import type { WashaDtfGenerationReadiness } from "@/lib/washa-dtf-generation-readiness";

export type WashaDtfStudioConfig = {
    generation?: WashaDtfGenerationReadiness;
    features?: {
        structuredUserActionsEnabled: boolean;
    };
    garments: Array<{
        id: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        aiReferenceFrontUrl: string | null;
        aiReferenceBackUrl: string | null;
        aiReferenceMode: "match_reference" | "prompt_realistic";
        mockupManifest: Array<{
            id: string;
            colorId: string | null;
            colorHex: string | null;
            side: "front" | "back";
            sourceType: "reference" | "generated_blank_garment";
            printAreaId: string;
            printArea: Record<string, unknown>;
            colorizationMode: "none" | "verified";
        }>;
        sortOrder: number;
        basePrice: number;
        pricing: {
            chestLarge: number;
            chestSmall: number;
            backLarge: number;
            backSmall: number;
            shoulderLarge: number;
            shoulderSmall: number;
            positions?: Partial<Record<PrintPosition, { price_large: number; price_small: number }>>;
        };
        colors: Array<{
            id: string;
            garmentId: string;
            name: string;
            hexCode: string;
            imageUrl: string | null;
            sortOrder: number;
        }>;
        sizes: Array<{
            id: string;
            garmentId: string;
            colorId: string | null;
            name: string;
            imageFrontUrl: string | null;
            imageBackUrl: string | null;
            trackInventory: boolean;
            stockQuantity: number;
            reservedQuantity: number;
            availableQuantity: number | null;
            stockStatus: SmartStoreStockStatus;
        }>;
    }>;
    styles: Array<WashaDtfStudioCreativeOption>;
    techniques: Array<WashaDtfStudioCreativeOption>;
    palettes: Array<WashaDtfStudioPaletteOption>;
    positions: Array<{
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        printPosition: PrintPosition | null;
        printSize: PrintSize | null;
        price: number;
        priceLarge: number;
        priceSmall: number;
        sortOrder: number;
    }>;
};

export type WashaDtfStudioCreativeOption = {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    prompt: string;
    metadata: DesignIntelligenceMetadata;
};

export type WashaDtfStudioPaletteOption = WashaDtfStudioCreativeOption & {
    colors: DesignColorToken[];
};

function assertQuerySucceeded(label: string, error: { message: string } | null) {
    if (!error) return;
    throw new Error(`${label}: ${error.message}`);
}

function compactText(parts: Array<string | null | undefined>) {
    return parts
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter(Boolean)
        .join(". ");
}

function metadataList(value: unknown) {
    if (!Array.isArray(value)) return "";
    return value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .join(", ");
}

function buildCreativePrompt(input: {
    name: string;
    description?: string | null;
    metadata: DesignIntelligenceMetadata;
    extra?: string | null;
}) {
    const keywords = metadataList(input.metadata.keywords);
    const moods = metadataList(input.metadata.moods);
    const creativeDirection =
        typeof input.metadata.creative_direction === "string"
            ? input.metadata.creative_direction.trim()
            : "";
    const storyHook =
        typeof input.metadata.story_hook === "string"
            ? input.metadata.story_hook.trim()
            : "";
    const notes =
        typeof input.metadata.notes === "string"
            ? input.metadata.notes.trim()
            : "";

    return compactText([
        input.name,
        input.description,
        creativeDirection ? `Creative direction: ${creativeDirection}` : null,
        storyHook ? `Story hook: ${storyHook}` : null,
        keywords ? `Keywords: ${keywords}` : null,
        moods ? `Mood: ${moods}` : null,
        input.extra,
        notes ? `Notes: ${notes}` : null,
    ]);
}

function mapCreativeOption(row: CustomDesignStyle | CustomDesignArtStyle): WashaDtfStudioCreativeOption {
    const overridePrompt =
        row.name in DTF_STYLE_PROMPT_OVERRIDES
            ? DTF_STYLE_PROMPT_OVERRIDES[row.name]
            : row.name in DTF_TECHNIQUE_PROMPT_OVERRIDES
                ? DTF_TECHNIQUE_PROMPT_OVERRIDES[row.name]
                : null;

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        sortOrder: row.sort_order,
        prompt: overridePrompt || buildCreativePrompt({
            name: row.name,
            description: row.description,
            metadata: row.metadata,
        }),
        metadata: row.metadata,
    };
}

function mapPaletteOption(row: CustomDesignColorPackage): WashaDtfStudioPaletteOption {
    const colorSummary = row.colors
        .map((color) => {
            const name = typeof color.name === "string" ? color.name.trim() : "";
            const hex = typeof color.hex === "string" ? color.hex.trim() : "";
            return [name, hex].filter(Boolean).join(" ");
        })
        .filter(Boolean)
        .join(", ");

    return {
        id: row.id,
        name: row.name,
        description: null,
        imageUrl: row.image_url,
        sortOrder: row.sort_order,
        prompt: DTF_PALETTE_PROMPT_OVERRIDES[row.name] || buildCreativePrompt({
            name: row.name,
            metadata: row.metadata,
            extra: colorSummary ? `Palette colors: ${colorSummary}` : null,
        }),
        metadata: row.metadata,
        colors: row.colors,
    };
}

export async function getWashaDtfStudioConfig(): Promise<WashaDtfStudioConfig> {
    const sb = getSupabaseAdminClient();

    const [garmentsRes, colorsRes, sizesRes, stylesResScoped, artStylesResScoped, colorPackagesResScoped, positionsRes] = await Promise.all([
        sb.from("custom_design_garments").select("*").eq("is_active", true).order("sort_order"),
        sb.from("custom_design_colors").select("*").eq("is_active", true).order("sort_order"),
        sb.from("custom_design_sizes").select("*").eq("is_active", true).order("name"),
        sb.from("custom_design_styles").select("*").in("catalog_scope", ["dtf_studio", "shared"]).eq("is_active", true).order("sort_order"),
        sb.from("custom_design_art_styles").select("*").in("catalog_scope", ["dtf_studio", "shared"]).eq("is_active", true).order("sort_order"),
        sb.from("custom_design_color_packages").select("*").in("catalog_scope", ["dtf_studio", "shared"]).eq("is_active", true).order("sort_order"),
        sb.from("custom_design_positions").select("*").eq("is_active", true).order("sort_order"),
    ]);

    // If catalog_scope column doesn't exist yet (migration not applied), fall back to unfiltered queries
    const scopeColumnMissing = (err: { message: string } | null) =>
        !!err && /catalog_scope/i.test(err.message);

    const [stylesRes, artStylesRes, colorPackagesRes] = await Promise.all([
        scopeColumnMissing(stylesResScoped.error)
            ? sb.from("custom_design_styles").select("*").eq("is_active", true).order("sort_order")
            : Promise.resolve(stylesResScoped),
        scopeColumnMissing(artStylesResScoped.error)
            ? sb.from("custom_design_art_styles").select("*").eq("is_active", true).order("sort_order")
            : Promise.resolve(artStylesResScoped),
        scopeColumnMissing(colorPackagesResScoped.error)
            ? sb.from("custom_design_color_packages").select("*").eq("is_active", true).order("sort_order")
            : Promise.resolve(colorPackagesResScoped),
    ]);

    assertQuerySucceeded("custom_design_garments", garmentsRes.error);
    assertQuerySucceeded("custom_design_colors", colorsRes.error);
    assertQuerySucceeded("custom_design_sizes", sizesRes.error);
    assertQuerySucceeded("custom_design_styles", stylesRes.error);
    assertQuerySucceeded("custom_design_art_styles", artStylesRes.error);
    assertQuerySucceeded("custom_design_color_packages", colorPackagesRes.error);
    assertQuerySucceeded("custom_design_positions", positionsRes.error);

    const garments = (garmentsRes.data as CustomDesignGarment[] | null) ?? [];
    const colors = (colorsRes.data as CustomDesignColor[] | null) ?? [];
    const sizes = (sizesRes.data as CustomDesignSize[] | null) ?? [];
    const styles = ((stylesRes.data as CustomDesignStyle[] | null) ?? []).map(normalizeStyleRow);
    const artStyles = ((artStylesRes.data as CustomDesignArtStyle[] | null) ?? []).map(normalizeArtStyleRow);
    const colorPackages = ((colorPackagesRes.data as CustomDesignColorPackage[] | null) ?? []).map(normalizeColorPackageRow);
    const positions = (positionsRes.data as CustomDesignPosition[] | null) ?? [];
    const mockupManifestResult = await (sb as any)
        .from("washa_garment_mockup_assets")
        .select("id, product_id, color_id, color_hex, side, source_type, print_area_id, print_area, colorization_mode")
        .eq("is_active", true);
    const mockupManifestRows = mockupManifestResult.error
        && /washa_garment_mockup_assets|schema cache|could not find/i.test(mockupManifestResult.error.message || "")
        ? []
        : (() => {
            if (mockupManifestResult.error) {
                throw new Error(`washa_garment_mockup_assets: ${mockupManifestResult.error.message}`);
            }
            return mockupManifestResult.data ?? [];
        })();

    return {
        garments: garments.map((garment) => {
            const garmentWithAiReferences = garment as CustomDesignGarment & {
                ai_reference_front_url?: string | null;
                ai_reference_back_url?: string | null;
                ai_reference_mode?: "match_reference" | "prompt_realistic" | null;
            };
            const pricing = applyPositionPricing({
                base_price: garment.base_price,
                price_chest_large: garment.price_chest_large,
                price_chest_small: garment.price_chest_small,
                price_back_large: garment.price_back_large,
                price_back_small: garment.price_back_small,
                price_shoulder_large: garment.price_shoulder_large,
                price_shoulder_small: garment.price_shoulder_small,
            }, positions);

            return {
                id: garment.id,
                name: garment.name,
                slug: garment.slug,
                imageUrl: garment.image_url,
                aiReferenceFrontUrl: garmentWithAiReferences.ai_reference_front_url ?? null,
                aiReferenceBackUrl: garmentWithAiReferences.ai_reference_back_url ?? null,
                aiReferenceMode: garmentWithAiReferences.ai_reference_mode === "prompt_realistic" ? "prompt_realistic" : "match_reference",
                mockupManifest: mockupManifestRows
                    .filter((asset: any) => asset.product_id === garment.id)
                    .map((asset: any) => ({
                        id: asset.id,
                        colorId: asset.color_id ?? null,
                        colorHex: asset.color_hex ?? null,
                        side: asset.side,
                        sourceType: asset.source_type,
                        printAreaId: asset.print_area_id,
                        printArea: asset.print_area ?? {},
                        colorizationMode: asset.colorization_mode === "verified" ? "verified" : "none",
                    })),
                sortOrder: garment.sort_order,
                basePrice: garment.base_price,
                pricing: {
                    chestLarge: pricing.price_chest_large,
                    chestSmall: pricing.price_chest_small,
                    backLarge: pricing.price_back_large,
                    backSmall: pricing.price_back_small,
                    shoulderLarge: pricing.price_shoulder_large,
                    shoulderSmall: pricing.price_shoulder_small,
                    positions: pricing.positions,
                },
                colors: colors
                .filter((color) => color.garment_id === garment.id)
                .map((color) => ({
                    id: color.id,
                    garmentId: color.garment_id,
                    name: color.name,
                    hexCode: color.hex_code,
                    imageUrl: color.image_url,
                    sortOrder: color.sort_order,
                })),
            sizes: sizes
                .filter((size) => size.garment_id === garment.id)
                .map((size) => ({
                    id: size.id,
                    garmentId: size.garment_id,
                    colorId: size.color_id,
                    name: size.name,
                    imageFrontUrl: size.image_front_url,
                    imageBackUrl: size.image_back_url,
                    trackInventory: size.track_inventory,
                    stockQuantity: size.stock_quantity,
                    reservedQuantity: size.reserved_quantity,
                    availableQuantity: getSmartStoreAvailableQuantity(size),
                    stockStatus: getSmartStoreStockStatus(size),
                })),
            };
        }),
        styles: styles.map(mapCreativeOption),
        techniques: artStyles.map(mapCreativeOption),
        palettes: colorPackages.map(mapPaletteOption),
        positions: positions.map((pos) => ({
            id: pos.id,
            name: pos.name,
            description: pos.description,
            imageUrl: pos.image_url,
            printPosition: pos.print_position,
            printSize: pos.print_size,
            price: pos.price,
            priceLarge: pos.price_large,
            priceSmall: pos.price_small,
            sortOrder: pos.sort_order,
        })),
    };
}
