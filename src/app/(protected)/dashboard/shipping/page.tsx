// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Shipping Management Page (Server)
// ═══════════════════════════════════════════════════════════

import { Suspense } from "react";
import { getShippingOrders, getShippingStats } from "@/app/actions/shipping";
import { ShippingClient } from "@/components/admin/shipping/ShippingClient";

interface Props {
    searchParams: Promise<{
        status?: string;
        search?: string;
        page?: string;
    }>;
}

export const metadata = {
    title: "إدارة الشحن | وشّى",
    description: "لوحة تحكم متكاملة لإدارة شحنات المتجر وتتبعها عبر طرود",
};

export default async function ShippingPage({ searchParams }: Props) {
    const sp = await searchParams;
    const status = sp.status || "all";
    const search = sp.search || "";
    const page = Math.max(1, Number(sp.page) || 1);
    const pageSize = 20;

    const [{ orders, total, error }, stats] = await Promise.all([
        getShippingOrders({ status, search, page, pageSize }),
        getShippingStats(),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <Suspense fallback={null}>
            <ShippingClient
                orders={orders}
                stats={stats}
                total={total}
                currentPage={page}
                totalPages={totalPages}
                currentStatus={status}
                currentSearch={search}
                error={error}
            />
        </Suspense>
    );
}
