import { getAdminProducts, getAdminArtistsForSelect, getCategories, getProductSalesMap } from "@/app/actions/settings";
import { getSKUs, getWarehouses, getInventoryWithSales } from "@/app/actions/erp/inventory";
import { getOrdersOperationsSnapshot } from "@/app/actions/admin";
import { ProductsInventoryClient } from "./ProductsInventoryClient";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { emitInventoryRiskEscalations } from "@/lib/operational-escalations";

interface PageProps {
    searchParams: Promise<{ page?: string; type?: string; tab?: string }>;
}

export const metadata = {
    title: "مركز التنفيذ والمخزون — وشّى | WASHA",
    description: "غرفة تشغيل للمخزون، التنفيذ، الجرد، الشحن، والباركود",
};

export default async function ProductsInventoryPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const type = params.type || "all";
    const tab = params.tab || "products";

    const [
        { data: products, count, totalPages },
        artists,
        { data: categories },
        skusResult,
        invRes,
        whRes,
        salesMap,
        fulfillmentSnapshot,
    ] = await Promise.all([
        getAdminProducts(page, type),
        getAdminArtistsForSelect(),
        getCategories(),
        getSKUs(),
        getInventoryWithSales(),
        getWarehouses(),
        getProductSalesMap(),
        getOrdersOperationsSnapshot(),
    ]);

    const skus = ('skus' in skusResult && Array.isArray(skusResult.skus)) ? skusResult.skus : [];
    const inventory = invRes?.inventory || [];
    const warehouses = whRes?.warehouses || [];
    const inventoryStats = invRes?.stats || null;

    await emitInventoryRiskEscalations({
        inventory,
        stats: inventoryStats,
        fulfillmentStats: fulfillmentSnapshot.stats,
    });

    return (
        <div className="space-y-6">
            <AdminHeader
                title="مركز التنفيذ والمخزون"
                subtitle="غرفة تشغيل تربط المنتجات بالمخزون الفعلي، مخاطر النفاد، ومكتب التنفيذ والشحن من شاشة واحدة."
            />

            <ProductsInventoryClient
                activeTab={tab}
                products={products}
                count={count}
                totalPages={totalPages}
                currentPage={page}
                currentType={type}
                artists={artists}
                categories={categories || []}
                skus={skus}
                inventory={inventory}
                warehouses={warehouses}
                inventoryStats={inventoryStats}
                salesMap={salesMap}
                fulfillmentSnapshot={fulfillmentSnapshot}
            />
        </div>
    );
}
