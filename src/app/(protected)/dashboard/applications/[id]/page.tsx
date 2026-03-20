import { notFound } from "next/navigation";
import { getAdminApplicationDetails, getApplicationWorkspaceContext } from "@/app/actions/admin";
import { ApplicationReviewWorkspace } from "@/components/admin/applications/ApplicationReviewWorkspace";

export const metadata = {
    title: "مراجعة طلب الانضمام | لوحة الإدارة",
};

export default async function AdminApplicationDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const [application, workspaceContext] = await Promise.all([
        getAdminApplicationDetails(params.id),
        getApplicationWorkspaceContext(params.id),
    ]);

    if (!application) {
        notFound();
    }

    return <ApplicationReviewWorkspace application={application} workspaceContext={workspaceContext} />;
}
