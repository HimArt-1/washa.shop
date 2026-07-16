import { getProducts, SortOption } from "@/app/actions/products";
import Link from "next/link";
import type { Metadata } from "next";
import { StoreFilters } from "./StoreFilters";
import { ProductCard } from "@/components/store/ProductCard";
import { getPublicVisibility } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildItemListSchema, buildBreadcrumbSchema, JsonLd } from "@/lib/seo";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
const BRAND_ASSET_VERSION = "20260630";
const SITE_OG_IMAGE_URL = `${SITE_URL}/og-image.png?v=${BRAND_ASSET_VERSION}`;

export const metadata: Metadata = {
    title: "المتجر | وشّى WUSHA",
    description: "اكتشف مجموعة وشّى الحصرية — تيشرتات وهودي وملابس مطبوعة بتصاميم فنية حصرية. جودة عالية وشحن سريع.",
    keywords: ["تيشرتات", "هودي", "ملابس فنية", "وشّى", "washa", "streetwear", "طباعة عند الطلب", "أزياء عربية"],
    alternates: { canonical: `${SITE_URL}/store` },
    openGraph: {
        title: "المتجر | وشّى",
        description: "قطع فنية وملابس مصممة بعناية — تصفح النوع والترتيب والمخزون.",
        url: `${SITE_URL}/store`,
        type: "website",
        siteName: "وشّى | WASHA",
        locale: "ar_SA",
        images: [{ url: SITE_OG_IMAGE_URL, width: 1200, height: 630, alt: "متجر وشّى" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "المتجر | وشّى",
        description: "قطع فنية وملابس مصممة بعناية.",
        images: [SITE_OG_IMAGE_URL],
    },
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
    const list = products || [];
    const showFeaturedTile = page === 1 && list.length >= 3;

    return (
        <div className="store-page min-h-[60vh] pb-12 pt-6 sm:pb-16 sm:pt-8" dir="rtl">
            {/* JSON-LD Structured Data */}
            {list.length > 0 && (
                <>
                    <JsonLd schema={buildItemListSchema(
                        list.map((p: any) => ({ id: p.id, title: p.title, image_url: p.image_url, price: p.price })),
                        "متجر وشّى",
                        "/products"
                    )} />
                    <JsonLd schema={buildBreadcrumbSchema([
                        { name: "الرئيسية", href: "/" },
                        { name: "المتجر", href: "/store" },
                    ])} />
                </>
            )}
            <div className="store-page-shell max-w-7xl mx-auto px-4 sm:px-6">
                {/* ─── Header — تخطيط غير متماثل على الشاشات الواسعة ─── */}
                <div className="store-hero-panel mb-8 rounded-[1.5rem] px-5 py-6 sm:mb-10 sm:px-7 sm:py-7 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                        <div className="min-w-0 text-center lg:text-right">
                            <div className="store-kicker mb-3">
                                <span className="store-brand-mark" aria-hidden />
                                متجر وشّى
                            </div>
                            <h1 className="text-3xl font-black sm:text-4xl md:text-5xl">
                                منتجات مختارة
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs lg:shrink-0 lg:justify-end">
                            <span className="store-count-pill rounded-md px-3 py-1 font-semibold">
                                {count || 0} منتج متاح الآن
                            </span>
                            <Link
                                href="/search"
                                className="store-pill-link rounded-md px-3 py-1 transition-colors"
                            >
                                بحث سريع
                            </Link>
                            <Link
                                href="/design"
                                className="store-pill-link rounded-md px-3 py-1 transition-colors"
                            >
                                صمّم قطعتك
                            </Link>
                        </div>
                    </div>
                    <StoreFilters currentType={type} inStockOnly={inStockOnly} currentSort={sort} />
                </div>

                {/* ─── Grid ─── */}
                {list.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                            {list.map((product: any, index: number) => {
                                const isFeatured = showFeaturedTile && index === 0;
                                const singleFull = page === 1 && list.length === 1;
                                return (
                                    <div
                                        key={product.id}
                                        className={cn(
                                            isFeatured && "col-span-2",
                                            singleFull && index === 0 && "col-span-2 md:col-span-3 xl:col-span-4",
                                        )}
                                    >
                                        <ProductCard product={product} featured={isFeatured} />
                                    </div>
                                );
                            })}
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
                                                    ? "store-page-link store-page-link--active"
                                                    : "store-page-link"
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
                    <div className="store-empty-panel rounded-[2rem] px-6 py-16 text-center sm:py-24">
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
