"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Database, DesignOrderMessage } from "@/types/database";

// Admin/Service client to bypass RLS for fetching everything easily
function getServiceRoleClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

// Public client for anonymous inserts
function getPublicClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/**
 * Fetch all messages for a specific design order.
 * Safe to be called publicly because RLS allows anyone to read messages.
 */
export async function getDesignOrderMessages(orderId: string) {
    // Both user and admin can see this. Using service role to ensure reliable fetching regardless of auth state.
    const sb = getServiceRoleClient();

    const { data, error } = await sb
        .from("design_order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching order messages:", error);
        return [];
    }

    return (data as DesignOrderMessage[]) || [];
}

/**
 * Customer sends a message about their anonymous/guest design order.
 */
export async function customerSendOrderMessage(orderId: string, message: string) {
    if (!message.trim()) return { success: false, error: "الرسالة فارغة" };

    const sb = getPublicClient();

    // RLS policy: Anyone can insert as long as is_admin_reply = false
    const { error } = await (sb as any)
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
    revalidatePath(`/design/tracker?order=${orderId}`);
    return { success: true };
}

/**
 * Admin sends a reply to a design order.
 */
export async function adminSendOrderMessage(orderId: string, message: string) {
    if (!message.trim()) return { success: false, error: "الرسالة فارغة" };

    const sb = getServiceRoleClient();

    const { error } = await (sb as any)
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
