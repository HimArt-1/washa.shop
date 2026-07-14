import { AdminHeader } from "@/components/admin/AdminHeader";
import { createClient } from "@supabase/supabase-js";
import { NotificationsAdminClient } from "./NotificationsAdminClient";
import { getAdminNotifications, getUnreadNotificationsCount } from "@/app/actions/notifications";

function getAdminSb() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    return createClient(
        url,
        key,
        { auth: { persistSession: false } }
    );
}

export default async function NotificationsAdminPage() {
    const supabase = getAdminSb();

    const [notifications, unreadCount] = await Promise.all([
        getAdminNotifications(100),
        getUnreadNotificationsCount(),
    ]);

    // Build dashboard alerts
    const { count: lowStockCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("stock_quantity", "is", null)
        .lte("stock_quantity", 5)
        .eq("in_stock", true);

    const { count: pendingOrdersCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

    const { count: newUsersToday } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    return (
        <div className="space-y-6">
            <AdminHeader
                title="تنبيهات الإدارة"
                subtitle="قناة داخلية منفصلة لمتابعة الطلبات والمدفوعات والتنبيهات التشغيلية."
            />
            <NotificationsAdminClient
                notifications={notifications || []}
                totalUnreadCount={unreadCount}
                alerts={{
                    lowStock: lowStockCount || 0,
                    pendingOrders: pendingOrdersCount || 0,
                    newUsersToday: newUsersToday || 0,
                }}
            />
        </div>
    );
}
