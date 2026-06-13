"use server";

import { type SupportTicketStatus, type SupportTicketPriority } from "@/types/database";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createAdminNotification } from "@/app/actions/notifications";
import { revalidatePath } from "next/cache";
import { runIdempotentDispatch } from "@/lib/idempotent-dispatch";
import { escapeAdminNotificationHtml, sendAdminNotification } from "@/lib/notifications";

interface GenerateTicketInput {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export async function submitSupportTicket(data: GenerateTicketInput) {
    try {
        const name = data.name.trim();
        const email = data.email.trim().toLowerCase();
        const subject = data.subject.trim();
        const message = data.message.trim();

        if (!name || !email || !subject || !message) {
            return { success: false, error: "جميع الحقول مطلوبة" };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: "البريد الإلكتروني غير صحيح" };
        }

        const adminSupabase = getSupabaseAdminClient();
        const user = await currentUser();
        let resolvedUserId: string | null = null;

        if (user) {
            const { data: profile } = await adminSupabase
                .from("profiles")
                .select("id")
                .eq("clerk_id", user.id)
                .single();

            resolvedUserId = profile?.id ?? null;
        }

        const ticketData = {
            name,
            email,
            subject,
            message,
            user_id: resolvedUserId,
            status: "open" as SupportTicketStatus,
            priority: "normal" as SupportTicketPriority,
        };

        const { data: ticket, error } = await adminSupabase
            .from("support_tickets")
            .insert(ticketData)
            .select("id")
            .single();

        if (error || !ticket) {
            console.error("Support Ticket Submission Error:", error);
            throw error || new Error("Support ticket was not created");
        }

        if (resolvedUserId) {
            const { error: messageError } = await adminSupabase
                .from("support_messages")
                .insert({
                    ticket_id: ticket.id,
                    sender_id: resolvedUserId,
                    message,
                });

            if (messageError) {
                console.warn("[submitSupportTicket] Initial support message was not mirrored:", messageError);
            }
        }

        await createAdminNotification({
            type: "system_alert",
            category: "support",
            severity: "warning",
            title: "تذكرة دعم جديدة",
            message: `تذكرة جديدة من ${name}: ${subject}`,
            link: `/dashboard/support/${ticket.id}`,
        });

        await runIdempotentDispatch(
            {
                dispatchKey: `support_ticket:${ticket.id}:webhook_admin:created`,
                eventType: "support_ticket_created",
                channel: "webhook_admin",
                resourceType: "support_ticket",
                resourceId: ticket.id,
                metadata: {
                    ticket_id: ticket.id,
                    subject,
                    email,
                    source: "public_support",
                },
            },
            async () => {
                await sendAdminNotification(
                    [
                        "🎫 <b>تذكرة دعم جديدة</b>",
                        `الموضوع: ${escapeAdminNotificationHtml(subject)}`,
                        `الأولوية: عادي`,
                        `العميل: ${escapeAdminNotificationHtml(name)}`,
                        `البريد: ${escapeAdminNotificationHtml(email)}`,
                        `الرابط: ${escapeAdminNotificationHtml(`/dashboard/support/${ticket.id}`)}`,
                    ].join("\n")
                );
            }
        ).catch(console.error);

        revalidatePath("/support");
        revalidatePath("/dashboard/support");
        if (resolvedUserId) {
            revalidatePath("/account/support");
        }

        return { success: true };
    } catch (e: any) {
        console.error("Error creating support ticket:", e);
        return { success: false, error: "حدث خطأ غير متوقع أثناء إرسال تذكرتك، يرجى المحاولة لاحقاً" };
    }
}
