import { NextRequest, NextResponse } from "next/server";

import { expireBankTransferReservations } from "@/lib/bank-transfer-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    try {
        const result = await expireBankTransferReservations({
            dryRun: req.nextUrl.searchParams.get("dryRun") === "1",
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    } catch (error) {
        console.error("Bank transfer reservation cleanup failed", error);
        return NextResponse.json({ ok: false, error: "cleanup_failed" }, { status: 500 });
    }
}
