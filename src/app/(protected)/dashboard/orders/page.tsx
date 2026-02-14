import { getAdminOrders } from "@/app/actions/admin";
import { OrdersClient } from "@/components/admin/OrdersClient";

interface PageProps {
    searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const status = params.status || "all";

    const { data: orders, count, totalPages } = await getAdminOrders(page, status);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إدارة الطلبات</h1>
                <p className="text-fg/40 mt-1">تتبع وإدارة جميع الطلبات على المنصة.</p>
            </div>

            <OrdersClient
                orders={orders}
                count={count}
                totalPages={totalPages}
                currentPage={page}
                currentStatus={status}
            />
        </div>
    );
}
