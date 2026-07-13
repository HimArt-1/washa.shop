"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, Share2, ShoppingCart, X } from "lucide-react";
import {
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    likeProduct,
    unlikeProduct,
    isProductLiked,
    getProductLikesCount,
} from "@/app/actions/social";
import { useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { useCartStore } from "@/stores/cartStore";
import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/components/ops/EventTracker";
import { pixelAddToCart } from "@/lib/meta-pixel";
import { sanitizeCommerceImageUrl } from "@/lib/commerce-safety";

const TYPE_LABELS: Record<string, string> = {
    apparel: "ملابس",
    print: "طباعة",
    digital: "رقمي",
    original: "عمل أصلي",
    nft: "NFT",
};

function typeLabel(type: string) {
    return TYPE_LABELS[type] ?? type;
}

function isCssColor(value?: string | null) {
    return Boolean(value && /^#?[0-9a-fA-F]{3,8}$/.test(value.trim()));
}

function normalizeColor(value: string) {
    return value.startsWith("#") ? value : `#${value}`;
}

interface ProductCardProps {
    featured?: boolean;
    product: {
        id: string;
        title: string;
        price: number;
        original_price?: number | null;
        image_url: string;
        thumbnail_url?: string | null;
        type: string;
        store_name?: string;
        artist?: { display_name: string };
        in_stock?: boolean;
        stock_quantity?: number | null;
        product_skus?: Array<{
            id: string;
            size?: string | null;
            color_code?: string | null;
            is_active?: boolean;
            inventory_levels?: Array<{ quantity: number }>;
        }>;
    };
}

export function ProductCard({ product, featured = false }: ProductCardProps) {
    const router = useRouter();
    const addToCart = useCartStore((state) => state.addItem);
    const trackEvent = useTrackEvent();
    const productTitle = typeof product.title === "string" && product.title.trim() ? product.title.trim() : "منتج وشّى";
    const productType = typeof product.type === "string" && product.type.trim() ? product.type.trim() : "product";
    const productPrice = Number.isFinite(Number(product.price)) && Number(product.price) >= 0 ? Number(product.price) : 0;
    const productImage = sanitizeCommerceImageUrl(product.thumbnail_url || product.image_url);

    // ── Stock calculation ────────────────────────────────────────────────
    const allSkus = product.product_skus ?? [];
    const skus = allSkus.filter((sku) => sku.is_active !== false);
    let erpTotalStock = 0;
    const sizeStock = new Map<string, number>();
    const colorStock = new Map<string, number>();

    if (skus.length > 0) {
        skus.forEach((sku) => {
            const skuStock = sku.inventory_levels?.reduce((s, l) => s + (l.quantity || 0), 0) ?? 0;
            erpTotalStock += skuStock;
            if (sku.size) {
                const key = sku.size.toUpperCase();
                sizeStock.set(key, (sizeStock.get(key) ?? 0) + skuStock);
            }
            if (sku.color_code) {
                const key = normalizeColor(sku.color_code);
                colorStock.set(key, (colorStock.get(key) ?? 0) + skuStock);
            }
        });
    } else if (allSkus.length === 0) {
        const legacyStock = product.in_stock !== false
            ? (product.stock_quantity === undefined || product.stock_quantity === null
                ? 999
                : product.stock_quantity)
            : 0;
        erpTotalStock = legacyStock;
    }

    const isCurrentlyInStock = erpTotalStock > 0;
    const isLowStock = isCurrentlyInStock && erpTotalStock > 0 && erpTotalStock <= 5;
    const sizeOptions = Array.from(sizeStock.entries()).map(([size, quantity]) => ({
        size,
        quantity,
        available: quantity > 0,
    }));
    const colorOptions = Array.from(colorStock.entries()).map(([color, quantity]) => ({
        color,
        quantity,
        available: quantity > 0,
    }));
    const needsSizeSelection = sizeOptions.length > 0;
    const hasColorVariants = colorOptions.length > 0;

    // ── Discount ─────────────────────────────────────────────────────────
    const originalPrice = Number(product.original_price);
    const hasDiscount = Number.isFinite(originalPrice) && originalPrice > productPrice;
    const discountPct = hasDiscount
        ? Math.round(((originalPrice - productPrice) / originalPrice) * 100)
        : 0;

    // ── Size picker state ─────────────────────────────────────────────────
    const [showSizePicker, setShowSizePicker] = useState(false);
    const [pendingSize, setPendingSize] = useState<string>("");
    const pickerRef = useRef<HTMLDivElement>(null);

    // ── Social state ──────────────────────────────────────────────────────
    const [inWishlist, setInWishlist] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (mounted && product.id) {
            Promise.all([
                isInWishlist(product.id),
                isProductLiked(product.id),
                getProductLikesCount(product.id),
            ]).then(([w, l, c]) => {
                setInWishlist(w);
                setLiked(l);
                setLikesCount(c);
            }).catch(() => {
                setInWishlist(false);
                setLiked(false);
                setLikesCount(0);
            });
        }
    }, [mounted, product.id]);

    // Close picker on outside click
    useEffect(() => {
        if (!showSizePicker) return;
        function handler(e: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowSizePicker(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showSizePicker]);

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleAddToCart = (e: React.MouseEvent, size?: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (hasColorVariants) {
            router.push(`/products/${product.id}`);
            return;
        }

        if (needsSizeSelection && !size) {
            setShowSizePicker(true);
            return;
        }

        const selectedSizeStock = size
            ? sizeOptions.find((option) => option.size === size)?.quantity
            : undefined;

        addToCart({
            id: product.id,
            title: productTitle,
            price: productPrice,
            image_url: productImage,
            artist_name: product.artist?.display_name || "وشّى",
            size: size ?? null,
            type: "product",
            maxQuantity: selectedSizeStock || product.stock_quantity || 99,
        });
        trackEvent("add_to_cart", {
            entityType: "product",
            entityId: product.id,
            metadata: { title: productTitle, price: productPrice, size: size ?? null },
        });
        pixelAddToCart({ contentId: product.id, contentName: productTitle, value: productPrice });
        setShowSizePicker(false);
        setPendingSize("");
    };

    const handleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const result = inWishlist ? await removeFromWishlist(product.id) : await addToWishlist(product.id);
            if (result.success) { setInWishlist(!inWishlist); router.refresh(); }
        } catch {
            setInWishlist(false);
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const result = liked ? await unlikeProduct(product.id) : await likeProduct(product.id);
            if (result.success) { setLiked(!liked); setLikesCount((c) => (liked ? c - 1 : c + 1)); router.refresh(); }
        } catch {
            setLiked(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/products/${product.id}`;
        try {
            if (navigator.share) { await navigator.share({ title: productTitle, text: `${productTitle} — وشّى`, url }); return; }
            await navigator.clipboard.writeText(url);
            setShareFeedback("copied");
            window.setTimeout(() => setShareFeedback("idle"), 1800);
        } catch { setShareFeedback("idle"); }
    };

    const typeBadgeStyle = {
        backgroundColor: "color-mix(in srgb, var(--wusha-surface) 76%, transparent)",
        borderColor: "color-mix(in srgb, var(--wusha-text) 10%, transparent)",
        color: "color-mix(in srgb, var(--wusha-text) 92%, transparent)",
    };

    // ── SSR skeleton (no hydration mismatch) ─────────────────────────────
    if (!mounted) {
        return (
            <Link
                href={`/products/${product.id}`}
                className={cn(
                    "group theme-surface-panel wusha-product-card block overflow-hidden rounded-[1.375rem] transition-all duration-300 hover:border-gold/30",
                    featured && "ring-1 ring-gold/20 shadow-[0_12px_40px_-12px_rgba(90,62,43,0.22)]"
                )}
            >
                <div className={cn("relative overflow-hidden", featured ? "aspect-[5/4]" : "aspect-square")}>
                    <Image
                        src={productImage}
                        alt={productTitle}
                        fill
                        className={`object-cover transition-transform duration-700 ${isCurrentlyInStock ? "group-hover:scale-105" : "grayscale opacity-70"}`}
                        sizes={featured ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <span className="text-[9px] backdrop-blur-md px-2 py-0.5 rounded-full border" style={typeBadgeStyle}>
                            {typeLabel(productType)}
                        </span>
                        {hasDiscount && (
                            <span className="text-[9px] bg-gold/90 backdrop-blur-sm text-[var(--wusha-bg)] px-2 py-0.5 rounded-full font-bold">
                                خصم {discountPct}%
                            </span>
                        )}
                        {!isCurrentlyInStock ? (
                            <span className="text-[9px] bg-red-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold">نفدت الكمية</span>
                        ) : isLowStock ? (
                            <span className="text-[9px] bg-amber-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                {erpTotalStock} قطع فقط!
                            </span>
                        ) : null}
                    </div>
                    {featured && (
                        <span className="pointer-events-none absolute start-2 top-2 rounded-lg border border-gold/30 bg-[color:rgba(15,15,15,0.42)] px-2 py-0.5 text-[10px] font-semibold text-gold backdrop-blur-sm">
                            مختار
                        </span>
                    )}
                </div>
                <div className="wusha-product-card-footer p-3 sm:p-4">
                    <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold transition-colors group-hover:text-gold" style={{ color: "var(--wusha-text)" }}>
                        {productTitle}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="line-clamp-1 text-[10px] text-theme-subtle">{product.store_name || product.artist?.display_name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {hasDiscount && (
                                <span className="text-[10px] text-theme-faint line-through">{originalPrice.toLocaleString()}</span>
                            )}
                            <span className="text-xs font-bold text-gold">{productPrice.toLocaleString()} ر.س</span>
                        </div>
                    </div>
                    {(sizeOptions.length > 0 || colorOptions.length > 0) && (
                        <div className="mt-3 flex min-h-[22px] items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap gap-1">
                                {sizeOptions.slice(0, 4).map((option) => (
                                    <span
                                        key={option.size}
                                        className={cn(
                                            "rounded-md border px-1.5 py-0.5 text-[9px] font-bold",
                                            option.available
                                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                                : "border-red-500/20 bg-red-500/10 text-red-400"
                                        )}
                                    >
                                        {option.size}
                                    </span>
                                ))}
                            </div>
                            {colorOptions.length > 0 && (
                                <div className="flex shrink-0 -space-x-1 space-x-reverse">
                                    {colorOptions.slice(0, 5).map((option) => (
                                        <span
                                            key={option.color}
                                            className={cn("h-4 w-4 rounded-full border border-theme-soft", !option.available && "opacity-35")}
                                            style={{ backgroundColor: isCssColor(option.color) ? option.color : undefined }}
                                            title={`${option.color} ${option.available ? "متوفر" : "نافد"}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Link>
        );
    }

    // ── Full interactive card ─────────────────────────────────────────────
    return (
        <Link
            href={`/products/${product.id}`}
            className={cn(
                "group theme-surface-panel wusha-product-card relative block overflow-hidden rounded-[1.375rem] transition-all duration-300 hover:border-gold/30",
                featured && "ring-1 ring-gold/20 shadow-[0_12px_40px_-12px_rgba(90,62,43,0.22)]"
            )}
        >
            <div className={cn("relative overflow-hidden", featured ? "aspect-[5/4]" : "aspect-square")}>
                <Image
                    src={productImage}
                    alt={productTitle}
                    fill
                    className={`object-cover transition-transform duration-700 ${isCurrentlyInStock ? "group-hover:scale-105" : "grayscale opacity-70"}`}
                    sizes={featured ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                />

                {/* Status Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <span className="rounded-md border px-2 py-1 text-[9px] font-semibold backdrop-blur-md" style={typeBadgeStyle}>
                        {typeLabel(productType)}
                    </span>
                    {hasDiscount && (
                        <span className="rounded-md bg-gold/90 px-2 py-1 text-[9px] font-bold text-[var(--wusha-bg)] backdrop-blur-sm">
                            خصم {discountPct}%
                        </span>
                    )}
                    {!isCurrentlyInStock ? (
                        <span className="text-[9px] bg-red-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold">نفدت الكمية</span>
                    ) : isLowStock ? (
                        <span className="text-[9px] bg-amber-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                            متبقي {erpTotalStock}
                        </span>
                    ) : null}
                </div>

                {featured && (
                    <span className="pointer-events-none absolute start-2 top-2 rounded-lg border border-gold/30 bg-[color:rgba(15,15,15,0.42)] px-2 py-0.5 text-[10px] font-semibold text-gold backdrop-blur-sm">
                        مختار
                    </span>
                )}

                {/* ── Size picker popover ───────────────────────────────── */}
                {showSizePicker && (
                    <div
                        ref={pickerRef}
                        onClick={(e) => e.preventDefault()}
                        className="absolute inset-x-2 bottom-2 z-20 rounded-2xl border border-gold/30 bg-[color:color-mix(in_srgb,var(--wusha-bg)_92%,transparent)] p-3 backdrop-blur-md shadow-xl"
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-gold">اختر المقاس</span>
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSizePicker(false); }}
                                className="rounded-full p-0.5 text-theme-faint hover:text-theme"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {sizeOptions.map((option) => (
                                <button
                                    key={option.size}
                                    disabled={!option.available}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (!option.available) return;
                                        setPendingSize(option.size);
                                        handleAddToCart(e, option.size);
                                    }}
                                    className={cn(
                                        "min-h-[32px] rounded-xl border px-3 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45",
                                        pendingSize === option.size
                                            ? "border-gold/50 bg-gold/20 text-gold"
                                            : "border-white/15 bg-[color:rgba(15,15,15,0.40)] text-white hover:border-gold/30 hover:bg-gold/10 hover:text-gold"
                                    )}
                                >
                                    <span>{option.size}</span>
                                    <span className="ms-1 text-[9px] opacity-70">{option.available ? option.quantity : "نفد"}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Hover actions */}
                {!showSizePicker && (
                    <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-2 opacity-100 transition-all duration-300 sm:translate-y-4 sm:opacity-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                        {isCurrentlyInStock && (
                            <button
                                onClick={(e) => handleAddToCart(e)}
                                className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl border border-gold/30 bg-[color:var(--wusha-gold)] text-[color:var(--wusha-bg)] backdrop-blur-md transition-all hover:bg-gold-light hover:scale-[1.02] font-bold w-full shadow-lg"
                                title={hasColorVariants ? "اختر اللون والمقاس" : needsSizeSelection ? "اختر المقاس" : "أضف للسلة"}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                <span className="text-[12px]">
                                    {hasColorVariants ? "اختر الخيارات" : needsSizeSelection ? "اختر المقاس" : "أضف للسلة"}
                                </span>
                            </button>
                        )}
                        <div className="flex justify-center gap-2">
                            <SignedIn>
                                <button
                                    onClick={handleWishlist}
                                    className={`flex min-h-[40px] min-w-[40px] flex-1 items-center justify-center gap-1 rounded-2xl border px-2.5 backdrop-blur-md transition-colors ${inWishlist ? "border-gold/30 bg-gold/20 text-gold" : "border-white/10 bg-[color:rgba(15,15,15,0.46)] text-on-dark hover:border-gold/20 hover:bg-gold/20 hover:text-gold"}`}
                                    title={inWishlist ? "إزالة من المحفوظات" : "إضافة للمحفوظات"}
                                >
                                    <Bookmark className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
                                    <span className="text-[10px] font-medium sm:hidden">حفظ</span>
                                </button>
                                <button
                                    onClick={handleLike}
                                    className={`hidden min-h-[40px] min-w-[40px] flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 backdrop-blur-md transition-colors sm:flex ${liked ? "border-red-400/20 bg-red-500/20 text-red-400" : "border-white/10 bg-[color:rgba(15,15,15,0.46)] text-on-dark hover:border-red-400/20 hover:bg-red-500/20 hover:text-red-400"}`}
                                    title={liked ? "إلغاء الإعجاب" : "إعجاب"}
                                >
                                    <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                                    {likesCount > 0 ? <span className="text-[10px]">{likesCount}</span> : <span className="text-[10px] font-medium sm:hidden">إعجاب</span>}
                                </button>
                            </SignedIn>
                            <button
                                onClick={handleShare}
                                className="flex min-h-[40px] min-w-[40px] flex-1 items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[color:rgba(15,15,15,0.46)] px-2.5 text-on-dark backdrop-blur-md transition-colors hover:border-gold/20 hover:bg-gold/20 hover:text-gold"
                                title="مشاركة"
                            >
                                <Share2 className="w-4 h-4" />
                                <span className="text-[10px] font-medium sm:hidden">مشاركة</span>
                            </button>
                        </div>
                    </div>
                )}

                {shareFeedback === "copied" && (
                    <div className="absolute bottom-14 left-2 right-2 rounded-2xl border border-gold/20 bg-[color:rgba(15,15,15,0.58)] px-3 py-2 text-center text-[11px] font-medium text-gold backdrop-blur-md">
                        تم نسخ رابط المنتج
                    </div>
                )}
            </div>

            {/* Card footer */}
            <div className="wusha-product-card-footer p-3 sm:p-4">
                <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-theme transition-colors group-hover:text-gold">
                    {productTitle}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="line-clamp-1 text-[10px] text-theme-faint">
                        {product.store_name || product.artist?.display_name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {hasDiscount && (
                            <span className="text-[10px] text-theme-faint line-through">
                                {originalPrice.toLocaleString()}
                            </span>
                        )}
                        <span suppressHydrationWarning className="text-xs font-bold text-gold">
                            {productPrice.toLocaleString()} ر.س
                        </span>
                    </div>
                </div>
                {(sizeOptions.length > 0 || colorOptions.length > 0) && (
                    <div className="mt-3 flex min-h-[22px] items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap gap-1">
                            {sizeOptions.slice(0, 4).map((option) => (
                                <span
                                    key={option.size}
                                    className={cn(
                                        "rounded-md border px-1.5 py-0.5 text-[9px] font-bold",
                                        option.available
                                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                            : "border-red-500/20 bg-red-500/10 text-red-400"
                                    )}
                                >
                                    {option.size}
                                </span>
                            ))}
                        </div>
                        {colorOptions.length > 0 && (
                            <div className="flex shrink-0 -space-x-1 space-x-reverse">
                                {colorOptions.slice(0, 5).map((option) => (
                                    <span
                                        key={option.color}
                                        className={cn("h-4 w-4 rounded-full border border-theme-soft", !option.available && "opacity-35")}
                                        style={{ backgroundColor: isCssColor(option.color) ? option.color : undefined }}
                                        title={`${option.color} ${option.available ? "متوفر" : "نافد"}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
}
