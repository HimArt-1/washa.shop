import { normalizeColorTokens } from "@/lib/design-intelligence";
import {
    getPremiumDesignBriefPlacementError,
    premiumDesignBriefSchema,
} from "@/lib/premium-design-request";
import { z } from "zod";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/;
const PRINT_POSITIONS = ["chest", "back", "shoulder_right", "shoulder_left"] as const;
const PRINT_SIZES = ["large", "small"] as const;
const DESIGN_METHODS = ["from_text", "from_image", "studio"] as const;
const ENERGY_LEVELS = ["low", "medium", "high"] as const;
const COMPLEXITY_LEVELS = ["minimal", "balanced", "bold"] as const;
const LUXURY_TIERS = ["core", "signature", "editorial"] as const;
const CATALOG_SCOPES = ["design_piece", "dtf_studio", "shared"] as const;
const GARMENT_AI_REFERENCE_MODES = ["match_reference", "prompt_realistic"] as const;
const DTF_MOCKUP_SIDES = ["front", "back"] as const;
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SAFE_RECORD_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/;

function trimToUndefined(value: unknown) {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function isSafeHttpUrlLike(value: string) {
    if (value.length > 2048 || CONTROL_CHARS.test(value)) return false;
    if (value.startsWith("/")) return true;

    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

const optionalUuid = (label: string) =>
    z.preprocess(
        trimToUndefined,
        z.string().uuid(`${label} غير صالح`).optional()
    );

const optionalSafeRecordId = (label: string) =>
    z.preprocess(
        trimToUndefined,
        z
            .string()
            .regex(SAFE_RECORD_ID_REGEX, `${label} غير صالح`)
            .optional()
    );

const requiredUuid = (label: string) =>
    z.preprocess(
        (value) => {
            if (typeof value !== "string") return "";
            return value.trim();
        },
        z.string().uuid(`${label} غير صالح`)
    );

const optionalText = (label: string, maxLength: number) =>
    z.preprocess(
        trimToUndefined,
        z.string().max(maxLength, `${label} طويل جداً`).optional()
    );

const requiredText = (label: string, maxLength: number) =>
    z.preprocess(
        (value) => {
            if (typeof value !== "string") return "";
            return value.trim();
        },
        z
            .string()
            .min(1, `${label} مطلوب`)
            .max(maxLength, `${label} طويل جداً`)
    );

const optionalSafeUrl = (label: string) =>
    z.preprocess(
        trimToUndefined,
        z
            .string()
            .refine(isSafeHttpUrlLike, `${label} غير صالح`)
            .optional()
    );

const requiredSafeUrl = (label: string) =>
    z.preprocess(
        (value) => (typeof value === "string" ? value.trim() : value),
        z
            .string()
            .min(1, `${label} مطلوب`)
            .refine(isSafeHttpUrlLike, `${label} غير صالح`)
    );

const optionalStoragePath = (label: string) =>
    z.preprocess(
        trimToUndefined,
        z
            .string()
            .max(1024, `${label} طويل جداً`)
            .refine((value) => !CONTROL_CHARS.test(value) && !value.startsWith("/") && !value.includes(".."), `${label} غير صالح`)
            .optional()
    );

const optionalEmail = z.preprocess(
    trimToUndefined,
    z.string().email("البريد الإلكتروني غير صالح").optional()
);

const optionalPhone = z.preprocess(
    trimToUndefined,
    z.string().regex(PHONE_REGEX, "رقم الهاتف غير صالح").optional()
);

const optionalColorHex = z.preprocess(
    trimToUndefined,
    z
        .string()
        .regex(HEX_COLOR_REGEX, "لون القطعة غير صالح")
        .optional()
);

const designMethodSchema = z.preprocess(
    trimToUndefined,
    z.enum(DESIGN_METHODS, { error: "طريقة التصميم غير صالحة" })
);

const printPositionSchema = z.preprocess(
    trimToUndefined,
    z.enum(PRINT_POSITIONS, { error: "موقع الطباعة غير صالح" })
);

const printSizeSchema = z.preprocess(
    trimToUndefined,
    z.enum(PRINT_SIZES, { error: "حجم الطباعة غير صالح" })
);

const garmentAiReferenceModeSchema = z.preprocess(
    (value) => trimToUndefined(value) ?? "match_reference",
    z.enum(GARMENT_AI_REFERENCE_MODES, { error: "طريقة توجيه AI للقطعة غير صالحة" })
);

const customColorsSchema = z
    .array(
        z.preprocess(
            trimToUndefined,
            z
                .string()
                .min(1, "قيمة لون مخصص غير صالحة")
                .max(64, "قيمة لون مخصص طويلة جداً")
        )
    )
    .max(12, "الحد الأقصى للألوان المخصصة هو 12")
    .optional();

const booleanFromUnknown = (defaultValue = false) =>
    z.preprocess((value) => {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (normalized === "true") return true;
            if (normalized === "false") return false;
        }
        if (value === null || value === undefined || value === "") return defaultValue;
        return value;
    }, z.boolean());

const numberFromUnknown = (
    label: string,
    options?: { integer?: boolean; min?: number; max?: number; defaultValue?: number }
) =>
    z.preprocess((value) => {
        const fallback = options?.defaultValue ?? 0;
        if (typeof value === "number") return value;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return fallback;
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : value;
        }
        if (value === null || value === undefined) return fallback;
        return value;
    }, (() => {
        let schema = z.number();
        if (options?.integer) schema = schema.int(`${label} يجب أن يكون رقماً صحيحاً`);
        if (typeof options?.min === "number") schema = schema.min(options.min, `${label} يجب ألا يقل عن ${options.min}`);
        if (typeof options?.max === "number") schema = schema.max(options.max, `${label} يجب ألا يزيد عن ${options.max}`);
        return schema;
    })());

const slugText = (label: string, maxLength: number) =>
    z.preprocess(
        (value) => {
            if (typeof value !== "string") return "";
            return value.trim().toLowerCase();
        },
        z
            .string()
            .min(1, `${label} مطلوب`)
            .max(maxLength, `${label} طويل جداً`)
            .regex(/^[a-z0-9_-]+$/, `${label} غير صالح`)
    );

const csvListSchema = (label: string, maxItems = 20, maxLength = 60) =>
    z.preprocess((value) => {
        if (Array.isArray(value)) {
            return value.map((item) => String(item).trim()).filter(Boolean);
        }
        if (typeof value === "string") {
            return value
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
        }
        return [];
    }, z.array(z.string().max(maxLength, `${label} طويل جداً`)).max(maxItems, `الحد الأقصى في ${label} هو ${maxItems}`));

const optionalEnum = <TValues extends readonly [string, ...string[]]>(values: TValues, message: string) =>
    z.preprocess(
        trimToUndefined,
        z.enum(values, { error: message }).optional()
    );

const metadataFieldsSchema = z.object({
    creative_direction: optionalText("التوجه الإبداعي", 200),
    energy: optionalEnum(ENERGY_LEVELS, "مستوى الطاقة غير صالح"),
    complexity: optionalEnum(COMPLEXITY_LEVELS, "مستوى التعقيد غير صالح"),
    luxury_tier: optionalEnum(LUXURY_TIERS, "فئة الفخامة غير صالحة"),
    story_hook: optionalText("الخط السردي", 240),
    palette_family: optionalText("عائلة الألوان", 120),
    keywords: csvListSchema("الكلمات المفتاحية"),
    moods: csvListSchema("الأجواء"),
    audiences: csvListSchema("الجمهور"),
    placements: csvListSchema("أماكن الطباعة"),
    recommended_methods: csvListSchema("طرق التصميم الموصى بها"),
    notes: optionalText("الملاحظات", 2000),
});

const colorPackageTokensSchema = z.preprocess((value) => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return [];
        try {
            return normalizeColorTokens(JSON.parse(trimmed));
        } catch {
            return value;
        }
    }
    return normalizeColorTokens(value);
}, z.array(z.object({
    hex: z.string().regex(HEX_COLOR_REGEX, "لون الباقة غير صالح"),
    name: z.string().min(1, "اسم اللون مطلوب").max(60, "اسم اللون طويل جداً"),
})).min(1, "أضف لوناً واحداً على الأقل").max(20, "الحد الأقصى لألوان الباقة هو 20"));

export const smartStoreSubmitDesignOrderSchema = z
    .object({
        garment_id: optionalUuid("معرّف القطعة"),
        garment_name: optionalText("اسم القطعة", 120),
        garment_image_url: optionalSafeUrl("صورة القطعة"),
        color_id: optionalUuid("معرّف اللون"),
        color_name: optionalText("اسم اللون", 120),
        color_hex: optionalColorHex,
        color_image_url: optionalSafeUrl("صورة اللون"),
        size_id: optionalUuid("معرّف المقاس"),
        size_name: optionalText("اسم المقاس", 80),
        design_method: designMethodSchema,
        text_prompt: optionalText("وصف التصميم", 3000),
        reference_image_url: optionalSafeUrl("الصورة المرجعية"),
        preset_id: optionalUuid("معرّف الـ preset"),
        preset_name: optionalText("اسم الـ preset", 120),
        preset_fully_aligned: z.boolean().optional(),
        style_id: optionalUuid("معرّف النمط"),
        style_name: optionalText("اسم النمط", 120),
        style_image_url: optionalSafeUrl("صورة النمط"),
        art_style_id: optionalUuid("معرّف الأسلوب"),
        art_style_name: optionalText("اسم الأسلوب", 120),
        art_style_image_url: optionalSafeUrl("صورة الأسلوب"),
        color_package_id: optionalUuid("معرّف باقة الألوان"),
        color_package_name: optionalText("اسم باقة الألوان", 120),
        studio_item_id: optionalUuid("معرّف عنصر الستيديو"),
        custom_colors: customColorsSchema,
        artwork_colors: z.array(z.object({
            name: optionalText("اسم لون العمل", 60),
            hex: z.string().regex(HEX_COLOR_REGEX, "لون العمل غير صالح"),
        })).max(5, "الحد الأقصى لألوان العمل هو 5").optional(),
        premium_brief: premiumDesignBriefSchema.optional(),
        customer_name: optionalText("اسم العميل", 120),
        customer_email: optionalEmail,
        customer_phone: optionalPhone,
        print_position: printPositionSchema,
        print_size: printSizeSchema,
        dtf_mockup_url: optionalSafeUrl("رابط الموكاب"),
        dtf_extracted_url: optionalSafeUrl("رابط التصميم المفرغ"),
    })
    .superRefine((data, ctx) => {
        if (data.premium_brief && data.design_method !== "studio") {
            const placementError = getPremiumDesignBriefPlacementError(
                data.premium_brief,
                data.print_position
            );
            if (placementError) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["premium_brief", "designWidth"],
                    message: placementError,
                });
            }
        }

        if (!data.garment_id && !data.garment_name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["garment_name"],
                message: "يجب تحديد القطعة المطلوبة",
            });
        }

        if (!data.color_id && (!data.color_name || !data.color_hex)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["color_name"],
                message: "يجب تحديد اللون المطلوب",
            });
        }

        if (!data.size_id && !data.size_name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["size_name"],
                message: "يجب تحديد المقاس المطلوب",
            });
        }
    });

export const smartStoreAdditionalDesignOrderSchema = z
    .object({
        print_position: printPositionSchema,
        print_size: printSizeSchema,
        style_id: optionalUuid("معرّف النمط"),
        style_name: optionalText("اسم النمط", 120),
        style_image_url: optionalSafeUrl("صورة النمط"),
        art_style_id: optionalUuid("معرّف الأسلوب"),
        art_style_name: optionalText("اسم الأسلوب", 120),
        art_style_image_url: optionalSafeUrl("صورة الأسلوب"),
        color_package_id: optionalUuid("معرّف باقة الألوان"),
        color_package_name: optionalText("اسم باقة الألوان", 120),
        custom_colors: customColorsSchema,
    })
    .superRefine((data, ctx) => {
        if (!data.style_id && !data.style_name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["style_name"],
                message: "يجب اختيار النمط",
            });
        }

        if (!data.art_style_id && !data.art_style_name) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["art_style_name"],
                message: "يجب اختيار الأسلوب",
            });
        }

        const hasColorPackage = Boolean(data.color_package_id || data.color_package_name);
        const hasCustomColors = Array.isArray(data.custom_colors) && data.custom_colors.length > 0;

        if (!hasColorPackage && !hasCustomColors) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["color_package_name"],
                message: "اختر باقة ألوان أو خصص ألوانك",
            });
        }
    });

export const smartStoreUpsertGarmentSchema = z.object({
    id: optionalUuid("معرّف القطعة"),
    name: requiredText("اسم القطعة", 120),
    slug: slugText("الرابط المختصر", 120),
    image_url: optionalSafeUrl("صورة القطعة"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة للقطعة"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة للقطعة"),
    ai_reference_front_url: optionalSafeUrl("مرجع AI الواقعي الأمامي"),
    ai_reference_back_url: optionalSafeUrl("مرجع AI الواقعي الخلفي"),
    ai_reference_mode: garmentAiReferenceModeSchema,
    sort_order: numberFromUnknown("ترتيب القطعة", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
    base_price: numberFromUnknown("السعر الأساسي", { min: 0, defaultValue: 0 }),
    price_chest_large: numberFromUnknown("سعر الصدر الكبير", { min: 0, defaultValue: 0 }),
    price_chest_small: numberFromUnknown("سعر الصدر الصغير", { min: 0, defaultValue: 0 }),
    price_back_large: numberFromUnknown("سعر الظهر الكبير", { min: 0, defaultValue: 0 }),
    price_back_small: numberFromUnknown("سعر الظهر الصغير", { min: 0, defaultValue: 0 }),
    price_shoulder_large: numberFromUnknown("سعر الكتف الكبير", { min: 0, defaultValue: 0 }),
    price_shoulder_small: numberFromUnknown("سعر الكتف الصغير", { min: 0, defaultValue: 0 }),
});

const dtfMockupPrintAreaSchema = z.object({
    print_position: z.enum(PRINT_POSITIONS, { error: "موضع الطباعة غير صالح" }),
    print_size: z.enum(PRINT_SIZES, { error: "حجم الطباعة غير صالح" }),
    x: z.number().min(0).max(0.99),
    y: z.number().min(0).max(0.99),
    width: z.number().min(0.01).max(1),
    height: z.number().min(0.01).max(1),
    rotation: z.number().min(-180).max(180).default(0),
    physical_width_cm: z.number().min(1).max(200).nullable().default(null),
    physical_height_cm: z.number().min(1).max(200).nullable().default(null),
}).superRefine((area, ctx) => {
    if (area.x + area.width > 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["width"],
            message: "منطقة الطباعة تتجاوز عرض الموكاب",
        });
    }
    if (area.y + area.height > 1) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["height"],
            message: "منطقة الطباعة تتجاوز ارتفاع الموكاب",
        });
    }
});

const dtfMockupPrintAreasSchema = z.preprocess((value) => {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}, z.array(dtfMockupPrintAreaSchema).min(1, "أضف منطقة طباعة واحدة على الأقل").max(8))
    .superRefine((areas, ctx) => {
        const seen = new Set<string>();
        areas.forEach((area, index) => {
            const key = `${area.print_position}:${area.print_size}`;
            if (seen.has(key)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [index, "print_position"],
                    message: "لا يمكن تكرار موضع وحجم الطباعة داخل القالب",
                });
            }
            seen.add(key);
        });
    });

export const smartStoreUpsertDtfMockupTemplateSchema = z.object({
    id: optionalUuid("معرّف قالب الموكاب"),
    garment_id: requiredUuid("معرّف القطعة"),
    color_id: optionalUuid("معرّف اللون"),
    side: z.preprocess(trimToUndefined, z.enum(DTF_MOCKUP_SIDES, { error: "جهة الموكاب غير صالحة" })),
    base_image_url: requiredSafeUrl("صورة الموكاب الأساسية"),
    base_image_path: optionalStoragePath("مسار صورة الموكاب"),
    mask_image_url: optionalSafeUrl("قناع الموكاب"),
    mask_image_path: optionalStoragePath("مسار قناع الموكاب"),
    overlay_image_url: optionalSafeUrl("طبقة ظلال الموكاب"),
    overlay_image_path: optionalStoragePath("مسار طبقة ظلال الموكاب"),
    print_areas: dtfMockupPrintAreasSchema,
    version: numberFromUnknown("نسخة القالب", { integer: true, min: 1, max: 10000, defaultValue: 1 }),
    sort_order: numberFromUnknown("ترتيب القالب", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(true),
}).superRefine((data, ctx) => {
    const incompatibleIndex = data.print_areas.findIndex((area) => (
        (data.side === "back" && area.print_position !== "back")
        || (data.side === "front" && area.print_position === "back")
    ));
    if (incompatibleIndex >= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["print_areas", incompatibleIndex, "print_position"],
            message: data.side === "back"
                ? "قالب الخلف يدعم موضع الظهر فقط"
                : "موضع الظهر يحتاج قالب جهة خلفية",
        });
    }
});

export const smartStoreUpsertColorSchema = z.object({
    id: optionalUuid("معرّف اللون"),
    garment_id: requiredUuid("معرّف القطعة"),
    name: requiredText("اسم اللون", 120),
    hex_code: z.preprocess(
        (value) => (typeof value === "string" ? value.trim() : value),
        z.string().regex(HEX_COLOR_REGEX, "لون القطعة غير صالح")
    ),
    image_url: optionalSafeUrl("صورة اللون"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة للون"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة للون"),
    sort_order: numberFromUnknown("ترتيب اللون", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
});

export const smartStoreUpsertSizeSchema = z.object({
    id: optionalUuid("معرّف المقاس"),
    garment_id: requiredUuid("معرّف القطعة"),
    color_id: optionalUuid("معرّف اللون"),
    name: requiredText("اسم المقاس", 80),
    image_front_url: optionalSafeUrl("صورة المقاس الأمامية"),
    image_back_url: optionalSafeUrl("صورة المقاس الخلفية"),
    track_inventory: booleanFromUnknown(false),
    stock_quantity: numberFromUnknown("كمية المخزون", { integer: true, min: 0, defaultValue: 0 }),
    low_stock_threshold: numberFromUnknown("حد المخزون المنخفض", { integer: true, min: 0, defaultValue: 3 }),
    is_active: booleanFromUnknown(false),
});

export const smartStoreUpsertStyleSchema = z.object({
    id: optionalUuid("معرّف النمط"),
    name: requiredText("اسم النمط", 120),
    description: optionalText("وصف النمط", 2000),
    image_url: optionalSafeUrl("صورة النمط"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة للنمط"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة للنمط"),
    catalog_scope: z.preprocess(trimToUndefined, z.enum(CATALOG_SCOPES, { error: "نطاق النمط غير صالح" }).default("design_piece")),
    sort_order: numberFromUnknown("ترتيب النمط", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
}).extend(metadataFieldsSchema.shape);

export const smartStoreUpsertArtStyleSchema = z.object({
    id: optionalUuid("معرّف الأسلوب"),
    name: requiredText("اسم الأسلوب", 120),
    description: optionalText("وصف الأسلوب", 2000),
    image_url: optionalSafeUrl("صورة الأسلوب"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة للأسلوب"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة للأسلوب"),
    catalog_scope: z.preprocess(trimToUndefined, z.enum(CATALOG_SCOPES, { error: "نطاق الأسلوب غير صالح" }).default("design_piece")),
    sort_order: numberFromUnknown("ترتيب الأسلوب", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
}).extend(metadataFieldsSchema.shape);

export const smartStoreUpsertPositionSchema = z.object({
    id: optionalSafeRecordId("معرّف المكان"),
    name: requiredText("اسم المكان", 120),
    description: optionalText("وصف المكان", 2000),
    image_url: optionalSafeUrl("صورة المكان"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة للمكان"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة للمكان"),
    print_position: z.preprocess(trimToUndefined, z.enum(PRINT_POSITIONS, { error: "موضع الطباعة غير صالح" }).nullable().optional()),
    print_size: z.preprocess(trimToUndefined, z.enum(PRINT_SIZES, { error: "حجم الطباعة غير صالح" }).nullable().optional()),
    price: numberFromUnknown("سعر خيار الطباعة", { min: 0, defaultValue: 0 }),
    price_large: numberFromUnknown("سعر الطباعة الكبير", { min: 0, defaultValue: 0 }),
    price_small: numberFromUnknown("سعر الطباعة الصغير", { min: 0, defaultValue: 0 }),
    sort_order: numberFromUnknown("ترتيب المكان", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
});

export const smartStoreUpsertColorPackageSchema = z.object({
    id: optionalUuid("معرّف باقة الألوان"),
    name: requiredText("اسم باقة الألوان", 120),
    colors: colorPackageTokensSchema,
    image_url: optionalSafeUrl("صورة باقة الألوان"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة لباقة الألوان"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة لباقة الألوان"),
    catalog_scope: z.preprocess(trimToUndefined, z.enum(CATALOG_SCOPES, { error: "نطاق الباقة غير صالح" }).default("design_piece")),
    sort_order: numberFromUnknown("ترتيب الباقة", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
}).extend(metadataFieldsSchema.shape);

export const smartStoreUpsertStudioItemSchema = z.object({
    id: optionalUuid("معرّف عنصر الستيديو"),
    name: requiredText("اسم عنصر الاستوديو", 120),
    description: optionalText("وصف عنصر الاستوديو", 2000),
    price: numberFromUnknown("سعر عنصر الستيديو", { min: 0, defaultValue: 0 }),
    main_image_url: optionalSafeUrl("الصورة الرئيسية"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة لعنصر الستيديو"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة لعنصر الستيديو"),
    mockup_image_url: optionalSafeUrl("صورة الموكب"),
    model_image_url: optionalSafeUrl("صورة المودل"),
    sort_order: numberFromUnknown("ترتيب عنصر الستيديو", { integer: true, min: 0, defaultValue: 0 }),
    is_active: booleanFromUnknown(false),
}).extend(metadataFieldsSchema.shape);

export const smartStoreUpsertDesignPresetSchema = z.object({
    id: optionalUuid("معرّف الـ preset"),
    name: requiredText("اسم الـ preset", 120),
    slug: slugText("الرابط المختصر", 120),
    description: optionalText("وصف الـ preset", 2000),
    story: optionalText("قصة الـ preset", 4000),
    badge: optionalText("شارة الـ preset", 120),
    image_url: optionalSafeUrl("صورة الـ preset"),
    thumbnail_url: optionalSafeUrl("الصورة المصغرة للـ preset"),
    thumbnail_path: optionalStoragePath("مسار الصورة المصغرة للـ preset"),
    garment_id: optionalUuid("معرّف القطعة"),
    design_method: z.preprocess(trimToUndefined, z.enum(DESIGN_METHODS).optional()),
    style_id: optionalUuid("معرّف النمط"),
    art_style_id: optionalUuid("معرّف الأسلوب"),
    color_package_id: optionalUuid("معرّف باقة الألوان"),
    studio_item_id: optionalUuid("معرّف عنصر الستيديو"),
    print_position: z.preprocess(trimToUndefined, z.enum(PRINT_POSITIONS).optional()),
    print_size: z.preprocess(trimToUndefined, z.enum(PRINT_SIZES).optional()),
    sort_order: numberFromUnknown("ترتيب الـ preset", { integer: true, min: 0, defaultValue: 0 }),
    is_featured: booleanFromUnknown(false),
    is_active: booleanFromUnknown(false),
}).extend(metadataFieldsSchema.shape).superRefine((data, ctx) => {
    if ((data.print_position && !data.print_size) || (!data.print_position && data.print_size)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["print_position"],
            message: "يجب تحديد موقع وحجم الطباعة معاً",
        });
    }

    if (data.design_method === "studio" && !data.studio_item_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["studio_item_id"],
            message: "عنصر الستيديو مطلوب عندما تكون الطريقة ستيديو",
        });
    }
});

export type SmartStoreSubmitDesignOrderInput = z.infer<typeof smartStoreSubmitDesignOrderSchema>;
export type SmartStoreAdditionalDesignOrderInput = z.infer<typeof smartStoreAdditionalDesignOrderSchema>;
