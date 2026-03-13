import { getProducts } from "@/app/actions/products";
import Link from "next/link";
import type { Metadata } from "next";
import { StoreFilters } from "./StoreFilters";
import { ProductCard } from "@/components/store/ProductCard";

export const metadata: Metadata = {
    title: "المتجر — وشّى",
    description: "تسوق منتجات فنية فريدة من فناني وشّى",
};

export default async function StorePage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string; page?: string; inStock?: string }>;
}) {
    const params = await searchParams;
    const type = params.type || "all";
    const page = parseInt(params.page || "1");
    const inStockOnly = params.inStock === "1"; // "1" means true

    const { data: products, count, totalPages } = await getProducts(page, type, inStockOnly);

    return (
        <div className="min-h-[60vh] pt-6 sm:pt-8 pb-12 sm:pb-16" style={{ backgroundColor: "var(--wusha-bg)" }} dir="rtl">
            <div className="max-w-7xl mx-auto px-6">
                {/* ─── Header ─── */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "var(--wusha-text)" }}>
                        المتجر
                    </h1>
                    <p className="text-sm text-theme-subtle">
                        {count || 0} منتج فني فريد
                    </p>
                </div>

                {/* ─── Filters (Client Component) ─── */}
                <StoreFilters currentType={type} inStockOnly={inStockOnly} />

                {/* ─── Grid ─── */}
                {products && products.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {products.map((product: any) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                                {[...Array(totalPages)].map((_, i) => {
                                    const params = new URLSearchParams();
                                    if (type !== "all") params.set("type", type);
                                    if (inStockOnly) params.set("inStock", "1");
                                    params.set("page", String(i + 1));

                                    return (
                                        <Link
                                            key={i}
                                            href={`/store?${params.toString()}`}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${page === i + 1
                                                    ? "bg-[var(--wusha-gold)] text-[var(--wusha-bg)]"
                                                    : "text-theme-subtle hover:bg-theme-subtle"
                                                }`}
                                        >
                                            {i + 1}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-24">
                        <p className="text-theme-subtle">لا توجد منتجات</p>
                    </div>
                )}
            </div>
        </div>
    );
}
