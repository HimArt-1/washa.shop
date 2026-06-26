import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetWashaAiSettings,
    mockCheckRateLimit,
} = vi.hoisted(() => ({
    mockGetWashaAiSettings: vi.fn(),
    mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/app/actions/settings", () => ({
    getWashaAiSettings: mockGetWashaAiSettings,
}));

vi.mock("@/lib/rate-limit", () => ({
    checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: vi.fn(),
}));

import { DtfTelemetryService } from "@/app/api/washa-dtf-studio/services/dtf-telemetry.service";

describe("DtfTelemetryService quota reservation", () => {
    beforeEach(() => {
        mockGetWashaAiSettings.mockReset();
        mockCheckRateLimit.mockReset();

        mockGetWashaAiSettings.mockResolvedValue({
            dtf_daily_quota_limit: 5,
            dtf_guest_daily_quota_limit: 3,
        });
        mockCheckRateLimit.mockResolvedValue({
            success: true,
            remaining: 2,
            resetAt: Date.now() + 86_400_000,
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
});
