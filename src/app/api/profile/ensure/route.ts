import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/ensure-profile";

export const dynamic = "force-dynamic";

export async function POST() {
    await ensureProfile();
    return NextResponse.json({ ok: true });
}
