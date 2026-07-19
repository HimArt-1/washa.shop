import { describe, expect, it } from "vitest";

import { guardPrompt } from "@/lib/washa-artwork/prompt-guard";

describe("Washa artwork prompt guard", () => {
    it("accepts a meaningful Arabic design prompt", () => {
        expect(guardPrompt("تصميم عربي حديث")).toEqual({ ok: true });
    });

    it("accepts a meaningful six-character Arabic prompt", () => {
        expect(guardPrompt("خط ثلث")).toEqual({ ok: true });
    });

    it("rejects a meaningful five-character Arabic prompt", () => {
        expect(guardPrompt("  قمرية  ")).toEqual({
            ok: false,
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير جدًا. أضف تفاصيل أكثر عن التصميم الذي تريده.",
        });
    });

    it("rejects a symbols-only prompt", () => {
        expect(guardPrompt("!!!!!!!!")).toEqual({
            ok: false,
            code: "PROMPT_NON_MEANINGFUL",
            message: "الوصف يبدو غير واضح. اكتب جملة تصف التصميم.",
        });
    });

    it("rejects whitespace-only input after trimming", () => {
        expect(guardPrompt(" \n\t  ")).toMatchObject({
            ok: false,
            code: "PROMPT_TOO_SHORT",
        });
    });
});
