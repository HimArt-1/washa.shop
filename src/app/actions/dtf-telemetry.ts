"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { logDiagnosticWarning } from "@/app/api/washa-dtf-studio/utils/api-error";
import type { DtfStudioActivityLog } from "@/types/database";

export async function getDtfTelemetryLogs(page = 1, limit = 50): Promise<{ data: DtfStudioActivityLog[]; count: number; error?: string }> {
    try {
        const user = await getCurrentUserOrDevAdmin();
        if (!user) return { data: [], count: 0, error: "Unauthorized" };

        const { isAdmin } = await resolveAdminAccess(user);
        if (!isAdmin) return { data: [], count: 0, error: "Unauthorized" };

        const sb = getSupabaseAdminClient();

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, count, error } = await sb
            .from("dtf_studio_activity_logs")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error) {
            logDiagnosticWarning("admin-fetch-dtf-telemetry", error);
            return { data: [], count: 0, error: error.message };
        }

        return { data: data as DtfStudioActivityLog[], count: count ?? 0 };
    } catch (err: unknown) {
        logDiagnosticWarning("admin-fetch-dtf-telemetry-fatal", err);
        return { data: [], count: 0, error: "Internal Error" };
    }
}
