import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetSupabaseAdminClient,
    mockRpc,
    mockGetPaylinkInvoice,
    mockGetWashaAiSettings,
} = vi.hoisted(() => ({
    mockGetSupabaseAdminClient: vi.fn(),
    mockRpc: vi.fn(),
    mockGetPaylinkInvoice: vi.fn(),
    mockGetWashaAiSettings: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
    getSupabaseAdminClient: mockGetSupabaseAdminClient,
}));

vi.mock("@/lib/paylink", () => ({
    PAYLINK_ENABLED: true,
    PAYLINK_CREATION_ENABLED: false,
    createPaylinkInvoice: vi.fn(),
    getPaylinkInvoice: mockGetPaylinkInvoice,
}));

vi.mock("@/app/actions/settings", () => ({
    getWashaAiSettings: mockGetWashaAiSettings,
}));

import { createCreditCheckout, verifyCreditPurchaseWebhook } from "@/app/api/washa-ai/credits/service";

function createSupabaseMock(params: {
    order?: Record<string, unknown> | null;
    wallet?: Record<string, unknown> | null;
    updates?: Array<Record<string, unknown>>;
}) {
    return {
        rpc: mockRpc,
        from(table: string) {
            return {
                select() {
                    return {
                        eq() {
                            return {
                                async maybeSingle() {
                                    if (table === "washa_ai_credit_orders") {
                                        return { data: params.order ?? null, error: null };
                                    }

                                    if (table === "washa_ai_credit_wallet") {
                                        return { data: params.wallet ?? null, error: null };
                                    }

                                    return { data: null, error: null };
                                },
                            };
                        },
                    };
                },
                update(values: Record<string, unknown>) {
                    params.updates?.push({ table, values });
                    return {
                        eq() {
                            return {
                                neq() {
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

describe("WASHA AI credit purchase service", () => {
    beforeEach(() => {
        mockGetSupabaseAdminClient.mockReset();
        mockRpc.mockReset();
        mockGetPaylinkInvoice.mockReset();
        mockGetWashaAiSettings.mockReset();
    });

    it("does not create a credit order while the checkout provider is disabled", async () => {
        process.env.WASHA_AI_CREDIT_CHECKOUT_ENABLED = "true";
        const result = await createCreditCheckout({
            profile: { id: "profile_1", role: "subscriber", displayName: "عميل", email: null, phone: "0500000000" },
            packageId: "starter",
        });

        expect(result).toEqual({ ok: false, status: 503, error: "بوابة الدفع غير مفعّلة حالياً" });
        expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled();
        delete process.env.WASHA_AI_CREDIT_CHECKOUT_ENABLED;
    });

    it("confirms a paid Paylink webhook and credits the wallet idempotently", async () => {
        const updates: Array<Record<string, unknown>> = [];
        mockGetSupabaseAdminClient.mockReturnValue(createSupabaseMock({
            updates,
            order: {
                order_number: "WAI-ABC-123",
                profile_id: "profile_1",
                credits: 20,
                amount: "25.00",
                status: "pending",
                transaction_no: "TX-1",
            },
        }));
        mockRpc.mockResolvedValue({
            data: { credited: true, balance: 35 },
            error: null,
        });

        const result = await verifyCreditPurchaseWebhook({
            orderNumber: "WAI-ABC-123",
            transactionNo: "TX-1",
            invoice: {
                orderStatus: "Paid",
                transactionNo: "TX-1",
                amount: "25.00",
                gatewayOrderRequest: { orderNumber: "WAI-ABC-123" },
            },
        });

        expect(result).toEqual({
            ok: true,
            data: {
                credited: true,
                alreadyProcessed: false,
                credits: 20,
                balance: 35,
            },
        });
        expect(mockRpc).toHaveBeenCalledWith("credit_washa_ai_wallet", {
            p_profile_id: "profile_1",
            p_amount: 20,
            p_entry_type: "purchase",
            p_reason: "شراء رصيد — 20 حصة",
            p_ref_type: "washa_ai_credit_order",
            p_ref_id: "WAI-ABC-123",
            p_metadata: { transaction_no: "TX-1", amount: 25 },
        });
        expect(updates).toHaveLength(1);
        expect(updates[0]).toMatchObject({
            table: "washa_ai_credit_orders",
            values: {
                status: "paid",
                transaction_no: "TX-1",
            },
        });
    });

    it("rejects a webhook invoice that does not match the credit order amount", async () => {
        mockGetSupabaseAdminClient.mockReturnValue(createSupabaseMock({
            order: {
                order_number: "WAI-ABC-123",
                profile_id: "profile_1",
                credits: 20,
                amount: "25.00",
                status: "pending",
                transaction_no: "TX-1",
            },
        }));

        const result = await verifyCreditPurchaseWebhook({
            orderNumber: "WAI-ABC-123",
            transactionNo: "TX-1",
            invoice: {
                orderStatus: "Paid",
                transactionNo: "TX-1",
                amount: "20.00",
                gatewayOrderRequest: { orderNumber: "WAI-ABC-123" },
            },
        });

        expect(result).toMatchObject({
            ok: false,
            status: 409,
        });
        expect(mockRpc).not.toHaveBeenCalled();
    });
});
