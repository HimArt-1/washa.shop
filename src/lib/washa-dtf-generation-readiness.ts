export type WashaDtfGenerationReadinessCode =
    | "ready"
    | "disabled"
    | "provider_not_configured"
    | "temporarily_unavailable";

export type WashaDtfGenerationReadiness = {
    enabled: boolean;
    code: WashaDtfGenerationReadinessCode;
    message: string;
    provider?: string;
    retryAfterSeconds?: number;
};

type GenerationEnvironment = Record<string, string | undefined>;

const GENERATION_FAILURE_THRESHOLD = 2;
const GENERATION_COOLDOWN_MS = 5 * 60 * 1000;

let consecutiveProviderFailures = 0;
let circuitOpenUntil = 0;

function clean(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed && !trimmed.startsWith("#") ? trimmed : undefined;
}

function resolveProvider(environment: GenerationEnvironment) {
    return (clean(environment.WASHA_DTF_IMAGE_PROVIDER) || clean(environment.IMAGE_PROVIDER) || "genai")
        .toLowerCase();
}

function providerCredentialIsConfigured(provider: string, environment: GenerationEnvironment) {
    if (["openai", "dall-e", "dalle", "gpt-image"].includes(provider)) {
        return Boolean(clean(environment.OPENAI_API_KEY));
    }
    if (provider === "replicate") {
        return Boolean(clean(environment.REPLICATE_API_TOKEN));
    }
    if ([
        "genai",
        "google_genai",
        "gemini",
        "gemini_flash",
        "flash_image",
        "nanobanana",
        "gemini-2.5-flash-image",
        "gemini-2.5-flash-image-preview",
        "gemini-3.1-flash-image-preview",
    ].includes(provider)) {
        return Boolean(clean(environment.GEMINI_API_KEY) || clean(environment.GOOGLE_GENERATIVE_AI_API_KEY));
    }
    return false;
}

export function resolveWashaDtfGenerationConfiguration(
    environment: GenerationEnvironment
): WashaDtfGenerationReadiness {
    const provider = resolveProvider(environment);
    const enabledFlag = clean(environment.WASHA_DTF_GENERATION_ENABLED)?.toLowerCase();
    const requiresExplicitProductionEnable = environment.NODE_ENV === "production" && enabledFlag !== "true";

    if (enabledFlag === "false" || requiresExplicitProductionEnable) {
        return {
            enabled: false,
            code: "disabled",
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
            provider,
        };
    }

    if (!providerCredentialIsConfigured(provider, environment)) {
        return {
            enabled: false,
            code: "provider_not_configured",
            message: "خدمة توليد WASHA AI غير مهيأة حالياً.",
            provider,
        };
    }

    return {
        enabled: true,
        code: "ready",
        message: "خدمة التوليد جاهزة.",
        provider,
    };
}

export function getWashaDtfGenerationReadiness(): WashaDtfGenerationReadiness {
    const configured = resolveWashaDtfGenerationConfiguration(process.env);
    if (!configured.enabled) return configured;

    const now = Date.now();
    if (circuitOpenUntil > now) {
        return {
            enabled: false,
            code: "temporarily_unavailable",
            message: "خدمة التوليد تحت المراجعة مؤقتاً بعد تعذر الاتصال بالمزوّد.",
            provider: configured.provider,
            retryAfterSeconds: Math.max(1, Math.ceil((circuitOpenUntil - now) / 1000)),
        };
    }

    if (circuitOpenUntil > 0) {
        circuitOpenUntil = 0;
        consecutiveProviderFailures = 0;
    }

    return configured;
}

export function recordWashaDtfGenerationSuccess() {
    consecutiveProviderFailures = 0;
    circuitOpenUntil = 0;
}

export function recordWashaDtfGenerationFailure(_error: unknown) {
    consecutiveProviderFailures += 1;
    if (consecutiveProviderFailures >= GENERATION_FAILURE_THRESHOLD) {
        circuitOpenUntil = Date.now() + GENERATION_COOLDOWN_MS;
    }
}
