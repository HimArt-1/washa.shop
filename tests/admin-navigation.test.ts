import { describe, expect, it } from "vitest";
import { canAccessAdminPath, getVisibleAdminCommandItems } from "@/lib/admin-navigation";

describe("admin navigation RBAC", () => {
    it("allows booth users to reach the sales POS surface only", () => {
        expect(canAccessAdminPath("/dashboard/sales", "booth")).toBe(true);
        expect(canAccessAdminPath("/dashboard/sales/manual", "booth")).toBe(true);
        expect(canAccessAdminPath("/dashboard/products-inventory", "booth")).toBe(false);
        expect(canAccessAdminPath("/dashboard/orders", "booth")).toBe(false);
        expect(canAccessAdminPath("/dashboard", "booth")).toBe(false);
    });

    it("filters command palette items by the current role", () => {
        const boothItems = getVisibleAdminCommandItems("booth");
        const boothHrefs = boothItems.map((item) => item.href);

        expect(boothHrefs).toContain("/dashboard/sales");
        expect(boothHrefs).not.toContain("/dashboard/orders");
        expect(boothHrefs).not.toContain("/dashboard/products-inventory");
    });

    it("exposes board requests only to admin and dev roles", () => {
        expect(canAccessAdminPath("/dashboard/board-requests", "admin")).toBe(true);
        expect(canAccessAdminPath("/dashboard/board-requests", "dev")).toBe(true);
        expect(canAccessAdminPath("/dashboard/board-requests", "subscriber")).toBe(false);
        expect(canAccessAdminPath("/dashboard/board-requests", "shipping_manager")).toBe(false);

        expect(getVisibleAdminCommandItems("admin").map((item) => item.href))
            .toContain("/dashboard/board-requests");
        expect(getVisibleAdminCommandItems("subscriber").map((item) => item.href))
            .not.toContain("/dashboard/board-requests");
    });
});
