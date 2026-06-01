import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetSupabaseAdminClient,
    mockRequiresWebhookSignature,
    mockValidateWebhookRequest,
    mockValidateWebhookSignature,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockRequiresWebhookSignature: vi.fn(),
    mockValidateWebhookRequest: vi.fn(),
    mockValidateWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/lib/shipping/torod", () => ({
    torod: {
        requiresWebhookSignature: mockRequiresWebhookSignature,
        validateWebhookRequest: mockValidateWebhookRequest,
        validateWebhookSignature: mockValidateWebhookSignature,
    },
}));

import { GET, HEAD, OPTIONS, POST } from "@/app/api/webhooks/torod/route";

type Lookup = { column: string; value: string };

function createSupabaseMock(params?: {
    order?: Record<string, unknown> | null;
    matchingLookups?: string[];
    updateError?: { message: string } | null;
}) {
    const lookups: Lookup[] = [];
    const updates: Array<{ data: Record<string, unknown>; filter?: Lookup }> = [];
    const matchingLookups = new Set(params?.matchingLookups ?? []);

    const client = {
        from(table: string) {
            expect(table).toBe("orders");

            return {
                select() {
                    return {
                        eq(column: string, value: string) {
                            lookups.push({ column, value });
                            return {
                                async single() {
                                    if (params?.order && matchingLookups.has(`${column}:${value}`)) {
                                        return { data: params.order, error: null };
                                    }

                                    return {
                                        data: null,
                                        error: { message: "No rows returned" },
                                    };
                                },
                            };
                        },
                    };
                },
                update(data: Record<string, unknown>) {
                    const entry: { data: Record<string, unknown>; filter?: Lookup } = { data };
                    updates.push(entry);

                    return {
                        async eq(column: string, value: string) {
                            entry.filter = { column, value };
                            return { error: params?.updateError ?? null };
                        },
                    };
                },
            };
        },
    };

    return { client, lookups, updates };
}

function jsonRequest(body: unknown, headers?: HeadersInit) {
    return new Request("http://localhost/api/webhooks/torod", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
        headers,
    });
}

describe("Torod webhook route", () => {
    beforeEach(() => {
        mockGetSupabaseAdminClient.mockReset();
        mockRequiresWebhookSignature.mockReset();
        mockValidateWebhookRequest.mockReset();
        mockValidateWebhookSignature.mockReset();
        mockRequiresWebhookSignature.mockReturnValue(true);
        mockValidateWebhookRequest.mockReturnValue(true);
        mockValidateWebhookSignature.mockReturnValue(true);
    });

    it("accepts endpoint validation methods", async () => {
        await expect(GET().then((res) => res.json())).resolves.toMatchObject({
            status: "ok",
        });

        expect((await HEAD()).status).toBe(200);
        expect((await OPTIONS()).headers.get("Allow")).toBe("GET, HEAD, POST, OPTIONS");
    });

    it("acknowledges empty and non-JSON validation payloads without touching Supabase", async () => {
        const emptyResponse = await POST(jsonRequest(""));
        expect(emptyResponse.status).toBe(200);
        await expect(emptyResponse.json()).resolves.toMatchObject({ success: true });

        const textResponse = await POST(jsonRequest("torod-validation"));
        expect(textResponse.status).toBe(200);
        await expect(textResponse.json()).resolves.toMatchObject({ success: true });

        expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled();
    });

    it("rejects a signed payload when webhook verification fails", async () => {
        mockValidateWebhookRequest.mockReturnValue(false);

        const response = await POST(
            jsonRequest(
                { order_id: "TOR-123", status: "delivered" },
                { Authorization: "wrong-secret" }
            )
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: "Invalid webhook verification" });
        expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled();
    });

    it("updates a matching order by Torod order_id stored in torod_order_id", async () => {
        const supabase = createSupabaseMock({
            order: {
                id: "order_1",
                status: "shipped",
                metadata: {
                    shipping_history: [{ status: "shipped", timestamp: "2026-01-01T00:00:00.000Z" }],
                },
            },
            matchingLookups: ["torod_order_id:TOR-123"],
        });
        mockGetSupabaseAdminClient.mockReturnValue(supabase.client);

        const response = await POST(
            jsonRequest(
                {
                    order_id: "TOR-123",
                    tracking_id: "TRK-123",
                    status: "Delivered",
                    date_time: "2026-06-01 12:00:00",
                    description: "Delivered to customer",
                    torod_description: "Delivered",
                    torod_description_ar: "تم التوصيل",
                },
                { Authorization: "client-secret" }
            )
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(supabase.lookups).toEqual([
            { column: "id", value: "TOR-123" },
            { column: "torod_order_id", value: "TOR-123" },
        ]);
        expect(supabase.updates).toHaveLength(1);
        expect(supabase.updates[0].filter).toEqual({ column: "id", value: "order_1" });
        expect(supabase.updates[0].data).toMatchObject({
            status: "delivered",
            torod_last_status: "Delivered",
        });
        expect((supabase.updates[0].data.metadata as any).shipping_history).toHaveLength(2);
        expect((supabase.updates[0].data.metadata as any).shipping_history[1]).toMatchObject({
            status: "delivered",
            timestamp: "2026-06-01 12:00:00",
        });
    });

    it("updates a matching order by tracking_id and maps in-transit statuses to shipped", async () => {
        const supabase = createSupabaseMock({
            order: {
                id: "order_2",
                status: "processing",
                metadata: {},
            },
            matchingLookups: ["tracking_number:TRK-900"],
        });
        mockGetSupabaseAdminClient.mockReturnValue(supabase.client);

        const response = await POST(
            jsonRequest(
                { tracking_id: "TRK-900", status: "Created" },
                { Authorization: "client-secret" }
            )
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(supabase.lookups).toContainEqual({ column: "tracking_number", value: "TRK-900" });
        expect(supabase.updates[0].data).toMatchObject({
            status: "shipped",
            torod_last_status: "Created",
        });
    });

    it("keeps failed Torod delivery states in the supported internal order status set", async () => {
        const supabase = createSupabaseMock({
            order: {
                id: "order_failed",
                status: "shipped",
                metadata: {},
            },
            matchingLookups: ["tracking_number:TRK-FAILED"],
        });
        mockGetSupabaseAdminClient.mockReturnValue(supabase.client);

        const response = await POST(
            jsonRequest(
                { tracking_id: "TRK-FAILED", status: "RTO" },
                { Authorization: "client-secret" }
            )
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ success: true });
        expect(supabase.updates[0].data).toMatchObject({
            status: "processing",
            torod_last_status: "RTO",
        });
    });

    it("rejects matched order updates without official authorization when webhook signing is configured", async () => {
        const supabase = createSupabaseMock({
            order: {
                id: "order_3",
                status: "processing",
                metadata: {},
            },
            matchingLookups: ["tracking_number:TRK-901"],
        });
        mockGetSupabaseAdminClient.mockReturnValue(supabase.client);

        const response = await POST(jsonRequest({ tracking_id: "TRK-901", status: "delivered" }));

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({ error: "Missing webhook verification" });
        expect(supabase.updates).toHaveLength(0);
    });

    it("acknowledges unmatched Torod validation/order samples without updating anything", async () => {
        const supabase = createSupabaseMock({
            order: null,
            matchingLookups: [],
        });
        mockGetSupabaseAdminClient.mockReturnValue(supabase.client);

        const response = await POST(jsonRequest({ order_id: "TOR-MISSING", status: "delivered" }));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            success: true,
            acknowledged: true,
        });
        expect(supabase.updates).toHaveLength(0);
    });
});
