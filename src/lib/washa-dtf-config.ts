import { getSupabaseAdminClient } from "@/lib/supabase";
import {
    DTF_PALETTE_PROMPT_OVERRIDES,
    DTF_STYLE_PROMPT_OVERRIDES,
    DTF_TECHNIQUE_PROMPT_OVERRIDES,
} from "@/lib/dtf-studio-catalog";
import {
    normalizeArtStyleRow,
    normalizeColorPackageRow,
    normalizeStyleRow,
} from "@/lib/smart-store-core";
import type {
    DesignColorToken,
    DesignIntelligenceMetadata,
} from "@/lib/design-intelligence";
import type {
    CustomDesignArtStyle,
    CustomDesignColor,
    CustomDesignColorPackage,
    CustomDesignGarment,
    CustomDesignSize,
    CustomDesignStyle,
} from "@/types/database";

export type WashaDtfStudioConfig = {
    garments: Array<{
        id: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        sortOrder: number;
        basePrice: number;
        pricing: {
            chestLarge: number;
            chestSmall: number;
            backLarge: number;
            backSmall: number;
            shoulderLarge: number;
            shoulderSmall: number;
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
        }>;
    }>;
    styles: Array<WashaDtfStudioCreativeOption>;
    techniques: Array<WashaDtfStudioCreativeOption>;
    palettes: Array<WashaDtfStudioPaletteOption>;
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

    const [garmentsRes, colorsRes, sizesRes, stylesRes, artStylesRes, colorPackagesRes] = await Promise.all([
        sb.from("custom_design_garments").select("*").eq("is_active", true).order("sort_order"),
        sb.from("custom_design_colors").select("*").eq("is_active", true).order("sort_order"),
        sb.from("custom_design_sizes").select("*").eq("is_active", true).order("name"),
        sb.from("custom_design_styles").select("*").in("catalog_scope", ["dtf_studio", "shared"]).eq("is_active", true).order("sort_order"),
        sb.from("custom_design_art_styles").select("*").in("catalog_scope", ["dtf_studio", "shared"]).eq("is_active", true).order("sort_order"),
        sb.from("custom_design_color_packages").select("*").in("catalog_scope", ["dtf_studio", "shared"]).eq("is_active", true).order("sort_order"),
    ]);

    assertQuerySucceeded("custom_design_garments", garmentsRes.error);
    assertQuerySucceeded("custom_design_colors", colorsRes.error);
    assertQuerySucceeded("custom_design_sizes", sizesRes.error);
    assertQuerySucceeded("custom_design_styles", stylesRes.error);
    assertQuerySucceeded("custom_design_art_styles", artStylesRes.error);
    assertQuerySucceeded("custom_design_color_packages", colorPackagesRes.error);

    const garments = (garmentsRes.data as CustomDesignGarment[] | null) ?? [];
    const colors = (colorsRes.data as CustomDesignColor[] | null) ?? [];
    const sizes = (sizesRes.data as CustomDesignSize[] | null) ?? [];
    const styles = ((stylesRes.data as CustomDesignStyle[] | null) ?? []).map(normalizeStyleRow);
    const artStyles = ((artStylesRes.data as CustomDesignArtStyle[] | null) ?? []).map(normalizeArtStyleRow);
    const colorPackages = ((colorPackagesRes.data as CustomDesignColorPackage[] | null) ?? []).map(normalizeColorPackageRow);

    return {
        garments: garments.map((garment) => ({
            id: garment.id,
            name: garment.name,
            slug: garment.slug,
            imageUrl: garment.image_url,
            sortOrder: garment.sort_order,
            basePrice: garment.base_price,
            pricing: {
                chestLarge: garment.price_chest_large,
                chestSmall: garment.price_chest_small,
                backLarge: garment.price_back_large,
                backSmall: garment.price_back_small,
                shoulderLarge: garment.price_shoulder_large,
                shoulderSmall: garment.price_shoulder_small,
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
                })),
        })),
        styles: styles.map(mapCreativeOption),
        techniques: artStyles.map(mapCreativeOption),
        palettes: colorPackages.map(mapPaletteOption),
    };
}
