import { describe, expect, it, vi } from "vitest";
import {
    unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";

vi.mock("@clerk/nextjs/server", () => ({
    clerkMiddleware: vi.fn((handler) => handler),
    createRouteMatcher: vi.fn(() => () => false),
}));

describe("WASHA AI dev PWA proxy coverage", () => {
    it.each([
        "/design/washa-ai/dev/manifest.webmanifest",
        "/design/washa-ai/dev/sw.js",
        "/design/washa-ai/dev-v2/manifest.webmanifest",
        "/design/washa-ai/dev-v2/sw.js",
    ])("runs Clerk proxy for the auth-aware dev asset %s", async (url) => {
        const { config } = await import("@/proxy");

        expect(unstable_doesMiddlewareMatch({
            config,
            url,
        })).toBe(true);
    });

    it("continues to bypass unrelated public static files", async () => {
        const { config } = await import("@/proxy");

        expect(unstable_doesMiddlewareMatch({
            config,
            url: "/icon-192.png",
        })).toBe(false);
    });
});
