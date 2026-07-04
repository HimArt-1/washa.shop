import { z } from "zod";

const aiImageReferenceSchema = z.object({
    base64: z.string().trim().min(1, "بيانات الصورة مطلوبة"),
    mimeType: z
        .string()
        .trim()
        .min(1, "نوع الملف مطلوب")
        .regex(/^image\/(png|jpeg|webp)$/, "نوع الصورة غير مدعوم"),
});

export const generateMockupSchema = z.object({
    prompt: z.string().trim().min(1, "الوصف مطلوب"),
    referenceImage: aiImageReferenceSchema.optional().nullable(),
    garmentReferenceImage: aiImageReferenceSchema.optional().nullable(),
});

export const enhanceIdeaSchema = z.object({
    idea: z.string().trim().min(2, "اكتب فكرة قصيرة أولاً").max(620, "الفكرة طويلة جداً"),
    garmentType: z.string().trim().max(80).optional().nullable(),
    style: z.string().trim().max(120).optional().nullable(),
    technique: z.string().trim().max(120).optional().nullable(),
    palette: z.string().trim().max(120).optional().nullable(),
});

export const extractDesignSchema = z.object({
    prompt: z.string().trim().min(1, "وصف الاستخراج مطلوب"),
    mockupImage: z.string().trim().min(1, "الصورة مطلوبة"),
    mimeType: z
        .string()
        .trim()
        .min(1, "نوع الملف مطلوب")
        .regex(/^image\/(png|jpeg|webp)$/, "نوع الصورة غير مدعوم"),
});
