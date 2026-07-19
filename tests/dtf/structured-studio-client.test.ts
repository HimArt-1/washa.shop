import { afterEach, describe, expect, it, vi } from "vitest";

import {
    isStructuredPublicErrorPayload,
    type StructuredPublicErrorPayload,
} from "@/lib/washa-dtf-public-errors";
import {
    MAX_AUTO_RETRY_ATTEMPTS,
    StructuredActionTimers,
    canBypassDisabledReadiness,
    canRunScheduledRetry,
    focusStudioPromptInput,
    isStructuredRetryBlocked,
    resolveReadinessErrorDirective,
    resolveStructuredErrorDirective,
} from "../../washa-dtf-studio/src/lib/structuredErrorActions";

function payload(
    overrides: Partial<StructuredPublicErrorPayload>
): StructuredPublicErrorPayload {
    return {
        ok: false,
        code: "INTERNAL_ERROR",
        message: "رسالة آمنة",
        userAction: "contact_support",
        retryAfterMs: null,
        retryable: false,
        requestId: "request-structured-client",
        ...overrides,
    };
}

describe("structured Studio client actions", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("degrades auto_retry to a manual countdown while quota safety is disabled", () => {
        const directive = resolveStructuredErrorDirective(payload({
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            userAction: "auto_retry",
            retryAfterMs: 3_000,
            retryable: true,
        }), 0, false);

        expect(directive).toMatchObject({
            action: "wait_and_retry",
            autoRetryDelayMs: null,
            countdownMs: 3_000,
        });
    });

    it("accepts only complete typed error payloads", () => {
        expect(isStructuredPublicErrorPayload(payload({
            code: "PROMPT_TOO_SHORT",
            userAction: "edit_prompt",
        }))).toBe(true);
        expect(isStructuredPublicErrorPayload({
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير",
        })).toBe(false);
        expect(isStructuredPublicErrorPayload({
            ...payload({}),
            userAction: "retry because the message said so",
        })).toBe(false);
    });

    it("keeps AUTH_REQUIRED visible without automatic retry", () => {
        const directive = resolveStructuredErrorDirective(payload({
            code: "AUTH_REQUIRED",
            userAction: "none",
        }), 0);

        expect(directive).toMatchObject({
            action: "none",
            autoRetryDelayMs: null,
            focusPrompt: false,
            showAuthentication: true,
        });
    });

    it("focuses the prompt for PROMPT_TOO_SHORT without retrying", () => {
        const directive = resolveStructuredErrorDirective(payload({
            code: "PROMPT_TOO_SHORT",
            userAction: "edit_prompt",
        }), 0);

        expect(directive).toMatchObject({
            action: "edit_prompt",
            autoRetryDelayMs: null,
            focusPrompt: true,
        });

        const input = {
            focus: vi.fn(),
            select: vi.fn(),
        };
        expect(focusStudioPromptInput(() => input)).toBe(true);
        expect(input.focus).toHaveBeenCalledOnce();
        expect(input.select).toHaveBeenCalledOnce();
    });

    it("keeps ARTWORK_PLACEMENT_INVALID on the current step without prompt focus or retry", () => {
        const directive = resolveStructuredErrorDirective(payload({
            code: "ARTWORK_PLACEMENT_INVALID",
            userAction: "none",
            retryable: false,
        }), 0);

        expect(directive).toMatchObject({
            action: "none",
            autoRetryDelayMs: null,
            focusPrompt: false,
        });
        expect(directive.showAuthentication).toBe(false);
    });

    it("limits IMAGE_PROVIDER_UNAVAILABLE to two progressive automatic retries", () => {
        const error = payload({
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            userAction: "auto_retry",
            retryAfterMs: 3_000,
            retryable: true,
        });

        expect(resolveStructuredErrorDirective(error, 0, true).autoRetryDelayMs)
            .toBe(3_000);
        expect(resolveStructuredErrorDirective(error, 1, true).autoRetryDelayMs)
            .toBe(6_000);
        expect(resolveStructuredErrorDirective(
            error,
            MAX_AUTO_RETRY_ATTEMPTS,
            true
        ).autoRetryDelayMs).toBeNull();
    });

    it("never retries an auto_retry action marked non-retryable", () => {
        expect(resolveStructuredErrorDirective(payload({
            code: "IMAGE_PROVIDER_UNAVAILABLE",
            userAction: "auto_retry",
            retryAfterMs: 3_000,
            retryable: false,
        }), 0, true).autoRetryDelayMs).toBeNull();
    });

    it("uses RATE_LIMITED as a manual countdown without automatic retry", () => {
        const directive = resolveStructuredErrorDirective(payload({
            code: "RATE_LIMITED",
            userAction: "wait_and_retry",
            retryAfterMs: 60_000,
        }), 0);

        expect(directive).toMatchObject({
            action: "wait_and_retry",
            autoRetryDelayMs: null,
            countdownMs: 60_000,
        });
        expect(isStructuredRetryBlocked({
            action: directive.action,
            retryRemainingMs: 60_000,
        })).toBe(true);
        expect(isStructuredRetryBlocked({
            action: directive.action,
            retryRemainingMs: 0,
        })).toBe(false);
    });

    it("turns a temporary config readiness state into a typed wait action", () => {
        expect(resolveReadinessErrorDirective({
            code: "temporarily_unavailable",
            message: "provider detail that must not drive the action",
            retryAfterSeconds: 4,
        })).toEqual({
            code: "temporarily_unavailable",
            message: "خدمة التوليد غير متاحة مؤقتاً. حاول بعد قليل.",
            userAction: "wait_and_retry",
            retryAfterMs: 4_000,
        });
    });

    it("lets a server-authorized automatic retry bypass stale disabled readiness", () => {
        expect(canBypassDisabledReadiness({
            isAutomaticRetry: true,
            currentError: {
                code: "IMAGE_PROVIDER_UNAVAILABLE",
                retryRemainingMs: 3_000,
            },
        })).toBe(true);
        expect(canBypassDisabledReadiness({
            isAutomaticRetry: false,
            currentError: {
                code: "temporarily_unavailable",
                retryRemainingMs: 1_000,
            },
        })).toBe(false);
        expect(canBypassDisabledReadiness({
            isAutomaticRetry: false,
            currentError: {
                code: "temporarily_unavailable",
                retryRemainingMs: 0,
            },
        })).toBe(true);
    });

    it("turns a missing provider configuration into final support guidance", () => {
        expect(resolveReadinessErrorDirective({
            code: "provider_not_configured",
            message: "unsafe server configuration detail",
        })).toEqual({
            code: "provider_not_configured",
            message: "خدمة التوليد غير جاهزة حالياً.",
            userAction: "contact_support",
            retryAfterMs: null,
        });
    });

    it("keeps contact_support final and exposes its request id", () => {
        expect(resolveStructuredErrorDirective(payload({
            code: "IDENTITY_CONFLICT",
            userAction: "contact_support",
            requestId: "request-for-support",
        }), 0)).toMatchObject({
            action: "contact_support",
            autoRetryDelayMs: null,
            requestId: "request-for-support",
        });
    });

    it("does not derive behavior from the Arabic or provider message", () => {
        const first = resolveStructuredErrorDirective(payload({
            code: "RATE_LIMITED",
            message: "انتظر",
            userAction: "wait_and_retry",
            retryAfterMs: 10_000,
        }), 0);
        const second = resolveStructuredErrorDirective(payload({
            code: "RATE_LIMITED",
            message: "OpenAI timeout text that must not drive behavior",
            userAction: "wait_and_retry",
            retryAfterMs: 10_000,
        }), 0);

        expect(first).toEqual(second);
    });

    it("blocks parallel or stale scheduled retries with the stable identity", () => {
        const scheduled = {
            fingerprint: "fingerprint-a",
            requestId: "request-a",
        };

        expect(canRunScheduledRetry({
            scheduled,
            current: scheduled,
            generationInFlight: false,
        })).toBe(true);
        expect(canRunScheduledRetry({
            scheduled,
            current: scheduled,
            generationInFlight: true,
        })).toBe(false);
        expect(canRunScheduledRetry({
            scheduled,
            current: null,
            generationInFlight: false,
        })).toBe(false);
    });

    it("cancels automatic retry and countdown timers when disposed", async () => {
        vi.useFakeTimers();
        const timers = new StructuredActionTimers();
        const retry = vi.fn();
        const countdown = vi.fn();

        timers.scheduleAutoRetry(2_000, retry);
        timers.startCountdown(5_000, countdown);
        timers.dispose();
        await vi.advanceTimersByTimeAsync(10_000);

        expect(retry).not.toHaveBeenCalled();
        expect(countdown).toHaveBeenCalledTimes(1);
        expect(countdown).toHaveBeenLastCalledWith(5_000);
    });
});
