"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type {
    AdminNotification,
    AdminNotificationCategory,
    AdminNotificationSeverity,
    AdminNotificationType,
} from "@/types/database";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import { getDefaultAdminNotificationMeta } from "@/lib/admin-notification-meta";

// NOTE: "use server" files can only export async functions.
// Import createUserNotification from "./user-notifications" directly.
// Import AdminNotification type from "@/types/database" directly.

// Raw client (bypasses typed schema to avoid postgrest-js never-type issue)
function getNotificationsClient() {
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

/** إنشاء إشعار (يُستدعى من createOrder، applications، إلخ) */
export async function createAdminNotification(data: {
    type: AdminNotificationType;
    title: string;
    message?: string;
    link?: string;
    metadata?: Record<string, unknown>;
    category?: AdminNotificationCategory;
    severity?: AdminNotificationSeverity;
}) {
    const supabase = getNotificationsClient();
    const defaults = getDefaultAdminNotificationMeta(data.type);
    const { error } = await supabase.from("admin_notifications").insert({
        type: data.type,
        category: data.category ?? defaults.category,
        severity: data.severity ?? defaults.severity,
        title: data.title,
        message: data.message ?? null,
        link: data.link ?? null,
        metadata: data.metadata ?? {},
    });
    if (error) {
        console.error("[createAdminNotification]", error);
        return { success: false as const, error: error.message };
    }
    return { success: true as const };
}

async function requireAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) return null;
    const supabase = getNotificationsClient();
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
    try {
        const supabase = await requireAdmin();
        if (!supabase) return { success: false as const, error: "Unauthorized" };
        const { error } = await supabase
            .from("admin_notifications")
            .update({ is_read: true })
            .eq("id", id);

        if (error) {
            return { success: false as const, error: error.message };
        }

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/notifications");
        return { success: true as const };
    } catch (error) {
        return { success: false as const, error: error instanceof Error ? error.message : "Failed to mark notification as read" };
    }
}

/** تعليم الكل كمقروء */
export async function markAllNotificationsRead() {
    try {
        const supabase = await requireAdmin();
        if (!supabase) return { success: false as const, error: "Unauthorized" };
        const { error } = await supabase
            .from("admin_notifications")
            .update({ is_read: true })
            .eq("is_read", false);

        if (error) {
            return { success: false as const, error: error.message };
        }

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/notifications");
        return { success: true as const };
    } catch (error) {
        return { success: false as const, error: error instanceof Error ? error.message : "Failed to mark all notifications as read" };
    }
}
