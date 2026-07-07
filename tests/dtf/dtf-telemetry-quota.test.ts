import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetWashaAiSettings,
    mockCheckRateLimit,
    mockGetSupabaseAdminClient,
    mockRpc,
} = vi.hoisted(() => ({
    mockGetWashaAiSettings: vi.fn(),
    mockCheckRateLimit: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
    mockRpc: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    getWashaAiSettings: mockGetWashaAiSettings,
}));

vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

import { DtfTelemetryService } from "@/app/api/washa-dtf-studio/services/dtf-telemetry.service";

describe("DtfTelemetryService quota reservation", () => {
    beforeEach(() => {
        mockGetWashaAiSettings.mockReset();
        mockCheckRateLimit.mockReset();
        mockGetSupabaseAdminClient.mockReset();
        mockRpc.mockReset();

        mockGetWashaAiSettings.mockResolvedValue({
            dtf_daily_quota_limit: 5,
            dtf_guest_daily_quota_limit: 3,
            dtf_booth_daily_quota_limit: 12,
        });
        mockCheckRateLimit.mockResolvedValue({
            success: true,
            remaining: 2,
            resetAt: Date.now() + 86_400_000,
        });
        mockRpc.mockResolvedValue({
            data: {
                granted: true,
                remaining: 11,
                used: 1,
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

    it("reserves booth generation quota with the configured booth limit", async () => {
        const result = await DtfTelemetryService.reserveDailyQuota("profile_1", "booth");

        expect(mockRpc).toHaveBeenCalledWith("reserve_dtf_daily_quota", {
            p_profile_id: "profile_1",
            p_daily_limit: 12,
        });
        expect(result).toMatchObject({
            allowed: true,
            remaining: 11,
            used: 1,
            quotaDate: "2026-07-07",
            tracked: true,
        });
    });

    it("releases booth generation quota with the configured booth limit", async () => {
        mockRpc.mockResolvedValueOnce({
            data: { released: true },
            error: null,
        });

        const released = await DtfTelemetryService.releaseDailyQuota("profile_1", "booth");

        expect(mockRpc).toHaveBeenCalledWith("release_dtf_daily_quota", {
            p_profile_id: "profile_1",
            p_daily_limit: 12,
        });
        expect(released).toBe(true);
    });
});
