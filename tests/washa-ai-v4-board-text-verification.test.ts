import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    generateContent: vi.fn(),
    getGenAiClient: vi.fn(),
}));

vi.mock("@/lib/washa-dtf-studio", () => ({
    getWashaDtfGenAiClient: mocks.getGenAiClient,
}));

import { ArtworkTextPolicyError } from "@/lib/washa-artwork/arabic-text-verification";
import { verifyPremiumBoardArtworkTextPolicy } from "@/lib/washa-ai-v4-board-text-verification";

function providerResponse(input: {
    complies: boolean;
    observedArtworkText?: string;
    reason?: string;
}) {
    return {
        text: JSON.stringify({
            observedArtworkText: "",
            reason: "Technical labels only.",
            ...input,
        }),
    };
}

describe("WASHA AI v4 board artwork text verification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getGenAiClient.mockReturnValue({
            models: { generateContent: mocks.generateContent },
        });
    });

    it("accepts technical labels outside text-free artwork", async () => {
        mocks.generateContent.mockResolvedValue(providerResponse({ complies: true }));

        await expect(verifyPremiumBoardArtworkTextPolicy({
            boardPng: Buffer.from("png"),
            expectedTexts: [],
            sourceModel: "gemini-v4-board",
            apiKey: "dedicated-v4-key",
        })).resolves.toMatchObject({
            verified: true,
            mode: "forbidden",
            observedArtworkText: null,
            provider: "genai",
        });

        expect(mocks.getGenAiClient).toHaveBeenCalledWith("dedicated-v4-key");
        const call = mocks.generateContent.mock.calls[0]?.[0];
        const prompt = call.contents.parts[1].text as string;
        expect(prompt).toContain("DETAIL 01");
        expect(prompt).toContain("technical presentation text outside the artwork");
        expect(prompt).toContain("printable artwork itself must contain no visible writing");
        expect(prompt).toContain("text-like glyphs");
        expect(prompt).not.toContain("numbers, glyphs");
    });

    it("rejects unrequested pseudo-text inside the artwork", async () => {
        mocks.generateContent.mockResolvedValue(providerResponse({
            complies: false,
            observedArtworkText: "B3Y0ND",
            reason: "Pseudo-text appears inside the shirt artwork.",
        }));

        await expect(verifyPremiumBoardArtworkTextPolicy({
            boardPng: Buffer.from("png"),
            expectedTexts: [],
            sourceModel: "gemini-v4-board",
            apiKey: "dedicated-v4-key",
        })).rejects.toBeInstanceOf(ArtworkTextPolicyError);
    });

    it("accepts exact selected text repeated across the required board views", async () => {
        mocks.generateContent.mockResolvedValue(providerResponse({
            complies: true,
            observedArtworkText: "وشّى",
            reason: "The same exact selected text appears in repeated artwork views.",
        }));

        await expect(verifyPremiumBoardArtworkTextPolicy({
            boardPng: Buffer.from("png"),
            expectedTexts: ["وشّى", ""],
            sourceModel: "gemini-v4-board",
            apiKey: "dedicated-v4-key",
        })).resolves.toMatchObject({
            verified: true,
            mode: "exact",
            observedArtworkText: "وشّى",
        });

        const call = mocks.generateContent.mock.calls[0]?.[0];
        const prompt = call.contents.parts[1].text as string;
        expect(prompt).toContain("may repeat across the hero shirt, detail crops, and FULL DESIGN");
        expect(prompt).toContain("This cross-view repetition is compliant");
        expect(prompt).not.toContain("unrequested, altered, duplicated");
    });
});
