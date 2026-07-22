import "server-only";

import type { WashaAiV4ArtStyleId } from "@/lib/washa-ai-v4-art-styles";

const WASHA_AI_V4_ART_STYLE_PROMPTS = {
    archival_editorial_ink: "Archival editorial ink illustration; expressive hand-drawn linework, controlled crosshatching, refined distressed halftone texture, bold negative space, and premium vintage print character.",
    neo_najdi_geometry: "Contemporary Neo-Najdi geometric art; disciplined angular rhythm, architectural proportion, abstract regional geometry, modern negative space, and sophisticated Saudi visual identity without generic heritage clichés.",
    retro_future_storybook: "Retro-futurist storybook illustration; cinematic narrative staging, delicate vintage linework, softly weathered color, whimsical cosmic detail, and a collectible 1970s science-fiction publishing mood.",
    luxury_minimal_symbol: "Luxury minimal symbolic illustration; one memorable visual idea, precise silhouette, intelligent negative space, restrained detail, immaculate balance, and gallery-grade contemporary fashion-art direction.",
    mythic_engraving: "Mythic fine engraving; intricate etched linework, dramatic classical anatomy, dense controlled hatching, antique print depth, and museum-quality mythological illustration adapted for premium streetwear.",
    cinematic_anime_cel: "Cinematic anime cel illustration; dynamic framing, clean expressive contours, disciplined cel shading, dramatic rim light, emotional atmosphere, and polished feature-film art direction without generic fan-art styling.",
    surreal_archive_collage: "Surreal archival collage; artful photographic cutouts, tactile paper edges, restrained analog grain, unexpected scale relationships, conceptual visual storytelling, and coherent luxury editorial composition.",
    brutalist_screen_print: "Brutalist screen-print illustration; forceful shapes, limited spot-color logic, intentional ink distress, hard graphic contrast, raw registration character, and authoritative underground streetwear energy.",
    botanical_scientific_etching: "Botanical scientific etching; anatomically precise organic detail, elegant engraved contours, layered specimen composition, subtle natural irregularity, and poetic nineteenth-century field-guide craftsmanship.",
    cosmic_airbrush: "Dreamlike cosmic airbrush art; smooth hand-sprayed gradients, luminous planetary depth, soft surreal transitions, polished 1990s fantasy-poster atmosphere, and refined collectible streetwear finish.",
    desert_noir: "Cinematic desert noir illustration; sculpted shadow, restrained mineral tones, atmospheric dust, stark horizon geometry, enigmatic visual tension, and sophisticated contemporary Arabian mood without tourist imagery.",
    fluid_abstract_cutout: "Fluid abstract cutout composition; layered organic forms, confident asymmetry, rhythmic color interaction, crisp print-friendly edges, tactile paper depth, and contemporary art-book sophistication.",
} as const satisfies Record<WashaAiV4ArtStyleId, string>;

export function getWashaAiV4ArtStylePrompt(id: WashaAiV4ArtStyleId) {
    return WASHA_AI_V4_ART_STYLE_PROMPTS[id];
}
