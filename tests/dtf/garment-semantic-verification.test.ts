import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyBlankGarmentSemantics } from "@/lib/washa-artwork/garment-semantic-verification";

describe("blank garment semantic verification", () => {
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
});
