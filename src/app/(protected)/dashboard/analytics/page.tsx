import { getAdminAnalytics, type AnalyticsPeriod } from "@/app/actions/admin";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    const period: AnalyticsPeriod = "30d";
    const data = await getAdminAnalytics(period);
    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز المالية والإيرادات"
                subtitle="غرفة تشغيل مالية تربط الإيراد بالتحصيل، الخصومات، الطلب اليومي، ومناطق التعثر من شاشة واحدة."
            />
            <AnalyticsClient initialData={data} initialPeriod={period} />
        </div>
    );
}
