import { getAdminApplications } from "@/app/actions/admin";
import { ApplicationsClient } from "@/components/admin/ApplicationsClient";

interface PageProps {
    searchParams: Promise<{ status?: string }>;
}

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const status = params.status || "all";

    const { data: applications, count } = await getAdminApplications(status);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">طلبات الانضمام</h1>
                <p className="text-fg/40 mt-1">مراجعة وإدارة طلبات انضمام الفنانين للمنصة.</p>
            </div>

            <ApplicationsClient
                applications={applications}
                count={count}
                currentStatus={status}
            />
        </div>
    );
}
