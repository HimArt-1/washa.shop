import { NextRequest, NextResponse } from "next/server";
import {
    getDesignPieceAccessFailure,
    resolveDesignPieceAccess,
} from "@/lib/design-piece-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const access = await resolveDesignPieceAccess();

    if (access.allowed) {
        return NextResponse.json(
            {
                authenticated: true,
                canGenerate: true,
                role: access.role ?? null,
            },
            { headers: { "Cache-Control": "no-store" } }
        );
    }

    const failure = getDesignPieceAccessFailure(access.reason);
    const returnPath = request.nextUrl.searchParams.get("returnPath");

    return NextResponse.json(
        {
            authenticated: false,
            canGenerate: false,
            reason: access.reason ?? "not_signed_in",
            message: failure.message,
            signInUrl: `/sign-in?redirect_url=${encodeURIComponent(returnPath?.startsWith("/") ? returnPath : "/design/washa-ai/app")}`,
        },
        {
            status: access.reason === "not_signed_in" ? 200 : failure.status,
            headers: { "Cache-Control": "no-store" },
        }
    );
}
