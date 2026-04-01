"use server";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { logDiagnosticWarning } from "@/app/api/washa-dtf-studio/utils/api-error";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
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
            .select("*", { count: "estimated" })
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

export interface DtfTelemetryStats {
    totalRequests: number;
    statusDistribution: {
        success: number;
        error: number;
        timeout: number;
        quotaExceeded: number;
    };
    chartData: {
        date: string;
        success: number;
        failed: number;
    }[];
}

export async function getDtfTelemetryStats(days = 7): Promise<{ data: DtfTelemetryStats | null; error?: string }> {
    try {
        const user = await getCurrentUserOrDevAdmin();
        if (!user) return { data: null, error: "Unauthorized" };

        const { isAdmin } = await resolveAdminAccess(user);
        if (!isAdmin) return { data: null, error: "Unauthorized" };

        const sb = getSupabaseAdminClient();
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        daysAgo.setUTCHours(0, 0, 0, 0);

        // Fetch minimal data needed for statistics to avoid payload bloat
        const { data, error } = await sb
            .from("dtf_studio_activity_logs")
            .select("status, created_at")
            .gte("created_at", daysAgo.toISOString())
            .order("created_at", { ascending: true })
            .limit(5000);

        if (error) {
            logDiagnosticWarning("admin-fetch-dtf-stats", error);
            return { data: null, error: error.message };
        }

        const logs = data || [];

        const stats: DtfTelemetryStats = {
            totalRequests: logs.length,
            statusDistribution: {
                success: 0,
                error: 0,
                timeout: 0,
                quotaExceeded: 0,
            },
            chartData: []
        };

        const dateMap = new Map<string, { success: number; failed: number }>();

        // Pre-fill last N days to ensure contiguous chart even if 0 requests
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = format(d, "dd MMM", { locale: ar });
            dateMap.set(dateStr, { success: 0, failed: 0 });
        }

        // Aggregate
        for (const log of logs) {
            const dateStr = format(parseISO(log.created_at), "dd MMM", { locale: ar });
            
            // Avoid adding historic logs to our "today" bounds if parsing mismatched 
            if (!dateMap.has(dateStr)) {
                // Ignore logs outside the sliding window display bounds
                continue; 
            }

            const dayStats = dateMap.get(dateStr)!;

            if (log.status === "success") {
                stats.statusDistribution.success++;
                dayStats.success++;
            } else if (log.status === "error") {
                stats.statusDistribution.error++;
                dayStats.failed++;
            } else if (log.status === "timeout") {
                stats.statusDistribution.timeout++;
                dayStats.failed++;
            } else if (log.status === "quota_exceeded") {
                stats.statusDistribution.quotaExceeded++;
                dayStats.failed++;
            } else {
                dayStats.failed++; // Any other failure like aborted
            }
        }

        stats.chartData = Array.from(dateMap.entries()).map(([date, counts]) => ({
            date,
            success: counts.success,
            failed: counts.failed
        }));

        return { data: stats };

    } catch (err: unknown) {
        logDiagnosticWarning("admin-fetch-dtf-stats-fatal", err);
        return { data: null, error: "Internal Error" };
    }
}
