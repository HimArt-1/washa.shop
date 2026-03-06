import { AdminHeader } from "@/components/admin/AdminHeader";
import { createClient } from "@supabase/supabase-js";
import { NotificationsAdminClient } from "./NotificationsAdminClient";

function getAdminSb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );
}

export default async function NotificationsAdminPage() {
    const supabase = getAdminSb();

    // Fetch notifications
    const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

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
                title="الإشعارات والتنبيهات"
                subtitle="متابعة التنبيهات الذكية وإشعارات النظام."
            />
            <NotificationsAdminClient
                notifications={notifications || []}
                alerts={{
                    lowStock: lowStockCount || 0,
                    pendingOrders: pendingOrdersCount || 0,
                    newUsersToday: newUsersToday || 0,
                }}
            />
        </div>
    );
}
