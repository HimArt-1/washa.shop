// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — حالة حصة WASHA AI (قراءة فقط)
//  GET /api/washa-dtf-studio/quota-status
//  يُرجع المتبقي من المنحة اليومية المجانية + رصيد المحفظة
//  المدفوع، دون استهلاك أي حصة.
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { DtfTelemetryService } from "../services/dtf-telemetry.service";
import { rejectUnexpectedGuestAccess, requireDtfRouteAccess } from "../utils/route-runtime";
import { getRequestClientIdentifier } from "@/lib/request-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const accessResult = await requireDtfRouteAccess({ allowPublicGeneration: true });
    if (accessResult.response) {
        return accessResult.response;
    }

    const access = accessResult.access;
    const unexpectedGuestResponse = rejectUnexpectedGuestAccess(request, access);
    if (unexpectedGuestResponse) return unexpectedGuestResponse;

    const status = await DtfTelemetryService.getQuotaStatus(access.profileId, access.role, {
        guestIdentifier: access.role === "guest" ? getRequestClientIdentifier(request) : null,
    });

    return NextResponse.json(status, {
        headers: { "Cache-Control": "private, no-store" },
    });
}
