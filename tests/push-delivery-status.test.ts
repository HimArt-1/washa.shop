import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockReportAdminOperationalAlert, state } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockReportAdminOperationalAlert: vi.fn(),
    state: {
        subscriptions: [] as Array<{ endpoint: string; p256dh: string; auth: string }>,
    },
}));

vi.mock("web-push", () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn(),
    },
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("@/lib/admin-operational-alerts", () => ({
    reportAdminOperationalAlert: mockReportAdminOperationalAlert,
}));

describe("push delivery status", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv("VAPID_PUBLIC_KEY", "");
        vi.stubEnv("VAPID_PRIVATE_KEY", "");
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
        state.subscriptions = [{
            endpoint: "https://push.example/subscription",
            p256dh: "p256dh",
            auth: "auth",
        }];
        mockCreateClient.mockReturnValue({
            from: vi.fn((table: string) => {
                if (table === "profiles") {
                    return {
                        select: vi.fn(() => ({
                            in: vi.fn(async () => ({
                                data: [{ id: "admin_1" }],
                                error: null,
                            })),
                        })),
                    };
                }

                let inCalls = 0;
                const query = {
                    in: vi.fn(() => {
                        inCalls += 1;
                        return inCalls >= 2
                            ? Promise.resolve({ data: state.subscriptions, error: null })
                            : query;
                    }),
                    eq: vi.fn(async () => ({
                        data: state.subscriptions,
                        error: null,
                    })),
                };
                return { select: vi.fn(() => query) };
            }),
        });
        mockReportAdminOperationalAlert.mockResolvedValue({ logged: true });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("reports missing VAPID configuration as a retryable delivery failure", async () => {
        const { sendPushToAdminsReliably, sendPushToUser } = await import("@/lib/push");

        await expect(sendPushToUser(
            "user_1",
            "تحديث الطلب",
            "تم شحن طلبك",
            "/account/orders"
        )).resolves.toEqual({
            sent: 0,
            failed: 1,
            failedEndpoints: ["https://push.example/subscription"],
        });
        await expect(sendPushToAdminsReliably(
            "طلب جديد",
            "يوجد طلب جديد يحتاج المراجعة",
            "/dashboard/orders"
        )).rejects.toThrow("Admin push delivery failed");
    });

    it("does not report a configuration failure when the user has no push subscription", async () => {
        state.subscriptions = [];
        const { sendPushToUser } = await import("@/lib/push");

        await expect(sendPushToUser(
            "user_1",
            "تحديث الطلب",
            "تم شحن طلبك"
        )).resolves.toEqual({ sent: 0, failed: 0, failedEndpoints: [] });
        expect(mockReportAdminOperationalAlert).not.toHaveBeenCalled();
    });
});
