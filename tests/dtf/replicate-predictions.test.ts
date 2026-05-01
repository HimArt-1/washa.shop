import { describe, expect, it } from "vitest";
import { REPLICATE_WAIT_SECONDS } from "@/lib/replicate-predictions";

describe("replicate predictions", () => {
    it("uses a Replicate-supported wait window", () => {
        expect(REPLICATE_WAIT_SECONDS).toBeLessThanOrEqual(60);
        expect(REPLICATE_WAIT_SECONDS).toBeGreaterThanOrEqual(1);
    });
});
