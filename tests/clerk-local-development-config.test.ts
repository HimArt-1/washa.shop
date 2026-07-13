import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";

const require = createRequire(import.meta.url);
const createNextConfig = require("../next.config.js") as (phase: string) => {
    webpack: (config: { resolve?: { alias?: Record<string, string> } }) => {
        resolve?: { alias?: Record<string, string> };
    };
};

const originalPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const originalBypass = process.env.DEV_AUTH_BYPASS;

afterEach(() => {
    if (originalPublishableKey === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalPublishableKey;

    if (originalBypass === undefined) delete process.env.DEV_AUTH_BYPASS;
    else process.env.DEV_AUTH_BYPASS = originalBypass;
});

function clerkClientAlias(phase: string) {
    const config = createNextConfig(phase);
    const webpackConfig = config.webpack({ resolve: { alias: {} } });
    return webpackConfig.resolve?.alias?.["@clerk/nextjs$"];
}

describe("local Clerk client configuration", () => {
    it("automatically uses the local client mock when next dev receives a production key", () => {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_example";
        process.env.DEV_AUTH_BYPASS = "false";

        expect(clerkClientAlias(PHASE_DEVELOPMENT_SERVER)).toBe(
            path.resolve(process.cwd(), "src/lib/clerk-dev/client.tsx")
        );
    });

    it("does not replace Clerk in a production build", () => {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_example";
        process.env.DEV_AUTH_BYPASS = "false";

        expect(clerkClientAlias(PHASE_PRODUCTION_BUILD)).toBeUndefined();
    });
});
