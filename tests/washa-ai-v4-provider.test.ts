import { describe, expect, it } from "vitest";

import {
    getWashaAiV4Readiness,
    resolveWashaAiV4ApiKey,
    resolveWashaAiV4ProviderConfiguration,
} from "@/lib/washa-ai-v4-provider";

describe("WASHA AI v4 provider isolation", () => {
    it("honors dedicated provider and model values without generation settings", () => {
        const configuration = resolveWashaAiV4ProviderConfiguration({
            WASHA_AI_V4_PROVIDER: "genai",
            WASHA_AI_V4_MODEL: "gemini-v4-board",
            GEMINI_API_KEY: "configured",
            WASHA_DTF_IMAGE_PROVIDER: "replicate",
        });

        expect(configuration).toMatchObject({
            provider: "genai",
            model: "gemini-v4-board",
            credentialConfigured: true,
        });
    });

    it("ignores legacy provider and model settings when V4 overrides are absent", () => {
        const configuration = resolveWashaAiV4ProviderConfiguration({
            WASHA_DTF_IMAGE_PROVIDER: "replicate",
            WASHA_DTF_GENAI_MODEL: "legacy-model",
            GEMINI_API_KEY: "configured",
        });

        expect(configuration).toMatchObject({
            provider: "genai",
            model: "gemini-3.1-flash-image-preview",
            fallbackEnabled: false,
            credentialConfigured: true,
        });
    });

    it("fails closed for providers that cannot return a native 4K board", () => {
        const configuration = resolveWashaAiV4ProviderConfiguration({
            WASHA_AI_V4_PROVIDER: "openai",
            WASHA_AI_V4_MODEL: "gpt-image-2",
            OPENAI_API_KEY: "configured",
        });

        expect(configuration).toMatchObject({
            provider: "unsupported",
            fallbackEnabled: false,
            credentialConfigured: false,
        });
    });

    it("prefers the dedicated V4 credential over shared Gemini credentials", () => {
        expect(resolveWashaAiV4ApiKey({
            WASHA_AI_V4_GEMINI_API_KEY: "v4-key",
            GEMINI_API_KEY: "legacy-key",
            GOOGLE_GENERATIVE_AI_API_KEY: "legacy-google-key",
        })).toBe("v4-key");
    });

    it("reports unavailable when the dedicated provider has no credential", () => {
        expect(getWashaAiV4Readiness({
            WASHA_AI_V4_PROVIDER: "genai",
        }).ready).toBe(false);
    });
});
