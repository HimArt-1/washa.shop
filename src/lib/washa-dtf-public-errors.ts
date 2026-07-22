export type UserAction =
    | "edit_prompt"
    | "auto_retry"
    | "wait_and_retry"
    | "contact_support"
    | "upgrade_plan"
    | "none";

export interface PublicErrorMapping {
    userMessage: string;
    userAction: UserAction;
    retryAfterMs: number | null;
}

interface PublicErrorPolicy extends PublicErrorMapping {
    nonRetryableMessage?: string;
}

export interface StructuredPublicErrorPayload {
    ok: false;
    code: string;
    message: string;
    userAction: UserAction;
    retryAfterMs: number | null;
    retryable: boolean;
    requestId: string;
}

export type PublicStudioErrorScope =
    | "generation"
    | "extraction"
    | "submit"
    | "general";

export const PUBLIC_GENERATION_ERROR =
    "تعذر إنشاء التصميم الآن. عدّل الوصف قليلًا أو جرّب مرة أخرى بعد لحظات.";

export const PUBLIC_EXTRACTION_ERROR =
    "تعذر تجهيز التصميم للطباعة الآن. جرّب مرة أخرى بعد لحظات.";

export const PUBLIC_SUBMIT_ERROR =
    "تعذر إضافة التصميم للسلة الآن. جرّب مرة أخرى بعد لحظات.";

export const PUBLIC_GENERAL_ERROR =
    "تعذر إكمال الطلب الآن. حاول مرة أخرى بعد لحظات.";

export const INTERNAL_ERROR_PATTERNS = [
    /\bapi\b/i,
    /\bhttp\b/i,
    /\bstatus\b/i,
    /\btrace\b/i,
    /\bserver\b/i,
    /\bfetch\b/i,
    /\bnetwork\b/i,
    /\bjson\b/i,
    /\bunexpected\b/i,
    /\bproxy\b/i,
    /\bprovider\b/i,
    /\bmerchant\b/i,
    /\bdeadline\b/i,
    /\btimeout\b/i,
    /\btimed out\b/i,
    /\bquota\b/i,
    /\bbilling\b/i,
    /\bpermission[_ -]?denied\b/i,
    /\bgemini\b/i,
    /\bopenai\b/i,
    /\breplicate\b/i,
    /\bgoogle\b/i,
    /\bgoogle ai\b/i,
    /\bsupabase\b/i,
    /\bpostgres(?:ql)?\b/i,
    /\bsql\b/i,
    /\bsdk\b/i,
    /\bstack(?:\s+trace)?\b/i,
    /\bat\s+\S+\s+\([^)]+:\d+:\d+\)/i,
    /\bmigration/i,
    /\bschema\b/i,
    /\bendpoint\b/i,
    /\bwebhook\b/i,
    /\bcredentials?\b/i,
    /\bkey\b/i,
    /\btoken\b/i,
    /\bquota_unavailable\b/i,
    /\b[A-Z][A-Z0-9_]+_(?:KEY|SECRET|TOKEN|URL)\b/,
    /\bOPENAI_API_KEY\b/,
    /\bGEMINI_API_KEY\b/,
    /https?:\/\/\S+/i,
    /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i,
    /الخادم/,
    /مزود/,
    /المزوّد/,
    /المزود/,
    /تاجر/,
    /التاجر/,
    /مراجعة/,
    /راجع/,
    /مفتاح/,
    /الفوترة/,
    /نموذج/,
    /قاعدة البيانات/,
    /migrations?/i,
    /[45]\d{2}/,
];

export const PUBLIC_ERROR_CODES = [
    "ARTWORK_PLACEMENT_INVALID",
    "ARTWORK_PRINT_VALIDATION_FAILED",
    "ARTWORK_TEXT_POLICY_FAILED",
    "ARTWORK_VERIFICATION_UNAVAILABLE",
    "AUTH_FORBIDDEN",
    "AUTH_REQUIRED",
    "AUTH_TEMPORARILY_UNAVAILABLE",
    "DUPLICATE_REQUEST",
    "IDEMPOTENCY_COMPLETION_FAILED",
    "IDEMPOTENCY_UNAVAILABLE",
    "IDENTITY_CONFLICT",
    "IMAGE_PROVIDER_UNAVAILABLE",
    "INTERNAL_ERROR",
    "INVALID_REQUEST",
    "LEGACY_EXTRACTION_DISABLED",
    "PROMPT_NON_MEANINGFUL",
    "PROMPT_TOO_SHORT",
    "QUOTA_STATE_UNCERTAIN",
    "RATE_LIMITED",
    "TRANSPARENT_ARTWORK_PROVIDER_UNAVAILABLE",
    "USER_SERVICE_UNAVAILABLE",
    "audience_disabled",
    "disabled",
    "provider_not_configured",
    "quota_exceeded",
    "quota_unavailable",
    "temporarily_unavailable",
] as const;

export type PublicErrorCode = typeof PUBLIC_ERROR_CODES[number];

export const ERROR_MAP = {
    ARTWORK_PLACEMENT_INVALID: {
        userMessage:
            "تعذر وضع التصميم داخل مساحة الطباعة الآمنة. استخدم «تعديل الخيارات» لضبط الحجم والموضع.",
        userAction: "none",
        retryAfterMs: null,
    },
    ARTWORK_PRINT_VALIDATION_FAILED: {
        userMessage:
            "تعذر اعتماد ملف الطباعة بالدقة والمساحة الآمنة المطلوبة. صغّر مقاس الطباعة أو عدّل الوصف ثم جرّب مرة أخرى.",
        userAction: "edit_prompt",
        retryAfterMs: null,
    },
    ARTWORK_TEXT_POLICY_FAILED: {
        userMessage: "التصميم يحتوي نصًا غير مطابق. سنعيد التوليد تلقائيًا.",
        userAction: "auto_retry",
        retryAfterMs: 1_000,
        nonRetryableMessage:
            "تعذّر اعتماد التصميم بسبب النص. عدّل الوصف أو تواصل مع الدعم.",
    },
    ARTWORK_VERIFICATION_UNAVAILABLE: {
        userMessage:
            "اكتمل التصميم لكن تعذّر التحقق من النص. سنعيد المحاولة تلقائيًا.",
        userAction: "auto_retry",
        retryAfterMs: 2_000,
        nonRetryableMessage:
            "تعذّر التحقق من النص في التصميم. تواصل مع الدعم.",
    },
    AUTH_FORBIDDEN: {
        userMessage: "لا يملك المستخدم صلاحية إكمال العملية.",
        userAction: "none",
        retryAfterMs: null,
    },
    AUTH_REQUIRED: {
        userMessage: "يلزم تسجيل الدخول لإكمال العملية.",
        userAction: "none",
        retryAfterMs: null,
    },
    AUTH_TEMPORARILY_UNAVAILABLE: {
        userMessage: "تعذّر التحقق من جلسة الدخول مؤقتاً.",
        userAction: "wait_and_retry",
        retryAfterMs: 2_000,
    },
    DUPLICATE_REQUEST: {
        userMessage: "طلبك قيد التنفيذ حاليًا. انتظر ظهور النتيجة.",
        userAction: "none",
        retryAfterMs: null,
    },
    IDEMPOTENCY_COMPLETION_FAILED: {
        userMessage:
            "اكتمل التصميم لكن تعذر تثبيت حالة الطلب. احتفظ بمعرّف الطلب وتواصل مع الدعم.",
        userAction: "contact_support",
        retryAfterMs: null,
    },
    IDEMPOTENCY_UNAVAILABLE: {
        userMessage: "تعذّر تثبيت طلب التوليد مؤقتاً.",
        userAction: "wait_and_retry",
        retryAfterMs: 5_000,
    },
    IDENTITY_CONFLICT: {
        userMessage: "تعذّر ربط حساب المستخدم تلقائياً. تواصل مع الدعم.",
        userAction: "contact_support",
        retryAfterMs: null,
    },
    IMAGE_PROVIDER_UNAVAILABLE: {
        userMessage:
            "خدمة التوليد غير متوفرة مؤقتًا. سنعيد المحاولة تلقائيًا.",
        userAction: "auto_retry",
        retryAfterMs: 3_000,
        nonRetryableMessage:
            "خدمة التوليد غير متوفرة مؤقتًا. تواصل مع الدعم.",
    },
    INTERNAL_ERROR: {
        userMessage: "حدث خطأ داخلي غير متوقع.",
        userAction: "contact_support",
        retryAfterMs: null,
    },
    INVALID_REQUEST: {
        userMessage: "بيانات الطلب غير صالحة. صحّح المدخلات وحاول مرة أخرى.",
        userAction: "none",
        retryAfterMs: null,
    },
    LEGACY_EXTRACTION_DISABLED: {
        userMessage:
            "تعذّر تجهيز هذا التصميم للطباعة من النسخة الحالية. استخدم التصميم الأصلي المحفوظ أو حاول مرة أخرى.",
        userAction: "none",
        retryAfterMs: null,
    },
    PROMPT_NON_MEANINGFUL: {
        userMessage: "الوصف غير واضح. اكتب جملة تصف التصميم.",
        userAction: "edit_prompt",
        retryAfterMs: null,
    },
    PROMPT_TOO_SHORT: {
        userMessage: "الوصف قصير جداً. أضف تفاصيل عن التصميم.",
        userAction: "edit_prompt",
        retryAfterMs: null,
    },
    QUOTA_STATE_UNCERTAIN: {
        userMessage: "تعذّر تأكيد حالة رصيدك. تحقق قبل إعادة المحاولة.",
        userAction: "contact_support",
        retryAfterMs: null,
    },
    RATE_LIMITED: {
        userMessage: "تم تجاوز الحد المسموح. انتظر دقيقة قبل المحاولة.",
        userAction: "wait_and_retry",
        retryAfterMs: 60_000,
    },
    TRANSPARENT_ARTWORK_PROVIDER_UNAVAILABLE: {
        userMessage: "خدمة إعداد التصميم غير متاحة حالياً. تواصل مع الدعم.",
        userAction: "contact_support",
        retryAfterMs: null,
    },
    USER_SERVICE_UNAVAILABLE: {
        userMessage: "تعذّر التحقق من بيانات المستخدم مؤقتاً.",
        userAction: "wait_and_retry",
        retryAfterMs: 5_000,
    },
    audience_disabled: {
        userMessage: "توليد وشّى AI غير متاح لحسابك حالياً.",
        userAction: "none",
        retryAfterMs: null,
    },
    disabled: {
        userMessage: "خدمة التوليد متوقفة حالياً.",
        userAction: "none",
        retryAfterMs: null,
    },
    provider_not_configured: {
        userMessage: "خدمة التوليد غير جاهزة حالياً.",
        userAction: "contact_support",
        retryAfterMs: null,
    },
    quota_exceeded: {
        userMessage: "نفدت حصتك من التوليد. يمكنك إضافة رصيد للمتابعة.",
        userAction: "upgrade_plan",
        retryAfterMs: null,
    },
    quota_unavailable: {
        userMessage: "تعذّر التحقق من رصيد WASHA AI حالياً. حاول بعد قليل.",
        userAction: "wait_and_retry",
        retryAfterMs: 5_000,
    },
    temporarily_unavailable: {
        userMessage: "خدمة التوليد غير متاحة مؤقتاً. حاول بعد قليل.",
        userAction: "wait_and_retry",
        retryAfterMs: 5_000,
    },
} as const satisfies Record<PublicErrorCode, PublicErrorPolicy>;

function getDefaultPublicError(scope: PublicStudioErrorScope) {
    if (scope === "generation") return PUBLIC_GENERATION_ERROR;
    if (scope === "extraction") return PUBLIC_EXTRACTION_ERROR;
    if (scope === "submit") return PUBLIC_SUBMIT_ERROR;
    return PUBLIC_GENERAL_ERROR;
}

function normalizeRetryAfterMs(value: number | null | undefined) {
    if (value === null) return null;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return undefined;
    }
    return Math.ceil(value);
}

export function isInternalStudioErrorMessage(message: string) {
    const trimmed = message.trim();
    return INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function getPublicStudioErrorMessage(
    message: string | null | undefined,
    scope: PublicStudioErrorScope = "general",
    fallback = getDefaultPublicError(scope)
) {
    const trimmed = typeof message === "string" ? message.trim() : "";
    if (!trimmed) return fallback;
    if (isInternalStudioErrorMessage(trimmed)) return fallback;
    return trimmed;
}

export function isPublicErrorCode(value: string): value is PublicErrorCode {
    return Object.prototype.hasOwnProperty.call(ERROR_MAP, value);
}

export function parseRetryAfterValueMs(
    value: string | null | undefined,
    nowMs = Date.now()
) {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const seconds = Number(trimmed);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.ceil(seconds * 1_000);
    }

    const retryAt = Date.parse(trimmed);
    if (!Number.isFinite(retryAt)) return null;
    return Math.max(0, retryAt - nowMs);
}

function isUserAction(value: string): value is UserAction {
    return value === "edit_prompt"
        || value === "auto_retry"
        || value === "wait_and_retry"
        || value === "contact_support"
        || value === "upgrade_plan"
        || value === "none";
}

export function isStructuredPublicErrorPayload(
    value: unknown
): value is StructuredPublicErrorPayload {
    if (!value || typeof value !== "object") return false;
    if (!("ok" in value) || value.ok !== false) return false;
    if (!("code" in value) || typeof value.code !== "string") return false;
    if (!("message" in value) || typeof value.message !== "string") return false;
    if (
        !("userAction" in value)
        || typeof value.userAction !== "string"
        || !isUserAction(value.userAction)
    ) {
        return false;
    }
    if (
        !("retryAfterMs" in value)
        || (
            value.retryAfterMs !== null
            && (
                typeof value.retryAfterMs !== "number"
                || !Number.isFinite(value.retryAfterMs)
                || value.retryAfterMs < 0
            )
        )
    ) {
        return false;
    }
    return (
        "retryable" in value
        && typeof value.retryable === "boolean"
        && "requestId" in value
        && typeof value.requestId === "string"
        && value.requestId.trim().length > 0
    );
}

export function mapPublicError(
    code: string | null | undefined,
    options: {
        fallbackMessage?: string | null;
        scope?: PublicStudioErrorScope;
        retryable?: boolean;
        retryAfterMs?: number | null;
    } = {}
): PublicErrorMapping {
    if (!code || !isPublicErrorCode(code)) {
        return {
            userMessage: getPublicStudioErrorMessage(
                options.fallbackMessage,
                options.scope ?? "general"
            ),
            userAction: "contact_support",
            retryAfterMs: null,
        };
    }

    const mapped = ERROR_MAP[code];
    if (mapped.userAction === "auto_retry" && options.retryable !== true) {
        return {
            userMessage:
                mapped.nonRetryableMessage
                ?? getDefaultPublicError(options.scope ?? "general"),
            userAction: "contact_support",
            retryAfterMs: null,
        };
    }

    const retryAfterOverride = normalizeRetryAfterMs(options.retryAfterMs);
    return {
        userMessage: mapped.userMessage,
        userAction: mapped.userAction,
        retryAfterMs: retryAfterOverride === undefined
            ? mapped.retryAfterMs
            : retryAfterOverride,
    };
}
