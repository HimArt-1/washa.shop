"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { ShoppingBag, Share2, Heart, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
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
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export function ProductActions({ product, isCurrentlyInStock, erpAvailableSizes }: { product: any, isCurrentlyInStock?: boolean, erpAvailableSizes?: string[] }) {
    const addItem = useCartStore((s) => s.addItem);
    const router = useRouter();

    // Fall back to product.sizes if ERP sizes aren't explicitly provided (or empty)
    const sizesToUse = erpAvailableSizes && erpAvailableSizes.length > 0 ? erpAvailableSizes : product.sizes || [];
    const [selectedSize, setSelectedSize] = useState<string>(sizesToUse[0] || "");

    // Fall back to product.in_stock if ERP flag isn't provided
    const inStock = isCurrentlyInStock !== undefined ? isCurrentlyInStock : product.in_stock;
    const [inWishlist, setInWishlist] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [loadingLike, setLoadingLike] = useState(false);
    const [mounted, setMounted] = useState(false);
    const utilityButtonBase = "p-3.5 rounded-2xl border border-theme-soft bg-theme-faint text-theme-subtle transition-colors hover:bg-theme-subtle";

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

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: product.title,
                text: `${product.title} — وشّى`,
                url: window.location.href,
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert("تم نسخ الرابط!");
        }
    };

    const handleWishlist = async () => {
        if (loadingWishlist) return;
        setLoadingWishlist(true);
        const result = inWishlist ? await removeFromWishlist(product.id) : await addToWishlist(product.id);
        setLoadingWishlist(false);
        if (result.success) {
            setInWishlist(!inWishlist);
            router.refresh();
        }
    };

    const handleLike = async () => {
        if (loadingLike) return;
        setLoadingLike(true);
        const result = liked ? await unlikeProduct(product.id) : await likeProduct(product.id);
        setLoadingLike(false);
        if (result.success) {
            setLiked(!liked);
            setLikesCount((c) => (liked ? c - 1 : c + 1));
            router.refresh();
        }
    };

    return (
        <div className="space-y-4">
            {/* Size Selector */}
            {sizesToUse.length > 0 && (
                <div>
                    <label className="text-xs text-theme-faint mb-2 block">اختر المقاس</label>
                    <div className="flex gap-2 flex-wrap">
                        {sizesToUse.map((size: string) => (
                            <button
                                key={size}
                                onClick={() => setSelectedSize(size)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${selectedSize === size
                                    ? "bg-gold/10 border-gold/40 text-gold"
                                    : "border-theme-soft bg-theme-faint text-theme-subtle hover:border-gold/20 hover:bg-theme-subtle"
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
                <motion.button
                    onClick={() => addItem({
                        id: product.id,
                        title: product.title,
                        price: Number(product.price),
                        image_url: product.image_url,
                        artist_name: product.artist?.display_name || "فنان وشّى",
                        type: "product",
                        size: selectedSize || null,
                        maxQuantity: product.stock_quantity || 99,
                    })}
                    disabled={!inStock}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gold text-[var(--wusha-bg)] font-bold rounded-2xl hover:bg-gold-light transition-colors shadow-[0_18px_40px_rgba(154,123,61,0.2)] disabled:opacity-30 disabled:cursor-not-allowed"
                    whileHover={inStock ? { scale: 1.02 } : {}}
                    whileTap={inStock ? { scale: 0.98 } : {}}
                >
                    <ShoppingBag className="w-4 h-4" />
                    {inStock ? "أضف للسلة" : "غير متوفر"}
                </motion.button>

                <SignedIn>
                    <motion.button
                        onClick={handleWishlist}
                        disabled={loadingWishlist}
                        className={`${utilityButtonBase} ${inWishlist ? "border-gold/40 bg-gold/10 text-gold" : "hover:text-gold hover:border-gold/30"
                            }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={inWishlist ? "إزالة من المحفوظات" : "إضافة للمحفوظات"}
                    >
                        <Bookmark className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
                    </motion.button>
                    <motion.button
                        onClick={handleLike}
                        disabled={loadingLike}
                        className={`${utilityButtonBase} flex items-center gap-1 ${liked ? "border-red-500/40 bg-red-500/10 text-red-400" : "hover:text-red-400 hover:border-red-500/20"
                            }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={liked ? "إلغاء الإعجاب" : "إعجاب"}
                    >
                        <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                        {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
                    </motion.button>
                </SignedIn>
                <SignedOut>
                    <Link
                        href={`/sign-in?redirect_url=/products/${product.id}`}
                        className={`${utilityButtonBase} hover:text-gold hover:border-gold/30 inline-block`}
                        title="إضافة للمحفوظات"
                    >
                        <Bookmark className="w-5 h-5" />
                    </Link>
                    <Link
                        href={`/sign-in?redirect_url=/products/${product.id}`}
                        className={`${utilityButtonBase} hover:text-red-400 hover:border-red-500/20 inline-flex items-center gap-1`}
                        title="إعجاب"
                    >
                        <Heart className="w-5 h-5" />
                        {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
                    </Link>
                </SignedOut>

                <motion.button
                    onClick={handleShare}
                    className={`${utilityButtonBase} hover:text-gold hover:border-gold/30`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="مشاركة الرابط"
                >
                    <Share2 className="w-5 h-5" />
                </motion.button>
            </div>
        </div>
    );
}
