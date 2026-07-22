import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const { mockGenerateContent } = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
}));

vi.mock("@/lib/admin-operational-alerts", () => ({
    reportAdminOperationalAlert: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
    extractGeneratedImageDataUrl: (response: any) => {
        const part = response?.candidates?.[0]?.content?.parts?.find(
            (candidate: any) => candidate?.inlineData?.data
        );
        return part?.inlineData?.data
            ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            : null;
    },
}));

async function artworkPng(backgroundAlpha: number) {
    return sharp({
        create: {
            width: 96,
            height: 96,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: backgroundAlpha },
        },
    })
        .composite([{
            input: Buffer.from(
                '<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" fill="#B97843"/></svg>'
            ),
            left: 24,
            top: 24,
        }])
        .png()
        .toBuffer();
}

async function garmentPng() {
    return sharp({
        create: {
            width: 160,
            height: 200,
            channels: 4,
            background: { r: 34, g: 39, b: 37, alpha: 1 },
        },
    }).png().toBuffer();
}

async function garmentPngWithSize(width: number, height: number) {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 34, g: 39, b: 37, alpha: 1 },
        },
    }).png().toBuffer();
}

async function compositedMockupPng(garment: Buffer, artwork: Buffer) {
    const overlay = await sharp(artwork).resize(72, 72, { fit: "contain" }).png().toBuffer();
    return sharp(garment).composite([{ input: overlay, left: 44, top: 64 }]).png().toBuffer();
}

function verifiedMockupResponse(overrides: Record<string, unknown> = {}) {
    return {
        pass: true,
        artworkVisible: true,
        artworkIdentityPreserved: true,
        textPreserved: true,
        garmentIdentityPreserved: true,
        placementPlausible: true,
        framingPreserved: true,
        issues: [],
        ...overrides,
    };
}

describe("WASHA AI Prompt Native pipeline", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv("OPENAI_API_KEY", "openai-test-key");
        vi.stubEnv("GEMINI_API_KEY", "gemini-test-key");
        vi.stubEnv("WASHA_DTF_GENERATION_ENABLED", "true");
        vi.stubEnv("WASHA_DTF_MIN_ARTWORK_DIMENSION", "64");
        vi.stubEnv("WASHA_PROMPT_NATIVE_OPENAI_MODEL", "gpt-image-1.5");
        vi.stubEnv("WASHA_PROMPT_NATIVE_GEMINI_MODEL", "gemini-3.1-flash-image");
        mockGenerateContent.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("requests a native transparent PNG from the pinned OpenAI artwork model", async () => {
        const transparent = await artworkPng(0);
        const bodies: Array<Record<string, unknown>> = [];
        vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
            bodies.push(JSON.parse(String(init?.body)));
            return new Response(JSON.stringify({
                data: [{ b64_json: transparent.toString("base64") }],
            }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }));

        const { generatePromptNativeArtwork } = await import(
            "@/lib/washa-prompt-native/openai-artwork.adapter"
        );
        const result = await generatePromptNativeArtwork({
            prompt: "صقر عربي هندسي",
            traceId: "prompt-native-test",
        });

        expect(bodies[0]).toMatchObject({
            model: "gpt-image-1.5",
            n: 1,
            size: "1024x1536",
            quality: "high",
            output_format: "png",
            background: "transparent",
        });
        expect(String(bodies[0]?.prompt)).toContain("real alpha channel");
        expect(result.provider).toBe("openai");
        expect(result.model).toBe("gpt-image-1.5");
        expect(result.validation.valid).toBe(true);
        expect(result.normalization.backgroundRemovalApplied).toBe(false);
        expect(result.buffer.equals(transparent)).toBe(true);
    });

    it("regenerates once instead of removing an opaque background", async () => {
        const opaque = await artworkPng(1);
        const transparent = await artworkPng(0);
        const bodies: Array<Record<string, unknown>> = [];
        vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
            bodies.push(JSON.parse(String(init?.body)));
            const image = bodies.length === 1 ? opaque : transparent;
            return new Response(JSON.stringify({
                data: [{ b64_json: image.toString("base64") }],
            }), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }));

        const { generatePromptNativeArtwork } = await import(
            "@/lib/washa-prompt-native/openai-artwork.adapter"
        );
        const result = await generatePromptNativeArtwork({
            prompt: "زخرفة نجدية متوازنة",
            traceId: "prompt-native-retry",
        });

        expect(bodies).toHaveLength(2);
        expect(String(bodies[1].prompt)).toContain("previous attempt failed alpha validation");
        expect(result.attempt).toBe(2);
        expect(result.validation.valid).toBe(true);
        expect(result.normalization.backgroundRemovalApplied).toBe(false);
    });

    it("gives Gemini the selected mockup, immutable artwork, and deterministic placement guide", async () => {
        const garment = await garmentPng();
        const artwork = await artworkPng(0);
        const generated = await compositedMockupPng(garment, artwork);
        const requests: any[] = [];
        mockGenerateContent.mockImplementation(async (input: any) => {
            requests.push(input);
            if (requests.length === 2) {
                return { text: JSON.stringify(verifiedMockupResponse()) };
            }
            return {
                candidates: [{
                    content: {
                        parts: [{
                            inlineData: {
                                mimeType: "image/png",
                                data: generated.toString("base64"),
                            },
                        }],
                    },
                }],
            };
        });

        const { composePromptNativeMockup } = await import(
            "@/lib/washa-prompt-native/gemini-mockup.adapter"
        );
        const result = await composePromptNativeMockup({
            garmentBase: garment,
            masterArtwork: artwork,
            placementGuide: generated,
            printArea: { x: 0.28, y: 0.2, width: 0.44, height: 0.5 },
            placement: {
                side: "front",
                x: 0.5,
                y: 0.48,
                scale: 0.82,
                rotation: 0,
                printWidthCm: 28,
                printHeightCm: 34,
                anchorX: 0.5,
                anchorY: 0.5,
                referenceMockupId: "mockup-1",
                printAreaId: "front_main",
                transformVersion: 1,
            },
            traceId: "prompt-native-mockup",
        });

        expect(requests).toHaveLength(2);
        expect(requests[0].model).toBe("gemini-3.1-flash-image");
        const parts = requests[0].contents.parts;
        expect(parts[0].text).toContain("REFERENCE IMAGE A");
        expect(parts[1].inlineData.data).toBe(garment.toString("base64"));
        expect(parts[2].text).toContain("REFERENCE IMAGE B");
        expect(parts[3].inlineData.data).toBe(artwork.toString("base64"));
        expect(parts[4].text).toContain("REFERENCE IMAGE C");
        expect(parts[5].inlineData.data).toBe(generated.toString("base64"));
        expect(parts[6].text).toContain("immutable print artwork");
        expect(parts[6].text).toContain("0.28");
        expect(requests[1].contents.parts).toHaveLength(9);
        expect(result.mimeType).toBe("image/webp");
        expect(result.transformationMetadata).toMatchObject({
            pipeline: "prompt_native",
            previewProvider: "gemini",
            artworkMutationAllowed: false,
            verification: { pass: true, artworkIdentityPreserved: true },
        });
    });

    it("rejects a readable Gemini image when the artwork identity gate fails", async () => {
        const garment = await garmentPng();
        const artwork = await artworkPng(0);
        mockGenerateContent
            .mockResolvedValueOnce({
                candidates: [{ content: { parts: [{ inlineData: {
                    mimeType: "image/png",
                    data: garment.toString("base64"),
                } }] } }],
            })
            .mockResolvedValueOnce({
                text: JSON.stringify(verifiedMockupResponse({
                    pass: false,
                    artworkVisible: false,
                    artworkIdentityPreserved: false,
                    issues: ["Artwork is absent from the garment."],
                })),
            });

        const { composePromptNativeMockup } = await import(
            "@/lib/washa-prompt-native/gemini-mockup.adapter"
        );
        await expect(composePromptNativeMockup({
            garmentBase: garment,
            masterArtwork: artwork,
            placementGuide: garment,
            printArea: { x: 0.28, y: 0.2, width: 0.44, height: 0.5 },
            placement: {
                side: "front", x: 0.5, y: 0.5, scale: 0.8, rotation: 0,
                printWidthCm: 28, printHeightCm: 34, anchorX: 0.5, anchorY: 0.5,
                referenceMockupId: "mockup-1", printAreaId: "front_main", transformVersion: 1,
            },
            traceId: "prompt-native-mockup-rejected",
        })).rejects.toThrow("identity verification");
    });

    it("rejects an impossible placement before calling Gemini", async () => {
        const garment = await garmentPng();
        const artwork = await artworkPng(0);
        const { composePromptNativeMockup } = await import(
            "@/lib/washa-prompt-native/gemini-mockup.adapter"
        );

        await expect(composePromptNativeMockup({
            garmentBase: garment,
            masterArtwork: artwork,
            placementGuide: garment,
            printArea: { x: 0.28, y: 0.2, width: 0.44, height: 0.5 },
            placement: {
                side: "front", x: 0.95, y: 0.5, scale: 1, rotation: 0,
                printWidthCm: 28, printHeightCm: 34, anchorX: 0.5, anchorY: 0.5,
                referenceMockupId: "mockup-1", printAreaId: "front_main", transformVersion: 1,
            },
            traceId: "prompt-native-placement-rejected",
        })).rejects.toMatchObject({ code: "ARTWORK_PLACEMENT_INVALID" });
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("requires both Prompt Native providers before starting the pipeline", async () => {
        const { getPromptNativeReadiness } = await import(
            "@/lib/washa-prompt-native/readiness"
        );
        expect(getPromptNativeReadiness()).toMatchObject({ ready: true });

        vi.stubEnv("GEMINI_API_KEY", "");
        expect(getPromptNativeReadiness()).toMatchObject({
            ready: false,
            missing: ["GEMINI_API_KEY"],
        });
    });

    it("rejects model overrides that break the approved transparency contract", async () => {
        vi.stubEnv("WASHA_PROMPT_NATIVE_OPENAI_MODEL", "gpt-image-2");
        const { getPromptNativeReadiness } = await import(
            "@/lib/washa-prompt-native/readiness"
        );
        expect(getPromptNativeReadiness()).toMatchObject({
            ready: false,
            code: "model_not_supported",
            incompatibleModels: [{
                stage: "artwork",
                configured: "gpt-image-2",
                required: "gpt-image-1.5",
            }],
        });
    });

    it("selects the nearest supported Gemini ratio without forcing portrait mockups to 4:5", async () => {
        const { resolvePromptNativeAspectRatio } = await import(
            "@/lib/washa-prompt-native/gemini-mockup.adapter"
        );

        expect(resolvePromptNativeAspectRatio(1200, 1800)).toBe("2:3");
        expect(resolvePromptNativeAspectRatio(1080, 1920)).toBe("9:16");
        expect(resolvePromptNativeAspectRatio(1600, 900)).toBe("16:9");
    });

    it("restores an arbitrary catalog mockup to its exact source crop and dimensions", async () => {
        const garment = await garmentPngWithSize(137, 200);
        const artwork = await artworkPng(0);
        const generatedAtSupportedRatio = await garmentPngWithSize(200, 300);
        const requests: any[] = [];
        mockGenerateContent.mockImplementation(async (input: any) => {
            requests.push(input);
            if (requests.length === 2) {
                return { text: JSON.stringify(verifiedMockupResponse()) };
            }
            return {
                candidates: [{ content: { parts: [{ inlineData: {
                    mimeType: "image/png",
                    data: generatedAtSupportedRatio.toString("base64"),
                } }] } }],
            };
        });

        const { composePromptNativeMockup } = await import(
            "@/lib/washa-prompt-native/gemini-mockup.adapter"
        );
        const result = await composePromptNativeMockup({
            garmentBase: garment,
            masterArtwork: artwork,
            placementGuide: garment,
            printArea: { x: 0.28, y: 0.2, width: 0.44, height: 0.5 },
            placement: {
                side: "front", x: 0.5, y: 0.5, scale: 0.8, rotation: 0,
                printWidthCm: 28, printHeightCm: 34, anchorX: 0.5, anchorY: 0.5,
                referenceMockupId: "mockup-ratio", printAreaId: "front_main", transformVersion: 1,
            },
            traceId: "prompt-native-ratio-restore",
        });

        expect(requests[0].config.imageConfig.aspectRatio).toBe("2:3");
        expect(result).toMatchObject({ width: 137, height: 200 });
        expect(result.transformationMetadata.framing).toMatchObject({
            sourceWidth: 137,
            sourceHeight: 200,
            generationCanvasWidth: 137,
            generationCanvasHeight: 206,
            restoredToSourceDimensions: true,
        });
    });
});
