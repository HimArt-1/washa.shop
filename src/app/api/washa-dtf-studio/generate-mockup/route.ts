import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { extractGeneratedImageDataUrl, getWashaDtfErrorDetails, getWashaDtfGenAiClient, WASHA_DTF_MODEL } from "@/lib/washa-dtf-studio";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return NextResponse.json({ error: "غير مصرح لك باستخدام WASHA AI" }, { status: 403 });
    }

    try {
        const { prompt, referenceImage } = await request.json();
        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json({ error: "الوصف مطلوب" }, { status: 400 });
        }

        const client = getWashaDtfGenAiClient();
        const parts: any[] = [{ text: prompt }];

        if (referenceImage?.base64 && referenceImage?.mimeType) {
            parts.unshift({
                inlineData: {
                    data: referenceImage.base64,
                    mimeType: referenceImage.mimeType,
                },
            });
        }

        const response = await client.models.generateContent({
            model: WASHA_DTF_MODEL,
            contents: { role: "user", parts },
            // @ts-ignore Gemini image config is not fully exposed in current typings.
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "2K",
                },
            },
        });

        const imageUrl = extractGeneratedImageDataUrl(response);
        if (!imageUrl) {
            return NextResponse.json({ error: "لم يتم توليد صورة من Gemini" }, { status: 500 });
        }

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error("[washa-dtf-studio.generate-mockup]", error);
        const handled = getWashaDtfErrorDetails(error);
        return NextResponse.json(
            { error: handled.message },
            { status: handled.status }
        );
    }
}
