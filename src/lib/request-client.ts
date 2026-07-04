import { createHash } from "crypto";
import type { NextRequest } from "next/server";

function firstHeaderIp(value: string | null) {
    return value?.split(",")[0]?.trim() || null;
}

function legacyRequestIp(request: NextRequest) {
    return (request as NextRequest & { ip?: string | null }).ip || null;
}

export function getRequestClientIdentifier(request: NextRequest) {
    const ip =
        firstHeaderIp(request.headers.get("x-forwarded-for")) ||
        firstHeaderIp(request.headers.get("x-vercel-forwarded-for")) ||
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-real-ip") ||
        legacyRequestIp(request) ||
        null;

    if (ip) {
        return ip;
    }

    const userAgent = request.headers.get("user-agent") || "unknown-agent";
    const language = request.headers.get("accept-language") || "unknown-language";
    const fingerprint = createHash("sha256")
        .update(`${userAgent}|${language}`)
        .digest("hex")
        .slice(0, 16);

    return `anon-${fingerprint}`;
}
