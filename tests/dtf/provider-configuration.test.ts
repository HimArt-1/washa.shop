import { describe, expect, it } from "vitest";

import {
    normalizeWashaDtfBoolean,
    resolveWashaDtfProviderConfiguration,
    sanitizeWashaDtfProviderMessage,
} from "@/lib/washa-dtf-provider-config";

describe("WASHA DTF provider configuration", () => {
    it("gives WASHA_DTF_IMAGE_PROVIDER priority over IMAGE_PROVIDER", () => {
        expect(resolveWashaDtfProviderConfiguration({
            WASHA_DTF_IMAGE_PROVIDER: " gemini ",
            IMAGE_PROVIDER: "openai",
            WASHA_DTF_GENAI_MODEL: "gemini-3-pro-image",
            GEMINI_API_KEY: "configured",
            OPENAI_API_KEY: "configured",
        })).toMatchObject({
            configuredProvider: "gemini",
            provider: "genai",
            model: "gemini-3-pro-image",
            credentialConfigured: true,
        });
    });

    it.each(["gemini", "genai", "GEMINI", " genai "])(
        "routes %j through the Google GenAI SDK branch",
        (provider) => {
            expect(resolveWashaDtfProviderConfiguration({
                WASHA_DTF_IMAGE_PROVIDER: provider,
                WASHA_DTF_GENAI_MODEL: "gemini-3-pro-image",
                GEMINI_API_KEY: "configured",
            })).toMatchObject({
                provider: "genai",
                model: "gemini-3-pro-image",
            });
        }
    );

    it("keeps nanobanana on its REST predict model", () => {
        expect(resolveWashaDtfProviderConfiguration({
            WASHA_DTF_IMAGE_PROVIDER: "nanobanana",
            WASHA_DTF_GENAI_MODEL: "gemini-3-pro-image",
            NANO_BANANA_PREDICT_MODEL: "imagen-explicit",
            GEMINI_API_KEY: "configured",
        })).toMatchObject({
            provider: "nanobanana",
            model: "imagen-explicit",
        });
    });

    it("does not use the legacy WASHA_DTF_IMAGE_MODEL as an implicit model override", () => {
        expect(resolveWashaDtfProviderConfiguration({
            WASHA_DTF_IMAGE_PROVIDER: "genai",
            WASHA_DTF_IMAGE_MODEL: "must-not-be-used",
            GEMINI_API_KEY: "configured",
        }).model).toBe("gemini-3.1-flash-image-preview");
    });

    it.each(["false", " false ", "FALSE", " False "])(
        "normalizes %j to a disabled paid fallback",
        (value) => {
            expect(normalizeWashaDtfBoolean(value, true)).toBe(false);
            expect(resolveWashaDtfProviderConfiguration({
                WASHA_DTF_PROVIDER_FALLBACK: value,
            }).fallbackEnabled).toBe(false);
        }
    );

    it("fails closed for an invalid explicit fallback value", () => {
        expect(normalizeWashaDtfBoolean("sometimes", true)).toBe(false);
    });

    it("redacts credentials and image payloads from provider diagnostics", () => {
        const secret = "gemini-secret-that-must-never-appear";
        const imagePayload = "A".repeat(320);
        const result = sanitizeWashaDtfProviderMessage(
            `api_key=${secret} data:image/png;base64,${imagePayload}`
        );

        expect(result).not.toContain(secret);
        expect(result).not.toContain(imagePayload);
        expect(result).toContain("[credential-omitted]");
        expect(result).toContain("[image-data-omitted]");
    });
});
