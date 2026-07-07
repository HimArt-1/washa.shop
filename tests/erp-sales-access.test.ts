import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient, mockGetCurrentUserOrDevAdmin, state } = vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockGetCurrentUserOrDevAdmin: vi.fn(),
    state: {
        role: "booth",
        salesEqCalls: [] as Array<[string, unknown]>,
    },
}));

vi.mock("@supabase/supabase-js", () => ({
    createClient: mockCreateClient,
}));

vi.mock("@/lib/admin-access", () => ({
    getCurrentUserOrDevAdmin: mockGetCurrentUserOrDevAdmin,
}));

vi.mock("@/lib/admin-operational-alerts", () => ({
    reportAdminOperationalAlert: vi.fn(),
}));

import { getSalesRecords } from "@/app/actions/erp/sales";

function makeThenableQuery(data: unknown) {
    const query = {
        eq: vi.fn((column: string, value: unknown) => {
            state.salesEqCalls.push([column, value]);
            return query;
        }),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve({ data, error: null }).then(resolve, reject),
    };

    return query;
}

function makeSupabaseClient() {
    return {
        from: vi.fn((table: string) => {
            if (table === "profiles") {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            single: vi.fn(async () => ({
                                data: {
                                    id: "profile_1",
                                    role: state.role,
                                    display_name: "موظف البوث",
                                },
                                error: null,
                            })),
                        })),
                    })),
                };
            }

            if (table === "sales_records") {
                const query = makeThenableQuery([]);
                return {
                    select: vi.fn(() => ({
                        order: vi.fn(() => query),
                    })),
                };
            }

            throw new Error(`Unexpected table: ${table}`);
        }),
    };
}

describe("sales records RBAC", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.role = "booth";
        state.salesEqCalls = [];
        process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        mockGetCurrentUserOrDevAdmin.mockResolvedValue({ id: "user_1" });
        mockCreateClient.mockReturnValue(makeSupabaseClient());
    });

    it("limits booth users to their own manual booth sales even if another method is requested", async () => {
        await getSalesRecords("online_store");

        expect(state.salesEqCalls).toEqual([
            ["sales_method", "booth_manual"],
            ["created_by", "profile_1"],
        ]);
    });

    it("lets finance users filter the full sales ledger by method", async () => {
        state.role = "financial_manager";

        await getSalesRecords("online_store");

        expect(state.salesEqCalls).toEqual([
            ["sales_method", "online_store"],
        ]);
    });
});
