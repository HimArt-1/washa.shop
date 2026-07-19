import { afterEach, describe, expect, it, vi } from "vitest";

import {
    StudioApiError,
    generateMockup,
    getStructuredStudioError,
} from "../../washa-dtf-studio/src/services/geminiService";

const BASE_PREFERENCES = {
    sessionToken: "session-token",
    requestId: "request-studio-api",
};

function runGeneration() {
    return generateMockup(
        "تيشيرت",
        "أسود",
        "ذئب هندسي",
        "DTF",
        "هندسي",
        "أحادي",
        undefined,
        undefined,
        undefined,
        BASE_PREFERENCES,
    );
}

describe("Studio API structured errors", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("turns a complete structured response into a typed StudioApiError", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            ok: false,
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير جدًا.",
            userAction: "edit_prompt",
            retryAfterMs: null,
            retryable: false,
            requestId: "request-from-server",
        }), {
            status: 400,
            headers: { "content-type": "application/json" },
        })));

        const error = await runGeneration().catch((caught) => caught);

        expect(error).toBeInstanceOf(StudioApiError);
        expect(getStructuredStudioError(error)).toEqual({
            ok: false,
            code: "PROMPT_TOO_SHORT",
            message: "الوصف قصير جدًا.",
            userAction: "edit_prompt",
            retryAfterMs: null,
            retryable: false,
            requestId: "request-from-server",
        });
    });

    it("treats the Retry-After response header as the timing source of truth", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            ok: false,
            code: "RATE_LIMITED",
            message: "انتظر قليلًا.",
            userAction: "wait_and_retry",
            retryAfterMs: 1_000,
            retryable: true,
            requestId: "request-rate-limited",
        }), {
            status: 429,
            headers: {
                "content-type": "application/json",
                "Retry-After": "7",
            },
        })));

        const error = await runGeneration().catch((caught) => caught);

        expect(getStructuredStudioError(error)?.retryAfterMs).toBe(7_000);
    });

    it("keeps legacy error bodies supported and scrubs provider details", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            error: "OpenAI upstream failed at https://provider.invalid/v1 trace id abc-123",
            code: "INTERNAL_ERROR",
        }), {
            status: 502,
            headers: { "content-type": "application/json" },
        })));

        const error = await runGeneration().catch((caught) => caught);

        expect(error).toBeInstanceOf(StudioApiError);
        expect(getStructuredStudioError(error)).toBeNull();
        expect((error as Error).message).not.toContain("OpenAI");
        expect((error as Error).message).not.toContain("provider.invalid");
        expect((error as Error).message).not.toContain("abc-123");
    });
});
