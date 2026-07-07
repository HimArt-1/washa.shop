import { describe, expect, it } from "vitest";

import {
    DtfReservationCleanupOrder,
    getDtfReservationCleanupConfig,
    getDtfReservationQueryCutoff,
    selectAbandonedDtfReservations,
} from "@/lib/dtf-reservation-cleanup";

const now = new Date("2026-07-07T12:00:00.000Z");

function hoursAgo(hours: number) {
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

function order(overrides: Partial<DtfReservationCleanupOrder>): DtfReservationCleanupOrder {
    return {
        id: "order-id",
        order_number: null,
        user_id: null,
        size_id: "size-id",
        status: "new",
        design_method: "studio",
        dtf_mockup_url: "https://cdn.example/mockup.png",
        dtf_extracted_url: null,
        admin_notes: null,
        created_at: hoursAgo(49),
        ...overrides,
    };
}

describe("DTF reservation cleanup", () => {
    it("uses safe defaults and clamps environment overrides", () => {
        expect(getDtfReservationCleanupConfig({})).toEqual({
            guestTtlHours: 48,
            ownedTtlHours: 168,
            limit: 100,
        });

        expect(getDtfReservationCleanupConfig({
            DTF_GUEST_RESERVATION_TTL_HOURS: "1",
            DTF_OWNED_RESERVATION_TTL_HOURS: "9999",
            DTF_RESERVATION_CLEANUP_LIMIT: "0",
        })).toEqual({
            guestTtlHours: 6,
            ownedTtlHours: 720,
            limit: 1,
        });
    });

    it("queries using the earliest TTL as a broad candidate cutoff", () => {
        const cutoff = getDtfReservationQueryCutoff(now, {
            guestTtlHours: 48,
            ownedTtlHours: 168,
            limit: 100,
        });

        expect(cutoff.toISOString()).toBe("2026-07-05T12:00:00.000Z");
    });

    it("selects only expired unlinked DTF Studio reservations", () => {
        const orders = [
            order({ id: "guest-old", user_id: null, created_at: hoursAgo(49) }),
            order({ id: "guest-young", user_id: null, created_at: hoursAgo(24) }),
            order({ id: "owned-young", user_id: "user-1", created_at: hoursAgo(100) }),
            order({ id: "owned-old", user_id: "user-2", created_at: hoursAgo(170) }),
            order({ id: "linked-old", user_id: null, created_at: hoursAgo(60) }),
            order({ id: "missing-dtf-media", dtf_mockup_url: null, dtf_extracted_url: null, created_at: hoursAgo(80) }),
            order({ id: "manual-design", design_method: "upload", created_at: hoursAgo(80) }),
            order({ id: "already-completed", status: "completed", created_at: hoursAgo(80) }),
        ];

        const selected = selectAbandonedDtfReservations({
            orders,
            linkedOrderIds: new Set(["linked-old"]),
            now,
            config: {
                guestTtlHours: 48,
                ownedTtlHours: 168,
                limit: 100,
            },
        });

        expect(selected.map((item) => item.id)).toEqual(["guest-old", "owned-old"]);
    });
});
