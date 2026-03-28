import { z } from "zod";

export const generateMockupSchema = z.object({
    prompt: z.string().trim().min(1, "الوصف مطلوب"),
    referenceImage: z
        .object({
            base64: z.string().trim().min(1, "بيانات الصورة مطلوبة"),
            mimeType: z
                .string()
                .trim()
                .min(1, "نوع الملف مطلوب")
                .regex(/^image\/(png|jpeg|webp)$/, "نوع الصورة غير مدعوم"),
        })
        .optional()
        .nullable(),
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
