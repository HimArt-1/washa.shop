import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const {
    mockCurrentUser,
    mockGetSupabaseAdminClient,
    mockConfirmOrderPayment,
    mockRetrieveSession,
} = vi.hoisted(() => ({
    mockCurrentUser: vi.fn(),
    mockGetSupabaseAdminClient: vi.fn(),
    mockConfirmOrderPayment: vi.fn(),
    mockRetrieveSession: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
    currentUser: mockCurrentUser,
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/app/actions/orders", () => ({
    confirmOrderPayment: mockConfirmOrderPayment,
}));

vi.mock("@/lib/stripe", () => ({
    stripe: {
        checkout: {
            sessions: {
                retrieve: mockRetrieveSession,
            },
        },
    },
}));

import { POST } from "@/app/api/stripe/checkout-session/verify/route";

function createSupabaseMock(params?: {
    order?: Record<string, unknown> | null;
    orderError?: Record<string, unknown> | null;
    profile?: Record<string, unknown> | null;
    profileError?: Record<string, unknown> | null;
}) {
    return {
        from(table: string) {
            return {
                select() {
                    return {
                        eq(column: string, value: string) {
                            const filters: Record<string, string> = { [column]: value };

                            return {
                                eq(nextColumn: string, nextValue: string) {
                                    filters[nextColumn] = nextValue;
                                    return this;
                                },
                                async single() {
                                    if (table === "profiles") {
                                        return {
                                            data: params?.profile ?? { id: "profile_1" },
                                            error: params?.profileError ?? null,
                                        };
                                    }

                                    if (table === "orders") {
                                        return {
                                            data: params?.order ??
                                                (filters.id === "order_1" || filters.order_number === "WA-1001"
                                                    ? {
                                                        id: "order_1",
                                                        buyer_id: "profile_1",
                                                        order_number: "WA-1001",
                                                        status: "pending",
                                                        payment_status: "pending",
                                                    }
                                                    : null),
                                            error: params?.orderError ?? null,
                                        };
                                    }

                                    return { data: null, error: null };
                                },
                            };
                        },
                    };
                },
            };
        },
    };
}

describe("POST /api/stripe/checkout-session/verify", () => {
    beforeEach(() => {
        mockCurrentUser.mockReset();
        mockGetSupabaseAdminClient.mockReset();
        mockConfirmOrderPayment.mockReset();
        mockRetrieveSession.mockReset();

        mockCurrentUser.mockResolvedValue({
            id: "clerk_1",
            emailAddresses: [{ emailAddress: "buyer@example.com" }],
        });

        mockGetSupabaseAdminClient.mockReturnValue(createSupabaseMock());
        mockConfirmOrderPayment.mockResolvedValue({ success: true });
    });

    it("returns success immediately when the order is already confirmed", async () => {
        mockGetSupabaseAdminClient.mockReturnValue(
            createSupabaseMock({
                order: {
                    id: "order_1",
                    buyer_id: "profile_1",
                    order_number: "WA-1001",
                    status: "confirmed",
                    payment_status: "paid",
                },
            })
        );

        const response = await POST(
            new Request("http://localhost/api/stripe/checkout-session/verify", {
                method: "POST",
                body: JSON.stringify({ orderNumber: "WA-1001" }),
            }) as NextRequest
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            success: true,
            orderNumber: "WA-1001",
            alreadyConfirmed: true,
        });
        expect(mockRetrieveSession).not.toHaveBeenCalled();
        expect(mockConfirmOrderPayment).not.toHaveBeenCalled();
    });

    it("confirms the order when Stripe reports a paid completed session", async () => {
        mockRetrieveSession.mockResolvedValue({
            id: "cs_test_1",
            mode: "payment",
            status: "complete",
            payment_status: "paid",
            metadata: { order_id: "order_1" },
            customer_email: "buyer@example.com",
            customer_details: null,
        });

        const response = await POST(
            new Request("http://localhost/api/stripe/checkout-session/verify", {
                method: "POST",
                body: JSON.stringify({
                    orderId: "order_1",
                    orderNumber: "WA-1001",
                    sessionId: "cs_test_1",
                }),
            }) as NextRequest
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            success: true,
            orderId: "order_1",
            orderNumber: "WA-1001",
        });
        expect(mockRetrieveSession).toHaveBeenCalledWith("cs_test_1");
        expect(mockConfirmOrderPayment).toHaveBeenCalledWith("order_1", {
            customerEmail: "buyer@example.com",
        });
    });

    it("rejects verification when the Stripe session is not paid yet", async () => {
        mockRetrieveSession.mockResolvedValue({
            id: "cs_test_1",
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            metadata: { order_id: "order_1" },
            customer_email: "buyer@example.com",
            customer_details: null,
        });

        const response = await POST(
            new Request("http://localhost/api/stripe/checkout-session/verify", {
                method: "POST",
                body: JSON.stringify({
                    orderId: "order_1",
                    orderNumber: "WA-1001",
                    sessionId: "cs_test_1",
                }),
            }) as NextRequest
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            error: "عملية الدفع لم تكتمل بعد",
        });
        expect(mockConfirmOrderPayment).not.toHaveBeenCalled();
    });
});
