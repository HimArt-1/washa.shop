"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type {
    AdminNotification,
    AdminNotificationCategory,
    AdminNotificationSeverity,
    AdminNotificationType,
    UserRole,
} from "@/types/database";
import { getCurrentUserOrDevAdmin, resolveAdminAccess } from "@/lib/admin-access";
import { getDefaultAdminNotificationMeta } from "@/lib/admin-notification-meta";
import { ADMIN_NOTIFICATION_ROLES } from "@/lib/notification-roles";

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
    const { profile } = await resolveAdminAccess(user);
    return profile && ADMIN_NOTIFICATION_ROLES.includes(profile.role)
        ? { supabase, profileId: profile.id }
        : null;
}

/** جلب الإشعارات للأدمن */
export async function getAdminNotifications(limit = 20): Promise<AdminNotification[]> {
    try {
        const access = await requireAdmin();
        if (!access) return [];
        const { supabase, profileId } = access;
        const { data, error } = await supabase
            .from("admin_notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("[getAdminNotifications]", error);
            return [];
        }
        const notifications = (data || []) as AdminNotification[];
        if (!notifications.length) return [];

        const { data: reads, error: readsError } = await supabase
            .from("admin_notification_reads")
            .select("notification_id")
            .eq("profile_id", profileId)
            .in("notification_id", notifications.map((notification) => notification.id));

        if (readsError) {
            console.error("[getAdminNotifications:reads]", readsError);
            return notifications.map((notification) => ({ ...notification, is_read: false }));
        }

        const readIds = new Set((reads || []).map((read) => read.notification_id));
        return notifications.map((notification) => ({
            ...notification,
            is_read: readIds.has(notification.id),
        }));
    } catch {
        return [];
    }
}

/** عدد الإشعارات غير المقروءة */
export async function getUnreadNotificationsCount(severity?: AdminNotificationSeverity): Promise<number> {
    try {
        const access = await requireAdmin();
        if (!access) return 0;
        const { data, error } = await access.supabase.rpc("get_admin_unread_notification_count", {
            p_profile_id: access.profileId,
            p_severity: severity ?? null,
        });

        if (error) return 0;
        return Number(data ?? 0);
    } catch {
        return 0;
    }
}

/** تعليم إشعار كمقروء */
export async function markNotificationRead(id: string) {
    try {
        const access = await requireAdmin();
        if (!access) return { success: false as const, error: "Unauthorized" };
        const { error } = await access.supabase
            .from("admin_notification_reads")
            .upsert({ notification_id: id, profile_id: access.profileId });

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
        const access = await requireAdmin();
        if (!access) return { success: false as const, error: "Unauthorized" };
        const { error } = await access.supabase.rpc("mark_all_admin_notifications_read", {
            p_profile_id: access.profileId,
        });

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
