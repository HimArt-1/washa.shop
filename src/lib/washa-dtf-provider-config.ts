export type WashaDtfProvider =
    | "genai"
    | "nanobanana"
    | "openai"
    | "replicate"
    | "unsupported";

export type WashaDtfProviderConfiguration = {
    configuredProvider: string;
    provider: WashaDtfProvider;
    model: string;
    fallbackEnabled: boolean;
    credentialConfigured: boolean;
};

export type WashaDtfProviderAttempt = {
    provider: string;
    model: string;
    attempt: number;
    durationMs: number;
    status: number | string | null;
    code: number | string | null;
    message: string;
};

type ProviderEnvironment = Record<string, string | undefined>;

const DEFAULT_GENAI_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_NANO_BANANA_MODEL = "imagen-4.0-ultra-generate-001";
const DEFAULT_OPENAI_MODEL = "gpt-image-1";
const DEFAULT_REPLICATE_MODEL = "black-forest-labs/flux-schnell";

const GENAI_ALIASES = new Set([
    "genai",
    "google_genai",
    "gemini",
    "gemini_flash",
    "flash_image",
]);

const OPENAI_ALIASES = new Set([
    "openai",
    "dall-e",
    "dalle",
    "gpt-image",
]);

export function cleanWashaDtfEnvValue(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed && !trimmed.startsWith("#") ? trimmed : undefined;
}

export function normalizeWashaDtfBoolean(
    value: string | undefined,
    defaultValue: boolean
) {
    const normalized = cleanWashaDtfEnvValue(value)?.toLowerCase();
    if (!normalized) return defaultValue;
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    // An invalid explicit value must not silently enable a paid fallback.
    return false;
}

function resolveConfiguredProvider(environment: ProviderEnvironment) {
    return (
        cleanWashaDtfEnvValue(environment.WASHA_DTF_IMAGE_PROVIDER)
        || cleanWashaDtfEnvValue(environment.IMAGE_PROVIDER)
        || "genai"
    ).toLowerCase();
}

function resolveProvider(configuredProvider: string): WashaDtfProvider {
    if (
        GENAI_ALIASES.has(configuredProvider)
        || (
            configuredProvider.startsWith("gemini-")
            && configuredProvider.includes("image")
        )
    ) {
        return "genai";
    }
    if (configuredProvider === "nanobanana") return "nanobanana";
    if (OPENAI_ALIASES.has(configuredProvider)) return "openai";
    if (configuredProvider === "replicate") return "replicate";
    return "unsupported";
}

function resolveModel(
    provider: WashaDtfProvider,
    configuredProvider: string,
    environment: ProviderEnvironment
) {
    if (provider === "genai") {
        return (
            cleanWashaDtfEnvValue(environment.WASHA_DTF_GENAI_MODEL)
            || (
                configuredProvider.startsWith("gemini-")
                && configuredProvider.includes("image")
                    ? configuredProvider
                    : undefined
            )
            || DEFAULT_GENAI_MODEL
        );
    }
    if (provider === "nanobanana") {
        return (
            cleanWashaDtfEnvValue(environment.NANO_BANANA_PREDICT_MODEL)
            || DEFAULT_NANO_BANANA_MODEL
        );
    }
    if (provider === "openai") {
        return cleanWashaDtfEnvValue(environment.OPENAI_IMAGE_MODEL) || DEFAULT_OPENAI_MODEL;
    }
    if (provider === "replicate") return DEFAULT_REPLICATE_MODEL;
    return configuredProvider;
}

function hasCredential(provider: WashaDtfProvider, environment: ProviderEnvironment) {
    if (provider === "genai" || provider === "nanobanana") {
        return Boolean(
            cleanWashaDtfEnvValue(environment.GEMINI_API_KEY)
            || cleanWashaDtfEnvValue(environment.GOOGLE_GENERATIVE_AI_API_KEY)
        );
    }
    if (provider === "openai") {
        return Boolean(cleanWashaDtfEnvValue(environment.OPENAI_API_KEY));
    }
    if (provider === "replicate") {
        return Boolean(cleanWashaDtfEnvValue(environment.REPLICATE_API_TOKEN));
    }
    return false;
}

export function resolveWashaDtfProviderConfiguration(
    environment: ProviderEnvironment = process.env
): WashaDtfProviderConfiguration {
    const configuredProvider = resolveConfiguredProvider(environment);
    const provider = resolveProvider(configuredProvider);
    return {
        configuredProvider,
        provider,
        model: resolveModel(provider, configuredProvider, environment),
        fallbackEnabled: normalizeWashaDtfBoolean(
            environment.WASHA_DTF_PROVIDER_FALLBACK,
            true
        ),
        credentialConfigured: hasCredential(provider, environment),
    };
}

function readStructuredError(value: string) {
    try {
        const parsed = JSON.parse(value) as {
            error?: {
                code?: unknown;
                message?: unknown;
                status?: unknown;
            };
        };
        return parsed.error && typeof parsed.error === "object"
            ? parsed.error
            : null;
    } catch {
        return null;
    }
}

export function sanitizeWashaDtfProviderMessage(value: unknown) {
    const raw = value instanceof Error ? value.message : String(value ?? "Unknown provider error");
    const structured = readStructuredError(raw);
    const source = typeof structured?.message === "string" ? structured.message : raw;
    return source
        .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi, "[image-data-omitted]")
        .replace(/\b(?:sk|AIza)[-_a-z0-9]{12,}\b/gi, "[credential-omitted]")
        .replace(/(authorization|api[-_ ]?key)\s*[:=]\s*bearer\s+\S+/gi, "$1=[credential-omitted]")
        .replace(/(authorization|api[-_ ]?key)\s*[:=]\s*\S+/gi, "$1=[credential-omitted]")
        .replace(/\b[A-Za-z0-9+/]{160,}={0,2}\b/g, "[binary-data-omitted]")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 320);
}

export function createWashaDtfProviderAttempt(params: {
    provider: string;
    model: string;
    attempt: number;
    durationMs: number;
    error: unknown;
}): WashaDtfProviderAttempt {
    const raw = params.error as {
        code?: unknown;
        status?: unknown;
        statusCode?: unknown;
        message?: unknown;
    } | null;
    const message = params.error instanceof Error
        ? params.error.message
        : typeof raw?.message === "string"
            ? raw.message
            : String(params.error ?? "");
    const structured = readStructuredError(message);
    const status = raw?.statusCode ?? raw?.status ?? structured?.status ?? null;
    const code = raw?.code ?? structured?.code ?? null;
    return {
        provider: params.provider,
        model: params.model,
        attempt: params.attempt,
        durationMs: params.durationMs,
        status:
            typeof status === "number" || typeof status === "string"
                ? status
                : null,
        code:
            typeof code === "number" || typeof code === "string"
                ? code
                : null,
        message: sanitizeWashaDtfProviderMessage(params.error),
    };
}

export class WashaDtfProviderChainError extends Error {
    readonly attempts: WashaDtfProviderAttempt[];
    readonly originalError: unknown;

    constructor(attempts: WashaDtfProviderAttempt[], originalError: unknown) {
        super(
            attempts.length
                ? `Image provider chain failed: ${attempts
                    .map((attempt) =>
                        `${attempt.provider}/${attempt.model}: ${attempt.message}`
                    )
                    .join(" | ")}`
                : "Image provider chain failed."
        );
        this.name = "WashaDtfProviderChainError";
        this.attempts = attempts;
        this.originalError = originalError;
        this.cause = originalError;
    }
}

export function getWashaDtfProviderAttempts(error: unknown) {
    return error instanceof WashaDtfProviderChainError ? error.attempts : [];
}
