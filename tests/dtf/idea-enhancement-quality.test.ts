import { describe, expect, it } from "vitest";
import { sanitizeEnhancedIdea } from "@/app/api/washa-dtf-studio/services/ai-studio.service";

describe("WASHA AI idea enhancement quality", () => {
    it("rejects a truncated three-word response even when the original idea is long", () => {
        const originalIdea = "تصميم يركز على نخلة عربية بتكوين هندسي، بطابع هادئ وفاخر، ويعبّر عن الأصالة والنمو، مع تجنب التفاصيل الصغيرة جدًا، بتكوين متوازن وعنصر رئيسي واضح.";

        expect(() => sanitizeEnhancedIdea("نخلة عربية شاهقة، تتجلى", originalIdea)).toThrow();
    });

    it("rejects the short twelve-word Gemini response reproduced from the live enhancer", () => {
        const originalIdea = "نخلة عربية هندسية تميل مع النسيم وتعبر عن الأصالة والنمو بروح فنية معاصرة";
        const truncatedResponse = "نخلة عربية هندسية شامخة، تتمايل أغصانها الذهبية الرشيقة مع نسيم صحراوي عليل";

        expect(() => sanitizeEnhancedIdea(truncatedResponse, originalIdea)).toThrow();
    });

    it("keeps a complete, specific Arabic enhancement", () => {
        const enhanced = "نخلة عربية شاهقة بتكوين هندسي متوازن، تمتد سعفاتها بانسيابية تحت ضوء ذهبي هادئ، وتحيط بها زخارف نجدية رقيقة تعبّر عن الأصالة والنمو بروح فاخرة وواضحة.";

        expect(sanitizeEnhancedIdea(enhanced, "نخلة عربية هندسية")).toBe(enhanced);
    });
});
