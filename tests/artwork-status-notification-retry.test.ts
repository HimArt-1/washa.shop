import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetCurrentUserOrDevAdmin,
    mockResolveAdminAccess,
    mockCreateUserNotification,
    mockRunIdempotentDispatch,
    mockReportAdminOperationalAlert,
    state,
} = vi.hoisted(() => ({
    mockGetCurrentUserOrDevAdmin: vi.fn(),
    mockResolveAdminAccess: vi.fn(),
    mockCreateUserNotification: vi.fn(),
    mockRunIdempotentDispatch: vi.fn(),
    mockReportAdminOperationalAlert: vi.fn(),
    state: {
        status: "pending",
        updatedAt: "2026-07-16T06:00:00.000000+00:00",
        databaseUpdatedAt: "2026-07-16T06:30:00.654321+00:00",
        failedDispatchKeys: new Set<string>(),
        dispatchKeys: [] as string[],
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

import { updateArtworkStatus } from "@/app/actions/admin";

function makeSupabaseClient() {
    return {
        from: vi.fn((table: string) => {
            if (table === "artworks") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    artist_id: "artist_1",
                                    title: "لوحة نجد",
                                    status: state.status,
                                    updated_at: state.updatedAt,
                                },
                                error: null,
                            })),
                        })),
                    })),
                    update: vi.fn((payload: Record<string, unknown>) => {
                        const query = {
                            eq: vi.fn(() => query),
                            select: vi.fn(() => ({
                                maybeSingle: vi.fn(async () => {
                                    state.status = String(payload.status);
                                    state.updatedAt = state.databaseUpdatedAt;
                                    return {
                                        data: {
                                            id: "artwork_1",
                                            updated_at: state.databaseUpdatedAt,
                                        },
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
                return { select: vi.fn(() => query) };
            }

            throw new Error(`Unexpected table: ${table}`);
        }),
    };
}

describe("artwork status notification retry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-16T06:30:00.000Z"));
        vi.clearAllMocks();

        state.status = "pending";
        state.updatedAt = "2026-07-16T06:00:00.000000+00:00";
        state.databaseUpdatedAt = "2026-07-16T06:30:00.654321+00:00";
        state.failedDispatchKeys.clear();
        state.dispatchKeys = [];

        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "admin_1" });
        mockResolveAdminAccess.mockResolvedValue({
            profile: { id: "profile_admin", role: "admin" },
            supabase: makeSupabaseClient(),
        });
        mockReportAdminOperationalAlert.mockResolvedValue({ success: true });
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

    it("retries a failed artist notification when the saved artwork status is submitted again", async () => {
        await expect(updateArtworkStatus("artwork_1", "published")).resolves.toEqual({ success: true });
        await expect(updateArtworkStatus("artwork_1", "published")).resolves.toEqual({ success: true });

        expect(mockCreateUserNotification).toHaveBeenCalledTimes(2);
        expect(state.dispatchKeys).toHaveLength(2);
        expect(state.dispatchKeys[1]).toBe(state.dispatchKeys[0]);
    });
});
