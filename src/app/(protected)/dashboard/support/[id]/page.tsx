import { getSupportTicketDetails } from "@/app/actions/support-tickets";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SupportCaseWorkspace } from "@/components/admin/support/SupportCaseWorkspace";
import { notFound } from "next/navigation";

export const metadata = {
    title: "مساحة عمل الدعم | لوحة الإدارة",
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
                subtitle={`#${details.ticket.id.slice(0, 8)} — مساحة عمل تركز على SLA، قرار الحالة، وسياق العميل في نفس الشاشة.`}
            />
            <SupportCaseWorkspace ticket={details.ticket as any} initialMessages={details.messages as any} />
        </div>
    );
}
