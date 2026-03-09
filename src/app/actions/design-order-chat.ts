"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { Database, DesignOrderMessage } from "@/types/database";

// Admin/Service client to bypass RLS for fetching everything easily
function getServiceRoleClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        console.error("Missing Supabase Service Role Env Vars:", { url: !!url, key: !!key });
    }
    return createClient<Database>(url!, key!);
}

// Public client for anonymous inserts
function getPublicClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
        console.error("Missing Supabase Public Env Vars:", { url: !!url, key: !!key });
    }
    return createClient<Database>(url!, key!);
}

/**
 * Fetch all messages for a specific design order.
 * Safe to be called publicly because RLS allows anyone to read messages.
 */
export async function getDesignOrderMessages(orderId: string) {
    // Attempt with service role first for admin context, but fallback to public
    let sb;
    try {
        sb = getServiceRoleClient();
    } catch (e) {
        console.warn("Falling back to public client for message fetch due to service role init error");
        sb = getPublicClient();
    }

    const { data, error } = await sb
        .from("design_order_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error(`Error fetching order messages for ${orderId}:`, error);
        // Retry with public client if service role failed or errored out
        if (sb !== getPublicClient()) {
            const publicSb = getPublicClient();
            const { data: publicData, error: publicError } = await publicSb
                .from("design_order_messages")
                .select("*")
                .eq("order_id", orderId)
                .order("created_at", { ascending: true });

            if (!publicError) return (publicData as DesignOrderMessage[]) || [];
        }
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
