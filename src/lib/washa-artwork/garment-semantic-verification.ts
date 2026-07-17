import {
    resolveWashaDtfVerificationProvider,
    runWashaDtfGeminiImageVerification,
} from "@/lib/washa-artwork/gemini-verification";

function extractAssistantText(payload: any) {
    const value = payload?.choices?.[0]?.message?.content;
    return typeof value === "string" ? value.trim() : "";
}

export async function verifyBlankGarmentSemantics(params: {
    garmentPng: Buffer;
    garmentType: string;
    colorName: string;
    colorHex?: string | null;
    side: "front" | "back";
}) {
    const prompt = [
        "Inspect this generated apparel mockup strictly.",
        `Expected garment type: ${params.garmentType}`,
        `Expected color: ${params.colorName} (${params.colorHex || "no hex supplied"})`,
        `Expected view: ${params.side}`,
        "Return JSON only with booleans isBlank, matchesGarmentType, matchesColor, matchesSide, printAreaClear,",
        "plus printArea as normalized {x,y,width,height} for the largest flat visible printable garment area.",
        "isBlank must be false if any artwork, print, logo, typography, symbol, or decorative graphic appears on the garment.",
        "printAreaClear must be true only when the main printable area is visible and unobstructed.",
    ].join("\n");
    const verificationProvider = resolveWashaDtfVerificationProvider();
    let parsed: any;
    let model: string;
    if (verificationProvider === "genai") {
        const result = await runWashaDtfGeminiImageVerification<any>({
            imagePng: params.garmentPng,
            prompt,
            responseJsonSchema: {
                type: "object",
                properties: {
                    isBlank: { type: "boolean" },
                    matchesGarmentType: { type: "boolean" },
                    matchesColor: { type: "boolean" },
                    matchesSide: { type: "boolean" },
                    printAreaClear: { type: "boolean" },
                    printArea: {
                        type: "object",
                        properties: {
                            x: { type: "number" },
                            y: { type: "number" },
                            width: { type: "number" },
                            height: { type: "number" },
                        },
                        required: ["x", "y", "width", "height"],
                    },
                },
                required: [
                    "isBlank",
                    "matchesGarmentType",
                    "matchesColor",
                    "matchesSide",
                    "printAreaClear",
                    "printArea",
                ],
            },
        });
        parsed = result.parsed;
        model = result.model;
    } else {
        if (verificationProvider === "unavailable") {
            throw new Error("Blank garment verification provider is unavailable.");
        }
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) throw new Error("Blank garment verification requires OPENAI_API_KEY.");
        model = (
            process.env.WASHA_DTF_GARMENT_VERIFICATION_MODEL
            || process.env.WASHA_DTF_ARABIC_VERIFICATION_MODEL
            || "gpt-4o-mini"
        ).trim();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    temperature: 0,
                    max_tokens: 220,
                    response_format: { type: "json_object" },
                    messages: [{
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${params.garmentPng.toString("base64")}`,
                                    detail: "high",
                                },
                            },
                        ],
                    }],
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Blank garment semantic verification failed with status ${response.status}.`);
            }
            parsed = JSON.parse(extractAssistantText(await response.json()));
        } finally {
            clearTimeout(timeout);
        }
    }

    const printArea = parsed?.printArea;
    const validPrintArea = printArea
        && [printArea.x, printArea.y, printArea.width, printArea.height]
            .every((value) => typeof value === "number" && Number.isFinite(value))
        && printArea.x >= 0
        && printArea.y >= 0
        && printArea.width >= 0.05
        && printArea.height >= 0.05
        && printArea.x + printArea.width <= 1
        && printArea.y + printArea.height <= 1;
    const verified = [
        parsed?.isBlank,
        parsed?.matchesGarmentType,
        parsed?.matchesColor,
        parsed?.matchesSide,
        parsed?.printAreaClear,
    ].every((value) => value === true) && validPrintArea;
    if (!verified) {
        throw new Error("Generated garment is not a verified blank exact-color side-specific mockup.");
    }
    return {
        verified: true,
        model,
        isBlank: true,
        matchesGarmentType: true,
        matchesColor: true,
        matchesSide: true,
        printAreaClear: true,
        printArea: {
            x: printArea.x,
            y: printArea.y,
            width: printArea.width,
            height: printArea.height,
        },
    };
}
