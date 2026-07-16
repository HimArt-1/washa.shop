import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockRecoverPostResponseJobs,
    mockRecoverFailedUserNotificationPushes,
    mockRecoverFailedAdminNotificationDeliveries,
} = vi.hoisted(() => ({
    mockRecoverPostResponseJobs: vi.fn(),
    mockRecoverFailedUserNotificationPushes: vi.fn(),
    mockRecoverFailedAdminNotificationDeliveries: vi.fn(),
}));

vi.mock("@/lib/post-response-recovery", () => ({
    recoverPostResponseJobs: mockRecoverPostResponseJobs,
}));

vi.mock("@/lib/user-notifications", () => ({
    recoverFailedUserNotificationPushes: mockRecoverFailedUserNotificationPushes,
}));
vi.mock("@/lib/admin-notification-delivery", () => ({
    recoverFailedAdminNotificationDeliveries: mockRecoverFailedAdminNotificationDeliveries,
}));

import { GET } from "@/app/api/cron/post-response-jobs/route";

describe("notification recovery cron", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = "cron-test-secret";
        mockRecoverPostResponseJobs.mockResolvedValue({
            ok: true,
            seeded: 0,
            inspected: 0,
            failed: 0,
        });
        mockRecoverFailedUserNotificationPushes.mockResolvedValue({
            ok: true,
            inspected: 2,
            recovered: 2,
            failed: 0,
            terminal: 0,
            skipped: 0,
        });
        mockRecoverFailedAdminNotificationDeliveries.mockResolvedValue({
            ok: true,
            inspected: 1,
            recovered: 1,
            failed: 0,
            terminal: 0,
            skipped: 0,
        });
    });

    it("recovers failed user pushes during the existing five-minute recovery cron", async () => {
        const response = await GET(new Request("http://localhost/api/cron/post-response-jobs", {
            headers: { authorization: "Bearer cron-test-secret" },
        }) as never);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            seeded: 0,
            inspected: 0,
            failed: 0,
            notificationPushRecovery: {
                ok: true,
                inspected: 2,
                recovered: 2,
                failed: 0,
                terminal: 0,
                skipped: 0,
            },
            adminNotificationRecovery: {
                ok: true,
                inspected: 1,
                recovered: 1,
                failed: 0,
                terminal: 0,
                skipped: 0,
            },
        });
        expect(mockRecoverFailedUserNotificationPushes).toHaveBeenCalledTimes(1);
        expect(mockRecoverFailedAdminNotificationDeliveries).toHaveBeenCalledTimes(1);
    });
});
