import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
}));

import { verifyExactArabicText } from "@/lib/washa-artwork/arabic-text-verification";

describe("Arabic artwork text verification", () => {
    beforeEach(() => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        mockGenerateContent.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("accepts only an exact character-for-character OCR match", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            choices: [{
                message: {
                    content: JSON.stringify({
                        matches: true,
                        observedText: "وشّى كما هي",
                    }),
                },
            }],
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        })));

        await expect(verifyExactArabicText({
            artworkPng: Buffer.from("png"),
            expectedText: "وشّى كما هي",
        })).resolves.toMatchObject({
            required: true,
            verified: true,
            observedText: "وشّى كما هي",
        });
    });

    it("rejects an Arabic rendering that was rewritten by the image model", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            choices: [{
                message: {
                    content: JSON.stringify({
                        matches: false,
                        observedText: "وشا كما هي",
                    }),
                },
            }],
        }), { status: 200 })));

        await expect(verifyExactArabicText({
            artworkPng: Buffer.from("png"),
            expectedText: "وشّى كما هي",
        })).rejects.toThrow("does not preserve");
    });

    it("uses Gemini and never calls OpenAI when Gemini is selected and fallback is false", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "gemini");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-3-pro-image");
        vi.stubEnv("WASHA_DTF_PROVIDER_FALLBACK", " FALSE ");
        vi.stubEnv("GEMINI_API_KEY", "configured-gemini-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                matches: true,
                observedText: "وشّى كما هي",
            }),
        });

        await expect(verifyExactArabicText({
            artworkPng: Buffer.from("png"),
            expectedText: "وشّى كما هي",
        })).resolves.toMatchObject({
            required: true,
            verified: true,
            model: "gemini-3-pro-image",
        });

        expect(mockGenerateContent).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
