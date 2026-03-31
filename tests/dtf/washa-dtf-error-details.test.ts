import { describe, expect, it } from "vitest";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";

describe("getWashaDtfErrorDetails", () => {
    it("normalizes a missing Gemini key to 503", () => {
        const result = getWashaDtfErrorDetails(new Error("GEMINI_API_KEY is not configured"));

        expect(result).toEqual({
            message: "إعدادات Gemini غير مكتملة على الخادم. أضف مفتاح Gemini الصحيح ثم أعد المحاولة.",
            status: 503,
        });
    });

    it("normalizes an expired Gemini key to 503", () => {
        const error = new Error(JSON.stringify({
            error: {
                code: 400,
                status: "INVALID_ARGUMENT",
                message: "API key expired. Please renew the API key.",
            },
        }));

        const result = getWashaDtfErrorDetails(error);

        expect(result).toEqual({
            message: "مفتاح Gemini الحالي غير صالح أو منتهي. حدّثه في متغيرات البيئة على الخادم ثم أعد المحاولة.",
            status: 503,
        });
    });
});
