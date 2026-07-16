import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockCreateClient,
    mockRunIdempotentDispatch,
    mockSendPushToUser,
} = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockRunIdempotentDispatch: vi.fn(),
    mockSendPushToUser: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));
vi.mock("@/lib/idempotent-dispatch", () => ({
    runIdempotentDispatch: mockRunIdempotentDispatch,
}));
vi.mock("@/lib/push", () => ({ sendPushToUser: mockSendPushToUser }));

import { createUserNotification } from "@/lib/user-notifications";

function makeSupabaseClient() {
    return {
        from: vi.fn((table: string) => {
            if (table === "user_notifications") {
                return {
                    insert: vi.fn(() => ({
                        select: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: { id: "notification_1" },
                                error: null,
                            })),
                        })),
                    })),
                };
            }

            if (table === "notification_preferences") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
                        })),
                    })),
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        }),
    };
}

describe("user notification delivery", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        mockCreateClient.mockReturnValue(makeSupabaseClient());
        mockSendPushToUser.mockResolvedValue({ sent: 1, failed: 0 });
        mockRunIdempotentDispatch.mockImplementation(async (
            _options: unknown,
            task: () => Promise<void>
        ) => {
            await task();
            return { success: true, skipped: false };
        });
    });

    it("persists the in-app notification and tracks its push by notification id", async () => {
        await expect(createUserNotification({
            userId: "user_1",
            type: "order_update",
            title: "تحديث حالة الطلب",
            message: "تم شحن طلبك",
            link: "/account/orders",
        })).resolves.toEqual({ success: true });

        expect(mockRunIdempotentDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                dispatchKey: "user_notification:notification_1:push",
                resourceId: "notification_1",
            }),
            expect.any(Function)
        );
        expect(mockSendPushToUser).toHaveBeenCalledTimes(1);
    });

    it("keeps the in-app notification successful when push is recorded for retry", async () => {
        mockSendPushToUser.mockResolvedValue({ sent: 0, failed: 1 });
        mockRunIdempotentDispatch.mockImplementation(async (
            _options: unknown,
            task: () => Promise<void>
        ) => {
            await task();
            return { success: true, skipped: false };
        });
        vi.spyOn(console, "warn").mockImplementation(() => undefined);

        await expect(createUserNotification({
            userId: "user_1",
            type: "order_update",
            title: "تحديث حالة الطلب",
            message: "تم شحن طلبك",
        })).resolves.toEqual({ success: true });
    });
});
