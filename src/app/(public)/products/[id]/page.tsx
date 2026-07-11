import { getProductById } from "@/app/actions/products";
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
import { buildProductSchema, buildBreadcrumbSchema, JsonLd } from "@/lib/seo";
import { ProductImageGallery } from "@/components/store/ProductImageGallery";
import { sanitizeCommerceImageUrl, sanitizeOptionalCommerceImageUrl } from "@/lib/commerce-safety";

const TYPE_LABELS: Record<string, string> = {
    apparel: "ملابس",
    print: "طباعة",
    digital: "رقمي",
    original: "عمل أصلي",
    nft: "NFT",
};
function typeLabel(type: string) { return TYPE_LABELS[type] ?? type; }
function normalizeColorCode(value?: string | null) {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

// ─── Dynamic Metadata ───────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) return { title: "غير موجود — وشّى" };

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
    const canonical = `${siteUrl}/products/${id}`;
    const desc = product.description || `${product.title} — منتج حصري في متجر وشّى للأزياء الفنية`;
    const imageUrl = sanitizeCommerceImageUrl(product.image_url);

    return {
        title: `${product.title} — وشّى`,
        description: desc,
        alternates: { canonical },
        openGraph: {
            title: `${product.title} | وشّى`,
            description: desc,
            url: canonical,
            type: "website",
            siteName: "وشّى | WASHA",
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 1200,
                    alt: product.title,
                }
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: `${product.title} | وشّى`,
            description: desc,
            images: [imageUrl],
        },
    };
}

// ─── Page ───────────────────────────────────────────────────

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) notFound();

    const reviews = await getProductReviews(id);
    const safeProductImage = sanitizeCommerceImageUrl(product.image_url);
    const safeProductImages = Array.isArray(product.images)
        ? product.images.map((img: unknown) => sanitizeOptionalCommerceImageUrl(img)).filter((img): img is string => Boolean(img))
        : [];
    const productTitle = typeof product.title === "string" && product.title.trim() ? product.title.trim() : "منتج وشّى";
    const productPrice = Number.isFinite(Number(product.price)) && Number(product.price) >= 0 ? Number(product.price) : 0;
    const originalPrice = Number(product.original_price);
    const hasDiscount = Number.isFinite(originalPrice) && originalPrice > productPrice;

    // Fetch Live ERP Inventory for SKUs
    const supabase = getSupabaseServerClient();
    const skuWithColorImages = await supabase
        .from("product_skus")
        .select(`
            id, size, color_code, color_image_url, is_active,
            inventory_levels(quantity)
        `)
        .eq("product_id", id);
    let skuData = skuWithColorImages.data;

    if (skuWithColorImages.error && skuWithColorImages.error.message.includes("color_image_url")) {
        const fallbackSkus = await supabase
            .from("product_skus")
            .select(`
                id, size, color_code, is_active,
                inventory_levels(quantity)
            `)
            .eq("product_id", id);
        skuData = (fallbackSkus.data || []).map((sku: any) => ({ ...sku, color_image_url: null }));
    }

    let hasErpStock = false;
    let erpTotalStock = 0;
    const variantSummaries: Array<{
        id: string;
        size: string | null;
        color_code: string | null;
        color_image_url: string | null;
        quantity: number;
    }> = [];

    const activeSkuData = (skuData || []).filter((sku: any) => sku.is_active !== false);

    if (skuData && skuData.length > 0) {
        activeSkuData.forEach((sku: any) => {
            const skuStock = sku.inventory_levels?.reduce((sum: number, level: any) => sum + (level.quantity || 0), 0) || 0;
            const size = typeof sku.size === "string" && sku.size.trim() ? sku.size.trim().toUpperCase() : null;
            const colorCode = normalizeColorCode(sku.color_code);
            erpTotalStock += skuStock;
            variantSummaries.push({
                id: sku.id,
                size,
                color_code: colorCode,
                color_image_url: typeof sku.color_image_url === "string" && sku.color_image_url.trim() ? sku.color_image_url.trim() : null,
                quantity: skuStock,
            });
        });
        hasErpStock = erpTotalStock > 0;
    } else {
        // Fallback to old system if no SKUs
        hasErpStock = product.in_stock && (product.stock_quantity == null || product.stock_quantity > 0);
    }

    // Determine final stock status
    const isCurrentlyInStock = hasErpStock;

    // Smart related products: same artist first, then same type sorted by rating
    const supabase2 = getSupabaseServerClient();
    const [byArtist, byType] = await Promise.all([
        product.artist_id
            ? supabase2.from("products").select("id, title, price, image_url, thumbnail_url, type, rating")
                .eq("artist_id", product.artist_id).neq("id", id).eq("in_stock", true)
                .order("rating", { ascending: false }).limit(2)
            : Promise.resolve({ data: [] }),
        supabase2.from("products").select("id, title, price, image_url, thumbnail_url, type, rating")
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
            {/* JSON-LD Structured Data */}
            <JsonLd schema={buildProductSchema({
                id: product.id,
                title: productTitle,
                description: product.description,
                price: productPrice,
                original_price: hasDiscount ? originalPrice : null,
                currency: product.currency,
                image_url: safeProductImage,
                images: safeProductImages,
                in_stock: isCurrentlyInStock,
                rating: product.rating,
                reviews_count: product.reviews_count,
                badge: product.badge,
                type: product.type,
                artist: (product as any).artist ?? null,
            })} />
            <JsonLd schema={buildBreadcrumbSchema([
                { name: "الرئيسية", href: "/" },
                { name: "المتجر", href: "/store" },
                { name: productTitle, href: `/products/${product.id}` },
            ])} />
            {/* Track this visit in localStorage */}
            <RecentlyViewedTracker product={{ id: product.id, title: productTitle, price: productPrice, image_url: safeProductImage, type: product.type }} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* ─── Breadcrumb ─── */}
                <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-theme-faint sm:mb-8">
                    <Link href="/" className="hover:text-gold transition-colors">الرئيسية</Link>
                    <span>/</span>
                    <Link href="/store" className="hover:text-gold transition-colors">المتجر</Link>
                    <span>/</span>
                    <span className="text-theme-subtle">{productTitle}</span>
                </nav>

                {/* ─── Main Content ─── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-12">
                    {/* Image */}
                    <ProductImageGallery
                        mainImage={safeProductImage}
                        images={safeProductImages}
                        title={productTitle}
                        type={product.type}
                        productId={product.id}
                        colorImages={variantSummaries
                            .filter((variant) => variant.color_code && variant.color_image_url)
                            .map((variant) => ({
                                color_code: variant.color_code as string,
                                image_url: sanitizeCommerceImageUrl(variant.color_image_url),
                            }))}
                    />

                    {/* Info */}
                    <div className="theme-surface-panel flex flex-col justify-center rounded-[2rem] p-5 sm:p-8 lg:p-10">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs text-theme-subtle">
                                {typeLabel(product.type)}
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

                        <h1 className="mb-3 text-2xl font-bold text-theme sm:text-3xl md:text-4xl">{productTitle}</h1>

                        {/* Author / Store */}
                        {(product as any).store_name ? (
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                                    <span className="text-[8px] font-black text-gold">W</span>
                                </div>
                                <span className="text-sm text-theme-subtle">{(product as any).store_name}</span>
                            </div>
                        ) : product.artist ? (
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
                        ) : (
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                                    <span className="text-[8px] font-black text-gold">W</span>
                                </div>
                                <span className="text-sm text-theme-subtle">وشّى | WASHA.SHOP</span>
                            </div>
                        )}

                        {/* Price */}
                        <div className="mb-5 rounded-[1.35rem] border border-gold/15 bg-gold/5 px-4 py-4">
                            {hasDiscount && (
                                <div className="mb-1 flex items-center gap-2">
                                    <span className="text-sm text-theme-faint line-through">
                                        {originalPrice.toLocaleString()} ر.س
                                    </span>
                                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                                        خصم {Math.round(((originalPrice - productPrice) / originalPrice) * 100)}%
                                    </span>
                                </div>
                            )}
                            <span className="text-3xl font-bold text-gold">{productPrice.toLocaleString()} ر.س</span>
                            <span className="text-xs text-theme-faint mr-2">{product.currency || "SAR"}</span>
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="mb-5 rounded-[1.35rem] border border-theme-subtle bg-theme-faint px-4 py-4">
                                <p className="text-sm leading-7 text-theme-subtle">{product.description}</p>
                            </div>
                        )}

                        <ProductActions
                            product={product}
                            isCurrentlyInStock={isCurrentlyInStock}
                            erpVariants={variantSummaries}
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
                                            src={sanitizeCommerceImageUrl(item.thumbnail_url || item.image_url)}
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
