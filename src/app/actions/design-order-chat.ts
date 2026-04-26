"use server";

import { revalidatePath } from "next/cache";
import type { DesignOrderMessage } from "@/types/database";
import { getDesignOrderAccess } from "@/lib/design-order-access";

/**
 * Fetch all messages for a specific design order.
 */
export async function getDesignOrderMessages(orderId: string, trackerToken?: string | null) {
    const { sb, order } = await getDesignOrderAccess(orderId, trackerToken);
    if (!order) {
        return [];
    }

    const { data, error } = await sb
        .from("design_order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(`Error fetching order messages for ${orderId}:`, error);
        return [];
    }

    return (data as DesignOrderMessage[]) || [];
}

/**
 * Customer sends a message about their design order.
 */
export async function customerSendOrderMessage(orderId: string, message: string, trackerToken?: string | null) {
    if (!message.trim()) return { success: false, error: "الرسالة فارغة" };

    const { sb, access } = await getDesignOrderAccess(orderId, trackerToken);
    if (access !== "owner" && access !== "token") {
        return { success: false, error: "غير مصرح لك بهذه المحادثة" };
    }

    const { error } = await sb
        .from("design_order_messages")
        .insert({
            order_id: orderId,
            message: message.trim(),
            is_admin_reply: false,
        });

    if (error) {
        console.error("Error sending customer message:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/design");
    revalidatePath("/design/preorder");
    revalidatePath(`/design/tracker?order=${orderId}`);
    return { success: true };
}

/**
 * Admin sends a reply to a design order.
 */
export async function adminSendOrderMessage(orderId: string, message: string) {
    if (!message.trim()) return { success: false, error: "الرسالة فارغة" };

    const { sb, access } = await getDesignOrderAccess(orderId);
    if (access !== "admin") {
        return { success: false, error: "صلاحيات غير كافية" };
    }

    const { error } = await sb
        .from("design_order_messages")
        .insert({
            order_id: orderId,
            message: message.trim(),
            is_admin_reply: true,
        });

    if (error) {
        console.error("Error sending admin message:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/smart-store");
    return { success: true };
}
