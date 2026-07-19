import { sanitizeWashaDtfProviderMessage } from "@/lib/washa-dtf-provider-config";

export type ArtworkVerificationStage =
    | "text_policy_verification"
    | "garment_semantic_verification";

type Scalar = number | string | null;

type ArtworkVerificationUnavailableErrorParams = {
    provider: string;
    model: string | null;
    sourceProvider?: string | null;
    sourceModel?: string | null;
    stage: ArtworkVerificationStage;
    statusCode?: Scalar;
    providerCode?: Scalar;
    requestId?: string | null;
    providerMessage?: string;
    retryable?: boolean;
    cause?: unknown;
};

function scalar(value: unknown): Scalar {
    return typeof value === "number" || typeof value === "string"
        ? value
        : null;
}

function safeRequestId(value: unknown) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return /^[a-zA-Z0-9._:-]{1,160}$/.test(trimmed) ? trimmed : null;
}

function retryableStatus(statusCode: Scalar) {
    return statusCode === 408
        || statusCode === 429
        || (
            typeof statusCode === "number"
            && statusCode >= 500
        );
}

export class ArtworkVerificationUnavailableError extends Error {
    readonly code = "ARTWORK_VERIFICATION_UNAVAILABLE";
    readonly stage: ArtworkVerificationStage;
    readonly provider: string;
    readonly model: string | null;
    readonly sourceProvider: string | null;
    readonly sourceModel: string | null;
    readonly statusCode: Scalar;
    readonly providerCode: Scalar;
    readonly requestId: string | null;
    readonly providerMessage: string;
    readonly retryable: boolean;

    constructor(params: ArtworkVerificationUnavailableErrorParams) {
        const providerMessage = sanitizeWashaDtfProviderMessage(
            params.providerMessage || params.cause || "Artwork verification provider is unavailable."
        );
        super(`${params.provider} artwork verification failed: ${providerMessage}`);
        this.name = "ArtworkVerificationUnavailableError";
        this.stage = params.stage;
        this.provider = params.provider;
        this.model = params.model;
        this.sourceProvider = params.sourceProvider ?? null;
        this.sourceModel = params.sourceModel ?? null;
        this.statusCode = params.statusCode ?? null;
        this.providerCode = params.providerCode ?? null;
        this.requestId = safeRequestId(params.requestId);
        this.providerMessage = providerMessage;
        this.retryable = params.retryable ?? retryableStatus(this.statusCode);
        if (params.cause !== undefined) {
            Object.defineProperty(this, "cause", {
                value: params.cause,
                configurable: true,
                enumerable: false,
            });
        }
    }
}

export function isArtworkVerificationUnavailableError(
    error: unknown
): error is ArtworkVerificationUnavailableError {
    return error instanceof ArtworkVerificationUnavailableError
        || (
            error instanceof Error
            && "code" in error
            && error.code === "ARTWORK_VERIFICATION_UNAVAILABLE"
        );
}

export async function createArtworkVerificationHttpError(params: {
    response: Response;
    provider: string;
    model: string | null;
    sourceProvider?: string | null;
    sourceModel?: string | null;
    stage: ArtworkVerificationStage;
}) {
    let responseBody = "";
    try {
        responseBody = (await params.response.text()).slice(0, 8_000);
    } catch {
        responseBody = "";
    }
    let providerCode: Scalar = null;
    try {
        const parsed = JSON.parse(responseBody) as {
            error?: {
                code?: unknown;
                type?: unknown;
            };
        };
        providerCode = scalar(parsed.error?.code) ?? scalar(parsed.error?.type);
    } catch {
        providerCode = null;
    }
    return new ArtworkVerificationUnavailableError({
        provider: params.provider,
        model: params.model,
        sourceProvider: params.sourceProvider,
        sourceModel: params.sourceModel,
        stage: params.stage,
        statusCode: params.response.status,
        providerCode,
        requestId: params.response.headers.get("x-request-id"),
        providerMessage: responseBody || `HTTP ${params.response.status}`,
        retryable: retryableStatus(params.response.status),
    });
}

export function createArtworkVerificationRuntimeError(params: {
    error: unknown;
    provider: string;
    model: string | null;
    sourceProvider?: string | null;
    sourceModel?: string | null;
    stage: ArtworkVerificationStage;
    fallbackCode?: string;
}) {
    if (isArtworkVerificationUnavailableError(params.error)) return params.error;
    const raw = params.error as {
        code?: unknown;
        status?: unknown;
        statusCode?: unknown;
        requestId?: unknown;
        headers?: Record<string, unknown>;
        name?: unknown;
    } | null;
    const aborted = params.error instanceof Error
        && (
            params.error.name === "AbortError"
            || params.error.name === "TimeoutError"
        );
    const statusCode = aborted
        ? 504
        : scalar(raw?.statusCode) ?? scalar(raw?.status);
    const providerCode = aborted
        ? "verification_timeout"
        : scalar(raw?.code) ?? params.fallbackCode ?? "verification_failed";
    const requestId = safeRequestId(raw?.requestId)
        ?? safeRequestId(raw?.headers?.["x-request-id"]);
    return new ArtworkVerificationUnavailableError({
        provider: params.provider,
        model: params.model,
        sourceProvider: params.sourceProvider,
        sourceModel: params.sourceModel,
        stage: params.stage,
        statusCode,
        providerCode,
        requestId,
        providerMessage: sanitizeWashaDtfProviderMessage(params.error),
        retryable: aborted || statusCode === null || retryableStatus(statusCode),
        cause: params.error,
    });
}
