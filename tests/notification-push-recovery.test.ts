import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockCreateClient,
    mockRunIdempotentDispatch,
    mockSendPushToUser,
    state,
} = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockRunIdempotentDispatch: vi.fn(),
    mockSendPushToUser: vi.fn(),
    state: {
        storedPreferences: null as Record<string, unknown> | null,
        dispatches: [] as Array<Record<string, unknown>>,
        notifications: [] as Array<Record<string, unknown>>,
        terminalUpdates: [] as Array<Record<string, unknown>>,
    },
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/idempotent-dispatch", () => ({
    DispatchDeliveryError: class DispatchDeliveryError extends Error {},
    runIdempotentDispatch: mockRunIdempotentDispatch,
}));
vi.mock("@/lib/push", () => ({ sendPushToUser: mockSendPushToUser }));

import { recoverFailedUserNotificationPushes } from "@/lib/user-notifications";

function makeSupabaseClient() {
    return {
        from: vi.fn((table: string) => {
            if (table === "event_dispatches") {
                const query = {
                    eq: vi.fn(() => query),
                    in: vi.fn(() => query),
                    order: vi.fn(() => query),
                    limit: vi.fn(async () => ({ data: state.dispatches, error: null })),
                };
                return {
                    select: vi.fn(() => query),
                    update: vi.fn((payload: Record<string, unknown>) => {
                        const updateQuery = {
                            eq: vi.fn(() => updateQuery),
                            select: vi.fn(() => ({
                                maybeSingle: vi.fn(async () => {
                                    state.terminalUpdates.push(payload);
                                    return { data: { id: "dispatch_1" }, error: null };
                                }),
                            })),
                        };
                        return updateQuery;
                    }),
                };
            }
            if (table === "user_notifications") {
                return {
                    select: vi.fn(() => ({
                        in: vi.fn(async () => ({ data: state.notifications, error: null })),
                    })),
                };
            }
            if (table === "notification_preferences") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: vi.fn(async () => ({
                                data: state.storedPreferences,
                                error: null,
                            })),
                        })),
                    })),
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        }),
    };
}

function dispatch(overrides: Record<string, unknown> = {}) {
    return {
        id: "dispatch_1",
        dispatch_key: "user_notification:notification_1:push",
        resource_id: "notification_1",
        status: "failed",
        attempt_count: 1,
        updated_at: "2020-01-01T00:00:00.000Z",
        metadata: { failed_endpoints: ["https://push.example/failed-device"] },
        ...overrides,
    };
}

function notification() {
    return {
        id: "notification_1",
        user_id: "user_1",
        type: "order_update",
        title: "تحديث حالة الطلب",
        message: "تم شحن طلبك",
        link: "/account/orders",
    };
}

describe("failed user push recovery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        state.storedPreferences = null;
        state.dispatches = [dispatch()];
        state.notifications = [notification()];
        state.terminalUpdates = [];
        mockCreateClient.mockReturnValue(makeSupabaseClient());
        mockSendPushToUser.mockResolvedValue({ sent: 1, failed: 0, failedEndpoints: [] });
        mockRunIdempotentDispatch.mockImplementation(async (
            options: { dispatchKey: string },
            task: () => Promise<void>
        ) => {
            await task();
            return { success: true, skipped: false, dispatchKey: options.dispatchKey };
        });
    });

    it("retries only the failed endpoint without duplicating a push that already arrived elsewhere", async () => {
        await expect(recoverFailedUserNotificationPushes(10)).resolves.toEqual({
            ok: true,
            inspected: 1,
            recovered: 1,
            failed: 0,
            terminal: 0,
            skipped: 0,
        });
        expect(mockSendPushToUser).toHaveBeenCalledWith(
            "user_1",
            "تحديث حالة الطلب",
            "تم شحن طلبك",
            "/account/orders",
            ["https://push.example/failed-device"]
        );
    });

    it("quarantines a stale processing dispatch instead of risking duplicate delivery", async () => {
        state.dispatches = [dispatch({ status: "processing" })];
        await expect(recoverFailedUserNotificationPushes(10)).resolves.toMatchObject({
            ok: false,
            recovered: 0,
            terminal: 1,
        });
        expect(mockRunIdempotentDispatch).not.toHaveBeenCalled();
        expect(state.terminalUpdates[0]).toMatchObject({ status: "delivery_unknown" });
    });

    it("closes the failed dispatch without sending when the user disabled that category", async () => {
        state.storedPreferences = {
            profile_id: "user_1",
            push_enabled: true,
            order_updates: false,
        };
        await expect(recoverFailedUserNotificationPushes(10)).resolves.toMatchObject({
            ok: true,
            recovered: 1,
        });
        expect(mockSendPushToUser).not.toHaveBeenCalled();
    });

    it("dead-letters an orphan dispatch instead of returning 500 forever", async () => {
        state.notifications = [];
        await expect(recoverFailedUserNotificationPushes(10)).resolves.toEqual({
            ok: false,
            inspected: 1,
            recovered: 0,
            failed: 0,
            terminal: 1,
            skipped: 0,
        });
        expect(state.terminalUpdates[0]).toMatchObject({
            metadata: expect.objectContaining({ recovery_terminal: true }),
        });
        expect(mockRunIdempotentDispatch).not.toHaveBeenCalled();
    });

    it("dead-letters a permanently failing dispatch after the maximum attempts", async () => {
        state.dispatches = [dispatch({ attempt_count: 5 })];
        await expect(recoverFailedUserNotificationPushes(10)).resolves.toMatchObject({
            ok: false,
            recovered: 0,
            terminal: 1,
        });
        expect(state.terminalUpdates[0]).toMatchObject({
            last_error: "Push recovery attempts exhausted",
        });
    });
});
