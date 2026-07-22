import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/washa-ai-dev-access", () => ({
    createWashaAiDevGenerationMetaTags: () => [],
    ensureWashaAiDevSurfaceAccess: vi.fn().mockResolvedValue(null),
    WASHA_AI_DEV_SIGNATURE_META_NAME: "washa-ai-dev-signature",
}));

import { GET as getDev } from "@/app/(immersive)/design/washa-ai/dev/[[...path]]/route";
import { GET as getDevV2 } from "@/app/(immersive)/design/washa-ai/dev-v2/[[...path]]/route";
import { GET as getDevV3 } from "@/app/(immersive)/design/washa-ai/dev-v3/[[...path]]/route";

describe("WASHA AI dev manifest", () => {
    it.each([
        ["dev", getDev],
        ["dev-v2", getDevV2],
        ["dev-v3", getDevV3],
    ] as const)("loads the protected %s manifest with the current same-origin session", async (surface, handler) => {
        const response = await handler(
            new NextRequest(`http://localhost/design/washa-ai/${surface}`),
            { params: Promise.resolve({ path: [] }) }
        );
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(html).toContain(
            `<link rel="manifest" href="/design/washa-ai/${surface}/manifest.webmanifest" crossorigin="use-credentials" />`
        );
    });
});
