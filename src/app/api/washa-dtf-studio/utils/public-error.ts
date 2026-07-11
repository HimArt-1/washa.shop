export const DTF_PUBLIC_GENERATION_ERROR =
    "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.";

export const DTF_PUBLIC_EXTRACTION_ERROR =
    "تعذر تجهيز التصميم للطباعة الآن. جرّب مرة أخرى بعد لحظات.";

export const DTF_PUBLIC_GENERAL_ERROR =
    "تعذر إكمال الطلب الآن. حاول مرة أخرى بعد لحظات.";

export type DtfPublicErrorScope = "generation" | "extraction" | "general";

export function getDtfPublicErrorMessage(scope: DtfPublicErrorScope) {
    if (scope === "generation") return DTF_PUBLIC_GENERATION_ERROR;
    if (scope === "extraction") return DTF_PUBLIC_EXTRACTION_ERROR;
    return DTF_PUBLIC_GENERAL_ERROR;
}
