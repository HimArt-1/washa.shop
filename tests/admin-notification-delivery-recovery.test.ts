import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockCreateClient,
    mockRunIdempotentDispatch,
    mockGetConfiguredChannels,
    mockSendAdminNotificationChannel,
    mockSendPushToAdmins,
    MockDispatchPersistenceError,
    state,
} = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockRunIdempotentDispatch: vi.fn(),
    mockGetConfiguredChannels: vi.fn(),
    mockSendAdminNotificationChannel: vi.fn(),
    mockSendPushToAdmins: vi.fn(),
    MockDispatchPersistenceError: class MockDispatchPersistenceError extends Error {
        stage: "claim" | "ack";
        constructor(stage: "claim" | "ack", message: string) {
            super(message);
            this.stage = stage;
        }
    },
    state: { dispatches: [] as Array<Record<string, unknown>> },
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/idempotent-dispatch", () => ({
    DispatchDeliveryError: class DispatchDeliveryError extends Error {
        dispatchMetadata: Record<string, unknown>;
        constructor(message: string, metadata: Record<string, unknown>) {
            super(message);
            this.dispatchMetadata = metadata;
        }
    },
    DispatchPersistenceError: MockDispatchPersistenceError,
    runIdempotentDispatch: mockRunIdempotentDispatch,
}));
vi.mock("@/lib/notifications", () => ({
    getConfiguredAdminNotificationChannels: mockGetConfiguredChannels,
    sendAdminNotificationChannel: mockSendAdminNotificationChannel,
}));
vi.mock("@/lib/push", () => ({ sendPushToAdmins: mockSendPushToAdmins }));

import {
    recoverFailedAdminNotificationDeliveries,
    runRecoverableAdminWebhookDispatch,
} from "@/lib/admin-notification-delivery";

function makeSupabaseClient() {
    return {
        from: vi.fn(() => {
            const query = {
                in: vi.fn(() => query),
                order: vi.fn(() => query),
                limit: vi.fn(async () => ({ data: state.dispatches, error: null })),
            };
            return {
                select: vi.fn(() => query),
                update: vi.fn(() => {
                    const updateQuery = {
                        eq: vi.fn(() => updateQuery),
                        select: vi.fn(() => ({
                            maybeSingle: vi.fn(async () => ({ data: { id: "dispatch_1" }, error: null })),
                        })),
                    };
                    return updateQuery;
                }),
            };
        }),
    };
}

describe("recoverable admin notification delivery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
        state.dispatches = [];
        mockCreateClient.mockReturnValue(makeSupabaseClient());
        mockGetConfiguredChannels.mockReturnValue(["telegram", "discord"]);
        mockRunIdempotentDispatch.mockImplementation(async (
            options: Record<string, unknown>,
            task: () => Promise<void>
        ) => {
            await task();
            return { success: true, skipped: false, options };
        });
        mockSendPushToAdmins.mockResolvedValue({ sent: 1, failed: 0, failedEndpoints: [] });
    });

    it("tracks Telegram and Discord independently so one failure does not lose the other channel", async () => {
        mockSendAdminNotificationChannel.mockImplementation(async (channel: string) => ({
            channel,
            ok: channel === "telegram",
            status: channel === "telegram" ? 200 : 503,
        }));

        const result = await runRecoverableAdminWebhookDispatch(
            {
                dispatchKey: "support:ticket_1:webhook",
                eventType: "support_ticket_created",
                resourceType: "support_ticket",
                resourceId: "ticket_1",
            },
            "تذكرة دعم جديدة"
        );

        expect(mockRunIdempotentDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                dispatchKey: expect.stringMatching(/^support:ticket_1:webhook:telegram:[a-f0-9]{12}$/),
                channel: "webhook_admin:telegram",
            }),
            expect.any(Function)
        );
        expect(mockRunIdempotentDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                dispatchKey: expect.stringMatching(/^support:ticket_1:webhook:discord:[a-f0-9]{12}$/),
                channel: "webhook_admin:discord",
            }),
            expect.any(Function)
        );
        expect(result.channelResults).toEqual([
            expect.objectContaining({ channel: "telegram", ok: true }),
            expect.objectContaining({ channel: "discord", ok: false }),
        ]);
    });

    it("recovers only the failed admin push endpoints from the durable payload", async () => {
        state.dispatches = [{
            id: "dispatch_1",
            dispatch_key: "order:1:admin_push:new_order",
            event_type: "order_created",
            channel: "push_admin",
            resource_type: "order",
            resource_id: "1",
            status: "failed",
            attempt_count: 1,
            updated_at: "2020-01-01T00:00:00.000Z",
            metadata: {
                delivery_title: "طلب جديد",
                delivery_body: "طلب #1",
                delivery_url: "/dashboard/orders",
                failed_endpoints: ["https://push.example/failed-admin-device"],
            },
        }];

        await expect(recoverFailedAdminNotificationDeliveries()).resolves.toEqual({
            ok: true,
            inspected: 1,
            recovered: 1,
            failed: 0,
            terminal: 0,
            skipped: 0,
        });
        expect(mockSendPushToAdmins).toHaveBeenCalledWith(
            "طلب جديد",
            "طلب #1",
            "/dashboard/orders",
            ["https://push.example/failed-admin-device"]
        );
    });

    it("abandons a failed webhook explicitly when its channel is no longer configured", async () => {
        mockGetConfiguredChannels.mockReturnValue(["telegram"]);
        state.dispatches = [{
            id: "dispatch_2",
            dispatch_key: "support:ticket_1:webhook:discord:hash",
            event_type: "support_ticket_created",
            channel: "webhook_admin:discord",
            resource_type: "support_ticket",
            resource_id: "ticket_1",
            status: "failed",
            attempt_count: 1,
            updated_at: "2020-01-01T00:00:00.000Z",
            metadata: {
                delivery_channel: "discord",
                delivery_message: "تذكرة دعم جديدة",
            },
        }];

        await expect(recoverFailedAdminNotificationDeliveries()).resolves.toMatchObject({
            ok: false,
            recovered: 0,
            failed: 0,
            terminal: 1,
        });
        expect(mockSendAdminNotificationChannel).not.toHaveBeenCalled();
    });

    it("falls back to direct delivery when the dispatch record cannot be persisted", async () => {
        mockRunIdempotentDispatch.mockRejectedValueOnce(
            new MockDispatchPersistenceError("claim", "dispatch database unavailable")
        );
        mockSendAdminNotificationChannel.mockImplementation(async (channel: string) => ({
            channel,
            ok: true,
            status: 200,
        }));

        await expect(runRecoverableAdminWebhookDispatch(
            { dispatchKey: "support:ticket_2:webhook", eventType: "support_ticket_created" },
            "تذكرة دعم جديدة"
        )).resolves.toMatchObject({
            channelResults: expect.arrayContaining([
                expect.objectContaining({ ok: true }),
            ]),
        });
        expect(mockSendAdminNotificationChannel).toHaveBeenCalled();
    });

    it("does not directly resend when only the post-delivery acknowledgement failed", async () => {
        mockGetConfiguredChannels.mockReturnValue(["telegram"]);
        mockRunIdempotentDispatch.mockRejectedValueOnce(
            new MockDispatchPersistenceError("ack", "sent acknowledgement unavailable")
        );

        await expect(runRecoverableAdminWebhookDispatch(
            { dispatchKey: "support:ticket_3:webhook", eventType: "support_ticket_created" },
            "تذكرة دعم جديدة"
        )).rejects.toThrow("sent acknowledgement unavailable");
        expect(mockSendAdminNotificationChannel).not.toHaveBeenCalled();
    });
});
