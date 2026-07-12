// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — حزم رصيد WASHA AI المتاحة للشراء
//  GET /api/washa-ai/credits/packages
// ═══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getActiveWashaAiCreditPackages } from "@/app/actions/settings";
import { getCreditCheckoutCapability } from "../service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const packages = await getActiveWashaAiCreditPackages();
    const capability = getCreditCheckoutCapability();
    return NextResponse.json({
        packages,
        checkoutEnabled: capability.enabled,
        checkoutProvider: capability.provider,
    });
}
