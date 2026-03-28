import { NextResponse } from "next/server";

export function respondWithError(message: string, status = 500, logContext?: unknown) {
    const source = "[DTF-Studio-API]";
    if (status >= 500) {
        console.error(`${source} ${message}`, logContext ?? "");
    } else {
        console.warn(`${source} ${message}`, logContext ?? "");
    }

    return NextResponse.json({ error: message }, { status });
}

export function logDiagnosticWarning(context: string, error: unknown) {
    const message = error instanceof Error ? error.message : error;
    console.warn(`[DTF-Studio-API] [${context}]`, message);
}
