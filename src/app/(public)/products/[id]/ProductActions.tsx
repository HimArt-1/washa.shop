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
    const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");
    const utilityButtonBase =
        "inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-4 text-theme-subtle transition-colors hover:bg-theme-subtle sm:w-auto";

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
        if (typeof window === "undefined") return;

        if (navigator.share) {
            await navigator.share({
                title: product.title,
                text: `${product.title} — وشّى`,
                url: window.location.href,
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            setShareFeedback("copied");
            window.setTimeout(() => setShareFeedback("idle"), 1800);
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
            <div className="rounded-[1.6rem] border border-theme-subtle bg-theme-faint px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint">ORDER SNAPSHOT</p>
                        <p className="mt-2 text-sm text-theme-subtle">
                            {inStock
                                ? "اختر المقاس المناسب ثم أضف القطعة مباشرة إلى السلة."
                                : "هذه القطعة غير متوفرة حاليًا، لكن يمكنك حفظها أو مشاركة رابطها."}
                        </p>
                    </div>
                    <span
                        className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                            inStock
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                    >
                        {inStock ? "متوفر الآن" : "نفدت الكمية"}
                    </span>
                </div>
            </div>

            {/* Size Selector */}
            {sizesToUse.length > 0 && (
                <div>
                    <label className="text-xs text-theme-faint mb-2 block">اختر المقاس</label>
                    <div className="flex gap-2 flex-wrap">
                        {sizesToUse.map((size: string) => (
                            <button
                                key={size}
                                onClick={() => setSelectedSize(size)}
                                className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium transition-all ${selectedSize === size
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
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
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
                    className="col-span-2 flex min-h-[56px] w-full min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 font-bold text-[var(--wusha-bg)] shadow-[0_18px_40px_rgba(154,123,61,0.2)] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-30 sm:min-w-[220px]"
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
                        className={`min-h-[56px] ${utilityButtonBase} ${inWishlist ? "border-gold/40 bg-gold/10 text-gold" : "hover:text-gold hover:border-gold/30"
                            }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={inWishlist ? "إزالة من المحفوظات" : "إضافة للمحفوظات"}
                    >
                        <Bookmark className={`w-5 h-5 ${inWishlist ? "fill-current" : ""}`} />
                        <span className="text-sm sm:hidden">{inWishlist ? "محفوظ" : "حفظ"}</span>
                    </motion.button>
                    <motion.button
                        onClick={handleLike}
                        disabled={loadingLike}
                        className={`min-h-[56px] ${utilityButtonBase} flex items-center gap-1 ${liked ? "border-red-500/40 bg-red-500/10 text-red-400" : "hover:text-red-400 hover:border-red-500/20"
                            }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={liked ? "إلغاء الإعجاب" : "إعجاب"}
                    >
                        <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                        <span className="text-sm sm:hidden">{liked ? "أعجبك" : "إعجاب"}</span>
                        {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
                    </motion.button>
                </SignedIn>
                <SignedOut>
                    <Link
                        href={`/sign-in?redirect_url=/products/${product.id}`}
                        className={`min-h-[56px] ${utilityButtonBase} inline-flex items-center justify-center hover:border-gold/30 hover:text-gold`}
                        title="إضافة للمحفوظات"
                    >
                        <Bookmark className="w-5 h-5" />
                        <span className="text-sm sm:hidden">حفظ</span>
                    </Link>
                    <Link
                        href={`/sign-in?redirect_url=/products/${product.id}`}
                        className={`min-h-[56px] ${utilityButtonBase} inline-flex items-center gap-1 hover:border-red-500/20 hover:text-red-400`}
                        title="إعجاب"
                    >
                        <Heart className="w-5 h-5" />
                        <span className="text-sm sm:hidden">إعجاب</span>
                        {likesCount > 0 && <span className="text-xs">{likesCount}</span>}
                    </Link>
                </SignedOut>

                <motion.button
                    onClick={handleShare}
                    className={`min-h-[56px] ${utilityButtonBase} hover:border-gold/30 hover:text-gold`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="مشاركة الرابط"
                >
                    <Share2 className="w-5 h-5" />
                    <span className="text-sm sm:hidden">مشاركة</span>
                </motion.button>
            </div>

            {shareFeedback === "copied" && (
                <div className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
                    تم نسخ رابط المنتج
                </div>
            )}
        </div>
    );
}
