import { ArtworkTextPolicyError } from "@/lib/washa-artwork/arabic-text-verification";
import { runWashaDtfGeminiImageVerification } from "@/lib/washa-artwork/gemini-verification";

type BoardTextVerificationResponse = {
    complies?: boolean;
    observedArtworkText?: string;
    reason?: string;
};

export async function verifyPremiumBoardArtworkTextPolicy(params: {
    boardPng: Buffer;
    expectedTexts: Array<string | null | undefined>;
    sourceModel: string;
    apiKey?: string | null;
}) {
    const expectedTexts = params.expectedTexts
        .map((value) => value?.trim() || "")
        .filter(Boolean);
    const mode = expectedTexts.length > 0 ? "exact" as const : "forbidden" as const;
    const artworkRule = expectedTexts.length > 0
        ? [
            `The only writing allowed inside the printable artwork is this exact JSON array: ${JSON.stringify(expectedTexts)}.`,
            "Every listed value must be preserved exactly, and no other writing or text-like content may appear inside the artwork.",
            "The selected text may repeat across the hero shirt, detail crops, and FULL DESIGN because those regions show the identical artwork. This cross-view repetition is compliant.",
        ]
        : [
            "The printable artwork itself must contain no visible writing.",
            "Treat letters, words, numbers, text-like glyphs, signatures, wordmarks, text-based logos, watermarks, and pseudo-text in any language as violations when they appear inside the artwork.",
        ];
    const prompt = [
        "Act only as a strict visual text-policy verifier for one apparel production-approval board.",
        "Inspect the artwork in all repeated contexts: the print on the hero shirt, DETAIL 01, DETAIL 02, and the isolated FULL DESIGN artwork.",
        ...artworkRule,
        "The board intentionally includes technical presentation text outside the artwork. Do not count these required labels as violations: DETAIL 01, DETAIL 02, FULL DESIGN, التصميم كامل, مقاسات التصميم, width/height labels, centimeter values or units, and measurement annotations.",
        "A technical label is allowed only when it remains outside the printable artwork boundaries. The same writing embedded in the artwork is a violation unless it exactly matches customer-selected text.",
        "Return JSON only: {\"complies\":boolean,\"observedArtworkText\":string,\"reason\":string}.",
        "Set complies to false for any unrequested, altered, fake, decorative, distorted, or partially legible writing inside any artwork context.",
    ].join("\n");
    const result = await runWashaDtfGeminiImageVerification<BoardTextVerificationResponse>({
        imagePng: params.boardPng,
        prompt,
        apiKeyOverride: params.apiKey,
        modelOverride: process.env.WASHA_AI_V4_TEXT_VERIFICATION_MODEL
            || params.sourceModel,
        sourceProvider: "genai",
        sourceModel: params.sourceModel,
        stage: "text_policy_verification",
        responseJsonSchema: {
            type: "object",
            properties: {
                complies: { type: "boolean" },
                observedArtworkText: { type: "string" },
                reason: { type: "string" },
            },
            required: ["complies", "observedArtworkText", "reason"],
        },
    });
    const observedArtworkText = typeof result.parsed.observedArtworkText === "string"
        ? result.parsed.observedArtworkText.trim()
        : "";
    if (result.parsed.complies !== true) {
        throw new ArtworkTextPolicyError(
            mode === "forbidden"
                ? "Generated board artwork contains unexpected visible text."
                : "Generated board artwork does not preserve only the selected text."
        );
    }

    return {
        mode,
        required: true,
        verified: true,
        observedArtworkText: observedArtworkText || null,
        provider: result.provider,
        model: result.model,
    };
}
