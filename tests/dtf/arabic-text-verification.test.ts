import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyExactArabicText } from "@/lib/washa-artwork/arabic-text-verification";

describe("Arabic artwork text verification", () => {
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
});
