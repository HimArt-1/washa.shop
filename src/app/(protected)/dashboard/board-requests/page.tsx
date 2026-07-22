import { AdminHeader } from "@/components/admin/AdminHeader";
import {
    getBoardRequests,
} from "@/app/actions/board-requests";
import {
    normalizeBoardManualPrintFilter,
    normalizeBoardRequestStatus,
} from "@/lib/board-request-filters";
import { BoardRequestsClient } from "./BoardRequestsClient";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams?: Promise<{
        status?: string;
        manual_print_status?: string;
    }>;
}

export default async function BoardRequestsPage({ searchParams }: PageProps) {
    const params = (await searchParams) ?? {};
    const status = normalizeBoardRequestStatus(params.status);
    const manualPrintStatus = normalizeBoardManualPrintFilter(
        params.manual_print_status
    );
    const rows = await getBoardRequests({
        status,
        manualPrintStatus: status === "ready" ? manualPrintStatus : undefined,
    });

    return (
        <div className="space-y-6">
            <AdminHeader
                title="طلبات اللوحات الاحتياطية"
                subtitle="راجع المعاينات الجاهزة للتركيب اليدوي واكشف طلبات التوليد الفاشلة من شاشة واحدة."
            />
            <BoardRequestsClient
                rows={rows}
                status={status}
                manualPrintStatus={manualPrintStatus}
            />
        </div>
    );
}
