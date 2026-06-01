import { describe, expect, it } from "vitest";
import { normalizeDtfTelemetryImageUrlForLog } from "@/lib/dtf-telemetry-sanitize";

describe("normalizeDtfTelemetryImageUrlForLog", () => {
    it("omits base64 data URLs from telemetry URL columns", () => {
        const normalized = normalizeDtfTelemetryImageUrlForLog(
            `data:image/png;base64,${"a".repeat(1200)}`,
            "result_image"
        );

        expect(normalized.url).toBeNull();
        expect(normalized.metadata).toMatchObject({
            result_image_omitted: true,
            result_image_omitted_reason: "data_url",
            result_image_mime_type: "image/png",
            result_image_approx_bytes: 900,
        });
    });

    it("keeps normal http URLs", () => {
        const normalized = normalizeDtfTelemetryImageUrlForLog(
            "https://example.com/generated/mockup.png",
            "result_image"
        );

        expect(normalized.url).toBe("https://example.com/generated/mockup.png");
        expect(normalized.metadata).toEqual({});
    });

    it("omits unusually long non-data values", () => {
        const normalized = normalizeDtfTelemetryImageUrlForLog(
            `https://example.com/${"x".repeat(5000)}`,
            "reference_image"
        );

        expect(normalized.url).toBeNull();
        expect(normalized.metadata).toMatchObject({
            reference_image_omitted: true,
            reference_image_omitted_reason: "url_too_long",
        });
    });
});
