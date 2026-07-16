import { NextRequest, NextResponse } from "next/server";

function normalizeDtfRequestId(value: string | null) {
    const normalized = value?.trim() || "";
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(normalized)) return null;
    return normalized;
}

export function resolveDtfTraceId(request: NextRequest) {
    return normalizeDtfRequestId(request.headers.get("x-request-id"))
        || normalizeDtfRequestId(request.headers.get("x-trace-id"))
        || crypto.randomUUID();
}

export function logDtfTrace(
    scope: string,
    traceId: string,
    event: string,
    details?: Record<string, unknown>
) {
    console.info(
        JSON.stringify({
            scope,
            route: scope,
            trace_id: traceId,
            requestId: traceId,
            event,
            stage: event,
            ...(details || {}),
        })
    );
}

export function attachDtfTraceId(response: NextResponse, traceId: string) {
    response.headers.set("X-Trace-Id", traceId);
    response.headers.set("X-Request-Id", traceId);
    return response;
}
