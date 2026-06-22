import { getSupabaseAdminClient } from "@/lib/supabase";
import { getWashaAiSettings } from "@/app/actions/settings";
import { normalizeDtfTelemetryImageUrlForLog } from "@/lib/dtf-telemetry-sanitize";
import { logDiagnosticWarning } from "../utils/api-error";
import { StorageService } from "./storage.service";

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
    public static readonly DEFAULT_DAILY_LIMIT = 5;
    private static readonly INSERT_RETRY_COUNT = 2;
    private static readonly INSERT_RETRY_DELAY_MS = 150;
    private static readonly TELEMETRY_RESULT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

    private static isQuotaBypassedRole(userRole: string | null | undefined) {
        return userRole === "admin" || userRole === "wushsha" || userRole === "dev";
    }

    private static normalizeQuotaPayload(data: DailyQuotaRpcPayload | null) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return null;
        }

        return data;
    }

    private static async resolveDailyLimit() {
        try {
            const settings = await getWashaAiSettings();
            const configuredLimit = Number(settings.dtf_daily_quota_limit);
            if (!Number.isFinite(configuredLimit)) {
                return DtfTelemetryService.DEFAULT_DAILY_LIMIT;
            }

            return Math.max(1, Math.round(configuredLimit));
        } catch {
            return DtfTelemetryService.DEFAULT_DAILY_LIMIT;
        }
    }

    static async reserveDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined
    ): Promise<DailyQuotaReservation> {
        const dailyLimit = await DtfTelemetryService.resolveDailyLimit();

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
                p_daily_limit: dailyLimit,
            });

            if (error) {
                logDiagnosticWarning("dtf-telemetry-quota-reserve", error);
                return { allowed: true, remaining: dailyLimit, used: 0, tracked: false };
            }

            const payload = DtfTelemetryService.normalizeQuotaPayload(data as DailyQuotaRpcPayload | null);
            if (!payload || typeof payload.granted !== "boolean") {
                logDiagnosticWarning("dtf-telemetry-quota-reserve-invalid", data);
                return { allowed: true, remaining: dailyLimit, used: 0, tracked: false };
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
            return { allowed: true, remaining: dailyLimit, used: 0, tracked: false };
        }
    }

    static async releaseDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined
    ): Promise<boolean> {
        const dailyLimit = await DtfTelemetryService.resolveDailyLimit();

        if (!profileId || DtfTelemetryService.isQuotaBypassedRole(userRole)) {
            return false;
        }

        try {
            const sb = getSupabaseAdminClient();

            const { data, error } = await sb.rpc("release_dtf_daily_quota", {
                p_profile_id: profileId,
                p_daily_limit: dailyLimit,
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

    private static getImageExtensionFromDataUrl(value: string) {
        const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
        const mimeType = match?.[1]?.toLowerCase();
        if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "jpg";
        if (mimeType === "image/webp") return "webp";
        if (mimeType === "image/gif") return "gif";
        return "png";
    }

    private static async persistResultImageForLog(params: LogParams) {
        const value = params.resultImageUrl?.trim();
        const metadata: Record<string, unknown> = {};

        if (!value || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) {
            return { resultImageUrl: params.resultImageUrl, metadata };
        }

        const extension = DtfTelemetryService.getImageExtensionFromDataUrl(value);
        const path = [
            "dtf-telemetry",
            params.action,
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`,
        ].join("/");

        const upload = await StorageService.uploadBase64Image(value, path, {
            maxBytes: DtfTelemetryService.TELEMETRY_RESULT_IMAGE_MAX_BYTES,
        });

        if ("error" in upload) {
            logDiagnosticWarning("dtf-telemetry-result-image-upload", upload.error);
            return {
                resultImageUrl: params.resultImageUrl,
                metadata: {
                    ...metadata,
                    result_image_upload_failed: true,
                    result_image_upload_error: upload.error,
                    result_image_upload_status: upload.status,
                },
            };
        }

        return {
            resultImageUrl: upload.url,
            metadata: {
                ...metadata,
                result_image_persisted: true,
                result_image_storage_path: path,
            },
        };
    }

    private static async buildInsertPayload(params: LogParams) {
        const persistedResult = await DtfTelemetryService.persistResultImageForLog(params);
        const referenceImage = normalizeDtfTelemetryImageUrlForLog(params.referenceImageUrl, "reference_image");
        const resultImage = normalizeDtfTelemetryImageUrlForLog(persistedResult.resultImageUrl, "result_image");
        const metadata = {
            ...(params.metadata || {}),
            ...persistedResult.metadata,
            ...referenceImage.metadata,
            ...resultImage.metadata,
        };

        return {
            profile_id: params.profileId || null,
            clerk_id: params.clerkId || null,
            action: params.action,
            status: params.status,
            prompt: params.prompt || null,
            reference_image_url: referenceImage.url,
            result_image_url: resultImage.url,
            error_message: params.errorMessage || null,
            metadata: Object.keys(metadata).length > 0 ? metadata : null,
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
            const payload = await DtfTelemetryService.buildInsertPayload(params);

            for (let attempt = 0; attempt < DtfTelemetryService.INSERT_RETRY_COUNT; attempt += 1) {
                const { error } = await sb.from("dtf_studio_activity_logs").insert(payload);

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
