import { getSupportTicketDetails } from "@/app/actions/support-tickets";
import { SupportTicketChat } from "@/components/account/SupportTicketChat";
import { notFound } from "next/navigation";

export const metadata = {
    title: "محادثة الدعم | حسابي",
};

export default async function SupportTicketPage({ params }: { params: { id: string } }) {
    const details = await getSupportTicketDetails(params.id);

    if (!details) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-theme">تذكرة #{details.ticket.id.slice(0, 8)}</h1>
            <SupportTicketChat ticket={details.ticket} initialMessages={details.messages} />
        </div>
    );
}
