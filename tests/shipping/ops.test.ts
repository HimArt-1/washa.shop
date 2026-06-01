import { describe, expect, it } from "vitest";
import {
    deriveShippingLifecycle,
    getLatestShippingHistory,
    getShippingIssues,
    hasCompleteShippingAddress,
} from "@/lib/shipping/ops";

const completeAddress = {
    name: "عميل وشّى",
    line1: "شارع التحلية",
    city: "الرياض",
    postal_code: "12211",
    country: "SA",
    phone: "966500000000",
};

describe("shipping ops lifecycle", () => {
    it("marks processing orders with complete address as ready to book", () => {
        expect(deriveShippingLifecycle({
            status: "processing",
            shipping_address: completeAddress,
        })).toBe("ready_to_book");
    });

    it("blocks processing orders with incomplete shipping data", () => {
        const order = {
            status: "processing",
            shipping_address: { ...completeAddress, line1: "" },
        };

        expect(hasCompleteShippingAddress(order.shipping_address)).toBe(false);
        expect(deriveShippingLifecycle(order)).toBe("blocked");
        expect(getShippingIssues(order)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: "missing_address", severity: "critical" }),
            ])
        );
    });

    it("keeps existing Torod orders without tracking in pending_torod", () => {
        const order = {
            status: "processing",
            torod_order_id: "79586149",
            tracking_number: null,
            shipping_address: completeAddress,
        };

        expect(deriveShippingLifecycle(order)).toBe("pending_torod");
        expect(getShippingIssues(order)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: "pending_torod", severity: "warning" }),
            ])
        );
    });

    it("promotes failed and RTO Torod updates to exception state", () => {
        expect(deriveShippingLifecycle({
            status: "processing",
            torod_last_status: "RTO",
            shipping_address: completeAddress,
        })).toBe("exception");

        expect(deriveShippingLifecycle({
            status: "shipped",
            torod_last_status: "Failed",
            tracking_number: "TRK-1",
            shipping_address: completeAddress,
        })).toBe("exception");
    });

    it("reads the latest webhook history entry from order metadata", () => {
        const latest = getLatestShippingHistory({
            shipping_history: [
                { status: "Created", timestamp: "2026-06-01T08:00:00.000Z" },
                {
                    status: "Delivered",
                    timestamp: "2026-06-01T12:00:00.000Z",
                    raw_payload: {
                        torod_description_ar: "تم التوصيل",
                    },
                },
            ],
        });

        expect(latest).toMatchObject({
            status: "Delivered",
            timestamp: "2026-06-01T12:00:00.000Z",
            description_ar: "تم التوصيل",
        });
    });
});
