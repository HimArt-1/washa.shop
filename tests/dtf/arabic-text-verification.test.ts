import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
    mockGenerateContent: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: () => ({
        models: { generateContent: mockGenerateContent },
    }),
}));

import {
    verifyArtworkTextPolicy,
    verifyExactArabicText,
} from "@/lib/washa-artwork/arabic-text-verification";

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

    it("accepts text-free artwork when the dedicated text field is empty", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            choices: [{
                message: {
                    content: JSON.stringify({
                        hasVisibleText: false,
                        observedText: "",
                    }),
                },
            }],
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        })));

        await expect(verifyArtworkTextPolicy({
            artworkPng: Buffer.from("png"),
            expectedText: null,
        })).resolves.toMatchObject({
            mode: "forbidden",
            verified: true,
            hasVisibleText: false,
            observedText: null,
        });
    });

    it("rejects any visible writing when the dedicated text field is empty", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            choices: [{
                message: {
                    content: JSON.stringify({
                        hasVisibleText: true,
                        observedText: "في قلب غابة ساحرة",
                    }),
                },
            }],
        }), {
            status: 200,
            headers: { "content-type": "application/json" },
        })));

        await expect(verifyArtworkTextPolicy({
            artworkPng: Buffer.from("png"),
            expectedText: "   ",
        })).rejects.toThrow("unexpected visible text");
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

    it("keeps verification on the provider that produced the accepted artwork", async () => {
        vi.stubEnv("WASHA_DTF_IMAGE_PROVIDER", "openai");
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-3-pro-image");
        vi.stubEnv("GEMINI_API_KEY", "configured-gemini-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                hasVisibleText: false,
                observedText: "",
            }),
        });

        await expect(verifyArtworkTextPolicy({
            artworkPng: Buffer.from("png"),
            expectedText: null,
            preferredProvider: "genai",
            sourceModel: "gemini-3-pro-image",
        })).resolves.toMatchObject({
            mode: "forbidden",
            verified: true,
            provider: "genai",
            model: "gemini-3-pro-image",
        });

        expect(mockGenerateContent).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns a typed and sanitized verifier outage when OpenAI responds with 429", async () => {
        vi.stubEnv("OPENAI_API_KEY", "test-key");
        const leakedSecret = "sk-test-secret-that-must-not-appear";
        vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: `You exceeded your current quota. api_key=${leakedSecret}`,
                type: "insufficient_quota",
                code: "insufficient_quota",
            },
        }), {
            status: 429,
            headers: {
                "content-type": "application/json",
                "x-request-id": "req_safe_verification_429",
            },
        })));

        const error = await verifyArtworkTextPolicy({
            artworkPng: Buffer.from("png"),
            expectedText: null,
            preferredProvider: "openai",
            sourceModel: "gpt-image-2",
        }).catch((caught) => caught);

        expect(error).toMatchObject({
            name: "ArtworkVerificationUnavailableError",
            code: "ARTWORK_VERIFICATION_UNAVAILABLE",
            stage: "text_policy_verification",
            provider: "openai",
            model: "gpt-4o-mini",
            sourceProvider: "openai",
            sourceModel: "gpt-image-2",
            statusCode: 429,
            providerCode: "insufficient_quota",
            requestId: "req_safe_verification_429",
            retryable: true,
        });
        expect(JSON.stringify(error)).not.toContain(leakedSecret);
        expect(JSON.stringify(error)).not.toContain("base64");
        expect(JSON.stringify(error)).not.toContain("data:image");
    });

    it("keeps Gemini verifier diagnostics when Gemini responds with RESOURCE_EXHAUSTED", async () => {
        vi.stubEnv("WASHA_DTF_GENAI_MODEL", "gemini-3-pro-image");
        vi.stubEnv("GEMINI_API_KEY", "configured-gemini-key");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const leakedSecret = "AIza-test-secret-that-must-not-appear";
        mockGenerateContent.mockRejectedValue(Object.assign(
            new Error(`Gemini quota exhausted api_key=${leakedSecret}`),
            {
                status: 429,
                code: "RESOURCE_EXHAUSTED",
                requestId: "gemini_safe_request_429",
            }
        ));

        const error = await verifyArtworkTextPolicy({
            artworkPng: Buffer.from("png"),
            expectedText: null,
            preferredProvider: "genai",
            sourceModel: "gemini-3-pro-image",
        }).catch((caught) => caught);

        expect(error).toMatchObject({
            name: "ArtworkVerificationUnavailableError",
            code: "ARTWORK_VERIFICATION_UNAVAILABLE",
            provider: "genai",
            model: "gemini-3-pro-image",
            sourceProvider: "genai",
            sourceModel: "gemini-3-pro-image",
            statusCode: 429,
            providerCode: "RESOURCE_EXHAUSTED",
            requestId: "gemini_safe_request_429",
            retryable: true,
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(JSON.stringify(error)).not.toContain(leakedSecret);
    });

    it("does not silently switch a locked Gemini verification to OpenAI", async () => {
        vi.stubEnv("GEMINI_API_KEY", "");
        vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
        vi.stubEnv("OPENAI_API_KEY", "configured-openai-key");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const error = await verifyArtworkTextPolicy({
            artworkPng: Buffer.from("png"),
            expectedText: null,
            preferredProvider: "genai",
            sourceModel: "gemini-3-pro-image",
        }).catch((caught) => caught);

        expect(error).toMatchObject({
            code: "ARTWORK_VERIFICATION_UNAVAILABLE",
            provider: "genai",
            sourceProvider: "genai",
            providerCode: "verification_provider_unavailable",
            retryable: false,
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(mockGenerateContent).not.toHaveBeenCalled();
    });
});
