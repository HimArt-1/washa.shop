"use server";

import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { CartItem } from "@/stores/cartStore";

export async function saveUserCart(items: CartItem[]) {
    try {
        const user = await currentUser();
        if (!user) return { success: false };

        const supabase = getSupabaseServerClient();
        const { error } = await supabase
            .from("profiles")
            .update({ cart_items: items } as any)
            .eq("clerk_id", user.id);

        if (error) return { success: false };
        return { success: true };
    } catch {
        return { success: false };
    }
}

export async function loadUserCart(): Promise<CartItem[]> {
    try {
        const user = await currentUser();
        if (!user) return [];

        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from("profiles")
            .select("cart_items")
            .eq("clerk_id", user.id)
            .single();

        if (error || !data) return [];
        return (data as any).cart_items || [];
    } catch {
        return [];
    }
}
