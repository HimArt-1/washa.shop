import { getAdminProducts } from "@/app/actions/settings";
import { ProductsClient } from "./ProductsClient";

interface PageProps {
    searchParams: Promise<{ page?: string; type?: string }>;
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const type = params.type || "all";

    const { data: products, count, totalPages } = await getAdminProducts(page, type);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إدارة المنتجات</h1>
                <p className="text-fg/40 mt-1">عرض وتعديل المنتجات والأسعار والمخزون.</p>
            </div>

            <ProductsClient
                products={products}
                count={count}
                totalPages={totalPages}
                currentPage={page}
                currentType={type}
            />
        </div>
    );
}
