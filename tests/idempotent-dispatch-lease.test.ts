import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, state } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    state: {
        markFilters: [] as Array<[string, unknown]>,
        markPayloads: [] as Array<Record<string, unknown>>,
        failSentAck: false,
    },
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mockCreateClient }));

import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";

function makeClient() {
    return {
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({ data: { id: "dispatch_1" }, error: null })),
                })),
            })),
            update: vi.fn((payload: Record<string, unknown>) => {
                state.markPayloads.push(payload);
                const query = {
                    eq: vi.fn((column: string, value: unknown) => {
                        state.markFilters.push([column, value]);
                        return query;
                    }),
                    select: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => state.failSentAck && payload.status === "sent"
                            ? { data: null, error: { message: "database unavailable" } }
                            : { data: { id: "dispatch_1" }, error: null }),
                    })),
                };
                return query;
            }),
        })),
    };
}

describe("idempotent dispatch lease", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
        state.markFilters = [];
        state.markPayloads = [];
        state.failSentAck = false;
        mockCreateClient.mockImplementation(() => makeClient());
    });

    it("finishes only the processing attempt that owns the current attempt count", async () => {
        await expect(runIdempotentDispatch(
            {
                dispatchKey: "notification:test",
                eventType: "notification_test",
                channel: "push_user",
            },
            async () => {}
        )).resolves.toMatchObject({ success: true, skipped: false });

        expect(state.markFilters).toContainEqual(["status", "processing"]);
        expect(state.markFilters).toContainEqual(["attempt_count", 1]);
    });

    it("does not rewrite a delivered effect as failed when only the sent acknowledgement fails", async () => {
        state.failSentAck = true;

        await expect(runIdempotentDispatch(
            {
                dispatchKey: "notification:ack-failure",
                eventType: "notification_test",
                channel: "push_user",
            },
            async () => {}
        )).rejects.toThrow("Failed to persist dispatch result");

        expect(state.markPayloads.map((payload) => payload.status)).toEqual([
            "sent",
            "delivery_unknown",
        ]);
    });

    it("does not rerun a stale processing task whose delivery outcome is unknown", async () => {
        const task = vi.fn();
        mockCreateClient.mockImplementation(() => ({
            from: vi.fn(() => ({
                insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => ({
                            data: null,
                            error: { code: "23505", message: "duplicate" },
                        })),
                    })),
                })),
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn(async () => ({
                            data: {
                                id: "dispatch_1",
                                status: "processing",
                                updated_at: "2020-01-01T00:00:00.000Z",
                                attempt_count: 1,
                            },
                            error: null,
                        })),
                    })),
                })),
            })),
        }));

        await expect(runIdempotentDispatch(
            {
                dispatchKey: "notification:stale-processing",
                eventType: "notification_test",
                channel: "push_user",
            },
            task
        )).resolves.toMatchObject({ skipped: true, reason: "stale_processing" });
        expect(task).not.toHaveBeenCalled();
    });
});
