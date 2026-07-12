import { NextRequest, NextResponse } from "next/server";

import { recoverPostResponseJobs } from "@/lib/post-response-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    try {
        const result = await recoverPostResponseJobs();
        return NextResponse.json(result, { status: result.ok ? 200 : 500 });
    } catch (error) {
        console.error("Post-response job recovery failed", error);
        return NextResponse.json({ ok: false, error: "recovery_failed" }, { status: 500 });
    }
}
