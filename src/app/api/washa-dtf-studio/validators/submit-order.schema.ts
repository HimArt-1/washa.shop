import { z } from "zod";

export const CUSTOM_PALETTE_ID = "__custom_palette__";

export const submitOrderSchema = z.object({
  garmentId: z.string().trim().nullable().optional(),
  garmentType: z.string().trim().min(1, "نوع القطعة مطلوب"),
  colorId: z.string().trim().nullable().optional(),
  garmentColor: z.string().trim().min(1, "لون القطعة مطلوب"),
  colorHex: z.string().trim().optional(),
  sizeId: z.string().trim().nullable().optional(),
  garmentSize: z.string().trim().optional(),
  designMethod: z.string().trim().optional(),
  prompt: z.string().trim().optional(),
  calligraphyText: z.string().trim().optional(),
  styleId: z.string().trim().nullable().optional(),
  style: z.string().trim().min(1, "أسلوب التصميم مطلوب"),
  techniqueId: z.string().trim().nullable().optional(),
  technique: z.string().trim().min(1, "التقنية مطلوبة"),
  paletteId: z.string().trim().nullable().optional(),
  palette: z.string().trim().optional(),
  customPalette: z.string().trim().nullable().optional(),
  // For Base64 images, a string pattern check can ensure it's minimally formatted as data URIs
  mockupDataUrl: z.string().trim().min(1, "رابط التصميم (الموكب) مطلوب").refine(
      (val) => val.startsWith("data:image/"), 
      { message: "صيغة الموكب غير صالحة" }
  ),
  extractedDataUrl: z.string().trim().nullable().optional().refine(
      (val) => !val || val.startsWith("data:image/"), 
      { message: "صيغة التصميم المستخرج غير صالحة" }
  ),
}).superRefine((data, ctx) => {
    const paletteId = data.paletteId?.trim() ?? "";
    const customPalette = data.customPalette?.trim() ?? "";

    if (!paletteId && !customPalette) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "الرجاء اختيار لوحة الألوان أو تحديد لوحة مخصصة",
            path: ["paletteId"],
        });
    }

    if (paletteId === CUSTOM_PALETTE_ID && !customPalette) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "الرجاء كتابة وصف لوحة الألوان المخصصة",
            path: ["customPalette"],
        });
    }
});

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;
