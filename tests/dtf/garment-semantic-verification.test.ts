import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
}));

import { verifyBlankGarmentSemantics } from "@/lib/washa-artwork/garment-semantic-verification";

describe("blank garment semantic verification", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        mockGenerateContent.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("accepts only a blank exact-color side-specific garment with a clear print area", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            choices: [{
                message: {
                    content: JSON.stringify({
                        isBlank: true,
                        matchesGarmentType: true,
                        matchesColor: true,
                        matchesSide: true,
                        printAreaClear: true,
                        printArea: { x: 0.3, y: 0.22, width: 0.4, height: 0.46 },
                    }),
                },
            }],
        }), { status: 200 })));

        await expect(verifyBlankGarmentSemantics({
            garmentPng: Buffer.from("png"),
            garmentType: "تيشيرت",
            colorName: "أسود",
            colorHex: "#111111",
            side: "back",
        })).resolves.toMatchObject({
            verified: true,
            isBlank: true,
            matchesSide: true,
        });
    });

    it("rejects a garment containing a logo or the wrong view", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            choices: [{
                message: {
                    content: JSON.stringify({
                        isBlank: false,
                        matchesGarmentType: true,
                        matchesColor: true,
                        matchesSide: false,
                        printAreaClear: true,
                        printArea: { x: 0.3, y: 0.22, width: 0.4, height: 0.46 },
                    }),
                },
            }],
        }), { status: 200 })));

        await expect(verifyBlankGarmentSemantics({
            garmentPng: Buffer.from("png"),
            garmentType: "تيشيرت",
            colorName: "أسود",
            colorHex: "#111111",
            side: "back",
        })).rejects.toThrow("not a verified blank");
    });

    it("uses Gemini and never calls OpenAI when Gemini is selected and fallback is false", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "genai");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-3-pro-image");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", "false");
        vi.stubEnv("GEMINI_API_KEY", "configured-gemini-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                isBlank: true,
                matchesGarmentType: true,
                matchesColor: true,
                matchesSide: true,
                printAreaClear: true,
                printArea: { x: 0.3, y: 0.22, width: 0.4, height: 0.46 },
            }),
        });

        await expect(verifyBlankGarmentSemantics({
            garmentPng: Buffer.from("png"),
            garmentType: "تيشيرت",
            colorName: "أسود",
            colorHex: "#111111",
            side: "back",
        })).resolves.toMatchObject({
            verified: true,
            model: "gemini-3-pro-image",
        });

        expect(mockGenerateContent).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
