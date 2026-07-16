function extractAssistantText(payload: any) {
    const value = payload?.choices?.[0]?.message?.content;
    return typeof value === "string" ? value.trim() : "";
}

export async function verifyExactArabicText(params: {
    artworkPng: Buffer;
    expectedText?: string | null;
}) {
    const expectedText = params.expectedText?.trim();
    if (!expectedText) {
        return { required: false, verified: true, observedText: null, model: null };
    }
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("Arabic artwork verification requires OPENAI_API_KEY.");
    const model = (
        process.env.WASHA_DTF_ARABIC_VERIFICATION_MODEL
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
                max_tokens: 160,
                response_format: { type: "json_object" },
                messages: [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: [
                                "Act only as a strict Arabic OCR verifier.",
                                `Expected exact text: ${JSON.stringify(expectedText)}`,
                                "Read every Arabic character visible in the artwork.",
                                "Return JSON only: {\"matches\":boolean,\"observedText\":string}.",
                                "matches may be true only when observedText is character-for-character identical to expected text.",
                            ].join("\n"),
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${params.artworkPng.toString("base64")}`,
                                detail: "high",
                            },
                        },
                    ],
                }],
            }),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`Arabic artwork verification failed with status ${response.status}.`);
        }
        const payload = await response.json();
        const parsed = JSON.parse(extractAssistantText(payload));
        const observedText = typeof parsed?.observedText === "string"
            ? parsed.observedText
            : "";
        if (parsed?.matches !== true || observedText !== expectedText) {
            throw new Error("Generated artwork does not preserve the supplied Arabic text exactly.");
        }
        return {
            required: true,
            verified: true,
            observedText,
            model,
        };
    } finally {
        clearTimeout(timeout);
    }
}
