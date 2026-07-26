import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy } from "@/lib/content-security-policy";

describe("document content security policy", () => {
    it("allows only nonce-bearing inline scripts on the main application", () => {
        const policy = createContentSecurityPolicy({
            nonce: "request-nonce",
        });
        const scriptDirective = policy
            .split("; ")
            .find((directive) => directive.startsWith("script-src"));

        expect(scriptDirective).toContain("'nonce-request-nonce'");
        expect(scriptDirective).not.toContain("'unsafe-inline'");
        expect(scriptDirective).toContain("https://clerk.washa.shop");
        expect(policy).toContain("object-src 'none'");
        expect(policy).toContain("frame-ancestors 'none'");
    });

    it("relaxes inline scripts only for the legacy WASHA AI development shells", () => {
        const policy = createContentSecurityPolicy({
            nonce: "request-nonce",
            allowInlineScripts: true,
        });
        const scriptDirective = policy
            .split("; ")
            .find((directive) => directive.startsWith("script-src"));

        expect(scriptDirective).toContain("'unsafe-inline'");
        expect(scriptDirective).not.toContain("'nonce-request-nonce'");
    });

    it("suppresses hydration comparison for browser-hidden nonce attributes", () => {
        const layoutSource = readFileSync(resolve("src/app/layout.tsx"), "utf8");
        const nonceScriptTags = (layoutSource.match(/<script[\s\S]*?>/g) ?? [])
            .filter((tag) => tag.includes("nonce={nonce}"));

        expect(nonceScriptTags).toHaveLength(4);
        for (const tag of nonceScriptTags) {
            expect(tag).toContain("suppressHydrationWarning");
        }
    });
});
