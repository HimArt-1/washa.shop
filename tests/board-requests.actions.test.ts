import { beforeEach, describe, expect, it, vi } from "vitest";

const seams = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    getSupabase: vi.fn(),
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: seams.getCurrentUser,
}));
vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: seams.getSupabase,
}));
vi.mock("next/cache", () => ({
    revalidatePath: seams.revalidatePath,
}));

import {
    getBoardRequests,
    updateBoardManualPrintStatus,
} from "@/app/actions/board-requests";

type Operation = [string, ...unknown[]];

function createDatabase(options: {
    role?: string;
    rows?: Array<Record<string, unknown>>;
    updatedRow?: { id: string } | null;
    boardError?: { message: string } | null;
} = {}) {
    const operations: Operation[] = [];
    let updatePayload: unknown = null;

    const boardQuery: Record<string, (...args: unknown[]) => unknown> & {
        then?: (resolve: (value: unknown) => unknown) => unknown;
    } = {};
    for (const method of ["select", "eq", "not", "order", "limit"]) {
        boardQuery[method] = (...args: unknown[]) => {
            operations.push([method, ...args]);
            return boardQuery;
        };
    }
    boardQuery.update = (payload: unknown) => {
        updatePayload = payload;
        operations.push(["update", payload]);
        return boardQuery;
    };
    boardQuery.maybeSingle = async () => ({
        data: options.updatedRow === undefined
            ? { id: "77777777-7777-4777-8777-777777777777" }
            : options.updatedRow,
        error: options.boardError ?? null,
    });
    boardQuery.then = (resolve) => resolve({
        data: options.rows ?? [],
        error: options.boardError ?? null,
    });

    const database = {
        from: vi.fn((table: string) => {
            if (table === "profiles") {
                const profileQuery = {
                    select: vi.fn(() => profileQuery),
                    eq: vi.fn(() => profileQuery),
                    single: vi.fn(async () => ({
                        data: { id: "admin-profile", role: options.role ?? "admin" },
                        error: null,
                    })),
                };
                return profileQuery;
            }
            if (table === "washa_board_requests") return boardQuery;
            throw new Error(`Unexpected table ${table}`);
        }),
    };

    return { database, operations, getUpdatePayload: () => updatePayload };
}

const readyRow = {
    id: "77777777-7777-4777-8777-777777777777",
    profile_id: "profile-1",
    generation_request_id: "request-1",
    prompt: "prompt",
    generation_context: { garmentType: "تيشيرت", garmentColor: "أسود" },
    board_image_url: "https://cdn.example/board.webp",
    provider: "genai",
    generation_model: "gemini-board",
    status: "ready",
    manual_print_status: "pending",
    created_at: "2026-07-22T08:00:00.000Z",
    updated_at: "2026-07-22T08:00:00.000Z",
    profile: {
        display_name: "عميل",
        username: "customer",
        email: "customer@example.com",
        phone: "+966500000000",
    },
};

describe("board requests admin actions", () => {
    beforeEach(() => {
        seams.getCurrentUser.mockReset();
        seams.getSupabase.mockReset();
        seams.revalidatePath.mockReset();
        seams.getCurrentUser.mockResolvedValue({ id: "clerk-admin" });
    });

    it("defaults to the ready pending queue and returns a narrow admin DTO", async () => {
        const fake = createDatabase({ rows: [readyRow] });
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(getBoardRequests()).resolves.toEqual([
            expect.objectContaining({
                id: readyRow.id,
                status: "ready",
                manualPrintStatus: "pending",
                boardImageUrl: readyRow.board_image_url,
                customer: {
                    displayName: "عميل",
                    username: "customer",
                    email: "customer@example.com",
                    phone: "+966500000000",
                },
            }),
        ]);
        expect(fake.operations).toContainEqual(["eq", "status", "ready"]);
        expect(fake.operations).toContainEqual(["not", "board_image_url", "is", null]);
        expect(fake.operations).toContainEqual(["eq", "manual_print_status", "pending"]);
    });

    it("loads failed rows without an image or manual-work filter", async () => {
        const fake = createDatabase({
            rows: [{
                ...readyRow,
                status: "failed",
                board_image_url: null,
                profile: null,
            }],
        });
        seams.getSupabase.mockReturnValue(fake.database);

        const rows = await getBoardRequests({
            status: "failed",
            manualPrintStatus: "completed",
        });

        expect(rows[0]).toMatchObject({
            status: "failed",
            boardImageUrl: null,
            customer: null,
        });
        expect(fake.operations).toContainEqual(["eq", "status", "failed"]);
        expect(fake.operations.some(([method]) => method === "not")).toBe(false);
        expect(fake.operations).not.toContainEqual(["eq", "manual_print_status", "completed"]);
    });

    it("updates only manual_print_status on a ready row and revalidates the queue", async () => {
        const fake = createDatabase();
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(updateBoardManualPrintStatus({
            boardRequestId: readyRow.id,
            manualPrintStatus: "in_progress",
        })).resolves.toEqual({ success: true });

        expect(fake.getUpdatePayload()).toEqual({ manual_print_status: "in_progress" });
        expect(fake.operations).toContainEqual(["eq", "id", readyRow.id]);
        expect(fake.operations).toContainEqual(["eq", "status", "ready"]);
        expect(seams.revalidatePath).toHaveBeenCalledWith("/dashboard/board-requests");
    });

    it("rejects invalid updates without touching the board table", async () => {
        const fake = createDatabase();
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(updateBoardManualPrintStatus({
            boardRequestId: "not-a-uuid",
            manualPrintStatus: "completed",
        })).resolves.toEqual({
            success: false,
            error: "بيانات تحديث الطلب غير صالحة.",
        });
        expect(fake.database.from).not.toHaveBeenCalledWith("washa_board_requests");
    });

    it.each([
        { name: "a missing ready row", updatedRow: null, boardError: null },
        { name: "a Supabase failure", updatedRow: null, boardError: { message: "db down" } },
    ])("does not claim update success for $name", async ({ updatedRow, boardError }) => {
        const fake = createDatabase({ updatedRow, boardError });
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(updateBoardManualPrintStatus({
            boardRequestId: readyRow.id,
            manualPrintStatus: "completed",
        })).resolves.toEqual({
            success: false,
            error: "تعذّر تحديث حالة طلب اللوحة.",
        });
        expect(seams.revalidatePath).not.toHaveBeenCalled();
    });

    it.each(["admin", "dev"])("authorizes %s inside both exported actions", async (role) => {
        const fake = createDatabase({ role, rows: [readyRow] });
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(getBoardRequests()).resolves.toHaveLength(1);
        await expect(updateBoardManualPrintStatus({
            boardRequestId: readyRow.id,
            manualPrintStatus: "completed",
        })).resolves.toEqual({ success: true });

        expect(seams.getCurrentUser).toHaveBeenCalledTimes(2);
    });

    it("rejects non-admin roles inside each exported action before board access", async () => {
        const fake = createDatabase({ role: "subscriber", rows: [readyRow] });
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(getBoardRequests()).rejects.toThrow("Forbidden");
        await expect(updateBoardManualPrintStatus({
            boardRequestId: readyRow.id,
            manualPrintStatus: "completed",
        })).rejects.toThrow("Forbidden");

        expect(fake.database.from).not.toHaveBeenCalledWith("washa_board_requests");
    });

    it("rejects unauthenticated calls inside each exported action", async () => {
        seams.getCurrentUser.mockResolvedValue(null);
        const fake = createDatabase({ rows: [readyRow] });
        seams.getSupabase.mockReturnValue(fake.database);

        await expect(getBoardRequests()).rejects.toThrow("Unauthorized");
        await expect(updateBoardManualPrintStatus({
            boardRequestId: readyRow.id,
            manualPrintStatus: "completed",
        })).rejects.toThrow("Unauthorized");

        expect(seams.getSupabase).not.toHaveBeenCalled();
    });
});
