export const WASHA_AI_V4_ART_STYLE_CATALOG = {
    archival_editorial_ink: {
        labelAr: "حبر تحريري أرشيفي",
        labelEn: "Archival Editorial Ink",
        descriptionAr: "خطوط حبر يدوية، تباين محسوب وملمس طباعي قديم راقٍ.",
    },
    neo_najdi_geometry: {
        labelAr: "هندسة نجدية معاصرة",
        labelEn: "Neo-Najdi Geometry",
        descriptionAr: "إيقاع هندسي سعودي معاصر بلا رموز تراثية مبتذلة.",
    },
    retro_future_storybook: {
        labelAr: "قصصي مستقبلي ريترو",
        labelEn: "Retro-Future Storybook",
        descriptionAr: "مشهد حكائي حالم بروح كتب السبعينيات والخيال الفضائي.",
    },
    luxury_minimal_symbol: {
        labelAr: "رمزية فاخرة مختزلة",
        labelEn: "Luxury Minimal Symbol",
        descriptionAr: "عنصر واحد قوي، مساحات صامتة وتوازن مناسب للقطع الفاخرة.",
    },
    mythic_engraving: {
        labelAr: "نقش أسطوري دقيق",
        labelEn: "Mythic Engraving",
        descriptionAr: "حفر كلاسيكي كثيف بتفاصيل أسطورية وعمق متحفي.",
    },
    cinematic_anime_cel: {
        labelAr: "أنيمي سينمائي مصقول",
        labelEn: "Cinematic Anime Cel",
        descriptionAr: "تكوين حركي نظيف بإضاءة درامية وتلوين cel فاخر.",
    },
    surreal_archive_collage: {
        labelAr: "كولاج أرشيفي سريالي",
        labelEn: "Surreal Archive Collage",
        descriptionAr: "قصاصات وصور وملامس أرشيفية ضمن تركيب غير متوقع ومتماسك.",
    },
    brutalist_screen_print: {
        labelAr: "سكرين برنت بروتالي",
        labelEn: "Brutalist Screen Print",
        descriptionAr: "كتل لونية جريئة، خشونة حبر محسوبة وتأثير ستريت وير قوي.",
    },
    botanical_scientific_etching: {
        labelAr: "حفر نباتي علمي",
        labelEn: "Botanical Scientific Etching",
        descriptionAr: "تفاصيل نباتية دقيقة تجمع بين الرسم العلمي والشاعرية.",
    },
    cosmic_airbrush: {
        labelAr: "إيربرش كوني حالم",
        labelEn: "Cosmic Airbrush",
        descriptionAr: "تدرجات هوائية ناعمة وفضاء تسعيني بطابع قابل للاقتناء.",
    },
    desert_noir: {
        labelAr: "نوار صحراوي سينمائي",
        labelEn: "Desert Noir",
        descriptionAr: "ظلال درامية وهدوء صحراوي بطابع غامض ومعاصر.",
    },
    fluid_abstract_cutout: {
        labelAr: "تجريد عضوي مقصوص",
        labelEn: "Fluid Abstract Cutout",
        descriptionAr: "أشكال عضوية متداخلة بإيقاع لوني حديث وحواف طباعية نظيفة.",
    },
} as const;

export type WashaAiV4ArtStyleId = keyof typeof WASHA_AI_V4_ART_STYLE_CATALOG;

export type WashaAiV4ArtStyle = {
    id: WashaAiV4ArtStyleId;
    labelAr: string;
    labelEn: string;
    descriptionAr: string;
};

export const WASHA_AI_V4_ART_STYLE_IDS = Object.keys(
    WASHA_AI_V4_ART_STYLE_CATALOG
) as [WashaAiV4ArtStyleId, ...WashaAiV4ArtStyleId[]];

export const WASHA_AI_V4_ART_STYLES = Object.entries(
    WASHA_AI_V4_ART_STYLE_CATALOG
).map(([id, style]) => ({
    id: id as WashaAiV4ArtStyleId,
    ...style,
})) as WashaAiV4ArtStyle[];

export function getWashaAiV4ArtStyle(id: WashaAiV4ArtStyleId) {
    return {
        id,
        ...WASHA_AI_V4_ART_STYLE_CATALOG[id],
    };
}
