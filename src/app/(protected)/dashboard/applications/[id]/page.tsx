import { notFound } from "next/navigation";
import { getAdminApplicationDetails, getApplicationWorkspaceContext } from "@/app/actions/admin";
import { ApplicationReviewWorkspace } from "@/components/admin/applications/ApplicationReviewWorkspace";

export const metadata = {
    title: "مراجعة طلب الانضمام | لوحة الإدارة",
};

export default async function AdminApplicationDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [application, workspaceContext] = await Promise.all([
        getAdminApplicationDetails(id),
        getApplicationWorkspaceContext(id),
    ]);

    if (!application) {
        notFound();
    }

    return <ApplicationReviewWorkspace application={application} workspaceContext={workspaceContext} />;
}
