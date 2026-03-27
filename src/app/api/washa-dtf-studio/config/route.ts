import { NextResponse } from "next/server";
import { getWashaDtfStudioConfig } from "@/lib/washa-dtf-config";

export const runtime = "nodejs";

export async function GET() {
    try {
        const config = await getWashaDtfStudioConfig();
        return NextResponse.json(config, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[washa-dtf-studio.config]", error);
        return NextResponse.json(
            { error: "تعذر تحميل إعدادات WASHA AI" },
            { status: 500 }
        );
    }
}
