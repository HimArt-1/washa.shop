// وشّى | WASHA — حذف البيانات التجريبية (للأدمن فقط)
"use server";

import { createClient } from "@supabase/supabase-js";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";

export interface PurgeScope {
    orders: boolean;
    designOrders: boolean;
    behavioralEvents: boolean;
    pageVisits: boolean;
    marketingCampaigns: boolean;
}

export interface PurgeResult {
    success: boolean;
    deleted: Record<string, number>;
    error?: string;
}

export async function purgeTestData(scope: PurgeScope): Promise<PurgeResult> {
    // ─── Auth: only dev or admin ──────────────────────────────────────────────
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return { success: false, deleted: {}, error: "غير مصرح" };

    const access = await resolveAdminAccess(user);
    if (!access.isAdmin) return { success: false, deleted: {}, error: "صلاحيات غير كافية" };

    // ─── Use untyped raw client for new tables ────────────────────────────────
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient<any>(url, key, { auth: { persistSession: false } });

    const deleted: Record<string, number> = {};

    try {
        if (scope.orders) {
            // order_items cascade deletes with orders (FK), but delete explicitly to be safe
            const { count: itemsCount } = await sb
                .from("order_items")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.order_items = itemsCount ?? 0;

            const { count: ordersCount } = await sb
                .from("orders")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.orders = ordersCount ?? 0;

            // Reset coupon usage counts
            await sb
                .from("discount_coupons")
                .update({ usage_count: 0 })
                .neq("id", "00000000-0000-0000-0000-000000000000");
        }

        if (scope.designOrders) {
            // Delete messages first (FK), then orders
            const { count: msgsCount } = await sb
                .from("design_order_messages")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.design_order_messages = msgsCount ?? 0;

            const { count: doCount } = await sb
                .from("custom_design_orders")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.custom_design_orders = doCount ?? 0;
        }

        if (scope.behavioralEvents) {
            const { count } = await sb
                .from("behavioral_events")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.behavioral_events = count ?? 0;
        }

        if (scope.pageVisits) {
            const { count } = await sb
                .from("page_visits")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.page_visits = count ?? 0;
        }

        if (scope.marketingCampaigns) {
            const { count } = await sb
                .from("marketing_campaigns")
                .delete({ count: "exact" })
                .neq("id", "00000000-0000-0000-0000-000000000000");
            deleted.marketing_campaigns = count ?? 0;
        }

        return { success: true, deleted };
    } catch (err) {
        console.error("[purgeTestData] error:", err);
        return {
            success: false,
            deleted,
            error: "حدث خطأ أثناء الحذف — راجع السجلات",
        };
    }
}
