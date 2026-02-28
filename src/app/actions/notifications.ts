"use server";

import { createClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
    );
}

export type NotificationType = "order_new" | "application_new" | "payment_received" | "order_status";

export interface AdminNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string | null;
    link: string | null;
    metadata: Record<string, unknown>;
    is_read: boolean;
    created_at: string;
}

/** إنشاء إشعار (يُستدعى من createOrder، applications، إلخ) */
export async function createAdminNotification(data: {
    type: NotificationType;
    title: string;
    message?: string;
    link?: string;
    metadata?: Record<string, unknown>;
}) {
    const supabase = getSupabase();
    const { error } = await supabase.from("admin_notifications").insert({
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        link: data.link ?? null,
        metadata: data.metadata ?? {},
    });
    if (error) console.error("[createAdminNotification]", error);
}

async function requireAdmin() {
    const user = await currentUser();
    if (!user) return null;
    const supabase = getSupabase();
    const { data } = await supabase.from("profiles").select("role").eq("clerk_id", user.id).single();
    return data?.role === "admin" ? supabase : null;
}

/** جلب الإشعارات للأدمن */
export async function getAdminNotifications(limit = 20): Promise<AdminNotification[]> {
    try {
        const supabase = await requireAdmin();
        if (!supabase) return [];
        const { data, error } = await supabase
            .from("admin_notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("[getAdminNotifications]", error);
            return [];
        }
        return (data || []) as AdminNotification[];
    } catch {
        return [];
    }
}

/** عدد الإشعارات غير المقروءة */
export async function getUnreadNotificationsCount(): Promise<number> {
    try {
        const supabase = await requireAdmin();
        if (!supabase) return 0;
        const { count, error } = await supabase
            .from("admin_notifications")
            .select("id", { count: "exact", head: true })
            .eq("is_read", false);

        if (error) return 0;
        return count ?? 0;
    } catch {
        return 0;
    }
}

/** تعليم إشعار كمقروء */
export async function markNotificationRead(id: string) {
    const supabase = await requireAdmin();
    if (!supabase) return;
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
}

/** تعليم الكل كمقروء */
export async function markAllNotificationsRead() {
    const supabase = await requireAdmin();
    if (!supabase) return;
    await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
}
