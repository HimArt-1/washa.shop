import { getSupabaseAdminClient } from "@/lib/supabase";
import { logDiagnosticWarning } from "../utils/api-error";
import type { Database } from "@/types/database";

export type TelemetryAction = "generate-mockup" | "extract-design" | "submit-order";
export type TelemetryStatus = "success" | "error" | "timeout" | "quota_exceeded" | "aborted";

export interface LogParams {
    profileId?: string | null;
    clerkId?: string | null;
    action: TelemetryAction;
    status: TelemetryStatus;
    prompt?: string;
    referenceImageUrl?: string;
    resultImageUrl?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
}

export class DtfTelemetryService {
    public static readonly DAILY_LIMIT = 5;

    /**
     * Checks if the user has available daily generation points.
     * Admins and Wushsha roles bypass the quota limit entirely.
     */
    static async checkDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined
    ): Promise<{ allowed: boolean; remaining: number }> {
        // Unauthenticated or Guest without profile can't track quota reliably here 
        // (usually handled by generic rate limit or auth gates), but we assume 0 if no profile.
        if (!profileId) {
            return { allowed: false, remaining: 0 };
        }

        // Admins and owners get unlimited access
        if (userRole === "admin" || userRole === "wushsha" || userRole === "dev") {
            return { allowed: true, remaining: 9999 };
        }

        try {
            const sb = getSupabaseAdminClient();
            
            // Get today's start boundary in UTC
            const startOfDay = new Date();
            startOfDay.setUTCHours(0, 0, 0, 0);

            // Count only successful complete generations today
            const { count, error } = await sb.from("dtf_studio_activity_logs")
                .select("id", { count: "exact", head: true })
                .eq("profile_id", profileId)
                .eq("action", "generate-mockup")
                .eq("status", "success")
                .gte("created_at", startOfDay.toISOString());

            if (error) {
                logDiagnosticWarning("dtf-telemetry-quota-check", error);
                // In case of DB failure, we might want to fail open or fail closed. 
                // Failing closed prevents abuse if DB is acting up.
                return { allowed: false, remaining: 0 };
            }

            const used = count ?? 0;
            const remaining = Math.max(0, DtfTelemetryService.DAILY_LIMIT - used);

            return { allowed: remaining > 0, remaining };
        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-quota-check-fatal", err);
            return { allowed: false, remaining: 0 };
        }
    }

    /**
     * Logs an activity asynchronously to the database.
     * Catch all errors to prevent crashing the main API flow.
     */
    static async logActivity(params: LogParams): Promise<void> {
        try {
            const sb = getSupabaseAdminClient();
            
            // Fire and forget insert
            sb.from("dtf_studio_activity_logs").insert({
                profile_id: params.profileId || null,
                clerk_id: params.clerkId || null,
                action: params.action,
                status: params.status,
                prompt: params.prompt || null,
                reference_image_url: params.referenceImageUrl || null,
                result_image_url: params.resultImageUrl || null,
                error_message: params.errorMessage || null,
                metadata: params.metadata || null,
            }).then(({ error }) => {
                if (error) {
                    logDiagnosticWarning("dtf-telemetry-insert-async", error);
                }
            });

        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-insert-sync", err);
        }
    }
}
