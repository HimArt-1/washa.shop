import { getAdminList, getDesignOrder } from "@/app/actions/smart-store";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DesignOrderWorkspace } from "@/components/admin/design-orders/DesignOrderWorkspace";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
    params: { id: string };
}

export default async function DesignOrderDetailPage({ params }: PageProps) {
    const { id } = params;

    const [order, adminList] = await Promise.all([
        getDesignOrder(id),
        getAdminList(),
    ]);

    if (!order) notFound();

    return (
        <div className="space-y-6">
            <AdminHeader
                title={`طلب التصميم #${order.order_number}`}
                subtitle="مساحة عمل تفصيلية لإدارة الحالة، التعيين، المخرجات، التسعير، ومحادثة الطلب من شاشة واحدة."
            />
            <DesignOrderWorkspace order={order} adminList={adminList} />
        </div>
    );
}
