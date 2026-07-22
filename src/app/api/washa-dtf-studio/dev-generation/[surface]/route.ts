import { NextRequest, NextResponse } from "next/server";
import { POST as generateMockup } from "../../generate-mockup/route";
import {
    createWashaAiDevGenerationHeaders,
    isWashaAiDevSurface,
} from "@/lib/washa-ai-dev-access";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ surface: string }> }
) {
    const { surface } = await context.params;
    if (!isWashaAiDevSurface(surface)) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const headers = new Headers(request.headers);
    for (const [name, value] of Object.entries(createWashaAiDevGenerationHeaders(surface))) {
        headers.set(name, value);
    }
    headers.set("referer", new URL(`/design/washa-ai/${surface}`, request.url).toString());

    const forwardedRequest = new NextRequest(
        new URL("/api/washa-dtf-studio/generate-mockup", request.url),
        {
            method: "POST",
            headers,
            body: await request.arrayBuffer(),
            signal: request.signal,
        }
    );

    return generateMockup(forwardedRequest);
}
