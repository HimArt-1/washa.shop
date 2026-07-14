import { describe, expect, it } from "vitest";

import { resolveWashaDtfGenerationConfiguration } from "@/lib/washa-dtf-generation-readiness";

describe("WASHA AI generation configuration", () => {
    it("fails closed in production until generation is explicitly enabled", () => {
        expect(resolveWashaDtfGenerationConfiguration({
            NODE_ENV: "production",
            IMAGE_PROVIDER: "gemini",
            GEMINI_API_KEY: "configured",
        })).toMatchObject({ enabled: false, code: "disabled" });
    });

    it("rejects an enabled provider whose required credential is missing", () => {
        expect(resolveWashaDtfGenerationConfiguration({
            NODE_ENV: "production",
            WASHA_DTF_GENERATION_ENABLED: "true",
            IMAGE_PROVIDER: "openai",
        })).toMatchObject({ enabled: false, code: "provider_not_configured" });
    });

    it("reports ready only when the production switch and provider credential are present", () => {
        expect(resolveWashaDtfGenerationConfiguration({
            NODE_ENV: "production",
            WASHA_DTF_GENERATION_ENABLED: "true",
            IMAGE_PROVIDER: "replicate",
            REPLICATE_API_TOKEN: "configured",
        })).toEqual({
            enabled: true,
            code: "ready",
            message: "خدمة التوليد جاهزة.",
            provider: "replicate",
        });
    });
});
