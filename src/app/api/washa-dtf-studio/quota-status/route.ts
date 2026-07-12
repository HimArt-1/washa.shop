// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — حالة حصة WASHA AI (قراءة فقط)
//  GET /api/washa-dtf-studio/quota-status
//  يُرجع المتبقي من المنحة اليومية المجانية + رصيد المحفظة
//  المدفوع، دون استهلاك أي حصة.
// ═══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { DtfTelemetryService } from "../services/dtf-telemetry.service";
import { requireDtfRouteAccess } from "../utils/route-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const accessResult = await requireDtfRouteAccess();
    if (accessResult.response) {
        return accessResult.response;
    }

    const access = accessResult.access;
    const status = await DtfTelemetryService.getQuotaStatus(access.profileId, access.role);

    return NextResponse.json(status, {
        headers: { "Cache-Control": "private, no-store" },
    });
}
