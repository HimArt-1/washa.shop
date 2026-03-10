import { getUserSupportTickets } from "@/app/actions/support-tickets";
import { SupportDashboardClient } from "@/components/account/SupportDashboardClient";

export const metadata = {
    title: "رسائل الدعم الفني | حسابي",
};

export default async function UserSupportPage() {
    const tickets = await getUserSupportTickets();

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-theme">رسائل الدعم الفني</h1>
                <p className="text-theme-soft text-sm">تواصل مع فريق الدعم لحل أي مشكلة تواجهك أو للإجابة على استفساراتك.</p>
            </div>

            <SupportDashboardClient initialTickets={tickets} />
        </div>
    );
}
