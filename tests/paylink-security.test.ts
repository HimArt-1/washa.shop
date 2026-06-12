import { describe, expect, it } from "vitest";
import {
    assertPaylinkInvoiceMatchesOrder,
    getStoredPaylinkTransactionNo,
    moneyMatches,
} from "@/lib/paylink-security";

const order = {
    order_number: "ORD-1001",
    total: 125.5,
    metadata: {
        paylink: {
            transactionNo: "TX-123",
        },
    },
};

describe("paylink-security", () => {
    it("matches paid invoices by order number, amount, and transaction number", () => {
        const result = assertPaylinkInvoiceMatchesOrder(
            {
                orderStatus: "Paid",
                amount: "125.50",
                transactionNo: "TX-123",
                gatewayOrderRequest: {
                    orderNumber: "ORD-1001",
                    clientEmail: "customer@example.com",
                },
            },
            order,
            { expectedTransactionNo: "TX-123" }
        );

        expect(result).toEqual({
            ok: true,
            amount: 125.5,
            orderNumber: "ORD-1001",
            clientEmail: "customer@example.com",
            transactionNo: "TX-123",
        });
    });

    it("rejects invoice amount mismatches", () => {
        const result = assertPaylinkInvoiceMatchesOrder(
            {
                orderStatus: "Paid",
                amount: 120,
                transactionNo: "TX-123",
                gatewayOrderRequest: { orderNumber: "ORD-1001" },
            },
            order,
            { expectedTransactionNo: "TX-123" }
        );

        expect(result).toMatchObject({
            ok: false,
            status: 409,
        });
    });

    it("rejects invoice order-number mismatches", () => {
        const result = assertPaylinkInvoiceMatchesOrder(
            {
                orderStatus: "Paid",
                amount: 125.5,
                transactionNo: "TX-123",
                gatewayOrderRequest: { orderNumber: "ORD-9999" },
            },
            order,
            { expectedTransactionNo: "TX-123" }
        );

        expect(result).toMatchObject({
            ok: false,
            status: 409,
        });
    });

    it("normalizes money and stored transaction metadata", () => {
        expect(moneyMatches("1,250.00", 1250)).toBe(true);
        expect(getStoredPaylinkTransactionNo(order.metadata)).toBe("TX-123");
    });
});
