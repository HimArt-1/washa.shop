import { getSupabaseAdminClient } from "@/lib/supabase";
import { logDiagnosticWarning } from "../utils/api-error";

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

type DailyQuotaRpcPayload = {
    granted?: unknown;
    released?: unknown;
    remaining?: unknown;
    used?: unknown;
    quota_date?: unknown;
};

export interface DailyQuotaReservation {
    allowed: boolean;
    remaining: number;
    used: number;
    quotaDate?: string;
    tracked: boolean;
}

export class DtfTelemetryService {
    public static readonly DAILY_LIMIT = 5;
    private static readonly INSERT_RETRY_COUNT = 2;
    private static readonly INSERT_RETRY_DELAY_MS = 150;

    private static isQuotaBypassedRole(userRole: string | null | undefined) {
        return userRole === "admin" || userRole === "wushsha" || userRole === "dev";
    }

    private static normalizeQuotaPayload(data: DailyQuotaRpcPayload | null) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return null;
        }

        return data;
    }

    static async reserveDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined
    ): Promise<DailyQuotaReservation> {
        if (!profileId) {
            if (userRole === "guest") {
                return { allowed: true, remaining: 0, used: 0, tracked: false };
            }
            return { allowed: false, remaining: 0, used: 0, tracked: false };
        }

        if (DtfTelemetryService.isQuotaBypassedRole(userRole)) {
            return { allowed: true, remaining: 9999, used: 0, tracked: false };
        }

        try {
            const sb = getSupabaseAdminClient();

            const { data, error } = await sb.rpc("reserve_dtf_daily_quota", {
                p_profile_id: profileId,
                p_daily_limit: DtfTelemetryService.DAILY_LIMIT,
            });

            if (error) {
                logDiagnosticWarning("dtf-telemetry-quota-reserve", error);
                return { allowed: true, remaining: DtfTelemetryService.DAILY_LIMIT, used: 0, tracked: false };
            }

            const payload = DtfTelemetryService.normalizeQuotaPayload(data as DailyQuotaRpcPayload | null);
            if (!payload || typeof payload.granted !== "boolean") {
                logDiagnosticWarning("dtf-telemetry-quota-reserve-invalid", data);
                return { allowed: true, remaining: DtfTelemetryService.DAILY_LIMIT, used: 0, tracked: false };
            }

            return {
                allowed: payload.granted,
                remaining: typeof payload.remaining === "number" ? payload.remaining : 0,
                used: typeof payload.used === "number" ? payload.used : 0,
                quotaDate: typeof payload.quota_date === "string" ? payload.quota_date : undefined,
                tracked: payload.granted,
            };
        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-quota-reserve-fatal", err);
            return { allowed: true, remaining: DtfTelemetryService.DAILY_LIMIT, used: 0, tracked: false };
        }
    }

    static async releaseDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined
    ): Promise<boolean> {
        if (!profileId || DtfTelemetryService.isQuotaBypassedRole(userRole)) {
            return false;
        }

        try {
            const sb = getSupabaseAdminClient();

            const { data, error } = await sb.rpc("release_dtf_daily_quota", {
                p_profile_id: profileId,
                p_daily_limit: DtfTelemetryService.DAILY_LIMIT,
            });

            if (error) {
                logDiagnosticWarning("dtf-telemetry-quota-release", error);
                return false;
            }

            const payload = DtfTelemetryService.normalizeQuotaPayload(data as DailyQuotaRpcPayload | null);
            return payload?.released === true;
        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-quota-release-fatal", err);
            return false;
        }
    }

    private static buildInsertPayload(params: LogParams) {
        return {
            profile_id: params.profileId || null,
            clerk_id: params.clerkId || null,
            action: params.action,
            status: params.status,
            prompt: params.prompt || null,
            reference_image_url: params.referenceImageUrl || null,
            result_image_url: params.resultImageUrl || null,
            error_message: params.errorMessage || null,
            metadata: params.metadata || null,
        };
    }

    private static async waitBeforeRetry(attempt: number) {
        if (attempt >= DtfTelemetryService.INSERT_RETRY_COUNT - 1) {
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, DtfTelemetryService.INSERT_RETRY_DELAY_MS * (attempt + 1)));
    }

    /**
     * Logs an activity to the database before the route returns.
     * Failures are swallowed so telemetry never breaks the user flow.
     */
    static async logActivity(params: LogParams): Promise<boolean> {
        try {
            const sb = getSupabaseAdminClient();

            for (let attempt = 0; attempt < DtfTelemetryService.INSERT_RETRY_COUNT; attempt += 1) {
                const { error } = await sb.from("dtf_studio_activity_logs").insert(
                    DtfTelemetryService.buildInsertPayload(params)
                );

                if (error) {
                    logDiagnosticWarning(`dtf-telemetry-insert-attempt-${attempt + 1}`, error);
                    await DtfTelemetryService.waitBeforeRetry(attempt);
                    continue;
                }

                return true;
            }
        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-insert-fatal", err);
        }

        return false;
    }
}
