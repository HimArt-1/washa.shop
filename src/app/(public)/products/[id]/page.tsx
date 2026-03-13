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
        description: product.description || `منتج بواسطة ${product.artist?.display_name}`,
        openGraph: {
            images: [product.image_url],
        },
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
        <div className="min-h-[60vh] bg-bg pt-6 sm:pt-8 pb-12 sm:pb-16" dir="rtl">
            {/* Track this visit in localStorage */}
            <RecentlyViewedTracker product={{ id: product.id, title: product.title, price: product.price, image_url: product.image_url, type: product.type }} />
            <div className="max-w-7xl mx-auto px-6">
                {/* ─── Breadcrumb ─── */}
                <nav className="flex items-center gap-2 text-xs text-theme-faint mb-8">
                    <Link href="/" className="hover:text-gold transition-colors">الرئيسية</Link>
                    <span>/</span>
                    <Link href="/store" className="hover:text-gold transition-colors">المتجر</Link>
                    <span>/</span>
                    <span className="text-theme-subtle">{product.title}</span>
                </nav>

                {/* ─── Main Content ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Image */}
                    <div className="relative aspect-square rounded-3xl overflow-hidden border border-theme-subtle bg-surface/30">
                        <Image
                            src={product.image_url}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            priority
                        />
                        <span className="absolute top-4 right-4 text-xs bg-black/50 backdrop-blur-sm text-theme-strong px-3 py-1 rounded-full">
                            {product.type}
                        </span>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col justify-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-3">{product.title}</h1>

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
                            <p className="text-theme-subtle text-sm leading-relaxed mb-6">{product.description}</p>
                        )}

                        {/* Product Details */}
                        <div className="space-y-3 mb-8">
                            <div className="flex items-center justify-between py-3 border-b border-theme-faint">
                                <span className="text-xs text-theme-faint">النوع</span>
                                <span className="text-sm text-theme-soft">{product.type}</span>
                            </div>
                            {availableSizes.size > 0 && (
                                <div className="flex items-center justify-between py-3 border-b border-theme-faint">
                                    <span className="text-xs text-theme-faint">المقاسات المتاحة المتوفرة</span>
                                    <span className="text-sm text-theme-soft font-semibold">{Array.from(availableSizes).join(" ، ")}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-3 border-b border-theme-faint">
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
                        <h2 className="text-2xl font-bold text-theme mb-8">منتجات مشابهة</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            {relatedProducts.map((item: any) => (
                                <Link
                                    key={item.id}
                                    href={`/products/${item.id}`}
                                    className="group rounded-2xl border border-theme-subtle overflow-hidden hover:border-gold/30 transition-all"
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
                                    <div className="p-3">
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
