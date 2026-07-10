import { getSupabaseAdminClient } from "@/lib/supabase";
import { getWashaAiSettings } from "@/app/actions/settings";
import type { WashaAiControls } from "@/types/database";
import { normalizeDtfTelemetryImageUrlForLog } from "@/lib/dtf-telemetry-sanitize";
import { checkRateLimit } from "@/lib/rate-limit";
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
    source?: unknown;
    free_used?: unknown;
    free_remaining?: unknown;
    free_limit?: unknown;
    paid_balance?: unknown;
};

/**
 * أي مصدر استُهلكت منه الحصة — يحدد كيفية الاسترجاع عند الفشل.
 * `blocked` = الفئة معطّلة (يُمنع التوليد)؛ `unlimited` = الحصص معطّلة عالمياً.
 */
export type QuotaSource = "free" | "paid" | "none" | "bypass" | "guest" | "blocked" | "unlimited";

export interface DailyQuotaReservation {
    allowed: boolean;
    /** إجمالي المتبقي بعد هذا الحجز = المجاني المتبقي + الرصيد المدفوع. */
    remaining: number;
    used: number;
    quotaDate?: string;
    tracked: boolean;
    /** المصدر الذي حُجز منه؛ يُمرَّر إلى releaseDailyQuota للاسترجاع الصحيح. */
    source: QuotaSource;
    /** المتبقي من المنحة اليومية المجانية. */
    freeRemaining: number;
    /** رصيد المحفظة المدفوع الحالي. */
    paidBalance: number;
    /** سبب الرفض عند allowed=false: 'audience_disabled' أو 'quota_exceeded'. */
    reason?: "audience_disabled" | "quota_exceeded";
    /** هل يحقّ لهذا المستخدم شراء رصيد إضافي (حسب مفاتيح التحكّم)؟ */
    canPurchase?: boolean;
}

type DailyQuotaOptions = {
    guestIdentifier?: string | null;
};

export interface QuotaStatus {
    /** المشرفون/المطورون أو عند تعطيل الحصص عالمياً — رصيد غير محدود. */
    unlimited: boolean;
    /** الفئة معطّلة — يُمنع التوليد. */
    blocked: boolean;
    freeLimit: number;
    freeUsed: number;
    freeRemaining: number;
    paidBalance: number;
    canPurchase: boolean;
}

export class DtfTelemetryService {
    public static readonly DEFAULT_DAILY_LIMIT = 5;
    public static readonly DEFAULT_GUEST_DAILY_LIMIT = 3;
    public static readonly DEFAULT_BOOTH_DAILY_LIMIT = 25;
    public static readonly DEFAULT_WUSHSHA_DAILY_LIMIT = 15;
    private static readonly INSERT_RETRY_COUNT = 2;
    private static readonly INSERT_RETRY_DELAY_MS = 150;
    private static readonly TELEMETRY_RESULT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
    private static readonly GUEST_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

    // ملاحظة: wushsha لم يعد ضمن التجاوز — الوشّايون يخضعون للحصة الهجينة
    // (منحة يومية أعلى + رصيد مدفوع). التجاوز حصراً للمشرفين والمطورين.
    private static isQuotaBypassedRole(userRole: string | null | undefined) {
        return userRole === "admin" || userRole === "dev";
    }

    private static normalizeQuotaPayload(data: DailyQuotaRpcPayload | null) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return null;
        }

        return data;
    }

    private static normalizePositiveLimit(value: unknown, fallback: number) {
        const configuredLimit = Number(value);
        if (!Number.isFinite(configuredLimit)) {
            return fallback;
        }

        return Math.max(1, Math.round(configuredLimit));
    }

    private static fallbackDailyLimit(userRole?: string | null) {
        if (userRole === "booth") return DtfTelemetryService.DEFAULT_BOOTH_DAILY_LIMIT;
        if (userRole === "wushsha") return DtfTelemetryService.DEFAULT_WUSHSHA_DAILY_LIMIT;
        return DtfTelemetryService.DEFAULT_DAILY_LIMIT;
    }

    private static async resolveDailyLimit(userRole?: string | null) {
        try {
            const settings = await getWashaAiSettings();
            if (userRole === "booth") {
                return DtfTelemetryService.normalizePositiveLimit(
                    settings.dtf_booth_daily_quota_limit,
                    DtfTelemetryService.DEFAULT_BOOTH_DAILY_LIMIT
                );
            }

            if (userRole === "wushsha") {
                return DtfTelemetryService.normalizePositiveLimit(
                    settings.dtf_wushsha_daily_quota_limit,
                    DtfTelemetryService.DEFAULT_WUSHSHA_DAILY_LIMIT
                );
            }

            return DtfTelemetryService.normalizePositiveLimit(
                settings.dtf_daily_quota_limit,
                DtfTelemetryService.DEFAULT_DAILY_LIMIT
            );
        } catch {
            return DtfTelemetryService.fallbackDailyLimit(userRole);
        }
    }

    private static async resolveGuestDailyLimit() {
        try {
            const settings = await getWashaAiSettings();
            const configuredLimit = Number(settings.dtf_guest_daily_quota_limit);
            if (!Number.isFinite(configuredLimit)) {
                return DtfTelemetryService.DEFAULT_GUEST_DAILY_LIMIT;
            }

            return Math.max(1, Math.round(configuredLimit));
        } catch {
            return DtfTelemetryService.DEFAULT_GUEST_DAILY_LIMIT;
        }
    }

    // مفاتيح متساهلة عند فشل قراءة الإعدادات — لا نمنع التوليد بسبب خطأ عابر.
    private static readonly DEFAULT_CONTROLS: WashaAiControls = {
        quota_enabled: true,
        credits_enabled: true,
        audience: { guest: true, subscriber: true, wushsha: true, booth: true },
        purchase: { subscriber: true, wushsha: true },
    };

    private static async resolveControls(): Promise<WashaAiControls> {
        try {
            const settings = await getWashaAiSettings();
            return settings.controls ?? DtfTelemetryService.DEFAULT_CONTROLS;
        } catch {
            return DtfTelemetryService.DEFAULT_CONTROLS;
        }
    }

    private static audienceKey(userRole?: string | null): keyof WashaAiControls["audience"] {
        if (userRole === "guest") return "guest";
        if (userRole === "wushsha") return "wushsha";
        if (userRole === "booth") return "booth";
        return "subscriber";
    }

    /** هل يحقّ لهذا الدور شراء الرصيد؟ (يتطلب حساباً + تفعيل النظام). */
    private static canRolePurchase(controls: WashaAiControls, userRole?: string | null) {
        if (!controls.credits_enabled) return false;
        if (userRole === "subscriber") return controls.purchase.subscriber;
        if (userRole === "wushsha") return controls.purchase.wushsha;
        return false;
    }

    static async reserveDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined,
        options: DailyQuotaOptions = {}
    ): Promise<DailyQuotaReservation> {
        // المشرفون/المطورون — تجاوز كامل بلا حصص.
        if (DtfTelemetryService.isQuotaBypassedRole(userRole)) {
            return { allowed: true, remaining: 9999, used: 0, tracked: false, source: "bypass", freeRemaining: 9999, paidBalance: 0 };
        }

        const controls = await DtfTelemetryService.resolveControls();

        // الفئة معطّلة → يُمنع التوليد نهائياً.
        if (!controls.audience[DtfTelemetryService.audienceKey(userRole)]) {
            return {
                allowed: false, remaining: 0, used: 0, tracked: false,
                source: "blocked", freeRemaining: 0, paidBalance: 0, reason: "audience_disabled",
            };
        }

        // الحصص معطّلة عالمياً → توليد بلا حدود للفئات المتاحة.
        if (!controls.quota_enabled) {
            return { allowed: true, remaining: 9999, used: 0, tracked: false, source: "unlimited", freeRemaining: 9999, paidBalance: 0 };
        }

        if (!profileId) {
            if (userRole === "guest") {
                const guestDailyLimit = await DtfTelemetryService.resolveGuestDailyLimit();
                const guestIdentifier = options.guestIdentifier?.trim();
                if (!guestIdentifier) {
                    return {
                        allowed: true, remaining: guestDailyLimit, used: 0, tracked: false,
                        source: "guest", freeRemaining: guestDailyLimit, paidBalance: 0,
                    };
                }

                try {
                    const result = await checkRateLimit(
                        `dtf-guest-daily-${guestIdentifier}`,
                        guestDailyLimit,
                        DtfTelemetryService.GUEST_DAILY_WINDOW_MS
                    );

                    return {
                        allowed: result.success,
                        remaining: result.remaining,
                        used: Math.max(0, guestDailyLimit - result.remaining),
                        quotaDate: new Date().toISOString().slice(0, 10),
                        tracked: true,
                        source: "guest",
                        freeRemaining: result.remaining,
                        paidBalance: 0,
                    };
                } catch (error) {
                    logDiagnosticWarning("dtf-telemetry-guest-quota-reserve", error);
                    return {
                        allowed: true, remaining: guestDailyLimit, used: 0, tracked: false,
                        source: "guest", freeRemaining: guestDailyLimit, paidBalance: 0,
                    };
                }
            }
            return { allowed: false, remaining: 0, used: 0, tracked: false, source: "none", freeRemaining: 0, paidBalance: 0, reason: "quota_exceeded" };
        }

        const dailyLimit = await DtfTelemetryService.resolveDailyLimit(userRole);
        const canPurchase = DtfTelemetryService.canRolePurchase(controls, userRole);
        const fallbackOpen = (): DailyQuotaReservation => ({
            allowed: true, remaining: dailyLimit, used: 0, tracked: false,
            source: "free", freeRemaining: dailyLimit, paidBalance: 0, canPurchase,
        });

        try {
            const sb = getSupabaseAdminClient();

            if (controls.credits_enabled) {
                // الدالة الهجينة: المجاني اليومي أولاً ثم الرصيد المدفوع، ذرّياً.
                const { data, error } = await sb.rpc("consume_washa_ai_generation", {
                    p_profile_id: profileId,
                    p_daily_limit: dailyLimit,
                });

                if (error) {
                    logDiagnosticWarning("dtf-telemetry-quota-reserve", error);
                    return fallbackOpen();
                }

                const payload = DtfTelemetryService.normalizeQuotaPayload(data as DailyQuotaRpcPayload | null);
                if (!payload || typeof payload.granted !== "boolean") {
                    logDiagnosticWarning("dtf-telemetry-quota-reserve-invalid", data);
                    return fallbackOpen();
                }

                const freeRemaining = typeof payload.free_remaining === "number" ? payload.free_remaining : 0;
                const paidBalance = typeof payload.paid_balance === "number" ? payload.paid_balance : 0;
                const source: QuotaSource =
                    payload.source === "paid" ? "paid" : payload.source === "none" ? "none" : "free";

                return {
                    allowed: payload.granted,
                    remaining: freeRemaining + paidBalance,
                    used: typeof payload.free_used === "number" ? payload.free_used : 0,
                    quotaDate: typeof payload.quota_date === "string" ? payload.quota_date : undefined,
                    tracked: payload.granted,
                    source,
                    freeRemaining,
                    paidBalance,
                    reason: payload.granted ? undefined : "quota_exceeded",
                    canPurchase,
                };
            }

            // نظام الرصيد معطّل → المنحة اليومية المجانية فقط (سقف صارم بلا محفظة).
            const { data, error } = await sb.rpc("reserve_dtf_daily_quota", {
                p_profile_id: profileId,
                p_daily_limit: dailyLimit,
            });

            if (error) {
                logDiagnosticWarning("dtf-telemetry-quota-reserve", error);
                return fallbackOpen();
            }

            const payload = DtfTelemetryService.normalizeQuotaPayload(data as DailyQuotaRpcPayload | null);
            if (!payload || typeof payload.granted !== "boolean") {
                logDiagnosticWarning("dtf-telemetry-quota-reserve-invalid", data);
                return fallbackOpen();
            }

            const freeRemaining = typeof payload.remaining === "number" ? payload.remaining : 0;
            return {
                allowed: payload.granted,
                remaining: freeRemaining,
                used: typeof payload.used === "number" ? payload.used : 0,
                quotaDate: typeof payload.quota_date === "string" ? payload.quota_date : undefined,
                tracked: payload.granted,
                source: payload.granted ? "free" : "none",
                freeRemaining,
                paidBalance: 0,
                reason: payload.granted ? undefined : "quota_exceeded",
                canPurchase,
            };
        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-quota-reserve-fatal", err);
            return fallbackOpen();
        }
    }

    static async releaseDailyQuota(
        profileId: string | null | undefined,
        userRole: string | null | undefined,
        source: QuotaSource = "free"
    ): Promise<boolean> {
        if (!profileId || DtfTelemetryService.isQuotaBypassedRole(userRole)) {
            return false;
        }

        // لا استرجاع للمصادر غير المستهلكة من الحساب.
        if (source !== "free" && source !== "paid") {
            return false;
        }

        const dailyLimit = await DtfTelemetryService.resolveDailyLimit(userRole);

        try {
            const sb = getSupabaseAdminClient();

            const { data, error } = await sb.rpc("refund_washa_ai_generation", {
                p_profile_id: profileId,
                p_source: source,
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

    /**
     * قراءة حالة الحصة دون استهلاك — للعرض في الواجهة (widget الرصيد).
     * لا يزيد أي عدّاد؛ يقرأ المستخدم اليومي المجاني + رصيد المحفظة.
     */
    static async getQuotaStatus(
        profileId: string | null | undefined,
        userRole: string | null | undefined
    ): Promise<QuotaStatus> {
        if (!profileId) {
            return { unlimited: false, blocked: false, freeLimit: 0, freeUsed: 0, freeRemaining: 0, paidBalance: 0, canPurchase: false };
        }

        if (DtfTelemetryService.isQuotaBypassedRole(userRole)) {
            return { unlimited: true, blocked: false, freeLimit: 0, freeUsed: 0, freeRemaining: 0, paidBalance: 0, canPurchase: false };
        }

        const controls = await DtfTelemetryService.resolveControls();

        // الفئة معطّلة → يُمنع التوليد.
        if (!controls.audience[DtfTelemetryService.audienceKey(userRole)]) {
            return { unlimited: false, blocked: true, freeLimit: 0, freeUsed: 0, freeRemaining: 0, paidBalance: 0, canPurchase: false };
        }

        // الحصص معطّلة عالمياً → غير محدود.
        if (!controls.quota_enabled) {
            return { unlimited: true, blocked: false, freeLimit: 0, freeUsed: 0, freeRemaining: 0, paidBalance: 0, canPurchase: false };
        }

        const freeLimit = await DtfTelemetryService.resolveDailyLimit(userRole);
        const canPurchase = DtfTelemetryService.canRolePurchase(controls, userRole);
        const quotaDate = new Date().toISOString().slice(0, 10);

        try {
            const sb = getSupabaseAdminClient();
            const [usageResult, walletResult] = await Promise.all([
                sb
                    .from("dtf_daily_quota_usage")
                    .select("used_count")
                    .eq("profile_id", profileId)
                    .eq("quota_date", quotaDate)
                    .maybeSingle(),
                sb
                    .from("washa_ai_credit_wallet")
                    .select("balance")
                    .eq("profile_id", profileId)
                    .maybeSingle(),
            ]);

            const freeUsed = Math.min(
                Math.max(Number(usageResult.data?.used_count) || 0, 0),
                freeLimit
            );
            // عند تعطيل نظام الرصيد، المحفظة غير قابلة للاستخدام — نعرضها صفراً.
            const paidBalance = controls.credits_enabled
                ? Math.max(Number(walletResult.data?.balance) || 0, 0)
                : 0;

            return {
                unlimited: false,
                blocked: false,
                freeLimit,
                freeUsed,
                freeRemaining: Math.max(freeLimit - freeUsed, 0),
                paidBalance,
                canPurchase,
            };
        } catch (err) {
            logDiagnosticWarning("dtf-telemetry-quota-status-fatal", err);
            return {
                unlimited: false,
                blocked: false,
                freeLimit,
                freeUsed: 0,
                freeRemaining: freeLimit,
                paidBalance: 0,
                canPurchase,
            };
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
