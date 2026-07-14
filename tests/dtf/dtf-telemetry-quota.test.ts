import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetWashaAiSettings,
    mockCheckRateLimit,
    mockReleaseRateLimit,
    mockPeekRateLimit,
    mockIsRateLimitRefundAvailable,
    mockGetSupabaseAdminClient,
    mockRpc,
} = vi.hoisted(() => ({
    mockGetWashaAiSettings: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockReleaseRateLimit: vi.fn(),
    mockPeekRateLimit: vi.fn(),
    mockIsRateLimitRefundAvailable: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
    mockRpc: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    getWashaAiSettings: mockGetWashaAiSettings,
}));

vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
    releaseRateLimit: mockReleaseRateLimit,
    peekRateLimit: mockPeekRateLimit,
    isRateLimitRefundAvailable: mockIsRateLimitRefundAvailable,
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

import { DtfTelemetryService } from "@/app/api/washa-dtf-studio/services/dtf-telemetry.service";

describe("DtfTelemetryService quota reservation", () => {
    beforeEach(() => {
        mockGetWashaAiSettings.mockReset();
        mockCheckRateLimit.mockReset();
        mockReleaseRateLimit.mockReset();
        mockPeekRateLimit.mockReset();
        mockIsRateLimitRefundAvailable.mockReset();
        mockGetSupabaseAdminClient.mockReset();
        mockRpc.mockReset();
        delete process.env.WASHA_AI_QUOTA_FAIL_OPEN;

        mockGetWashaAiSettings.mockResolvedValue({
            dtf_daily_quota_limit: 5,
            dtf_guest_daily_quota_limit: 3,
            dtf_booth_daily_quota_limit: 12,
            dtf_wushsha_daily_quota_limit: 15,
            controls: {
                quota_enabled: true,
                credits_enabled: true,
                audience: { guest: true, subscriber: true, wushsha: true, booth: true },
                purchase: { subscriber: true, wushsha: true },
            },
        });
        mockCheckRateLimit.mockResolvedValue({
            success: true,
            remaining: 2,
            resetAt: Date.now() + 86_400_000,
        });
        mockReleaseRateLimit.mockResolvedValue(true);
        mockPeekRateLimit.mockResolvedValue({ success: true, remaining: 1, resetAt: Date.now() + 86_400_000 });
        mockIsRateLimitRefundAvailable.mockResolvedValue(true);
        mockRpc.mockResolvedValue({
            data: {
                granted: true,
                source: "free",
                free_used: 1,
                free_remaining: 11,
                free_limit: 12,
                paid_balance: 4,
                quota_date: "2026-07-07",
            },
            error: null,
        });
        mockGetSupabaseAdminClient.mockReturnValue({
            rpc: mockRpc,
        });
    });

    it("reserves guest generation quota with the configured guest limit", async () => {
        const result = await DtfTelemetryService.reserveDailyQuota(undefined, "guest", {
            guestIdentifier: "guest:127.0.0.1",
        });

        expect(mockCheckRateLimit).toHaveBeenCalledWith(
            "dtf-guest-daily-guest:127.0.0.1",
            3,
            86_400_000
        );
        expect(result).toMatchObject({
            allowed: true,
            remaining: 2,
            used: 1,
            tracked: true,
        });
    });

    it("fails closed before consuming guest quota when refund infrastructure is missing", async () => {
        mockIsRateLimitRefundAvailable.mockResolvedValue(false);

        const result = await DtfTelemetryService.reserveDailyQuota(undefined, "guest", {
            guestIdentifier: "guest:127.0.0.1",
        });

        expect(result).toMatchObject({
            allowed: false,
            tracked: false,
            reason: "quota_unavailable",
        });
        expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it("falls back without blocking guests when no identifier is available", async () => {
        const result = await DtfTelemetryService.reserveDailyQuota(undefined, "guest");

        expect(mockCheckRateLimit).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            allowed: true,
            remaining: 3,
            used: 0,
            tracked: false,
        });
    });

    it("returns a guest quota reservation when generation fails", async () => {
        const released = await DtfTelemetryService.releaseDailyQuota(undefined, "guest", "guest", {
            guestIdentifier: "guest:127.0.0.1",
        });

        expect(mockReleaseRateLimit).toHaveBeenCalledWith(
            "dtf-guest-daily-guest:127.0.0.1",
            86_400_000
        );
        expect(released).toBe(true);
    });

    it("reports the guest quota without consuming another generation", async () => {
        const result = await DtfTelemetryService.getQuotaStatus(undefined, "guest", {
            guestIdentifier: "guest:127.0.0.1",
        });

        expect(mockPeekRateLimit).toHaveBeenCalledWith(
            "dtf-guest-daily-guest:127.0.0.1",
            3,
            86_400_000
        );
        expect(mockCheckRateLimit).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            audience: "guest",
            freeLimit: 3,
            freeUsed: 2,
            freeRemaining: 1,
            paidBalance: 0,
            canPurchase: false,
        });
    });

    it("reserves booth generation quota with the configured booth limit", async () => {
        const result = await DtfTelemetryService.reserveDailyQuota("profile_1", "booth");

        expect(mockRpc).toHaveBeenCalledWith("consume_washa_ai_generation", {
            p_profile_id: "profile_1",
            p_daily_limit: 12,
        });
        expect(result).toMatchObject({
            allowed: true,
            remaining: 15,
            used: 1,
            quotaDate: "2026-07-07",
            tracked: true,
            source: "free",
            freeRemaining: 11,
            paidBalance: 4,
        });
    });

    it("uses paid balance after the free quota is exhausted", async () => {
        mockRpc.mockResolvedValueOnce({
            data: {
                granted: true,
                source: "paid",
                free_used: 12,
                free_remaining: 0,
                free_limit: 12,
                paid_balance: 8,
                quota_date: "2026-07-07",
            },
            error: null,
        });

        const result = await DtfTelemetryService.reserveDailyQuota("profile_1", "booth");

        expect(result).toMatchObject({
            allowed: true,
            remaining: 8,
            used: 12,
            tracked: true,
            source: "paid",
            freeRemaining: 0,
            paidBalance: 8,
        });
    });

    it("consumes exactly one point for each consecutive successful generation", async () => {
        mockRpc
            .mockResolvedValueOnce({
                data: {
                    granted: true,
                    source: "free",
                    free_used: 1,
                    free_remaining: 4,
                    free_limit: 5,
                    paid_balance: 0,
                    quota_date: "2026-07-12",
                },
                error: null,
            })
            .mockResolvedValueOnce({
                data: {
                    granted: true,
                    source: "free",
                    free_used: 2,
                    free_remaining: 3,
                    free_limit: 5,
                    paid_balance: 0,
                    quota_date: "2026-07-12",
                },
                error: null,
            });

        const first = await DtfTelemetryService.reserveDailyQuota("profile_1", "subscriber");
        const second = await DtfTelemetryService.reserveDailyQuota("profile_1", "subscriber");

        expect(mockRpc).toHaveBeenCalledTimes(2);
        expect(first).toMatchObject({ used: 1, freeRemaining: 4, remaining: 4 });
        expect(second).toMatchObject({ used: 2, freeRemaining: 3, remaining: 3 });
    });

    it("blocks generation when neither free quota nor paid balance is available", async () => {
        mockRpc.mockResolvedValueOnce({
            data: {
                granted: false,
                source: "none",
                free_used: 5,
                free_remaining: 0,
                free_limit: 5,
                paid_balance: 0,
                quota_date: "2026-07-07",
            },
            error: null,
        });

        const result = await DtfTelemetryService.reserveDailyQuota("profile_1", "subscriber");

        expect(result).toMatchObject({
            allowed: false,
            tracked: false,
            reason: "quota_exceeded",
            canPurchase: true,
            freeRemaining: 0,
            paidBalance: 0,
        });
    });

    it("fails closed when quota reservation RPC fails", async () => {
        mockRpc.mockResolvedValueOnce({
            data: null,
            error: { message: "database unavailable" },
        });

        const result = await DtfTelemetryService.reserveDailyQuota("profile_1", "subscriber");

        expect(result).toMatchObject({
            allowed: false,
            tracked: false,
            reason: "quota_unavailable",
            remaining: 0,
            freeRemaining: 0,
            paidBalance: 0,
        });
    });

    it("supports explicit fail-open emergency mode for quota backend failures", async () => {
        process.env.WASHA_AI_QUOTA_FAIL_OPEN = "true";
        mockRpc.mockResolvedValueOnce({
            data: null,
            error: { message: "database unavailable" },
        });

        const result = await DtfTelemetryService.reserveDailyQuota("profile_1", "subscriber");

        expect(result).toMatchObject({
            allowed: true,
            tracked: false,
            remaining: 5,
            freeRemaining: 5,
            paidBalance: 0,
        });
    });

    it("releases booth generation quota with the configured booth limit", async () => {
        mockRpc.mockResolvedValueOnce({
            data: { released: true },
            error: null,
        });

        const released = await DtfTelemetryService.releaseDailyQuota("profile_1", "booth");

        expect(mockRpc).toHaveBeenCalledWith("refund_washa_ai_generation", {
            p_profile_id: "profile_1",
            p_source: "free",
            p_daily_limit: 12,
        });
        expect(released).toBe(true);
    });

    it("releases paid generation credits with the consumed source", async () => {
        mockRpc.mockResolvedValueOnce({
            data: { released: true, source: "paid", paid_balance: 9 },
            error: null,
        });

        const released = await DtfTelemetryService.releaseDailyQuota("profile_1", "booth", "paid");

        expect(mockRpc).toHaveBeenCalledWith("refund_washa_ai_generation", {
            p_profile_id: "profile_1",
            p_source: "paid",
            p_daily_limit: 12,
        });
        expect(released).toBe(true);
    });
});
