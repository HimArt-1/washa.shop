import { z } from "zod";

const MAX_IMAGE_BASE64_LENGTH = 12_000_000;
const imageBase64Schema = z
    .string()
    .trim()
    .min(1, "بيانات الصورة مطلوبة")
    .max(MAX_IMAGE_BASE64_LENGTH, "حجم الصورة يتجاوز الحد المسموح")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "ترميز الصورة غير صالح");

const aiImageReferenceSchema = z.object({
    base64: imageBase64Schema,
    mimeType: z
        .string()
        .trim()
        .min(1, "نوع الملف مطلوب")
        .regex(/^image\/(png|jpeg|webp)$/, "نوع الصورة غير مدعوم"),
});

export const generationContextSchema = z.object({
    garmentId: z.string().uuid().nullable().optional(),
    colorId: z.string().uuid().nullable().optional(),
    sizeId: z.string().uuid().nullable().optional(),
    garmentType: z.string().trim().min(1).max(120),
    garmentColor: z.string().trim().min(1).max(120),
    colorHex: z.string().trim().max(32).nullable().optional(),
    designMethod: z.enum(["text", "image", "calligraphy"]).optional(),
    style: z.string().trim().max(240).nullable().optional(),
    technique: z.string().trim().max(240).nullable().optional(),
    palette: z.string().trim().max(500).nullable().optional(),
    calligraphyText: z.string().trim().max(500).nullable().optional(),
    referenceImageMode: z.enum(["reinterpret", "preserve_subject", "style_inspiration"]).nullable().optional(),
    printPosition: z.enum(["chest", "back", "shoulder_right", "shoulder_left"]),
    printSize: z.enum(["large", "small"]),
    printScale: z.number().min(35).max(100).nullable().optional(),
    printOffsetX: z.number().min(-45).max(45).nullable().optional(),
    printOffsetY: z.number().min(-45).max(45).nullable().optional(),
});

export type GenerationContext = z.infer<typeof generationContextSchema>;

export const generateMockupSchema = z.object({
    prompt: z.string().trim().min(1, "الوصف مطلوب").max(12_000, "الوصف طويل جداً"),
    referenceImage: aiImageReferenceSchema.optional().nullable(),
    generationContext: generationContextSchema.optional().nullable(),
    // Legacy clients supplied a garment reference so the image model could draw
    // the complete mockup. It is accepted only as a compatibility base image;
    // the artwork is never sent with it to a generative model.
    garmentReferenceImage: aiImageReferenceSchema.optional().nullable(),
});

export const recomposePreviewSchema = z.object({
    designRequestId: z.string().uuid(),
    masterAssetId: z.string().uuid(),
    generationContext: generationContextSchema,
});

export const enhanceIdeaSchema = z.object({
    idea: z.string().trim().min(2, "اكتب فكرة قصيرة أولاً").max(620, "الفكرة طويلة جداً"),
    garmentType: z.string().trim().max(80).optional().nullable(),
    style: z.string().trim().max(120).optional().nullable(),
    technique: z.string().trim().max(120).optional().nullable(),
    palette: z.string().trim().max(120).optional().nullable(),
});

export const extractDesignSchema = z.object({
    masterAssetId: z.string().uuid().optional().nullable(),
    prompt: z.string().trim().optional().default(""),
    mockupImage: z.string().trim().optional().default(""),
    mimeType: z
        .string()
        .trim()
        .regex(/^image\/(png|jpeg|webp)$/, "نوع الصورة غير مدعوم")
        .optional()
        .default("image/png"),
}).superRefine((data, ctx) => {
    if (!data.masterAssetId && !data.mockupImage) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "معرّف أصل التصميم مطلوب",
            path: ["masterAssetId"],
        });
    }
});
