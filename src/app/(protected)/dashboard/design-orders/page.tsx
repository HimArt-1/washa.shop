import { getDesignOrders, getDesignPromptTemplate } from "@/app/actions/smart-store";
import { DesignOrdersClient } from "@/components/admin/DesignOrdersClient";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams?: { page?: string; status?: string };
}

export default async function DesignOrdersPage({ searchParams }: PageProps) {
    const params = searchParams ?? {};
    const page = Number(params.page) || 1;
    const status = params.status || "all";

    const [ordersResult, promptTemplate] = await Promise.all([
        getDesignOrders(page, status),
        getDesignPromptTemplate(),
    ]);

    return (
        <div className="space-y-6">
            <AdminHeader
                title="طلبات التصميم"
                subtitle="إدارة طلبات التصميم المخصص من العملاء — مراجعة، تنفيذ، وإرسال النتائج."
            />
            <DesignOrdersClient
                orders={ordersResult.data}
                count={ordersResult.count}
                totalPages={ordersResult.totalPages}
                currentPage={page}
                currentStatus={status}
                promptTemplate={promptTemplate}
            />
        </div>
    );
}
