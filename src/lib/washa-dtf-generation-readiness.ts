import {
    cleanWashaDtfEnvValue,
    resolveWashaDtfProviderConfiguration,
} from "@/lib/washa-dtf-provider-config";

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
    model?: string;
    fallbackEnabled?: boolean;
    retryAfterSeconds?: number;
};

type GenerationEnvironment = Record<string, string | undefined>;

const GENERATION_FAILURE_THRESHOLD = 2;
const GENERATION_COOLDOWN_MS = 5 * 60 * 1000;

let consecutiveProviderFailures = 0;
let circuitOpenUntil = 0;

export function resolveWashaDtfGenerationConfiguration(
    environment: GenerationEnvironment
): WashaDtfGenerationReadiness {
    const providerConfiguration = resolveWashaDtfProviderConfiguration(environment);
    const enabledFlag = cleanWashaDtfEnvValue(
        environment.WASHA_DTF_GENERATION_ENABLED
    )?.toLowerCase();
    const requiresExplicitProductionEnable = environment.NODE_ENV === "production" && enabledFlag !== "true";
    const providerDetails = {
        provider: providerConfiguration.provider,
        model: providerConfiguration.model,
        fallbackEnabled: providerConfiguration.fallbackEnabled,
    };

    if (enabledFlag === "false" || requiresExplicitProductionEnable) {
        return {
            enabled: false,
            code: "disabled",
            message: "توليد WASHA AI متوقف مؤقتاً حتى اكتمال إعداد الخدمة.",
            ...providerDetails,
        };
    }

    if (
        providerConfiguration.provider === "unsupported"
        || !providerConfiguration.credentialConfigured
    ) {
        return {
            enabled: false,
            code: "provider_not_configured",
            message: "خدمة توليد WASHA AI غير مهيأة حالياً.",
            ...providerDetails,
        };
    }

    return {
        enabled: true,
        code: "ready",
        message: "خدمة التوليد جاهزة.",
        ...providerDetails,
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
            model: configured.model,
            fallbackEnabled: configured.fallbackEnabled,
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
