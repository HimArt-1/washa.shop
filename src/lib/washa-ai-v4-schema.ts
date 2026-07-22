import { z } from "zod";
import {
    getPremiumDesignBriefPlacementError,
    premiumDesignBriefSchema,
} from "@/lib/premium-design-request";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const washaAiV4GenerateSchema = z.object({
    requestId: z.string().trim().regex(/^[a-zA-Z0-9_-]{8,128}$/, "معرّف الطلب غير صالح"),
    brief: premiumDesignBriefSchema,
    garmentName: z.string().trim().min(2).max(160),
    garmentColorName: z.string().trim().min(2).max(100),
    garmentColorHex: z.string().trim().regex(HEX_COLOR, "لون القطعة غير صالح"),
    printPosition: z.enum(["front", "back", "left_chest", "right_chest", "full_back", "custom"]),
    customPrintPosition: z.string().trim().max(160).optional().default(""),
    styleName: z.string().trim().min(2).max(160),
    artStyleName: z.string().trim().min(2).max(240),
    artworkColors: z.array(z.object({
        name: z.string().trim().max(60).optional(),
        hex: z.string().trim().regex(HEX_COLOR, "لون التصميم غير صالح"),
    })).max(5),
}).superRefine((value, ctx) => {
    const placementError = getPremiumDesignBriefPlacementError(value.brief, value.printPosition);
    if (placementError) {
        ctx.addIssue({
            code: "custom",
            path: ["brief", placementError.includes("منظور") ? "garmentView" : "designWidth"],
            message: placementError,
        });
    }
    if (value.printPosition === "custom" && !value.customPrintPosition) {
        ctx.addIssue({
            code: "custom",
            path: ["customPrintPosition"],
            message: "اكتب موضع الطباعة المخصص",
        });
    }
});

export type WashaAiV4GenerateInput = z.infer<typeof washaAiV4GenerateSchema>;
