import { getProductById, getProducts } from "@/app/actions/products";
import { getProductReviews } from "@/app/actions/reviews";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ProductActions } from "./ProductActions";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { getSupabaseServerClient } from "@/lib/supabase";
import { RecentlyViewedTracker } from "@/components/store/RecentlyViewedTracker";
import { RecentlyViewedSection } from "@/components/store/RecentlyViewedSection";

// ─── Dynamic Metadata ───────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) return { title: "غير موجود — وشّى" };

    return {
        title: `${product.title} — وشّى`,
        description: product.description || `منتج حصري في متجر وشّى`,
        openGraph: {
            title: `${product.title} | وشّى`,
            description: product.description || `تصميم فريد وأزياء عصرية. اكتشف تفاصيل المنتج الآن في وشّى.`,
            images: [
                {
                    url: product.image_url,
                    width: 1080,
                    height: 1080,
                    alt: product.title,
                }
            ],
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `${product.title} | وشّى`,
            description: product.description || `اكتشف هذا التصميم الحصري في وشّى.`,
            images: [product.image_url],
        }
    };
}

// ─── Page ───────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) notFound();

    const reviews = await getProductReviews(id);

    // Fetch Live ERP Inventory for SKUs
    const supabase = getSupabaseServerClient();
    const { data: skuData } = await supabase
        .from("product_skus")
        .select(`
            id, size, color_code,
            inventory_levels(quantity)
        `)
        .eq("product_id", id);

    let hasErpStock = false;
    let erpTotalStock = 0;
    const availableSizes = new Set<string>();

    if (skuData && skuData.length > 0) {
        skuData.forEach((sku: any) => {
            const skuStock = sku.inventory_levels?.reduce((sum: number, level: any) => sum + (level.quantity || 0), 0) || 0;
            erpTotalStock += skuStock;
            if (skuStock > 0 && sku.size) {
                availableSizes.add(sku.size.toUpperCase());
            }
        });
        hasErpStock = erpTotalStock > 0;
    } else {
        // Fallback to old system if no SKUs
        hasErpStock = product.in_stock && (product.stock_quantity ?? 0) > 0;
        if (hasErpStock && product.sizes) {
            product.sizes.forEach((s: string) => availableSizes.add(s.toUpperCase()));
        }
    }

    // Determine final stock status
    const isCurrentlyInStock = hasErpStock;

    // Smart related products: same artist first, then same type sorted by rating
    const supabase2 = getSupabaseServerClient();
    const [byArtist, byType] = await Promise.all([
        product.artist_id
            ? supabase2.from("products").select("id, title, price, image_url, type, rating")
                .eq("artist_id", product.artist_id).neq("id", id).eq("in_stock", true)
                .order("rating", { ascending: false }).limit(2)
            : Promise.resolve({ data: [] }),
        supabase2.from("products").select("id, title, price, image_url, type, rating")
            .eq("type", product.type).neq("id", id).eq("in_stock", true)
            .order("rating", { ascending: false }).limit(6),
    ]);
    const artistIds = new Set((byArtist.data || []).map((p: any) => p.id));
    const relatedProducts = [
        ...(byArtist.data || []),
        ...(byType.data || []).filter((p: any) => !artistIds.has(p.id)),
    ].slice(0, 4);

    return (
        <div className="min-h-[60vh] bg-bg pb-12 pt-5 sm:pb-16 sm:pt-8" dir="rtl">
            {/* Track this visit in localStorage */}
            <RecentlyViewedTracker product={{ id: product.id, title: product.title, price: product.price, image_url: product.image_url, type: product.type }} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* ─── Breadcrumb ─── */}
                <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-theme-faint sm:mb-8">
                    <Link href="/" className="hover:text-gold transition-colors">الرئيسية</Link>
                    <span>/</span>
                    <Link href="/store" className="hover:text-gold transition-colors">المتجر</Link>
                    <span>/</span>
                    <span className="text-theme-subtle">{product.title}</span>
                </nav>

                {/* ─── Main Content ─── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12">
                    {/* Image */}
                    <div className="theme-surface-panel rounded-[2rem] p-3 sm:p-4 xl:sticky xl:top-28 xl:self-start">
                        <div className="relative aspect-square rounded-[1.55rem] overflow-hidden bg-theme-subtle">
                            <Image
                                src={product.image_url}
                                alt={product.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                priority
                            />
                            <span className="absolute top-4 right-4 text-xs bg-[color:rgba(15,15,15,0.42)] backdrop-blur-md text-on-dark px-3 py-1 rounded-full">
                                {product.type}
                            </span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="theme-surface-panel flex flex-col justify-center rounded-[2rem] p-5 sm:p-8 lg:p-10">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs text-theme-subtle">
                                {product.type}
                            </span>
                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                    isCurrentlyInStock
                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                        : "border-red-500/30 bg-red-500/10 text-red-400"
                                }`}
                            >
                                {isCurrentlyInStock ? "متوفر الآن" : "غير متوفر"}
                            </span>
                        </div>

                        <h1 className="mb-3 text-2xl font-bold text-theme sm:text-3xl md:text-4xl">{product.title}</h1>

                        {/* Artist */}
                        {product.artist && (
                            <Link
                                href={`/artists/${product.artist.username}`}
                                className="flex items-center gap-2 mb-6 text-theme-subtle hover:text-gold transition-colors"
                            >
                                {product.artist.avatar_url ? (
                                    <Image src={product.artist.avatar_url} alt="" width={24} height={24} className="rounded-full" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gold/20" />
                                )}
                                <span className="text-sm">بواسطة {product.artist.display_name}</span>
                            </Link>
                        )}

                        {/* Description */}
                        {product.description && (
                            <p className="mb-6 text-sm leading-7 text-theme-subtle">{product.description}</p>
                        )}

                        {/* Product Details */}
                        <div className="mb-8 space-y-3">
                            <div className="flex flex-col gap-1 border-b border-theme-subtle py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="text-xs text-theme-faint">النوع</span>
                                <span className="text-right text-sm text-theme-soft">{product.type}</span>
                            </div>
                            {availableSizes.size > 0 && (
                                <div className="flex flex-col gap-1 border-b border-theme-subtle py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                    <span className="text-xs text-theme-faint">المقاسات المتاحة المتوفرة</span>
                                    <span className="text-right text-sm font-semibold text-theme-soft">{Array.from(availableSizes).join(" ، ")}</span>
                                </div>
                            )}
                            <div className="flex flex-col gap-1 border-b border-theme-subtle py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                <span className="text-xs text-theme-faint">الحالة</span>
                                <span className={`text-sm font-medium ${isCurrentlyInStock ? "text-emerald-400" : "text-red-400"}`}>
                                    {isCurrentlyInStock ? "متوفر" : "غير متوفر"}
                                </span>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="mb-6">
                            <span className="text-3xl font-bold text-gold">{Number(product.price).toLocaleString()} ر.س</span>
                            <span className="text-xs text-theme-faint mr-2">{product.currency || "SAR"}</span>
                        </div>

                        <ProductActions
                            product={product}
                            isCurrentlyInStock={isCurrentlyInStock}
                            erpAvailableSizes={Array.from(availableSizes)}
                        />
                    </div>
                </div>

                {/* ─── Reviews ─── */}
                <ProductReviews
                    productId={id}
                    initialReviews={reviews}
                    initialRating={Number(product.rating) || 0}
                    initialReviewsCount={Number(product.reviews_count) || 0}
                />

                {/* ─── Recently Viewed ─── */}
                <RecentlyViewedSection excludeId={id} />

                {/* ─── Related Products ─── */}
                {relatedProducts.length > 0 && (
                    <div className="mt-20">
                        <h2 className="mb-8 text-2xl font-bold text-theme">منتجات مشابهة</h2>
                        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
                            {relatedProducts.map((item: any) => (
                                <Link
                                    key={item.id}
                                    href={`/products/${item.id}`}
                                    className="group theme-surface-panel rounded-[1.65rem] overflow-hidden hover:border-gold/30 transition-all"
                                >
                                    <div className="aspect-square relative">
                                        <Image
                                            src={item.image_url}
                                            alt={item.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold text-theme truncate">{item.title}</h3>
                                        <p className="text-xs text-gold mt-1">{Number(item.price).toLocaleString()} ر.س</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
