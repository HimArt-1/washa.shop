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
        <div className="min-h-[60vh] pb-12 pt-6 sm:pb-16 sm:pt-8" style={{ backgroundColor: "var(--wusha-bg)" }} dir="rtl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* ─── Header ─── */}
                <div className="mb-10 theme-surface-panel rounded-[2rem] px-5 py-8 text-center sm:mb-12 sm:px-8 sm:py-10 lg:px-10">
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                        <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 font-semibold text-gold">
                            {count || 0} منتج متاح الآن
                        </span>
                        <Link
                            href="/search"
                            className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-theme-subtle transition-colors hover:border-gold/20 hover:text-theme"
                        >
                            بحث سريع
                        </Link>
                        <Link
                            href="/design"
                            className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-theme-subtle transition-colors hover:border-gold/20 hover:text-theme"
                        >
                            صمّم قطعتك
                        </Link>
                    </div>
                    <p className="mb-3 text-xs font-bold tracking-[0.24em] text-theme-faint">STORE</p>
                    <h1 className="mb-3 text-3xl font-black sm:text-4xl md:text-5xl" style={{ color: "var(--wusha-text)" }}>
                        المتجر
                    </h1>
                    <p className="mx-auto max-w-2xl text-sm leading-7 text-theme-subtle sm:text-[15px]">
                        اكتشف قطع وشّى الفنية بتجربة قراءة أوضح في الفاتح والداكن. لدينا الآن {count || 0} منتجًا فنيًا فريدًا.
                    </p>
                </div>

                {/* ─── Filters (Client Component) ─── */}
                <StoreFilters currentType={type} inStockOnly={inStockOnly} currentSort={sort} />

                {/* ─── Grid ─── */}
                {products && products.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                            {products.map((product: any) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:mt-12">
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
                    <div className="theme-surface-panel rounded-[2rem] px-6 py-16 text-center sm:py-24">
                        <p className="text-base font-semibold text-theme">لا توجد منتجات مطابقة حاليًا</p>
                        <p className="mt-2 text-sm text-theme-subtle">
                            جرّب تغيير النوع أو الترتيب أو توسيع النتائج المتاحة.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
