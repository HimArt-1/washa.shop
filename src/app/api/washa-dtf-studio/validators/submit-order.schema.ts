import { z } from "zod";

export const CUSTOM_PALETTE_ID = "__custom_palette__";

const placementDataSchema = z.object({
  side: z.enum(["front", "back"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(0.35).max(1),
  rotation: z.number().min(-180).max(180),
  printWidthCm: z.number().positive().max(100),
  printHeightCm: z.number().positive().max(100),
  anchorX: z.number().min(0).max(1),
  anchorY: z.number().min(0).max(1),
  referenceMockupId: z.string().uuid().nullable(),
  printAreaId: z.string().trim().min(1).max(120),
  transformVersion: z.number().int().positive(),
});

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
  printOptionId: z.string().trim().nullable().optional(),
  printPosition: z.enum(["chest", "back", "shoulder_right", "shoulder_left"]).nullable().optional(),
  printSize: z.enum(["large", "small"]).nullable().optional(),
  printPositionLabel: z.string().trim().nullable().optional(),
  designRequestId: z.string().uuid().nullable().optional(),
  masterAssetId: z.string().uuid().nullable().optional(),
  masterChecksum: z.string().trim().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  placementData: placementDataSchema.nullable().optional(),
  // Legacy compatibility only. The single-source path references stored assets
  // by immutable IDs and never re-uploads browser screenshots or previews.
  mockupDataUrl: z.string().trim().nullable().optional().refine(
      (val) => !val || val.startsWith("data:image/"),
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

    if (data.designRequestId) {
        if (!data.masterAssetId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "معرّف أصل التصميم مطلوب",
                path: ["masterAssetId"],
            });
        }
        if (!data.masterChecksum) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "بصمة أصل التصميم مطلوبة",
                path: ["masterChecksum"],
            });
        }
        if (!data.placementData) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "بيانات موضع التصميم مطلوبة",
                path: ["placementData"],
            });
        }
    } else if (!data.mockupDataUrl) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "رابط الموكب مطلوب للطلب القديم",
            path: ["mockupDataUrl"],
        });
    }
});

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;
