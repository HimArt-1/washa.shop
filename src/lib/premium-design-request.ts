import { z } from "zod";

const compositionSchema = z.enum([
    "horizontal",
    "vertical",
    "diagonal",
    "centered",
    "asymmetrical",
]);

const visualMovementSchema = z.enum([
    "lower_left_to_upper_right",
    "left_to_right",
    "bottom_to_top",
    "center_outward",
]);

const typographyStyleSchema = z.enum([
    "modern_sans_serif",
    "condensed",
    "serif",
    "arabic_calligraphy",
    "monospace",
    "custom",
]);

const printMethodSchema = z.enum([
    "dtf",
    "screen_print",
    "embroidery",
    "mixed",
]);

const printFinishSchema = z.enum([
    "matte",
    "soft_hand",
    "metallic",
    "puff",
    "custom",
]);

const backgroundSchema = z.enum([
    "ice_vanilla",
    "light_beige",
    "soft_concrete",
    "muted_charcoal",
]);

const heroPositionSchema = z.enum(["left", "right", "center"]);

const optionalBriefText = (max: number) => z.string().trim().max(max).optional().default("");

export const premiumDesignBriefSchema = z.object({
    designIdea: z.string().trim().min(2, "اكتب فكرة التصميم").max(3000),
    mainSubject: z.string().trim().min(2, "حدد العنصر الرئيسي").max(500),
    secondarySubjects: optionalBriefText(800),
    environment: optionalBriefText(800),
    composition: compositionSchema,
    visualMovement: visualMovementSchema,
    heroPosition: heroPositionSchema,
    garmentView: z.enum(["front", "back"]),
    designWidth: z.number().finite().min(5).max(60),
    designHeight: z.number().finite().min(5).max(70),
    detailOne: z.string().trim().min(2, "حدد التفصيل الأول").max(300),
    detailTwo: z.string().trim().min(2, "حدد التفصيل الثاني").max(300),
    visualStyle: optionalBriefText(500),
    mainText: optionalBriefText(250),
    secondaryText: optionalBriefText(250),
    typographyStyle: typographyStyleSchema,
    customTypographyStyle: optionalBriefText(160),
    printMethod: printMethodSchema,
    printFinish: printFinishSchema,
    customPrintFinish: optionalBriefText(160),
    background: backgroundSchema,
    backgroundColor: optionalBriefText(80),
    additionalInstructions: optionalBriefText(1200),
}).superRefine((value, ctx) => {
    if (value.detailOne.localeCompare(value.detailTwo, undefined, { sensitivity: "base" }) === 0) {
        ctx.addIssue({
            code: "custom",
            path: ["detailTwo"],
            message: "اختر تفصيلاً مختلفاً للوحة الثانية",
        });
    }
    if (value.printFinish === "custom" && !value.customPrintFinish) {
        ctx.addIssue({
            code: "custom",
            path: ["customPrintFinish"],
            message: "اكتب نوع التشطيب المطلوب",
        });
    }
    const hasArtworkText = Boolean(value.mainText || value.secondaryText);
    if (hasArtworkText && value.typographyStyle === "custom" && !value.customTypographyStyle) {
        ctx.addIssue({
            code: "custom",
            path: ["customTypographyStyle"],
            message: "اكتب أسلوب الخط المطلوب",
        });
    }
});

export type PremiumDesignBrief = z.infer<typeof premiumDesignBriefSchema>;

export type PremiumPrintPosition =
    | "front"
    | "back"
    | "left_chest"
    | "right_chest"
    | "full_back"
    | "custom";

export const premiumBackgroundHex: Record<PremiumDesignBrief["background"], string> = {
    ice_vanilla: "#F4F0E6",
    light_beige: "#D9CDBD",
    soft_concrete: "#B9B7B0",
    muted_charcoal: "#343432",
};

export const premiumPrintPlacementConstraints: Record<PremiumPrintPosition, {
    garmentView: PremiumDesignBrief["garmentView"] | null;
    maxWidth: number;
    maxHeight: number;
}> = {
    front: { garmentView: "front", maxWidth: 45, maxHeight: 55 },
    back: { garmentView: "back", maxWidth: 40, maxHeight: 40 },
    left_chest: { garmentView: "front", maxWidth: 15, maxHeight: 15 },
    right_chest: { garmentView: "front", maxWidth: 15, maxHeight: 15 },
    full_back: { garmentView: "back", maxWidth: 45, maxHeight: 60 },
    custom: { garmentView: null, maxWidth: 45, maxHeight: 60 },
};

export function getPremiumDesignBriefPlacementError(
    brief: PremiumDesignBrief,
    printPosition: PremiumPrintPosition
) {
    const constraint = premiumPrintPlacementConstraints[printPosition];
    if (constraint.garmentView && brief.garmentView !== constraint.garmentView) {
        return printPosition === "back" || printPosition === "full_back"
            ? "منظور القطعة يجب أن يكون خلفياً لطباعة الظهر"
            : "منظور القطعة يجب أن يكون أمامياً لهذا الموضع";
    }
    if (brief.designWidth > constraint.maxWidth || brief.designHeight > constraint.maxHeight) {
        return `المقاس يتجاوز حد الإنتاج الواقعي لهذا الموضع (${constraint.maxWidth} × ${constraint.maxHeight} سم)`;
    }
    return null;
}

export function createPremiumDesignBriefDefaults(input?: {
    printPosition?: PremiumPrintPosition | null;
    printSize?: "large" | "small" | null;
}): PremiumDesignBrief {
    const isChest = input?.printPosition === "left_chest" || input?.printPosition === "right_chest";
    const isFullBack = input?.printPosition === "full_back";
    const isSmall = input?.printSize === "small";
    const dimensions = isChest
        ? { width: 10, height: 10 }
        : isFullBack
            ? { width: 40, height: 45 }
        : isSmall
            ? { width: 18, height: 18 }
            : { width: 40, height: 27 };

    return {
        designIdea: "",
        mainSubject: "",
        secondarySubjects: "",
        environment: "",
        composition: "centered",
        visualMovement: "center_outward",
        heroPosition: "left",
        garmentView: input?.printPosition === "back" || input?.printPosition === "full_back" ? "back" : "front",
        designWidth: dimensions.width,
        designHeight: dimensions.height,
        detailOne: "",
        detailTwo: "",
        visualStyle: "",
        mainText: "",
        secondaryText: "",
        typographyStyle: "modern_sans_serif",
        customTypographyStyle: "",
        printMethod: "dtf",
        printFinish: "matte",
        customPrintFinish: "",
        background: "ice_vanilla",
        backgroundColor: premiumBackgroundHex.ice_vanilla,
        additionalInstructions: "",
    };
}

export type PremiumArtworkColor = {
    name?: string | null;
    hex: string;
};
