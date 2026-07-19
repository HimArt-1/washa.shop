export type PromptGuardResult =
    | { ok: true }
    | {
        ok: false;
        code: "PROMPT_TOO_SHORT" | "PROMPT_NON_MEANINGFUL";
        message: string;
    };

const MIN_PROMPT_LENGTH = 6;
const NON_MEANINGFUL_PATTERN = /^[\s\p{P}\p{S}\p{M}]*$/u;

export function guardPrompt(prompt: string): PromptGuardResult {
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_PROMPT_LENGTH) {
        return {
            ok: false,
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير جدًا. أضف تفاصيل أكثر عن التصميم الذي تريده.",
        };
    }
    if (NON_MEANINGFUL_PATTERN.test(trimmed)) {
        return {
            ok: false,
            code: "PROMPT_NON_MEANINGFUL",
            message: "الوصف يبدو غير واضح. اكتب جملة تصف التصميم.",
        };
    }

    return { ok: true };
}
