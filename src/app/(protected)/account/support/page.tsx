import { getUserSupportTickets } from "@/app/actions/support-tickets";
import { SupportDashboardClient } from "@/components/account/SupportDashboardClient";

export const metadata = {
    title: "رسائل الدعم الفني | حسابي",
};

export default async function UserSupportPage() {
    const tickets = await getUserSupportTickets();

    return (
        <div className="space-y-8">
            <div className="theme-surface-panel rounded-[2rem] px-6 py-6 sm:px-8 sm:py-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">ACCOUNT SUPPORT</p>
                        <h1 className="mt-2 text-2xl font-bold text-theme md:text-3xl">رسائل الدعم الفني</h1>
                    </div>
                    <p className="max-w-2xl text-sm text-theme-soft">
                        تواصل مع فريق الدعم، افتح تذكرة جديدة، أو تابع المحادثات الحالية من مكان واحد.
                    </p>
                </div>
            </div>

            <SupportDashboardClient initialTickets={tickets} />
        </div>
    );
}
