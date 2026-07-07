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
});
