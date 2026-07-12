import { createHash } from "crypto";
import type { NextRequest } from "next/server";

function firstHeaderIp(value: string | null) {
    return value?.split(",")[0]?.trim() || null;
}

function legacyRequestIp(request: NextRequest) {
    return (request as NextRequest & { ip?: string | null }).ip || null;
}

export function getRequestClientIdentifier(request: NextRequest) {
    // Prefer headers written by the hosting edge over the user-controllable
    // x-forwarded-for header. The latter remains a local/self-hosted fallback.
    const ip =
        firstHeaderIp(request.headers.get("x-vercel-forwarded-for")) ||
        request.headers.get("cf-connecting-ip") ||
        legacyRequestIp(request) ||
        request.headers.get("x-real-ip") ||
        firstHeaderIp(request.headers.get("x-forwarded-for")) ||
        null;

    const userAgent = request.headers.get("user-agent") || "unknown-agent";
    const language = request.headers.get("accept-language") || "unknown-language";
    const fingerprint = createHash("sha256")
        .update(ip ? `ip:${ip}` : `fallback:${userAgent}|${language}`)
        .digest("hex")
        .slice(0, 24);

    return `client-${fingerprint}`;
}
