"use server";

import { SupportTicketPriority, SupportTicketStatus } from "@/types/database";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createUserNotification } from "./user-notifications";
import { createAdminNotification } from "./notifications";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getSupportTicketAccess, requireSupportAdmin } from "@/lib/support-ticket-access";
import { emitSupportServiceEscalations } from "@/lib/operational-escalations";

export async function createSupportTicket(data: { subject: string; message: string; priority: SupportTicketPriority }) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const subject = data.subject.trim();
    const message = data.message.trim();
    if (!subject || !message) {
        return { success: false, error: "Subject and message are required" };
    }

    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase.from("profiles").select("id").eq("clerk_id", user.id).single();
    if (!profile) return { success: false, error: "Profile not found" };

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
            user_id: profile.id,
            subject,
            priority: data.priority,
            name: user.firstName || "مستخدم",
            email: user.emailAddresses?.[0]?.emailAddress || "",
            message,
        })
        .select("id")
        .single();

    if (ticketError || !ticket) {
        console.error("[createSupportTicket] Error creating ticket:", ticketError);
        return { success: false, error: ticketError?.message || "Failed to create ticket" };
    }

    // Insert the first message
    const { error: msgError } = await supabase.from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: profile.id,
        message,
    });

    if (msgError) {
        console.error("[createSupportTicket] Error creating initial message:", msgError);
    }

    // Notify admin about new support ticket
    await createAdminNotification({
        type: "system_alert",
        category: "support",
        severity: "warning",
        title: "تذكرة دعم جديدة 🎫",
        message: `تذكرة جديدة من ${user.firstName || "مستخدم"}: ${subject}`,
        link: `/dashboard/support`,
    });

    revalidatePath("/account/support");
    return { success: true, ticketId: ticket.id };
}

export async function getUserSupportTickets() {
    const user = await currentUser();
    if (!user) return [];

    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase.from("profiles").select("id").eq("clerk_id", user.id).single();
    if (!profile) return [];

    const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", profile.id)
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("[getUserSupportTickets] Error:", error);
        return [];
    }
    return data || [];
}

export async function getSupportTicketDetails(ticketId: string) {
    const { sb: supabase, access } = await getSupportTicketAccess(ticketId);
    if (access === "none") return null;

    // Fetch Ticket + User Profile
    const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*, profile:profiles!user_id(display_name, avatar_url, role)")
        .eq("id", ticketId)
        .single();

    if (ticketError || !ticket) return null;

    // Fetch Messages
    const { data: messages, error: messagesError } = await supabase
        .from("support_messages")
        .select("*, sender:profiles!sender_id(display_name, avatar_url, role)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

    if (messagesError) {
        console.error("[getSupportTicketDetails] Messages error:", messagesError);
    }

    return {
        ticket,
        messages: messages || []
    };
}

export async function createSupportMessage(ticketId: string, message: string) {
    const content = message.trim();
    if (!content) return { success: false, error: "Message is required" };

    const { sb: supabase, ticket, access, profileId } = await getSupportTicketAccess(ticketId);
    if (access === "none" || !ticket || !profileId) {
        return { success: false, error: "Unauthorized" };
    }

    if (access === "owner" && (ticket.status === "closed" || ticket.status === "resolved")) {
        return { success: false, error: "Ticket is closed" };
    }

    const isAdminReply = access === "admin";

    // Insert Message
    const { error } = await supabase.from("support_messages").insert({
        ticket_id: ticketId,
        sender_id: profileId,
        message: content,
        is_admin_reply: isAdminReply
    });

    if (error) {
        console.error("[createSupportMessage]", error);
        return { success: false, error: error.message };
    }

    // Update Ticket's updated_at timestamp & optionally status
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (isAdminReply && ticket.status === "open") updatePayload.status = "in_progress";

    await supabase.from("support_tickets").update(updatePayload).eq("id", ticketId);

    // Notifications
    if (isAdminReply && ticket.user_id) {
        await createUserNotification({
            userId: ticket.user_id,
            type: "support_reply",
            title: "رد جديد من الدعم الفني",
            message: `تم الرد على تذكرتك: ${ticket.subject}`,
            link: `/account/support/${ticketId}`
        });
    }

    revalidatePath(`/account/support/${ticketId}`);
    revalidatePath(`/dashboard/support/${ticketId}`);

    return { success: true };
}

// ─── ADMIN ACTIONS ─────────────────────────────────────────

export async function adminGetSupportTickets() {
    try {
        const { sb: supabase } = await requireSupportAdmin();
        const { data, error } = await supabase
            .from("support_tickets")
            .select("*, profile:profiles!user_id(display_name, avatar_url)")
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("[adminGetSupportTickets]", error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error("[adminGetSupportTickets]", err);
        return [];
    }
}

export async function getSupportOperationsSnapshot() {
    try {
        const { sb: supabase } = await requireSupportAdmin();
        const todayStartIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const staleThresholdIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const results = await Promise.allSettled([
            supabase.from("support_tickets").select("id", { count: "exact", head: true }),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "closed"),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("priority", "high").in("status", ["open", "in_progress"]),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", todayStartIso),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("updated_at", todayStartIso).in("status", ["resolved", "closed"]),
            supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]).lte("created_at", staleThresholdIso),
            supabase.from("support_tickets")
                .select("id, created_at, updated_at")
                .in("status", ["open", "in_progress"]),
            supabase.from("support_tickets")
                .select("id, created_at, updated_at")
                .in("status", ["resolved", "closed"]),
            supabase.from("support_tickets")
                .select("*, profile:profiles!user_id(display_name, avatar_url)")
                .eq("priority", "high")
                .in("status", ["open", "in_progress"])
                .order("updated_at", { ascending: false })
                .limit(5),
            supabase.from("support_tickets")
                .select("*, profile:profiles!user_id(display_name, avatar_url)")
                .in("status", ["open", "in_progress"])
                .lte("created_at", staleThresholdIso)
                .order("created_at", { ascending: true })
                .limit(5),
            supabase.from("support_tickets")
                .select("*, profile:profiles!user_id(display_name, avatar_url)")
                .in("status", ["resolved", "closed"])
                .order("updated_at", { ascending: false })
                .limit(5),
            supabase.from("support_tickets")
                .select("*, profile:profiles!user_id(display_name, avatar_url)")
                .in("status", ["open", "in_progress"])
                .order("created_at", { ascending: true })
                .limit(40),
        ]);

        const getCount = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && typeof result.value.count === "number" ? result.value.count : 0;

        const getData = (result: PromiseSettledResult<any>) =>
            result.status === "fulfilled" && Array.isArray(result.value.data) ? result.value.data : [];

        results.forEach((res, idx) => {
            if (res.status === "rejected") {
                console.error(`Support snapshot query ${idx} failed:`, res.reason);
                return;
            }

            if (res.value?.error) {
                console.error(`Support snapshot query ${idx} returned DB error:`, res.value.error);
            }
        });

        const activeAges = getData(results[9]).map((ticket: { created_at: string }) => {
            return (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
        });
        const resolvedDurations = getData(results[10]).map((ticket: { created_at: string; updated_at: string }) => {
            return (new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
        });
        const activeDetailed = getData(results[14]);
        const slaQueue = activeDetailed
            .map((ticket: any) => {
                const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
                const isHighPriority = ticket.priority === "high";
                const riskThreshold = isHighPriority ? 2 : 8;
                const breachThreshold = isHighPriority ? 6 : 24;
                const slaState =
                    ageHours >= breachThreshold ? "breached" : ageHours >= riskThreshold ? "at_risk" : "healthy";

                return {
                    ...ticket,
                    ageHours,
                    slaState,
                    flagLabel:
                        slaState === "breached"
                            ? `تجاوز SLA منذ ${Math.round(ageHours)} ساعة`
                            : slaState === "at_risk"
                              ? `على وشك تجاوز SLA خلال ${Math.round(ageHours)} ساعة`
                              : null,
                };
            })
            .filter((ticket: any) => ticket.slaState !== "healthy")
            .sort((a: any, b: any) => {
                const stateRank = (value: string) => (value === "breached" ? 0 : 1);
                const stateDelta = stateRank(a.slaState) - stateRank(b.slaState);
                if (stateDelta !== 0) return stateDelta;

                const priorityRank = (value: string) => (value === "high" ? 0 : value === "normal" ? 1 : 2);
                const priorityDelta = priorityRank(a.priority) - priorityRank(b.priority);
                if (priorityDelta !== 0) return priorityDelta;

                return b.ageHours - a.ageHours;
            })
            .slice(0, 5);

        const avgActiveHours = activeAges.length
            ? Math.round(activeAges.reduce((sum: number, value: number) => sum + value, 0) / activeAges.length)
            : 0;
        const avgResolutionHours = resolvedDurations.length
            ? Math.round(resolvedDurations.reduce((sum: number, value: number) => sum + value, 0) / resolvedDurations.length)
            : 0;

        const snapshot = {
            stats: {
                total: getCount(results[0]),
                open: getCount(results[1]),
                inProgress: getCount(results[2]),
                resolved: getCount(results[3]),
                closed: getCount(results[4]),
                urgentOpen: getCount(results[5]),
                createdToday: getCount(results[6]),
                resolvedToday: getCount(results[7]),
                staleActive: getCount(results[8]),
                avgActiveHours,
                avgResolutionHours,
                slaAtRisk: slaQueue.filter((ticket: any) => ticket.slaState === "at_risk").length,
                slaBreached: slaQueue.filter((ticket: any) => ticket.slaState === "breached").length,
            },
            urgentQueue: getData(results[11]),
            staleQueue: getData(results[12]),
            recentlyResolved: getData(results[13]),
            slaQueue,
        };

        await emitSupportServiceEscalations(snapshot);

        return snapshot;
    } catch (err) {
        console.error("[getSupportOperationsSnapshot]", err);
        return {
            stats: {
                total: 0,
                open: 0,
                inProgress: 0,
                resolved: 0,
                closed: 0,
                urgentOpen: 0,
                createdToday: 0,
                resolvedToday: 0,
                staleActive: 0,
                avgActiveHours: 0,
                avgResolutionHours: 0,
                slaAtRisk: 0,
                slaBreached: 0,
            },
            urgentQueue: [],
            staleQueue: [],
            recentlyResolved: [],
            slaQueue: [],
        };
    }
}

export async function adminUpdateSupportTicketStatus(ticketId: string, status: SupportTicketStatus) {
    const { sb: supabase } = await requireSupportAdmin();
    const { error } = await supabase.from("support_tickets").update({
        status,
        updated_at: new Date().toISOString()
    }).eq("id", ticketId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/dashboard/support/${ticketId}`);
    revalidatePath(`/dashboard/support`);
    revalidatePath(`/account/support/${ticketId}`);
    return { success: true };
}
