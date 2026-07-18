import type { ArtworkGenerationContext } from "@/lib/washa-artwork/types";

export const WASHA_ISOLATED_ARTWORK_SYSTEM_INSTRUCTIONS = [
    "Create only the isolated print design artwork.",
    "The output must use a true transparent background with a real alpha channel.",
    "Do not generate a shirt, hoodie, garment, person, mannequin, model, mockup, wall, paper, canvas, frame, room, product scene, background color, floor, environment, or presentation surface.",
    "Do not generate a white, black, colored, checkerboard, or simulated transparent background.",
    "The complete artwork must be centered, fully visible, uncropped, and surrounded by safe transparent padding.",
    "Preserve all Arabic text exactly as supplied. Do not rewrite, translate, correct, replace, rearrange, or invent Arabic characters.",
    "Generate crisp, clean, high-resolution edges suitable for professional DTF printing.",
    "Return exactly one isolated print-ready design.",
].join("\n");

export const WASHA_ARTWORK_TRANSPORT_MATTE_INSTRUCTIONS = [
    "Image transport compatibility:",
    "If the response encoder cannot return a real alpha channel, use one perfectly uniform solid #F2F2F2 transport matte across the entire edge-connected canvas background.",
    "This transport matte is the only allowed non-transparent fallback and will be removed after generation.",
    "Do not add gradients, textures, shadows, lighting variation, vignettes, floors, scenery, frames, or objects to the transport matte.",
    "Keep the complete artwork separated from every canvas edge, and do not use #F2F2F2 as a color inside the artwork.",
].join("\n");

function compact(value: string | null | undefined) {
    return typeof value === "string" ? value.trim() : "";
}

export function buildArtworkTransportPrompt(prompt: string) {
    return [
        prompt.trim(),
        WASHA_ARTWORK_TRANSPORT_MATTE_INSTRUCTIONS,
    ].filter(Boolean).join("\n\n");
}

export function buildArtworkBackgroundRecoveryPrompt() {
    return [
        "Edit the supplied image; do not create a new design.",
        "Treat every visible artwork element, composition, typography, color, proportion, and internal white detail as immutable.",
        "Change only the canvas background and preserve the artwork exactly.",
        "Return the same complete artwork centered, uncropped, and separated from every canvas edge.",
        "Use true transparency if the response supports alpha.",
        "If the response encoder cannot return alpha, use one perfectly uniform solid #F2F2F2 transport matte across the entire edge-connected background.",
        "Do not add gradients, textures, shadows, lighting variation, vignettes, floors, scenery, frames, or presentation surfaces.",
        "Return exactly one image.",
    ].join("\n");
}

export function extractCustomerConceptFromLegacyPrompt(value: string) {
    const prompt = value.trim();
    if (!prompt) return "";

    const conceptMatch = prompt.match(
        /Mandatory customer artwork concept:\s*([\s\S]*?)(?:\.\s+(?:Create a new visible print artwork|The result is invalid|Style:)|$)/i
    );
    if (conceptMatch?.[1]?.trim()) return conceptMatch[1].trim();

    const isolatedConceptMatch = prompt.match(
        /Customer artwork idea:\s*([\s\S]*?)(?:\n\n(?:Exact text that must appear unchanged|Selected visual style|Selected technique|Selected color palette|This is a calligraphy|Do not add any text)|$)/i
    );
    if (isolatedConceptMatch?.[1]?.trim()) return isolatedConceptMatch[1].trim();

    const arabicCalligraphyMatch = prompt.match(/المخطوطة الفنية التالية[^:]*:\s*"([^"]+)"/i);
    if (arabicCalligraphyMatch?.[1]?.trim()) return arabicCalligraphyMatch[1].trim();

    const calligraphyMatch = prompt.match(/Render ONLY this phrase as artistic calligraphy:\s*"([^"]+)"/i);
    if (calligraphyMatch?.[1]?.trim()) return calligraphyMatch[1].trim();

    return prompt;
}

export function buildIsolatedArtworkPrompt(
    userIdea: string,
    context: ArtworkGenerationContext = {}
) {
    const calligraphyText = compact(context.calligraphyText);
    const exactIdea = calligraphyText || extractCustomerConceptFromLegacyPrompt(userIdea);
    const referenceDirective = context.referenceImageMode === "preserve_subject"
        ? "Use the supplied customer reference to preserve the identity and recognizable structure of its main subject, while producing a clean isolated print artwork."
        : context.referenceImageMode === "style_inspiration"
            ? "Use the supplied customer reference only as visual style inspiration. Do not copy its exact subject, background, frame, or composition."
            : context.referenceImageMode === "reinterpret"
                ? "Creatively reinterpret the supplied customer reference as an isolated print artwork; do not paste or reproduce its background."
                : null;
    const sections = [
        WASHA_ISOLATED_ARTWORK_SYSTEM_INSTRUCTIONS,
        exactIdea ? `Customer artwork idea:\n${exactIdea}` : null,
        calligraphyText ? `Exact text that must appear unchanged:\n${calligraphyText}` : null,
        compact(context.style) ? `Selected visual style:\n${compact(context.style)}` : null,
        compact(context.technique) ? `Selected technique:\n${compact(context.technique)}` : null,
        compact(context.palette) ? `Selected color palette:\n${compact(context.palette)}` : null,
        referenceDirective,
        context.designMethod === "calligraphy"
            ? "This is a calligraphy artwork request. Render only the exact supplied text and its requested artistic treatment."
            : "Do not add any text, letters, symbols, or words unless the customer explicitly supplied them.",
    ].filter(Boolean);

    return sections.join("\n\n");
}

export function buildBlankGarmentPrompt(params: {
    garmentType: string;
    colorName: string;
    colorHex?: string | null;
    side: "front" | "back";
}) {
    return [
        "Generate a clean blank apparel mockup only.",
        "The garment must contain no artwork, no print, no logo, no typography, no symbols, and no decorative graphics.",
        `Use the exact requested garment type: ${params.garmentType}.`,
        `Use the selected garment color: ${params.colorName}${params.colorHex ? ` (${params.colorHex})` : ""}.`,
        `Use a strict ${params.side} view.`,
        "Keep the printable area clearly visible, flat, unobstructed, and suitable for later programmatic artwork compositing.",
        "Use neutral premium studio lighting and a clean uniform background.",
        "Do not invent or redraw the customer's design.",
        "Return one blank garment mockup only.",
    ].join("\n");
}
