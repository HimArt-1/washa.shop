import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getDesignPieceAccessFailure,
    resolveDesignPieceAccess,
    type DesignPieceAccessResult,
} from "@/lib/design-piece-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIdentifier } from "@/lib/request-client";

const DTF_PRIVILEGED_ROLES = new Set(["admin", "wushsha", "dev"]);
export const WASHA_AUTH_STATE_HEADER = "x-washa-auth-state";

type ErrorResponder = (message: string, status: number, logContext?: unknown) => NextResponse;

type AccessResolution =
    | { access: DesignPieceAccessResult; response?: undefined }
    | { access?: undefined; response: NextResponse };

type ParsedJsonResolution<TData> =
    | { data: TData; response?: undefined }
    | { data?: undefined; response: NextResponse };

function jsonError(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

/**
 * The studio checks its Clerk session immediately before generation. If a
 * following API request is momentarily resolved as public, never silently
 * downgrade it to the guest quota: that can display a false sign-in gate and
 * charge the wrong bucket. The hint grants no access; it only fails closed.
 */
export function rejectUnexpectedGuestAccess(
    request: NextRequest,
    access: DesignPieceAccessResult
) {
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionCookie = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/)?.[1]?.trim();
    const clientUpdatedAt = Number(cookieHeader.match(/(?:^|;\s*)__client_uat=([^;]+)/)?.[1] || 0);
    const hasClerkSessionEvidence = Boolean(sessionCookie) || clientUpdatedAt > 0;
    const expectedAuthenticated = request.headers.get(WASHA_AUTH_STATE_HEADER) === "authenticated"
        || hasClerkSessionEvidence;
    if (!expectedAuthenticated || access.role !== "guest" || access.profileId) return null;

    return NextResponse.json(
        {
            error: "تعذّر تثبيت جلسة الدخول مؤقتاً. سنحاول مجدداً دون احتساب حصة.",
            code: "session_unavailable",
            retryable: true,
            guest: false,
        },
        {
            status: 503,
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
        response: respond(failure.message, failure.status),
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
