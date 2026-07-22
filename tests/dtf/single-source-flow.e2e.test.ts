import { afterEach, describe, expect, it, vi } from "vitest";
import {
    generateMockup,
    isBoardPreviewResult,
    recomposeMockup,
} from "../../washa-dtf-studio/src/services/geminiService";

const masterIdentity = {
    designRequestId: "11111111-1111-4111-8111-111111111111",
    masterAssetId: "22222222-2222-4222-8222-222222222222",
    masterAssetUrl: "https://washa.shop/api/washa-dtf-studio/assets/master/22222222-2222-4222-8222-222222222222",
    masterChecksum: "a".repeat(64),
};

function response(previewUrl: string, scale: number) {
    return {
        imageUrl: previewUrl,
        previewUrl,
        frontPreviewUrl: previewUrl,
        backPreviewUrl: null,
        ...masterIdentity,
        mockupSourceType: "reference",
        placement: {
            side: "front",
            x: 0.5,
            y: 0.5,
            scale,
            rotation: 0,
            printWidthCm: 30 * scale,
            printHeightCm: 40 * scale,
            anchorX: 0.5,
            anchorY: 0.5,
            referenceMockupId: "33333333-3333-4333-8333-333333333333",
            printAreaId: "front_default",
            transformVersion: 1,
        },
        transparencyVerificationStatus: "verified",
        productionReadinessStatus: "ready",
        provider: "genai",
        model: "gemini-3-pro-image",
    };
}

describe("WASHA AI single-source browser flow (E2E contract)", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("generates once, then changes placement through deterministic recompositing with the same master", async () => {
        const requests: Array<{ url: string; body: any }> = [];
        vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body));
            requests.push({ url, body });
            const payload = url.endsWith("/recompose-preview")
                ? response("https://washa.shop/assets/preview-v2.webp", 0.6)
                : response("https://washa.shop/assets/preview-v1.webp", 1);
            return new Response(JSON.stringify(payload), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }));

        const generated = await generateMockup(
            "تيشيرت",
            "أسود",
            "وشّى",
            "DTF",
            "هندسي",
            "ذهبي",
            undefined,
            undefined,
            undefined,
            {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                printPosition: "chest",
                printSize: "large",
                printScale: 100,
                sessionToken: "session-token",
                requestId: "generation-request",
            }
        );
        expect(generated).not.toBeNull();
        expect(isBoardPreviewResult(generated)).toBe(false);
        if (!generated || isBoardPreviewResult(generated)) {
            throw new Error("Primary single-source generation returned a board preview");
        }
        const recomposed = await recomposeMockup(
            generated,
            "تيشيرت",
            "أسود",
            "DTF",
            "هندسي",
            "ذهبي",
            undefined,
            {
                garmentId: "44444444-4444-4444-8444-444444444444",
                colorId: "55555555-5555-4555-8555-555555555555",
                printPosition: "chest",
                printSize: "large",
                printScale: 60,
                sessionToken: "session-token",
            }
        );

        expect(requests.map((request) => request.url)).toEqual([
            "/api/washa-dtf-studio/generate-mockup",
            "/api/washa-dtf-studio/recompose-preview",
        ]);
        expect(requests[1].body).toMatchObject({
            designRequestId: masterIdentity.designRequestId,
            masterAssetId: masterIdentity.masterAssetId,
        });
        expect(requests[1].body).not.toHaveProperty("prompt");
        expect(recomposed.masterAssetId).toBe(generated.masterAssetId);
        expect(recomposed.masterChecksum).toBe(generated.masterChecksum);
        expect(recomposed.previewUrl).not.toBe(generated.previewUrl);
    });
});
