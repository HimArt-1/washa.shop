import "server-only";

import {
    resolveWashaDtfProviderConfiguration,
    type WashaDtfProviderConfiguration,
} from "@/lib/washa-dtf-provider-config";

type Environment = Record<string, string | undefined>;

const DEFAULT_V4_PROVIDER = "genai";
const DEFAULT_V4_MODEL = "gemini-3.1-flash-image-preview";

function clean(value: string | undefined) {
    return value?.trim() || undefined;
}

export function resolveWashaAiV4ApiKey(environment: Environment = process.env) {
    return clean(environment.WASHA_AI_V4_GEMINI_API_KEY)
        || clean(environment.GEMINI_API_KEY)
        || clean(environment.GOOGLE_GENERATIVE_AI_API_KEY);
}

export function resolveWashaAiV4ProviderConfiguration(
    environment: Environment = process.env
): WashaDtfProviderConfiguration {
    const provider = clean(environment.WASHA_AI_V4_PROVIDER)?.toLowerCase()
        || DEFAULT_V4_PROVIDER;
    const model = clean(environment.WASHA_AI_V4_MODEL);

    // V4 promises a native 4K board. At present only the GenAI path requests
    // a native 4K image, so lower-resolution legacy providers fail closed.
    if (!["genai", "google_genai", "gemini", "gemini_flash", "flash_image"].includes(provider)) {
        return {
            configuredProvider: provider,
            provider: "unsupported",
            model: model || provider,
            fallbackEnabled: false,
            credentialConfigured: false,
        };
    }

    return resolveWashaDtfProviderConfiguration({
        WASHA_DTF_IMAGE_PROVIDER: provider,
        WASHA_DTF_GENAI_MODEL: model || DEFAULT_V4_MODEL,
        WASHA_DTF_PROVIDER_FALLBACK: "false",
        GEMINI_API_KEY: resolveWashaAiV4ApiKey(environment),
    });
}

export function getWashaAiV4Readiness(environment: Environment = process.env) {
    const configuration = resolveWashaAiV4ProviderConfiguration(environment);
    return {
        ready: configuration.provider !== "unsupported" && configuration.credentialConfigured,
        provider: configuration.provider,
        model: configuration.model,
    };
}
