import { NextRequest, NextResponse } from "next/server";

export function resolveDtfTraceId(request: NextRequest) {
    return request.headers.get("x-trace-id")
        || request.headers.get("x-request-id")
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
            trace_id: traceId,
            event,
            ...(details || {}),
        })
    );
}

export function attachDtfTraceId(response: NextResponse, traceId: string) {
    response.headers.set("X-Trace-Id", traceId);
    return response;
}
