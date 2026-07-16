import { afterEach, describe, expect, it, vi } from "vitest";

import {
    CheckoutSubmissionTimeoutError,
    runCheckoutSubmission,
} from "@/lib/checkout-submission";

describe("checkout submission lifecycle", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns the server result before the deadline", async () => {
        await expect(runCheckoutSubmission(Promise.resolve({ success: true }), 15_000))
            .resolves.toEqual({ success: true });
    });

    it("rejects with a recognizable timeout while the server task may continue safely", async () => {
        vi.useFakeTimers();
        const pending = new Promise<never>(() => undefined);
        const result = runCheckoutSubmission(pending, 15_000);
        const expectation = expect(result).rejects.toBeInstanceOf(CheckoutSubmissionTimeoutError);

        await vi.advanceTimersByTimeAsync(15_000);

        await expectation;
    });

    it("preserves ordinary server errors for the checkout error state", async () => {
        const error = new Error("network failed");
        await expect(runCheckoutSubmission(Promise.reject(error), 15_000)).rejects.toBe(error);
    });
});
