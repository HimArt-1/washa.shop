// وشّى | WASHA — Server Action: جلب شرائح الجمهور للداشبورد
"use server";

import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { computeSegments, type SegmentSummary } from "@/lib/segment-engine";

export async function getMarketingSegments(days = 90): Promise<SegmentSummary | null> {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return null;

    const access = await resolveAdminAccess(user);
    if (!access.isAdmin) return null;

    return computeSegments(days);
}
