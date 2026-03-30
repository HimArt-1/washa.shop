import { NextResponse } from "next/server";
import { getWashaDtfStudioConfig } from "@/lib/washa-dtf-config";
import { requireDtfRouteAccess } from "../utils/route-runtime";

export const runtime = "nodejs";

export async function GET() {
    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    if (accessResult.response) {
        return accessResult.response;
    }

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
            { error: "تعذر تحميل إعدادات استوديو DTF" },
            { status: 500 }
        );
    }
}
