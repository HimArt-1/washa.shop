import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    getDesignPieceAccessFailure,
    resolveDesignPieceAccess,
    type DesignPieceAccessResult,
} from "@/lib/design-piece-access";
import { resolveDesignPieceApiState } from "@/lib/design-piece-runtime";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestClientIdentifier } from "@/lib/request-client";

const DTF_PRIVILEGED_ROLES = new Set(["admin", "wushsha", "dev"]);

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

export async function requireDtfRouteAccess(options?: {
    allowPublicGeneration?: boolean;
    errorResponder?: ErrorResponder;
}): Promise<AccessResolution> {
    const allowPublicGeneration = options?.allowPublicGeneration === true;
    const respond = options?.errorResponder ?? jsonError;

    const access = allowPublicGeneration
        ? (await resolveDesignPieceApiState()).access
        : await resolveDesignPieceAccess();

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
