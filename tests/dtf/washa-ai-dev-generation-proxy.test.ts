import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockGenerateMockup } = vi.hoisted(() => ({
    mockGenerateMockup: vi.fn(),
}));

vi.mock("@/app/api/washa-dtf-studio/generate-mockup/route", () => ({
    POST: mockGenerateMockup,
}));

import { POST } from "@/app/api/washa-dtf-studio/dev-generation/[surface]/route";
import { createWashaAiDevGenerationHeaders } from "@/lib/washa-ai-dev-access";

describe("WASHA AI isolated dev generation endpoint", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("WASHA_AI_DEV_SURFACE_SECRET", "test-dev-surface-secret");
        mockGenerateMockup.mockImplementation(async (request: NextRequest) => NextResponse.json({
            url: request.url,
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.text(),
        }));
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it.each(["dev", "dev-v2", "dev-v3"] as const)(
        "forwards %s through the primary-only server identity",
        async (surface) => {
            const request = new NextRequest(
                `https://washa.shop/api/washa-dtf-studio/dev-generation/${surface}`,
                {
                    method: "POST",
                    headers: {
                        authorization: "Bearer session-token",
                        "content-type": "application/json",
                        referer: "https://attacker.example/forged",
                        "x-washa-ai-dev-signature": "forged",
                        "x-washa-ai-dev-surface": "forged",
                    },
                    body: JSON.stringify({ prompt: "legacy request" }),
                }
            );

            const response = await POST(request, {
                params: Promise.resolve({ surface }),
            });
            const result = await response.json();

            expect(response.status).toBe(200);
            expect(mockGenerateMockup).toHaveBeenCalledOnce();
            expect(result.url).toBe("https://washa.shop/api/washa-dtf-studio/generate-mockup");
            expect(result.headers).toMatchObject({
                authorization: "Bearer session-token",
                referer: `https://washa.shop/design/washa-ai/${surface}`,
                ...createWashaAiDevGenerationHeaders(surface),
            });
            expect(result.body).toBe(JSON.stringify({ prompt: "legacy request" }));
        }
    );

    it("rejects unknown surfaces before forwarding", async () => {
        const response = await POST(new NextRequest(
            "https://washa.shop/api/washa-dtf-studio/dev-generation/dev-v4",
            { method: "POST", body: "{}" }
        ), {
            params: Promise.resolve({ surface: "dev-v4" }),
        });

        expect(response.status).toBe(404);
        expect(mockGenerateMockup).not.toHaveBeenCalled();
    });
});
