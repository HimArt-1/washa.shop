import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getDesignPieceAccessFailure,
    resolveDesignPieceAccess,
    type DesignPieceAccessResult,
} from "@/lib/design-piece-access";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIdentifier } from "@/lib/request-client";

const DTF_PRIVILEGED_ROLES = new Set(["admin", "wushsha", "dev"]);
export const WASHA_AUTH_STATE_HEADER = "x-washa-auth-state";

type ErrorResponder = (
    message: string,
    status: number,
    logContext?: unknown,
    reason?: DesignPieceAccessResult["reason"]
) => NextResponse;

type AccessResolution =
    | { access: DesignPieceAccessResult; response?: undefined }
    | { access?: undefined; response: NextResponse };

type ParsedJsonResolution<TData> =
    | { data: TData; response?: undefined }
    | { data?: undefined; response: NextResponse };

type DtfGenerationClaimPayload = {
    claimed?: unknown;
    state?: unknown;
    retry_after_seconds?: unknown;
};

export type DtfGenerationClaimResult = {
    claimed: boolean;
    state: "claimed" | "processing" | "succeeded" | "blocked" | "unavailable";
    retryAfterSeconds: number;
};

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

/**
 * A Bearer token is an explicit authenticated request. If token verification
 * resolves without a user, never silently downgrade that request to guest
 * quota. Missing/expired identity is a 401; actual Clerk runtime failures are
 * classified separately by resolveDesignPieceAccess().
 */
export function rejectUnexpectedGuestAccess(
    request: NextRequest,
    access: DesignPieceAccessResult
) {
    const hasBearerToken = /^Bearer\s+\S+/i.test(request.headers.get("authorization") || "");
    const legacyAuthenticatedHint = request.headers.get(WASHA_AUTH_STATE_HEADER) === "authenticated";
    if ((!hasBearerToken && !legacyAuthenticatedHint) || access.role !== "guest" || access.profileId) {
        return null;
    }

    return NextResponse.json(
        {
            ok: false,
            code: "AUTH_REQUIRED",
            message: "يلزم تسجيل الدخول لإكمال العملية.",
            guest: false,
        },
        {
            status: 401,
            headers: { "Cache-Control": "private, no-store" },
        }
    );
}

export async function requireDtfRouteAccess(options?: {
    allowPublicGeneration?: boolean;
    errorResponder?: ErrorResponder;
}): Promise<AccessResolution> {
    const allowPublicGeneration = options?.allowPublicGeneration === true;
    const respond = options?.errorResponder ?? jsonError;

    const access = await resolveDesignPieceAccess({
        allowPublicAccess: allowPublicGeneration,
    });

    if (access.allowed) {
        return { access };
    }

    const failure = getDesignPieceAccessFailure(access.reason);
    return {
        response: respond(failure.message, failure.status, undefined, access.reason),
    };
}

export async function parseAndValidateDtfJson<TData>(
    request: NextRequest,
    schema: z.ZodType<TData>,
    options: {
        invalidJsonMessage: string;
        fallbackValidationMessage: string;
        errorResponder?: ErrorResponder;
    }
): Promise<ParsedJsonResolution<TData>> {
    const respond = options.errorResponder ?? jsonError;

    let rawBody: unknown;
    try {
        rawBody = await request.json();
    } catch (error) {
        return {
            response: respond(options.invalidJsonMessage, 400, error),
        };
    }

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || options.fallbackValidationMessage;
        return {
            response: respond(errorMsg, 400, parsed.error),
        };
    }

    return { data: parsed.data };
}

export async function enforceDtfRouteRateLimit(
    request: NextRequest,
    access: DesignPieceAccessResult,
    options: {
        keyPrefix: string;
        limit: number;
        windowMs: number;
        message: string;
    }
) {
    if (access.role && DTF_PRIVILEGED_ROLES.has(access.role)) {
        return null;
    }

    const identifier = access.profileId || getRequestClientIdentifier(request);
    const limits = await checkRateLimit(`${options.keyPrefix}-${identifier}`, options.limit, options.windowMs);

    if (limits.success) {
        return null;
    }

    return NextResponse.json(
        { error: options.message },
        {
            status: 429,
            headers: {
                "X-RateLimit-Reset": new Date(limits.resetAt).toISOString(),
            },
        }
    );
}

export async function claimDtfGenerationRequest(
    profileId: string,
    requestId: string,
    operation = "generate-mockup",
    leaseSeconds = 5 * 60
): Promise<DtfGenerationClaimResult> {
    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase.rpc("claim_dtf_generation_request", {
            p_profile_id: profileId,
            p_operation: operation,
            p_request_id: requestId,
            p_lease_seconds: leaseSeconds,
            p_retention_seconds: 24 * 60 * 60,
        });

        if (error) {
            console.error("[dtf-generation-idempotency] claim failed", {
                errorCode: error.code ?? null,
            });
            return { claimed: false, state: "unavailable", retryAfterSeconds: 0 };
        }

        const payload = data as DtfGenerationClaimPayload | null;
        const state = payload?.state;
        if (
            typeof payload?.claimed !== "boolean"
            || (state !== "claimed" && state !== "processing" && state !== "succeeded" && state !== "blocked")
        ) {
            console.error("[dtf-generation-idempotency] invalid claim payload");
            return { claimed: false, state: "unavailable", retryAfterSeconds: 0 };
        }

        return {
            claimed: payload.claimed,
            state,
            retryAfterSeconds: typeof payload.retry_after_seconds === "number"
                ? Math.max(Math.round(payload.retry_after_seconds), 0)
                : 0,
        };
    } catch (error) {
        console.error("[dtf-generation-idempotency] unexpected claim failure", {
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return { claimed: false, state: "unavailable", retryAfterSeconds: 0 };
    }
}

export async function completeDtfGenerationRequest(
    profileId: string,
    requestId: string,
    operation = "generate-mockup"
) {
    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase.rpc("complete_dtf_generation_request", {
            p_profile_id: profileId,
            p_operation: operation,
            p_request_id: requestId,
            p_retention_seconds: 24 * 60 * 60,
        });

        if (error) {
            console.error("[dtf-generation-idempotency] completion failed", {
                errorCode: error.code ?? null,
            });
            return false;
        }
        return data === true;
    } catch (error) {
        console.error("[dtf-generation-idempotency] unexpected completion failure", {
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return false;
    }
}

export async function failDtfGenerationRequest(
    profileId: string,
    requestId: string,
    options: {
        operation?: string;
        blockRetry?: boolean;
    } = {}
) {
    try {
        const supabase = getSupabaseAdminClient();
        const { data, error } = await supabase.rpc("fail_dtf_generation_request", {
            p_profile_id: profileId,
            p_operation: options.operation ?? "generate-mockup",
            p_request_id: requestId,
            p_block_retry: options.blockRetry === true,
            p_retention_seconds: 24 * 60 * 60,
        });

        if (error) {
            console.error("[dtf-generation-idempotency] failure state update failed", {
                errorCode: error.code ?? null,
            });
            return false;
        }
        return data === true;
    } catch (error) {
        console.error("[dtf-generation-idempotency] unexpected failure state update", {
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return false;
    }
}
