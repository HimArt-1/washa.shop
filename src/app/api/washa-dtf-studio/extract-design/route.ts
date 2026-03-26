import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { extractGeneratedImageDataUrl, getWashaDtfGenAiClient, WASHA_DTF_MODEL } from "@/lib/washa-dtf-studio";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return NextResponse.json({ error: "غير مصرح لك باستخدام استوديو DTF" }, { status: 403 });
    }

    try {
        const { prompt, mockupImage, mimeType } = await request.json();
        if (!prompt || typeof prompt !== "string" || !mockupImage || typeof mockupImage !== "string" || !mimeType || typeof mimeType !== "string") {
            return NextResponse.json({ error: "بيانات الاستخراج غير مكتملة" }, { status: 400 });
        }

        const client = getWashaDtfGenAiClient();
        const response = await client.models.generateContent({
            model: WASHA_DTF_MODEL,
            contents: {
                role: "user",
                parts: [
                    {
                        inlineData: {
                            data: mockupImage,
                            mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
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
            return NextResponse.json({ error: "لم يتم استخراج التصميم من Gemini" }, { status: 500 });
        }

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error("[washa-dtf-studio.extract-design]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "فشل استخراج التصميم" },
            { status: 500 }
        );
    }
}
