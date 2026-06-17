import { Suspense } from "react";
import { getAdminAnalytics, type AnalyticsPeriod } from "@/app/actions/admin";
import { getBehavioralSnapshot } from "@/app/actions/behavioral-analytics";
import { AnalyticsClient } from "@/components/admin/AnalyticsClient";
import { AnalyticsBehavioralClient } from "@/components/admin/AnalyticsBehavioralClient";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AnalyticsTabSwitcher } from "@/components/admin/AnalyticsTabSwitcher";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    const period: AnalyticsPeriod = "30d";
    const [financialData, behavioralData] = await Promise.all([
        getAdminAnalytics(period),
        getBehavioralSnapshot(30),
    ]);

    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز التحليلات"
                subtitle="المالية والإيرادات · السلوك والتحويل · مسارات المستخدم"
            />
            <Suspense fallback={null}>
                <AnalyticsTabSwitcher
                    financialTab={
                        <AnalyticsClient initialData={financialData} initialPeriod={period} />
                    }
                    behavioralTab={
                        <AnalyticsBehavioralClient initial={behavioralData} />
                    }
                />
            </Suspense>
        </div>
    );
}
