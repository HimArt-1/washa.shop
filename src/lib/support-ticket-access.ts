import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getCurrentUserOrDevAdmin } from "@/lib/admin-access";
import type { Database, SupportTicket } from "@/types/database";

export type SupportTicketAccessLevel = "none" | "owner" | "admin";

export type SupportTicketAccess = {
    sb: SupabaseClient<Database>;
    ticket: SupportTicket | null;
    access: SupportTicketAccessLevel;
    profileId: string | null;
};

export async function getSupportTicketAccess(ticketId: string): Promise<SupportTicketAccess> {
    const sb = getSupabaseAdminClient();
    const { data: ticket } = await sb
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

    const supportTicket = (ticket as SupportTicket | null) ?? null;
    if (!supportTicket) {
        return { sb, ticket: null, access: "none", profileId: null };
    }

    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        return { sb, ticket: null, access: "none", profileId: null };
    }

    const { data: profile } = await sb
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile) {
        return { sb, ticket: null, access: "none", profileId: null };
    }

    if (profile.role === "admin") {
        return { sb, ticket: supportTicket, access: "admin", profileId: profile.id };
    }

    if (supportTicket.user_id && supportTicket.user_id === profile.id) {
        return { sb, ticket: supportTicket, access: "owner", profileId: profile.id };
    }

    return { sb, ticket: null, access: "none", profileId: profile.id };
}

export async function requireSupportAdmin() {
    const user = await getCurrentUserOrDevAdmin();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const sb = getSupabaseAdminClient();
    const { data: profile } = await sb
        .from("profiles")
        .select("id, role")
        .eq("clerk_id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        throw new Error("Forbidden");
    }

    return { sb, profile, user };
}
