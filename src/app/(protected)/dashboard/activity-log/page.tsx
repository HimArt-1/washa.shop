import { AdminHeader } from "@/components/admin/AdminHeader";
import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ActivityLogClient } from "./ActivityLogClient";

function getAdminSb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );
}

export default async function ActivityLogPage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const supabase = getAdminSb();

    // Fetch recent activity from multiple tables
    const [ordersRes, productsRes, profilesRes] = await Promise.all([
        supabase
            .from("orders")
            .select("id, order_number, status, payment_status, created_at, total")
            .order("created_at", { ascending: false })
            .limit(20),
        supabase
            .from("products")
            .select("id, title, price, created_at, updated_at")
            .order("updated_at", { ascending: false })
            .limit(15),
        supabase
            .from("profiles")
            .select("id, display_name, role, created_at")
            .order("created_at", { ascending: false })
            .limit(10),
    ]);

    const activities = buildActivityLog(
        ordersRes.data || [],
        productsRes.data || [],
        profilesRes.data || [],
    );

    return (
        <div className="space-y-6">
            <AdminHeader
                title="سجل العمليات"
                subtitle="متابعة جميع الأنشطة والعمليات التي تمت في النظام."
            />
            <ActivityLogClient activities={activities} />
        </div>
    );
}

// Build a unified timeline from different data sources
function buildActivityLog(orders: any[], products: any[], profiles: any[]) {
    const log: {
        id: string;
        type: "order" | "product" | "user";
        action: string;
        detail: string;
        timestamp: string;
    }[] = [];

    orders.forEach((o) => {
        log.push({
            id: `order-${o.id}`,
            type: "order",
            action: `طلب #${o.order_number}`,
            detail: `حالة: ${o.status} — الدفع: ${o.payment_status} — ${Number(o.total).toLocaleString()} ر.س`,
            timestamp: o.created_at,
        });
    });

    products.forEach((p) => {
        log.push({
            id: `product-${p.id}`,
            type: "product",
            action: `${p.title}`,
            detail: `${Number(p.price).toLocaleString()} ر.س`,
            timestamp: p.updated_at || p.created_at,
        });
    });

    profiles.forEach((u) => {
        log.push({
            id: `user-${u.id}`,
            type: "user",
            action: u.display_name || "مستخدم جديد",
            detail: `الدور: ${u.role || "user"}`,
            timestamp: u.created_at,
        });
    });

    // Sort by timestamp, newest first
    log.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return log.slice(0, 50);
}
