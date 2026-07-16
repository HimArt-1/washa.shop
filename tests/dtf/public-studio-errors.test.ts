import { describe, expect, it } from "vitest";
import {
    getPublicStudioErrorMessage,
    PUBLIC_EXTRACTION_ERROR,
    PUBLIC_GENERATION_ERROR,
    PUBLIC_SUBMIT_ERROR,
} from "../../washa-dtf-studio/src/lib/publicErrors";

describe("public studio error messages", () => {
    it("hides generation messages that expose internal parties or APIs", () => {
        const messages = [
            "مراجعة التاجر مطلوبة قبل تنفيذ الطلب",
            "راجع API الخاص بالتوليد",
            "OpenAI API failed with status 500",
            "provider timeout trace: abc-123",
        ];

        for (const message of messages) {
            expect(getPublicStudioErrorMessage(message, "generation")).toBe(PUBLIC_GENERATION_ERROR);
        }
    });

    it("uses scope-specific fallbacks for internal errors", () => {
        expect(getPublicStudioErrorMessage("Gemini deadline exceeded", "extraction")).toBe(PUBLIC_EXTRACTION_ERROR);
        expect(getPublicStudioErrorMessage("Supabase schema cache is stale", "submit")).toBe(PUBLIC_SUBMIT_ERROR);
    });

    it("preserves intentional user messages", () => {
        const messages = [
            "الصورة المرجعية كبيرة جدًا. استخدم صورة أخف أو بدقة أقل.",
            "طلب التوليد نفسه ما زال قيد التنفيذ. انتظر اكتماله قبل المحاولة مجدداً.",
            "اكتمل طلب التوليد هذا مسبقاً، لكن نتيجته غير محفوظة في سجل الطلب. ابدأ محاولة جديدة فقط إذا لم تظهر النتيجة لديك.",
            "تعذّر إعادة محاولة هذا الطلب لأن حالة الحصة غير محسومة. تحقق من رصيدك قبل بدء محاولة جديدة.",
            "تعذّر تأكيد حالة حجز الحصة. تحقق من رصيدك قبل بدء محاولة جديدة.",
        ];

        for (const message of messages) {
            expect(getPublicStudioErrorMessage(message, "generation")).toBe(message);
        }
    });
});
