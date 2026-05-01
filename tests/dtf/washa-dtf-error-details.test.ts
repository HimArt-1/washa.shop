import { describe, expect, it } from "vitest";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";

describe("getWashaDtfErrorDetails", () => {
    it("normalizes a missing Washa AI key to 503", () => {
        const result = getWashaDtfErrorDetails(new Error("GEMINI_API_KEY is not configured"));

        expect(result).toEqual({
            message: "إعدادات Washa AI غير مكتملة على الخادم. أضف المفتاح الصحيح ثم أعد المحاولة.",
            status: 503,
        });
    });

    it("normalizes an expired Washa AI key to 503", () => {
        const error = new Error(JSON.stringify({
            error: {
                code: 400,
                status: "INVALID_ARGUMENT",
                message: "API key expired. Please renew the API key.",
            },
        }));

        const result = getWashaDtfErrorDetails(error);

        expect(result).toEqual({
            message: "مفتاح Washa AI الحالي غير صالح أو منتهي. حدّثه في متغيرات البيئة على الخادم ثم أعد المحاولة.",
            status: 503,
        });
    });

    it("normalizes denied Google image model access to an actionable 503", () => {
        const error = new Error(JSON.stringify({
            error: {
                code: 403,
                status: "PERMISSION_DENIED",
                message: "Your project has been denied access. Please contact support.",
            },
        }));

        const result = getWashaDtfErrorDetails(error);

        expect(result).toEqual({
            message: "مشروع Google المرتبط بـ Washa AI لا يملك صلاحية الوصول لنموذج الصور الحالي. فعّل صلاحية النموذج/الفوترة أو غيّر مزود WASHA AI.",
            status: 503,
        });
    });

    it("normalizes Google free-tier zero quota to a billing/quota message", () => {
        const error = new Error(JSON.stringify({
            error: {
                code: 429,
                status: "RESOURCE_EXHAUSTED",
                message: "You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3.1-flash-image",
            },
        }));

        const result = getWashaDtfErrorDetails(error);

        expect(result).toEqual({
            message: "حصة Google المرتبطة بـ Washa AI غير مفعّلة أو نفدت لهذا النموذج. راجع الفوترة والحدود في Google AI Studio أو استخدم مزودًا آخر.",
            status: 429,
        });
    });
});
