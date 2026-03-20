"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, Share2 } from "lucide-react";
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

interface ProductCardProps {
    product: {
        id: string;
        title: string;
        price: number;
        image_url: string;
        type: string;
        store_name?: string;
        artist?: { display_name: string };
        in_stock?: boolean;
        stock_quantity?: number;
        product_skus?: any[];
    };
}

export function ProductCard({ product }: ProductCardProps) {
    const router = useRouter();
    const typeBadgeStyle = {
        backgroundColor: "color-mix(in srgb, var(--wusha-surface) 76%, transparent)",
        borderColor: "color-mix(in srgb, var(--wusha-text) 10%, transparent)",
        color: "color-mix(in srgb, var(--wusha-text) 92%, transparent)",
    };

    // Calculate Stock
    const skus = product.product_skus;
    let hasErpStock = false;
    let erpTotalStock = 0;

    if (skus && skus.length > 0) {
        skus.forEach((sku: any) => {
            const skuStock = sku.inventory_levels?.reduce((sum: number, level: any) => sum + (level.quantity || 0), 0) || 0;
            erpTotalStock += skuStock;
        });
        hasErpStock = erpTotalStock > 0;
    } else {
        hasErpStock = product.in_stock !== false && (product.stock_quantity === undefined || product.stock_quantity > 0);
        erpTotalStock = product.stock_quantity ?? 999;
    }

    const isCurrentlyInStock = hasErpStock;
    const isLowStock = isCurrentlyInStock && erpTotalStock > 0 && erpTotalStock <= 5;
    const [inWishlist, setInWishlist] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");

    useEffect(() => {
        setMounted(true);
    }, []);

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
            });
        }
    }, [mounted, product.id]);

    const handleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const result = inWishlist ? await removeFromWishlist(product.id) : await addToWishlist(product.id);
        if (result.success) {
            setInWishlist(!inWishlist);
            router.refresh();
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const result = liked ? await unlikeProduct(product.id) : await likeProduct(product.id);
        if (result.success) {
            setLiked(!liked);
            setLikesCount((c) => (liked ? c - 1 : c + 1));
            router.refresh();
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/products/${product.id}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: product.title,
                    text: `${product.title} — وشّى`,
                    url,
                });
                return;
            }

            await navigator.clipboard.writeText(url);
            setShareFeedback("copied");
            window.setTimeout(() => setShareFeedback("idle"), 1800);
        } catch {
            setShareFeedback("idle");
        }
    };

    if (!mounted) {
        return (
            <Link
                href={`/products/${product.id}`}
                className="group theme-surface-panel block overflow-hidden rounded-[1.65rem] transition-all duration-500 hover:border-gold/30"
            >
                <div className="aspect-square relative overflow-hidden">
                    <Image
                        src={product.image_url}
                        alt={product.title}
                        fill
                        className={`object-cover transition-transform duration-700 ${isCurrentlyInStock ? 'group-hover:scale-105' : 'grayscale opacity-70'}`}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    
                    {/* Status Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <span
                            className="text-[9px] backdrop-blur-md px-2 py-0.5 rounded-full border"
                            style={typeBadgeStyle}
                        >
                            {product.type}
                        </span>
                        {!isCurrentlyInStock ? (
                            <span className="text-[9px] bg-red-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold">
                                نفدت الكمية
                            </span>
                        ) : isLowStock ? (
                            <span className="text-[9px] bg-amber-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                {erpTotalStock} قطع فقط!
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="bg-[color:color-mix(in_srgb,var(--wusha-text)_2%,transparent)] p-3 sm:p-4">
                    <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold transition-colors group-hover:text-gold" style={{ color: "var(--wusha-text)" }}>
                        {product.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="line-clamp-1 text-[10px] text-theme-subtle">{product.store_name || product.artist?.display_name}</span>
                        <span suppressHydrationWarning className="shrink-0 text-xs font-bold text-gold">{Number(product.price).toLocaleString()} ر.س</span>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={`/products/${product.id}`}
            className="group theme-surface-panel relative block overflow-hidden rounded-[1.65rem] transition-all duration-500 hover:border-gold/30"
        >
            <div className="aspect-square relative overflow-hidden">
                <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className={`object-cover transition-transform duration-700 ${isCurrentlyInStock ? 'group-hover:scale-105' : 'grayscale opacity-70'}`}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                
                {/* Status Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <span
                        className="text-[9px] backdrop-blur-md px-2 py-0.5 rounded-full border"
                        style={typeBadgeStyle}
                    >
                        {product.type}
                    </span>
                    {!isCurrentlyInStock ? (
                        <span className="text-[9px] bg-red-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold">
                            نفدت الكمية
                        </span>
                    ) : isLowStock ? (
                        <span className="text-[9px] bg-amber-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                            {erpTotalStock} قطع فقط!
                        </span>
                    ) : null}
                </div>

                {/* Action buttons on hover */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2 opacity-100 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                    <SignedIn>
                        <button
                            onClick={handleWishlist}
                            className={`flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-2xl border px-2.5 backdrop-blur-md transition-colors ${inWishlist ? "border-gold/30 bg-gold/20 text-gold" : "border-white/10 bg-[color:rgba(15,15,15,0.46)] text-on-dark hover:border-gold/20 hover:bg-gold/20 hover:text-gold"
                                }`}
                            title={inWishlist ? "إزالة من المحفوظات" : "إضافة للمحفوظات"}
                        >
                            <Bookmark className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
                            <span className="text-[10px] font-medium sm:hidden">حفظ</span>
                        </button>
                        <button
                            onClick={handleLike}
                            className={`flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-2xl border px-2.5 backdrop-blur-md transition-colors ${liked ? "border-red-400/20 bg-red-500/20 text-red-400" : "border-white/10 bg-[color:rgba(15,15,15,0.46)] text-on-dark hover:border-red-400/20 hover:bg-red-500/20 hover:text-red-400"
                                }`}
                            title={liked ? "إلغاء الإعجاب" : "إعجاب"}
                        >
                            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                            {likesCount > 0 ? <span className="text-[10px]">{likesCount}</span> : <span className="text-[10px] font-medium sm:hidden">إعجاب</span>}
                        </button>
                    </SignedIn>
                    <button
                        onClick={handleShare}
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[color:rgba(15,15,15,0.46)] px-2.5 text-on-dark backdrop-blur-md transition-colors hover:border-gold/20 hover:bg-gold/20 hover:text-gold"
                        title="مشاركة"
                    >
                        <Share2 className="w-4 h-4" />
                        <span className="text-[10px] font-medium sm:hidden">مشاركة</span>
                    </button>
                </div>

                {shareFeedback === "copied" && (
                    <div className="absolute bottom-14 left-2 right-2 rounded-2xl border border-gold/20 bg-[color:rgba(15,15,15,0.58)] px-3 py-2 text-center text-[11px] font-medium text-gold backdrop-blur-md">
                        تم نسخ رابط المنتج
                    </div>
                )}
            </div>
            <div className="bg-[color:color-mix(in_srgb,var(--wusha-text)_2%,transparent)] p-3 sm:p-4">
                <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold text-theme transition-colors group-hover:text-gold">
                    {product.title}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="line-clamp-1 text-[10px] text-theme-faint">{product.store_name || product.artist?.display_name}</span>
                    <span suppressHydrationWarning className="shrink-0 text-xs font-bold text-gold">{Number(product.price).toLocaleString()} ر.س</span>
                </div>
            </div>
        </Link>
    );
}
