import { NextRequest, NextResponse } from "next/server";

import { cleanupAbandonedDtfReservations } from "@/lib/dtf-reservation-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const auth = req.headers.get("authorization");
    return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
    if (!authorizeCron(req)) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const dryRun =
        req.nextUrl.searchParams.get("dryRun") === "1" ||
        req.nextUrl.searchParams.get("dry_run") === "1";

    try {
        const result = await cleanupAbandonedDtfReservations({ dryRun });
        return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to clean DTF reservations";
        console.error("DTF reservation cleanup failed:", error);
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
