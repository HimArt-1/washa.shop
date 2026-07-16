import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAfter, mockGetSupabaseAdminClient } = vi.hoisted(() => ({
    mockAfter: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mockAfter }));
vi.mock("@/lib/supabase", () => ({ getSupabaseAdminClient: mockGetSupabaseAdminClient }));

import { runPostResponseJob, schedulePostResponseTask } from "@/lib/post-response";

describe("post-response task scheduling", () => {
    beforeEach(() => {
        mockAfter.mockReset();
    });

    it("schedules work without starting it on the response path", () => {
        const task = vi.fn(async () => undefined);

        schedulePostResponseTask("order notifications", task);

        expect(mockAfter).toHaveBeenCalledTimes(1);
        expect(task).not.toHaveBeenCalled();
    });

    it("runs the task inside after and contains secondary failures", async () => {
        let scheduled: (() => Promise<void>) | undefined;
        mockAfter.mockImplementation((callback: () => Promise<void>) => {
            scheduled = callback;
        });
        const error = new Error("email unavailable");
        const task = vi.fn(async () => { throw error; });
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        schedulePostResponseTask("order notifications", task);
        await expect(scheduled?.()).resolves.toBeUndefined();

        expect(task).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith("[post-response] order notifications failed", error);
        consoleSpy.mockRestore();
    });

    it("contains a synchronous scheduling failure", () => {
        const error = new Error("request lifecycle unavailable");
        mockAfter.mockImplementation(() => { throw error; });
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        expect(() => schedulePostResponseTask("order notifications", vi.fn())).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith(
            "[post-response] order notifications scheduling failed",
            error
        );
        consoleSpy.mockRestore();
    });
});

describe("durable post-response jobs", () => {
    function createSupabaseMock(claimed = true) {
        const eq = vi.fn(async () => ({ error: null }));
        const update = vi.fn(() => ({ eq }));
        const from = vi.fn(() => ({ update }));
        const rpc = vi.fn(async () => ({ data: claimed, error: null }));
        mockGetSupabaseAdminClient.mockReturnValue({ rpc, from });
        return { rpc, from, update, eq };
    }

    beforeEach(() => {
        mockGetSupabaseAdminClient.mockReset();
    });

    it("claims and completes a persisted job", async () => {
        const db = createSupabaseMock();
        const task = vi.fn(async () => undefined);

        await expect(runPostResponseJob("order:1:checkout", task)).resolves.toEqual({ processed: true });

        expect(task).toHaveBeenCalledTimes(1);
        expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    });

    it("marks a failed job for recovery and rethrows", async () => {
        const db = createSupabaseMock();
        const error = new Error("email unavailable");

        await expect(runPostResponseJob("order:1:checkout", async () => { throw error; })).rejects.toThrow(error);

        expect(db.update).toHaveBeenCalledWith(expect.objectContaining({
            status: "failed",
            last_error: "email unavailable",
        }));
    });

    it("does not execute a job that another worker already claimed", async () => {
        createSupabaseMock(false);
        const task = vi.fn(async () => undefined);

        await expect(runPostResponseJob("order:1:checkout", task)).resolves.toEqual({ processed: false });
        expect(task).not.toHaveBeenCalled();
    });
});
