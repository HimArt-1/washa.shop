import { afterEach, describe, expect, it, vi } from "vitest";

import type { StructuredPublicErrorPayload } from "@/lib/washa-dtf-public-errors";
import {
    StructuredRecoveryCoordinator,
    type GenerationRetryIdentity,
    type StructuredRecoveryRetry,
} from "../../washa-dtf-studio/src/lib/structuredErrorActions";

function payload(
    overrides: Partial<StructuredPublicErrorPayload>
): StructuredPublicErrorPayload {
    return {
        ok: false,
        code: "IMAGE_PROVIDER_UNAVAILABLE",
        message: "copy does not control this harness",
        userAction: "auto_retry",
        retryAfterMs: 3_000,
        retryable: true,
        requestId: "request-design-provider",
        ...overrides,
    };
}

class StructuredRecoveryHostHarness {
    readonly retries: StructuredRecoveryRetry[] = [];
    readonly focusedPrompt = vi.fn();
    retryHandler = (retry: StructuredRecoveryRetry) => {
        this.retries.push(retry);
    };
    currentStep = 6;
    generationInFlight = false;
    currentIdentity: GenerationRetryIdentity | null = {
        fingerprint: "fingerprint-stable",
        requestId: "request-design-provider",
    };
    readonly recovery = new StructuredRecoveryCoordinator({
        getCurrentIdentity: () => this.currentIdentity,
        isGenerationInFlight: () => this.generationInFlight,
        clearRetryIdentity: () => {
            this.currentIdentity = null;
        },
        onPromptFocus: () => {
            this.focusedPrompt();
            this.currentStep = 2;
        },
        onRetry: (retry) => this.retryHandler(retry),
        onStateChange: vi.fn(),
    });

    constructor(
        readonly autoRetryQuotaSafe = false
    ) {}

    receive(
        error: StructuredPublicErrorPayload,
        automaticRetryAttempt = 0,
        retryIdentity = this.currentIdentity
    ) {
        if (!retryIdentity) {
            throw new Error("retry identity is required by the harness");
        }
        return this.recovery.apply({
            payload: error,
            automaticRetryAttempt,
            retryIdentity,
            autoRetryQuotaSafe: this.autoRetryQuotaSafe,
        });
    }

    editDescription() {
        this.recovery.invalidate();
    }

    succeed() {
        this.recovery.complete();
    }

    unmount() {
        this.recovery.dispose();
    }
}

describe("StructuredRecoveryCoordinator integration used by DesignProvider", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("runs at most two automatic retries", async () => {
        vi.useFakeTimers();
        const harness = new StructuredRecoveryHostHarness(true);
        const error = payload({});

        harness.retryHandler = (retry) => {
            harness.retries.push(retry);
            harness.receive(
                error,
                retry.automaticRetryAttempt,
                retry.retryIdentity
            );
        };
        harness.receive(error);

        await vi.advanceTimersByTimeAsync(3_000);
        await vi.advanceTimersByTimeAsync(6_000);
        await vi.advanceTimersByTimeAsync(30_000);

        expect(harness.retries).toHaveLength(2);
    });

    it("keeps one request ID and fingerprint across automatic retries", async () => {
        vi.useFakeTimers();
        const harness = new StructuredRecoveryHostHarness(true);
        const error = payload({});

        harness.retryHandler = (retry) => {
            harness.retries.push(retry);
            harness.receive(
                error,
                retry.automaticRetryAttempt,
                retry.retryIdentity
            );
        };
        harness.receive(error);

        await vi.advanceTimersByTimeAsync(3_000);
        await vi.advanceTimersByTimeAsync(6_000);

        expect(harness.retries).toEqual([
            {
                automaticRetryAttempt: 1,
                retryIdentity: {
                    fingerprint: "fingerprint-stable",
                    requestId: "request-design-provider",
                },
            },
            {
                automaticRetryAttempt: 2,
                retryIdentity: {
                    fingerprint: "fingerprint-stable",
                    requestId: "request-design-provider",
                },
            },
        ]);
    });

    it("does not start a scheduled retry while another generation is in flight", async () => {
        vi.useFakeTimers();
        const harness = new StructuredRecoveryHostHarness(true);
        harness.receive(payload({}));
        harness.generationInFlight = true;

        await vi.advanceTimersByTimeAsync(10_000);

        expect(harness.retries).toHaveLength(0);
    });

    it("cancels a late automatic retry after success", async () => {
        vi.useFakeTimers();
        const afterSuccess = new StructuredRecoveryHostHarness(true);
        afterSuccess.receive(payload({}));
        afterSuccess.succeed();

        await vi.advanceTimersByTimeAsync(10_000);

        expect(afterSuccess.retries).toHaveLength(0);
        expect(afterSuccess.currentIdentity).toBeNull();
    });

    it("description edits cancel the timer and previous identity", async () => {
        vi.useFakeTimers();
        const afterEdit = new StructuredRecoveryHostHarness(true);
        afterEdit.receive(payload({}));
        afterEdit.editDescription();

        await vi.advanceTimersByTimeAsync(10_000);

        expect(afterEdit.retries).toHaveLength(0);
        expect(afterEdit.currentIdentity).toBeNull();
    });

    it("unmount cancels a pending automatic retry", async () => {
        vi.useFakeTimers();
        const afterUnmount = new StructuredRecoveryHostHarness(true);
        afterUnmount.receive(payload({}));
        afterUnmount.unmount();

        await vi.advanceTimersByTimeAsync(10_000);

        expect(afterUnmount.retries).toHaveLength(0);
    });

    it("uses a manual countdown with zero retries while quota safety is disabled", async () => {
        vi.useFakeTimers();
        const harness = new StructuredRecoveryHostHarness(false);

        const directive = harness.receive(payload({}));

        expect(directive.action).toBe("wait_and_retry");
        expect(harness.recovery.isManualRetryBlocked()).toBe(true);
        await vi.advanceTimersByTimeAsync(3_000);
        expect(harness.recovery.isManualRetryBlocked()).toBe(false);
        expect(harness.retries).toHaveLength(0);
    });

    it("PROMPT_TOO_SHORT focuses the prompt without sending a retry", () => {
        const promptHarness = new StructuredRecoveryHostHarness();
        promptHarness.receive(payload({
            code: "PROMPT_TOO_SHORT",
            userAction: "edit_prompt",
            retryAfterMs: null,
            retryable: false,
        }));

        expect(promptHarness.focusedPrompt).toHaveBeenCalledOnce();
        expect(promptHarness.currentStep).toBe(2);
        expect(promptHarness.retries).toHaveLength(0);
    });

    it("ARTWORK_PLACEMENT_INVALID stays on results without prompt focus or retry", () => {
        const placementHarness = new StructuredRecoveryHostHarness();
        placementHarness.receive(payload({
            code: "ARTWORK_PLACEMENT_INVALID",
            userAction: "none",
            retryAfterMs: null,
            retryable: false,
        }));

        expect(placementHarness.focusedPrompt).not.toHaveBeenCalled();
        expect(placementHarness.currentStep).toBe(6);
        expect(placementHarness.retries).toHaveLength(0);
    });

    it("blocks manual retry for RATE_LIMITED until the countdown expires", async () => {
        vi.useFakeTimers();
        const harness = new StructuredRecoveryHostHarness();
        harness.receive(payload({
            code: "RATE_LIMITED",
            userAction: "wait_and_retry",
            retryAfterMs: 60_000,
            retryable: false,
        }));

        expect(harness.recovery.isManualRetryBlocked()).toBe(true);
        await vi.advanceTimersByTimeAsync(59_000);
        expect(harness.recovery.isManualRetryBlocked()).toBe(true);
        await vi.advanceTimersByTimeAsync(1_000);
        expect(harness.recovery.isManualRetryBlocked()).toBe(false);
        expect(harness.retries).toHaveLength(0);
    });
});
