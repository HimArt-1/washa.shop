import { getAdminList, getDesignOperationsSnapshot, getDesignOrders, getDesignPromptTemplate } from "@/app/actions/smart-store";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DesignOperationsCenter } from "@/components/admin/design-orders/DesignOperationsCenter";
import type { CustomDesignOrderStatus } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams?: Promise<{ page?: string; status?: string; admin?: string; search?: string }>;
}

export default async function DesignOrdersPage({ searchParams }: PageProps) {
    const params = (await searchParams) ?? {} as Record<string, string | undefined>;
    const page = Number(params.page) || 1;
    const status = (params.status || "all") as CustomDesignOrderStatus | "all";

    const [ordersResult, promptTemplate, adminList, snapshot] = await Promise.all([
        getDesignOrders(page, status),
        getDesignPromptTemplate(),
        getAdminList(),
        getDesignOperationsSnapshot(),
    ]);

    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز عمليات التصميم"
                subtitle="غرفة تشغيل لإدارة الوارد، التنفيذ، المراجعة، التعيين، والتسليم داخل مسار التصميم المخصص."
            />
            <DesignOperationsCenter
                snapshot={snapshot}
                clientProps={{
                    orders: ordersResult.data,
                    count: ordersResult.count,
                    totalPages: ordersResult.totalPages,
                    currentPage: page,
                    currentStatus: status,
                    promptTemplate,
                    stats: {
                        new: snapshot.stats.new,
                        in_progress: snapshot.stats.in_progress,
                        awaiting_review: snapshot.stats.awaiting_review,
                        modification_requested: snapshot.stats.modification_requested,
                        completed: snapshot.stats.completed,
                        cancelled: snapshot.stats.cancelled,
                        revenue: snapshot.stats.revenue,
                    },
                    adminList,
                }}
            />
        </div>
    );
}
