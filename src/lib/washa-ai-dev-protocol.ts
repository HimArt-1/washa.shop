export const WASHA_AI_DEV_SURFACES = ["dev", "dev-v2"] as const;
export type WashaAiDevSurface = typeof WASHA_AI_DEV_SURFACES[number];

export const WASHA_AI_DEV_SURFACE_HEADER = "x-washa-ai-dev-surface";
export const WASHA_AI_DEV_SIGNATURE_HEADER = "x-washa-ai-dev-signature";
export const WASHA_AI_DEV_SURFACE_META_NAME = "washa-ai-dev-surface";
export const WASHA_AI_DEV_SIGNATURE_META_NAME = "washa-ai-dev-signature";

export function isWashaAiDevSurface(value: string | null): value is WashaAiDevSurface {
    return WASHA_AI_DEV_SURFACES.some((surface) => surface === value);
}

type MetaSource = {
    querySelector(selector: string): {
        getAttribute(name: string): string | null;
    } | null;
};

function readMetaContent(source: MetaSource, name: string) {
    return source.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || "";
}

export function getWashaAiDevGenerationHeadersFromDocument(
    source?: MetaSource
): Record<string, string> {
    const effectiveSource = source
        ?? (typeof document === "undefined" ? null : document);
    if (!effectiveSource) return {};

    const surface = readMetaContent(effectiveSource, WASHA_AI_DEV_SURFACE_META_NAME);
    const signature = readMetaContent(effectiveSource, WASHA_AI_DEV_SIGNATURE_META_NAME);
    if (!isWashaAiDevSurface(surface) || !signature) return {};

    return {
        [WASHA_AI_DEV_SURFACE_HEADER]: surface,
        [WASHA_AI_DEV_SIGNATURE_HEADER]: signature,
    };
}
