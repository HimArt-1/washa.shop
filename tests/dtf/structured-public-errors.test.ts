import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
    ERROR_MAP,
    PUBLIC_ERROR_CODES,
    PUBLIC_GENERATION_ERROR,
    mapPublicError,
    parseRetryAfterValueMs,
} from "@/lib/washa-dtf-public-errors";

describe("structured public error mapping", () => {
    it("keeps an exhaustive, reviewable mapping for every public DTF error code", () => {
        expect(Object.keys(ERROR_MAP)).toEqual([...PUBLIC_ERROR_CODES]);
        expect(ERROR_MAP).toMatchInlineSnapshot(`
          {
            "ARTWORK_PLACEMENT_INVALID": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "تعذر وضع التصميم داخل مساحة الطباعة الآمنة. استخدم «تعديل الخيارات» لضبط الحجم والموضع.",
            },
            "ARTWORK_PRINT_VALIDATION_FAILED": {
              "retryAfterMs": null,
              "userAction": "edit_prompt",
              "userMessage": "التصميم لا يستوفي متطلبات الطباعة. أعد المحاولة بوصف مختلف قليلاً.",
            },
            "ARTWORK_TEXT_POLICY_FAILED": {
              "nonRetryableMessage": "تعذّر اعتماد التصميم بسبب النص. عدّل الوصف أو تواصل مع الدعم.",
              "retryAfterMs": 1000,
              "userAction": "auto_retry",
              "userMessage": "التصميم يحتوي نصًا غير مطابق. سنعيد التوليد تلقائيًا.",
            },
            "ARTWORK_VERIFICATION_UNAVAILABLE": {
              "nonRetryableMessage": "تعذّر التحقق من النص في التصميم. تواصل مع الدعم.",
              "retryAfterMs": 2000,
              "userAction": "auto_retry",
              "userMessage": "اكتمل التصميم لكن تعذّر التحقق من النص. سنعيد المحاولة تلقائيًا.",
            },
            "AUTH_FORBIDDEN": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "لا يملك المستخدم صلاحية إكمال العملية.",
            },
            "AUTH_REQUIRED": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "يلزم تسجيل الدخول لإكمال العملية.",
            },
            "AUTH_TEMPORARILY_UNAVAILABLE": {
              "retryAfterMs": 2000,
              "userAction": "wait_and_retry",
              "userMessage": "تعذّر التحقق من جلسة الدخول مؤقتاً.",
            },
            "DUPLICATE_REQUEST": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "طلبك قيد التنفيذ حاليًا. انتظر ظهور النتيجة.",
            },
            "IDEMPOTENCY_COMPLETION_FAILED": {
              "retryAfterMs": null,
              "userAction": "contact_support",
              "userMessage": "اكتمل التصميم لكن تعذر تثبيت حالة الطلب. احتفظ بمعرّف الطلب وتواصل مع الدعم.",
            },
            "IDEMPOTENCY_UNAVAILABLE": {
              "retryAfterMs": 5000,
              "userAction": "wait_and_retry",
              "userMessage": "تعذّر تثبيت طلب التوليد مؤقتاً.",
            },
            "IDENTITY_CONFLICT": {
              "retryAfterMs": null,
              "userAction": "contact_support",
              "userMessage": "تعذّر ربط حساب المستخدم تلقائياً. تواصل مع الدعم.",
            },
            "IMAGE_PROVIDER_UNAVAILABLE": {
              "nonRetryableMessage": "خدمة التوليد غير متوفرة مؤقتًا. تواصل مع الدعم.",
              "retryAfterMs": 3000,
              "userAction": "auto_retry",
              "userMessage": "خدمة التوليد غير متوفرة مؤقتًا. سنعيد المحاولة تلقائيًا.",
            },
            "INTERNAL_ERROR": {
              "retryAfterMs": null,
              "userAction": "contact_support",
              "userMessage": "حدث خطأ داخلي غير متوقع.",
            },
            "INVALID_REQUEST": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "بيانات الطلب غير صالحة. صحّح المدخلات وحاول مرة أخرى.",
            },
            "LEGACY_EXTRACTION_DISABLED": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "تعذّر تجهيز هذا التصميم للطباعة من النسخة الحالية. استخدم التصميم الأصلي المحفوظ أو حاول مرة أخرى.",
            },
            "PROMPT_NON_MEANINGFUL": {
              "retryAfterMs": null,
              "userAction": "edit_prompt",
              "userMessage": "الوصف غير واضح. اكتب جملة تصف التصميم.",
            },
            "PROMPT_TOO_SHORT": {
              "retryAfterMs": null,
              "userAction": "edit_prompt",
              "userMessage": "الوصف قصير جداً. أضف تفاصيل عن التصميم.",
            },
            "QUOTA_STATE_UNCERTAIN": {
              "retryAfterMs": null,
              "userAction": "contact_support",
              "userMessage": "تعذّر تأكيد حالة رصيدك. تحقق قبل إعادة المحاولة.",
            },
            "RATE_LIMITED": {
              "retryAfterMs": 60000,
              "userAction": "wait_and_retry",
              "userMessage": "تم تجاوز الحد المسموح. انتظر دقيقة قبل المحاولة.",
            },
            "TRANSPARENT_ARTWORK_PROVIDER_UNAVAILABLE": {
              "retryAfterMs": null,
              "userAction": "contact_support",
              "userMessage": "خدمة إعداد التصميم غير متاحة حالياً. تواصل مع الدعم.",
            },
            "USER_SERVICE_UNAVAILABLE": {
              "retryAfterMs": 5000,
              "userAction": "wait_and_retry",
              "userMessage": "تعذّر التحقق من بيانات المستخدم مؤقتاً.",
            },
            "audience_disabled": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "توليد وشّى AI غير متاح لحسابك حالياً.",
            },
            "disabled": {
              "retryAfterMs": null,
              "userAction": "none",
              "userMessage": "خدمة التوليد متوقفة حالياً.",
            },
            "provider_not_configured": {
              "retryAfterMs": null,
              "userAction": "contact_support",
              "userMessage": "خدمة التوليد غير جاهزة حالياً.",
            },
            "quota_exceeded": {
              "retryAfterMs": null,
              "userAction": "upgrade_plan",
              "userMessage": "نفدت حصتك من التوليد. يمكنك إضافة رصيد للمتابعة.",
            },
            "quota_unavailable": {
              "retryAfterMs": 5000,
              "userAction": "wait_and_retry",
              "userMessage": "تعذّر التحقق من رصيد WASHA AI حالياً. حاول بعد قليل.",
            },
            "temporarily_unavailable": {
              "retryAfterMs": 5000,
              "userAction": "wait_and_retry",
              "userMessage": "خدمة التوليد غير متاحة مؤقتاً. حاول بعد قليل.",
            },
          }
        `);
    });

    it("keeps one architecture-table row per code exactly aligned with ERROR_MAP", () => {
        const document = readFileSync(
            resolve(process.cwd(), "docs/architecture/phase-3.md"),
            "utf8"
        );
        const tableRows = [...document.matchAll(
            /^\| `([^`]+)` \| ([^|]+) \| `([^`]+)` \| ([^|]+) \| `([^`]+)` \|$/gm
        )].map((match) => ({
            code: match[1],
            userMessage: match[2].trim(),
            userAction: match[3],
            retryAfterMs: match[4].trim() === "—"
                ? null
                : Number(match[4].trim().replace(" s", "")) * 1_000,
            effectiveUserActionWithQuotaSafetyOff: match[5],
        }));

        expect(tableRows.map(({ code }) => code)).toEqual([
            ...PUBLIC_ERROR_CODES,
        ]);
        expect(new Set(tableRows.map(({ code }) => code)).size).toBe(
            PUBLIC_ERROR_CODES.length
        );
        expect(tableRows).toEqual(PUBLIC_ERROR_CODES.map((code) => ({
            code,
            userMessage: ERROR_MAP[code].userMessage,
            userAction: ERROR_MAP[code].userAction,
            retryAfterMs: ERROR_MAP[code].retryAfterMs,
            effectiveUserActionWithQuotaSafetyOff:
                ERROR_MAP[code].userAction === "auto_retry"
                    ? "wait_and_retry"
                    : ERROR_MAP[code].userAction,
        })));
    });

    it("falls back safely for an unknown code with provider and internal details", () => {
        expect(mapPublicError("NEW_PROVIDER_FAILURE", {
            fallbackMessage:
                "OpenAI gpt-image SDK failed at https://internal.example/sql?key=secret",
            scope: "generation",
            retryable: true,
        })).toEqual({
            userMessage: PUBLIC_GENERATION_ERROR,
            userAction: "contact_support",
            retryAfterMs: null,
        });
    });

    it("uses a supplied Retry-After value as the retry timing source of truth", () => {
        expect(mapPublicError("RATE_LIMITED", {
            retryable: false,
            retryAfterMs: 12_000,
        })).toMatchObject({
            userAction: "wait_and_retry",
            retryAfterMs: 12_000,
        });
    });

    it("parses both HTTP Retry-After forms from one shared implementation", () => {
        const now = Date.parse("2026-07-19T12:00:00.000Z");

        expect(parseRetryAfterValueMs("7", now)).toBe(7_000);
        expect(parseRetryAfterValueMs(
            "Sun, 19 Jul 2026 12:00:09 GMT",
            now
        )).toBe(9_000);
        expect(parseRetryAfterValueMs("not-a-delay", now)).toBeNull();
    });

    it("never emits auto_retry when the response is not retryable", () => {
        for (const code of PUBLIC_ERROR_CODES) {
            const mapped = mapPublicError(code, { retryable: false });
            expect(mapped.userAction).not.toBe("auto_retry");
        }

        expect(mapPublicError("IMAGE_PROVIDER_UNAVAILABLE", {
            retryable: false,
        })).toEqual({
            userMessage: "خدمة التوليد غير متوفرة مؤقتًا. تواصل مع الدعم.",
            userAction: "contact_support",
            retryAfterMs: null,
        });

        for (const code of PUBLIC_ERROR_CODES) {
            expect(mapPublicError(code, {
                retryable: false,
            }).userMessage).not.toContain("تلقائيًا");
        }
    });

    it("retains auto_retry for explicitly retryable generation failures", () => {
        expect(mapPublicError("IMAGE_PROVIDER_UNAVAILABLE", {
            retryable: true,
        })).toMatchObject({
            userAction: "auto_retry",
            retryAfterMs: 3000,
        });
    });

    it("keeps every positive-map message safe through the fallback scrubber", () => {
        for (const mapping of Object.values(ERROR_MAP)) {
            expect(mapPublicError("UNKNOWN", {
                fallbackMessage: mapping.userMessage,
                scope: "generation",
            }).userMessage).toBe(mapping.userMessage);
        }
    });
});
