import { getAdminProducts, getAdminArtistsForSelect, getCategories } from "@/app/actions/settings";
import { getSKUs, getWarehouses, getInventoryWithSales } from "@/app/actions/erp/inventory";
import { ProductsInventoryClient } from "./ProductsInventoryClient";
import { AdminHeader } from "@/components/admin/AdminHeader";

interface PageProps {
    searchParams: Promise<{ page?: string; type?: string; tab?: string }>;
}

export const metadata = {
    title: "إدارة المنتجات والمخزون — وشّى | WASHA",
    description: "إدارة شاملة للمنتجات والمخزون والجرد والباركود",
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
    ] = await Promise.all([
        getAdminProducts(page, type),
        getAdminArtistsForSelect(),
        getCategories(),
        getSKUs(),
        getInventoryWithSales(),
        getWarehouses(),
    ]);

    const skus = ('skus' in skusResult && Array.isArray(skusResult.skus)) ? skusResult.skus : [];
    const inventory = invRes?.inventory || [];
    const warehouses = whRes?.warehouses || [];
    const inventoryStats = invRes?.stats || null;

    return (
        <div className="space-y-6">
            <AdminHeader
                title="إدارة المنتجات والمخزون"
                subtitle="إدارة شاملة للمنتجات، المخزون، الجرد، الباركود والفئات — كل ما تحتاجه في مكان واحد."
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
            />
        </div>
    );
}
