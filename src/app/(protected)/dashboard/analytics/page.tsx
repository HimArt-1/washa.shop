import { getAdminAnalytics, type AnalyticsPeriod } from "@/app/actions/admin";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    const period: AnalyticsPeriod = "30d";
    const data = await getAdminAnalytics(period);
    return <AnalyticsClient initialData={data} initialPeriod={period} />;
}
