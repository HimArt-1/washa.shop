import { Suspense } from "react";
import { getAdminOrderForFocusList, getAdminOrders, getOrdersOperationsSnapshot } from "@/app/actions/admin";
import { OrdersClient } from "@/components/admin/OrdersClient";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams?: { page?: string; status?: string; focus?: string; search?: string };
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
    const params = searchParams ?? {};
    const page = Number(params.page) || 1;
    const status = params.status || "all";
    const search = params.search || "";
    const focusOrderId = typeof params.focus === "string" ? params.focus.trim() : "";

    const snapshot = await getOrdersOperationsSnapshot();

    let orders: any[] = [];
    let count = 0;
    let totalPages = 0;
    try {
        const result = await getAdminOrders({ page, status, search });
        orders = result.data ?? [];
        count = result.count ?? 0;
        totalPages = result.totalPages ?? 0;
    } catch (err) {
        console.error("[Orders] Error:", err);
    }

    if (focusOrderId && orders.length > 0 && !orders.some((o) => o.id === focusOrderId)) {
        const focused = await getAdminOrderForFocusList(focusOrderId);
        if (focused) {
            orders = [focused, ...orders.filter((o) => o.id !== focusOrderId)];
        }
    } else if (focusOrderId && orders.length === 0) {
        const focused = await getAdminOrderForFocusList(focusOrderId);
        if (focused) {
            orders = [focused];
        }
    }

    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز عمليات الطلبات"
                subtitle="غرفة تشغيل يومية لمراجعة الطلبات، المدفوعات، التنفيذ، والشحن من زاوية واحدة."
            />

            <Suspense
                fallback={
                    <div
                        className="h-72 animate-pulse rounded-[28px] border border-theme-subtle bg-theme-faint"
                        aria-hidden
                    />
                }
            >
                <OrdersClient
                    snapshot={snapshot}
                    orders={orders}
                    count={count}
                    totalPages={totalPages}
                    currentPage={page}
                    currentStatus={status}
                    currentSearch={search}
                    initialFocusOrderId={focusOrderId || undefined}
                />
            </Suspense>
        </div>
    );
}
