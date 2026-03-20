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
            <div className="theme-surface-panel rounded-[2rem] px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">SUPPORT THREAD</p>
                    <h1 className="text-2xl font-bold text-theme md:text-3xl">تذكرة #{details.ticket.id.slice(0, 8)}</h1>
                    <p className="text-sm text-theme-subtle">هذه المساحة مخصصة لمتابعة الردود بينك وبين فريق الدعم.</p>
                </div>
            </div>
            <SupportTicketChat ticket={details.ticket} initialMessages={details.messages} />
        </div>
    );
}
