import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPieceAccess } from "@/lib/design-piece-access";
import { extractDesignSchema } from "../validators/ai-studio.schema";
import { getWashaDtfErrorDetails } from "@/lib/washa-dtf-studio";
import { AiStudioService } from "../services/ai-studio.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const access = await resolveDesignPieceAccess();
    if (!access.allowed) {
        return NextResponse.json({ error: "غير مصرح لك باستخدام استوديو DTF" }, { status: 403 });
    }

    try {
        const rawBody = await request.json();
        const parsed = extractDesignSchema.safeParse(rawBody);

        if (!parsed.success) {
            const errorMsg = parsed.error.issues[0]?.message || "بيانات الاستخراج غير مكتملة";
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }

        const { prompt, mockupImage, mimeType } = parsed.data;

        const imageUrl = await AiStudioService.extractDesign(prompt, mockupImage, mimeType);

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error("[washa-dtf-studio.extract-design]", error);
        const handled = getWashaDtfErrorDetails(error);
        return NextResponse.json(
            { error: handled.message },
            { status: handled.status }
        );
    }
}
