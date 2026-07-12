import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { getRequestClientIdentifier } from "@/lib/request-client";

function request(headers: Record<string, string>) {
    return new Request("https://washa.example/api/generate", { headers }) as NextRequest;
}

describe("guest generation client identifier", () => {
    it("prefers the hosting edge address over a spoofed forwarded address", () => {
        const trustedHeaders = {
            "x-vercel-forwarded-for": "203.0.113.42",
            "user-agent": "WashaBrowser/1",
            "accept-language": "ar-SA",
        };

        const first = getRequestClientIdentifier(request({ ...trustedHeaders, "x-forwarded-for": "198.51.100.1" }));
        const second = getRequestClientIdentifier(request({ ...trustedHeaders, "x-forwarded-for": "198.51.100.99" }));

        expect(first).toBe(second);
        expect(first).toMatch(/^client-[a-f0-9]{24}$/);
    });

    it("does not allow user-agent rotation to reset a trusted network quota", () => {
        const base = {
            "x-vercel-forwarded-for": "203.0.113.42",
            "accept-language": "ar-SA",
        };

        expect(getRequestClientIdentifier(request({ ...base, "user-agent": "Mobile-A" }))).toBe(
            getRequestClientIdentifier(request({ ...base, "user-agent": "Mobile-B" }))
        );
    });
});
