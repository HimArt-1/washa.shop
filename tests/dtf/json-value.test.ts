import { describe, expect, it } from "vitest";
import { isJsonValue, serializeJsonValue } from "@/lib/json-value";

describe("JSON value contracts", () => {
    it("rejects values that JSONB cannot represent directly", () => {
        expect(isJsonValue(new Date("2026-07-22T00:00:00.000Z"))).toBe(false);
        expect(isJsonValue({ invalid: undefined })).toBe(false);
        expect(isJsonValue(Number.POSITIVE_INFINITY)).toBe(false);
    });

    it("serializes known domain values while dropping absent object fields", () => {
        expect(serializeJsonValue({ title: "تنبيه", link: undefined }, "announcement")).toEqual({
            title: "تنبيه",
        });
    });
});
