import { getSupportTicketDetails } from "@/app/actions/support-tickets";
import { AdminSupportTicketChat } from "@/components/admin/support/AdminSupportTicketChat";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { notFound } from "next/navigation";

export const metadata = {
    title: "محادثة الدعم | لوحة الإدارة",
};

export default async function AdminSupportTicketPage({ params }: { params: { id: string } }) {
    const details = await getSupportTicketDetails(params.id);

    if (!details) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <AdminHeader
                title={`تذكرة: ${details.ticket.subject}`}
                subtitle={`#${details.ticket.id.slice(0, 8)} — ${(details.ticket.profile as any)?.display_name || "مستخدم"}`}
            />
            <AdminSupportTicketChat ticket={details.ticket as any} initialMessages={details.messages as any} />
        </div>
    );
}
