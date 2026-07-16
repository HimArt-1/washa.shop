import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetCurrentUserOrDevAdmin,
    mockResolveAdminAccess,
    mockCreateUserNotification,
    mockRunIdempotentDispatch,
    mockReportAdminOperationalAlert,
    mockRestoreStockForOrder,
    state,
} = vi.hoisted(() => ({
    mockGetCurrentUserOrDevAdmin: vi.fn(),
    mockResolveAdminAccess: vi.fn(),
    mockCreateUserNotification: vi.fn(),
    mockRunIdempotentDispatch: vi.fn(),
    mockReportAdminOperationalAlert: vi.fn(),
    mockRestoreStockForOrder: vi.fn(),
    state: {
        status: "pending",
        updatedAt: "2026-07-16T06:00:00.000000+00:00",
        databaseUpdatedAt: "2026-07-16T06:30:00.123456+00:00",
        databaseUpdatedAtQueue: [] as string[],
        failedDispatchKeys: new Set<string>(),
        dispatchKeys: [] as string[],
        updateFilters: [] as Array<[string, string]>,
        concurrentUpdate: false,
        metadata: {} as Record<string, unknown>,
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((fn) => fn),
    unstable_noStore: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: mockGetCurrentUserOrDevAdmin,
    resolveAdminAccess: mockResolveAdminAccess,
}));

vi.mock("@/lib/user-notifications", () => ({
    createUserNotification: mockCreateUserNotification,
}));

vi.mock("@/lib/idempotent-dispatch", () => ({
    runIdempotentDispatch: mockRunIdempotentDispatch,
}));

vi.mock("@/lib/admin-operational-alerts", () => ({
    reportAdminOperationalAlert: mockReportAdminOperationalAlert,
}));
vi.mock("@/lib/inventory", () => ({ restoreStockForOrder: mockRestoreStockForOrder }));

import { updateOrderStatus } from "@/app/actions/admin";

function makeSupabaseClient() {
    return {
        rpc: vi.fn(async () => ({ data: true, error: null })),
        from: vi.fn((table: string) => {
            if (table === "orders") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    status: state.status,
                                    payment_status: "paid",
                                    buyer_id: "buyer_1",
                                    order_number: "W-1001",
                                    metadata: state.metadata,
                                    coupon_id: null,
                                    updated_at: state.updatedAt,
                                },
                                error: null,
                            })),
                        })),
                    })),
                    update: vi.fn((payload: Record<string, unknown>) => {
                        const query = {
                            eq: vi.fn((column: string, value: string) => {
                                state.updateFilters.push([column, value]);
                                return query;
                            }),
                            select: vi.fn(() => ({
                                maybeSingle: vi.fn(async () => {
                                    if (state.concurrentUpdate) {
                                        return { data: null, error: null };
                                    }
                                    if (typeof payload.status === "string") {
                                        state.status = payload.status;
                                    }
                                    if (payload.metadata && typeof payload.metadata === "object") {
                                        state.metadata = payload.metadata as Record<string, unknown>;
                                    }
                                    state.updatedAt = state.databaseUpdatedAtQueue.shift()
                                        || state.databaseUpdatedAt;
                                    return {
                                        data: { updated_at: state.updatedAt },
                                        error: null,
                                    };
                                }),
                            })),
                        };
                        return query;
                    }),
                };
            }

            if (table === "event_dispatches") {
                let dispatchKey = "";
                const query = {
                    eq: vi.fn((column: string, value: string) => {
                        if (column === "dispatch_key") dispatchKey = value;
                        return query;
                    }),
                    maybeSingle: vi.fn(async () => ({
                        data: state.failedDispatchKeys.has(dispatchKey)
                            ? { id: "failed_dispatch_1" }
                            : null,
                        error: null,
                    })),
                };
                return {
                    select: vi.fn(() => query),
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        }),
    };
}

describe("order status notification retry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-16T06:30:00.000Z"));
        vi.clearAllMocks();

        state.status = "pending";
        state.updatedAt = "2026-07-16T06:00:00.000000+00:00";
        state.databaseUpdatedAt = "2026-07-16T06:30:00.123456+00:00";
        state.databaseUpdatedAtQueue = [];
        state.failedDispatchKeys.clear();
        state.dispatchKeys = [];
        state.updateFilters = [];
        state.concurrentUpdate = false;
        state.metadata = {};

        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "admin_1" });
        mockResolveAdminAccess.mockResolvedValue({
            profile: { id: "profile_admin", role: "admin" },
            supabase: makeSupabaseClient(),
        });
        mockReportAdminOperationalAlert.mockResolvedValue({ success: true });
        mockRestoreStockForOrder.mockResolvedValue({ success: true });
        mockCreateUserNotification
            .mockResolvedValueOnce({ success: false, error: "notification unavailable" })
            .mockResolvedValueOnce({ success: true });
        mockRunIdempotentDispatch.mockImplementation(async (
            options: { dispatchKey: string },
            task: () => Promise<void>
        ) => {
            state.dispatchKeys.push(options.dispatchKey);
            try {
                await task();
                return { success: true, skipped: false };
            } catch (error) {
                state.failedDispatchKeys.add(options.dispatchKey);
                throw error;
            }
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("retries a failed buyer notification when the same saved status is submitted again", async () => {
        await expect(updateOrderStatus("order_1", "processing")).resolves.toEqual({ success: true });
        await expect(updateOrderStatus("order_1", "processing")).resolves.toEqual({ success: true });

        expect(mockCreateUserNotification).toHaveBeenCalledTimes(2);
        expect(state.dispatchKeys).toHaveLength(2);
        expect(state.dispatchKeys[1]).toBe(state.dispatchKeys[0]);
        expect(state.updateFilters).toContainEqual(["status", "pending"]);
    });

    it("rejects a stale admin update instead of creating a duplicate status notification", async () => {
        state.concurrentUpdate = true;

        await expect(updateOrderStatus("order_1", "processing")).resolves.toEqual({
            success: false,
            error: "جرى تحديث الطلب من جلسة أخرى؛ حدّث الصفحة وحاول مجددًا.",
        });

        expect(mockCreateUserNotification).not.toHaveBeenCalled();
        expect(mockRunIdempotentDispatch).not.toHaveBeenCalled();
    });

    it("claims a cancellation before releasing stock so a concurrent admin cannot restore it twice", async () => {
        state.status = "processing";
        state.metadata = { inventory_reserved: true };
        state.concurrentUpdate = true;

        await expect(updateOrderStatus("order_1", "cancelled")).resolves.toMatchObject({
            success: false,
            error: expect.stringContaining("جلسة أخرى"),
        });

        expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
    });

    it("blocks a different status transition while an expired stock-release lease still needs recovery", async () => {
        state.status = "cancelled";
        state.metadata = {
            inventory_reserved: true,
            reservation_release_status: "processing",
            reservation_release_started_at: "2026-07-16T06:00:00.000Z",
        };

        await expect(updateOrderStatus("order_1", "shipped")).resolves.toMatchObject({
            success: false,
            error: expect.stringContaining("تحرير مخزون الطلب"),
        });
        expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
        expect(mockCreateUserNotification).not.toHaveBeenCalled();
    });

    it("keeps a durable notification intent when stock release fails, then notifies after retry", async () => {
        state.status = "processing";
        state.metadata = { inventory_reserved: true };
        state.databaseUpdatedAtQueue = [
            "2026-07-16T06:30:00.111111+00:00",
            "2026-07-16T06:41:00.222222+00:00",
            "2026-07-16T06:41:00.333333+00:00",
        ];
        mockRestoreStockForOrder
            .mockResolvedValueOnce({ success: false, error: "inventory unavailable" })
            .mockResolvedValueOnce({ success: true });
        mockCreateUserNotification.mockReset();
        mockCreateUserNotification.mockResolvedValue({ success: true });

        await expect(updateOrderStatus("order_1", "cancelled")).resolves.toMatchObject({
            success: false,
            error: "inventory unavailable",
        });
        expect(state.metadata).toMatchObject({ status_notification_pending: true });
        expect(mockCreateUserNotification).not.toHaveBeenCalled();

        vi.advanceTimersByTime(11 * 60 * 1000);
        await expect(updateOrderStatus("order_1", "cancelled")).resolves.toEqual({ success: true });

        expect(mockCreateUserNotification).toHaveBeenCalledTimes(1);
        expect(mockCreateUserNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "order_update", userId: "buyer_1" })
        );
        expect(state.dispatchKeys.at(-1)).toContain("2026-07-16T06:41:00.222222+00:00");
    });
});
