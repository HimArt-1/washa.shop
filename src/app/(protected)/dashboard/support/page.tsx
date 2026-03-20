import { adminGetSupportTickets, getSupportOperationsSnapshot } from "@/app/actions/support-tickets";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { SupportOperationsCenter } from "@/components/admin/support/SupportOperationsCenter";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "مركز الدعم الفني | لوحة الإدارة",
};

export default async function AdminSupportPage() {
    const [tickets, snapshot] = await Promise.all([
        adminGetSupportTickets(),
        getSupportOperationsSnapshot(),
    ]);

    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز الدعم الفني"
                subtitle="غرفة تشغيل مركزة لطوابير الدعم، التذاكر الحرجة، التذاكر الراكدة، وسرعة الاستجابة اليومية."
            />
            <SupportOperationsCenter snapshot={snapshot} tickets={tickets} />
        </div>
    );
}
