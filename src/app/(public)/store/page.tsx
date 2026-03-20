import { getProducts, SortOption } from "@/app/actions/products";
import Link from "next/link";
import type { Metadata } from "next";
import { StoreFilters } from "./StoreFilters";
import { ProductCard } from "@/components/store/ProductCard";
import { getPublicVisibility } from "@/app/actions/settings";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "المتجر | WUSHA",
    description: "اكتشف مجموعة WUSHA الحصرية من القطع الفنية والملابس المصممة بعناية.",
};

export default async function StorePage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string; page?: string; inStock?: string; sort?: string }>;
}) {
    const params = await searchParams;
    const type = params.type || "all";
    const page = parseInt(params.page || "1");
    const inStockOnly = params.inStock === "1";
    const sort = (params.sort as SortOption) || "newest";

    const visibility = await getPublicVisibility();
    if (!visibility.store) {
        redirect("/");
    }

    const { data: products, count, totalPages } = await getProducts(page, type, inStockOnly, sort);

    return (
        <div className="min-h-[60vh] pt-6 sm:pt-8 pb-12 sm:pb-16" style={{ backgroundColor: "var(--wusha-bg)" }} dir="rtl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* ─── Header ─── */}
                <div className="text-center mb-12 theme-surface-panel rounded-[2rem] px-6 py-10 sm:px-10">
                    <p className="mb-3 text-xs font-bold tracking-[0.24em] text-theme-faint">STORE</p>
                    <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ color: "var(--wusha-text)" }}>
                        المتجر
                    </h1>
                    <p className="text-sm text-theme-subtle max-w-2xl mx-auto">
                        اكتشف قطع وشّى الفنية بتجربة قراءة أوضح في الفاتح والداكن. لدينا الآن {count || 0} منتجًا فنيًا فريدًا.
                    </p>
                </div>

                {/* ─── Filters (Client Component) ─── */}
                <StoreFilters currentType={type} inStockOnly={inStockOnly} currentSort={sort} />

                {/* ─── Grid ─── */}
                {products && products.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                            {products.map((product: any) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const params = new URLSearchParams();
                                    if (type !== "all") params.set("type", type);
                                    if (inStockOnly) params.set("inStock", "1");
                                    if (sort !== "newest") params.set("sort", sort);
                                    params.set("page", String(i + 1));

                                    return (
                                        <Link
                                            key={i}
                                            href={`/store?${params.toString()}`}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all border ${page === i + 1
                                                    ? "bg-[var(--wusha-gold)] text-[var(--wusha-bg)]"
                                                    : "text-theme-subtle hover:bg-theme-subtle border-theme-strong/10"
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
                    <div className="theme-surface-panel rounded-[2rem] px-6 py-24 text-center">
                        <p className="text-theme-subtle">لا توجد منتجات</p>
                    </div>
                )}
            </div>
        </div>
    );
}
