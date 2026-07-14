"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useTrackEvent } from "@/components/ops/EventTracker";
import { pixelViewContent, pixelAddToCart } from "@/lib/meta-pixel";
import { sanitizeCommerceImageUrl, sanitizeOptionalCommerceImageUrl } from "@/lib/commerce-safety";
import { resolveCartMaxQuantity, resolveLegacyProductStock } from "@/lib/product-stock";

type ProductVariant = {
    id: string;
    size: string | null;
    color_code: string | null;
    color_image_url?: string | null;
    quantity: number;
};

function normalizeSize(value?: string | null) {
    return value?.trim().toUpperCase() || null;
}

function normalizeColor(value?: string | null) {
    const valueOrNull = value?.trim();
    if (!valueOrNull) return null;
    return valueOrNull.startsWith("#") ? valueOrNull.toLowerCase() : `#${valueOrNull.toLowerCase()}`;
}

function isCssColor(value?: string | null) {
    return Boolean(value && /^#[0-9a-fA-F]{3,8}$/.test(value));
}

function sumVariantQuantity(variants: ProductVariant[], size: string | null, color: string | null) {
    return variants
        .filter((variant) => {
            const variantSize = normalizeSize(variant.size);
            const variantColor = normalizeColor(variant.color_code);
            return (!size || variantSize === size) && (!color || variantColor === color);
        })
        .reduce((sum, variant) => sum + (Number(variant.quantity) || 0), 0);
}

export function ProductActions({
    product,
    isCurrentlyInStock,
    erpVariants = [],
}: {
    product: any;
    isCurrentlyInStock?: boolean;
    erpVariants?: ProductVariant[];
}) {
    const addItem = useCartStore((s) => s.addItem);
    const router = useRouter();
    const trackEvent = useTrackEvent();
    const productTitle = typeof product.title === "string" && product.title.trim() ? product.title.trim() : "منتج وشّى";
    const productPrice = Number.isFinite(Number(product.price)) && Number(product.price) >= 0 ? Number(product.price) : 0;
    const productImage = sanitizeCommerceImageUrl(product.image_url);

    const hasErpVariants = erpVariants.length > 0;
    const legacySizes = useMemo(
        () => Array.isArray(product.sizes) ? product.sizes.map(normalizeSize).filter(Boolean) as string[] : [],
        [product.sizes]
    );
    const erpSizes = useMemo(
        () => erpVariants.map((variant) => normalizeSize(variant.size)).filter(Boolean) as string[],
        [erpVariants]
    );
    const sizeValues = useMemo(() => Array.from(new Set([...(legacySizes || []), ...erpSizes])), [legacySizes, erpSizes]);
    const colorValues = useMemo(
        () => Array.from(new Set(erpVariants.map((variant) => normalizeColor(variant.color_code)).filter(Boolean) as string[])),
        [erpVariants]
    );

    const legacyStock = resolveLegacyProductStock(product.in_stock, product.stock_quantity);
    const sizeOptions = useMemo(() => sizeValues.map((size) => {
        const quantity = hasErpVariants ? sumVariantQuantity(erpVariants, size, null) : legacyStock;
        return { size, quantity, available: quantity > 0 };
    }), [erpVariants, hasErpVariants, legacyStock, sizeValues]);

    const firstAvailableSize = sizeOptions.find((option) => option.available)?.size || sizeOptions[0]?.size || "";
    const [selectedSize, setSelectedSize] = useState<string>(firstAvailableSize);
    const [selectedColor, setSelectedColor] = useState<string>("");

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
        "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-theme-soft bg-theme-faint px-4 text-theme-subtle transition-colors hover:bg-theme-subtle sm:w-auto";

    const colorOptions = useMemo(() => colorValues.map((color) => {
        const quantity = hasErpVariants ? sumVariantQuantity(erpVariants, selectedSize || null, color) : legacyStock;
        return { color, quantity, available: quantity > 0 };
    }), [colorValues, erpVariants, hasErpVariants, legacyStock, selectedSize]);
    const selectedVariantStock = hasErpVariants
        ? sumVariantQuantity(erpVariants, selectedSize || null, selectedColor || null)
        : legacyStock;
    const selectedColorImage = useMemo(() => {
        if (!selectedColor) return null;
        const rawImage = erpVariants.find((variant) =>
            normalizeColor(variant.color_code) === selectedColor && variant.color_image_url
        )?.color_image_url || null;
        return sanitizeOptionalCommerceImageUrl(rawImage);
    }, [erpVariants, selectedColor]);
    const canAddToCart = Boolean(inStock)
        && (!sizeOptions.length || sizeOptions.some((option) => option.size === selectedSize && option.available))
        && (!colorOptions.length || colorOptions.some((option) => option.color === selectedColor && option.available))
        && selectedVariantStock > 0;

    useEffect(() => {
        setMounted(true);
        trackEvent("product_view", {
            entityType: "product",
            entityId: product.id,
            metadata: { title: productTitle, price: productPrice },
        });
        pixelViewContent({ contentId: product.id, contentName: productTitle, value: productPrice });
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
            }).catch(() => {
                setInWishlist(false);
                setLiked(false);
                setLikesCount(0);
            });
        }
    }, [mounted, product.id]);

    useEffect(() => {
        const nextSize = sizeOptions.find((option) => option.available)?.size || sizeOptions[0]?.size || "";
        if (nextSize && selectedSize !== nextSize && (!selectedSize || !sizeOptions.some((option) => option.size === selectedSize && option.available))) {
            setSelectedSize(nextSize);
        }
    }, [selectedSize, sizeOptions]);

    useEffect(() => {
        if (!colorOptions.length) {
            if (selectedColor) setSelectedColor("");
            return;
        }
        if (!colorOptions.some((option) => option.color === selectedColor && option.available)) {
            const nextColor = colorOptions.find((option) => option.available)?.color || colorOptions[0]?.color || "";
            if (nextColor && nextColor !== selectedColor) setSelectedColor(nextColor);
        }
    }, [selectedColor, colorOptions]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("wusha:product-color-change", {
            detail: {
                productId: product.id,
                colorCode: selectedColor || null,
                imageUrl: selectedColorImage || null,
            },
        }));
    }, [product.id, selectedColor, selectedColorImage]);

    const handleShare = async () => {
        if (typeof window === "undefined") return;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: productTitle,
                    text: `${productTitle} — وشّى`,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setShareFeedback("copied");
                window.setTimeout(() => setShareFeedback("idle"), 1800);
            }
        } catch {
            setShareFeedback("idle");
        }
    };

    const handleWishlist = async () => {
        if (loadingWishlist) return;
        setLoadingWishlist(true);
        try {
            const result = inWishlist ? await removeFromWishlist(product.id) : await addToWishlist(product.id);
            if (result.success) {
                setInWishlist(!inWishlist);
                router.refresh();
            }
        } catch {
            setInWishlist(false);
        } finally {
            setLoadingWishlist(false);
        }
    };

    const handleLike = async () => {
        if (loadingLike) return;
        setLoadingLike(true);
        try {
            const result = liked ? await unlikeProduct(product.id) : await likeProduct(product.id);
            if (result.success) {
                setLiked(!liked);
                setLikesCount((c) => (liked ? c - 1 : c + 1));
                router.refresh();
            }
        } catch {
            setLiked(false);
        } finally {
            setLoadingLike(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold text-theme-faint">تفاصيل الاختيار</p>
                        <p className="mt-2 text-sm text-theme-subtle">
                            {inStock
                                ? colorOptions.length > 0
                                    ? "اختر المقاس واللون المتوفرين، ثم أضف القطعة إلى السلة."
                                    : "اختر المقاس المناسب ثم أضف القطعة مباشرة إلى السلة."
                                : "هذه القطعة غير متوفرة حاليًا، لكن يمكنك حفظها أو مشاركة رابطها."}
                        </p>
                    </div>
                    <span
                        className={`inline-flex w-fit items-center rounded-md border px-3 py-1 text-xs font-semibold ${
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
            {sizeOptions.length > 0 && (
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-theme">المقاس</label>
                        {selectedSize ? <span className="text-xs text-theme-faint">المحدد: {selectedSize}</span> : null}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {sizeOptions.map((option) => (
                            <button
                                key={option.size}
                                onClick={() => option.available && setSelectedSize(option.size)}
                                disabled={!option.available}
                                className={`min-h-[48px] rounded-xl border px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-45 ${selectedSize === option.size
                                    ? "bg-earth border-earth text-white shadow-[0_8px_20px_rgba(104,72,59,0.16)]"
                                    : "border-theme-soft bg-theme-faint text-theme-subtle hover:border-gold/20 hover:bg-theme-subtle"
                                    }`}
                            >
                                <span className="block">{option.size}</span>
                                <span className="mt-0.5 block text-[10px] opacity-75">
                                    {option.available ? `${option.quantity} متاح` : "نفد"}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Color Selector */}
            {colorOptions.length > 0 && (
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-theme">اللون</label>
                        {selectedColor ? <span className="text-xs text-theme-faint" dir="ltr">{selectedColor}</span> : null}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {colorOptions.map((option) => (
                            <button
                                key={option.color}
                                onClick={() => option.available && setSelectedColor(option.color)}
                                disabled={!option.available}
                                className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                                    selectedColor === option.color
                                        ? "border-earth bg-earth text-white shadow-[0_8px_20px_rgba(104,72,59,0.16)]"
                                        : "border-theme-soft bg-theme-faint text-theme-subtle hover:border-gold/20 hover:bg-theme-subtle"
                                }`}
                            >
                                <span
                                    className="h-5 w-5 rounded-full border border-theme-soft"
                                    style={{ backgroundColor: isCssColor(option.color) ? option.color : undefined }}
                                    aria-hidden
                                />
                                <span dir="ltr">{option.color}</span>
                                <span className="text-[10px] opacity-70">{option.available ? option.quantity : "نفد"}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <motion.button
                    onClick={() => {
                        addItem({
                            id: product.id,
                            title: productTitle,
                            price: productPrice,
                            image_url: selectedColorImage || productImage,
                            artist_name: product.artist?.display_name || "فنان وشّى",
                            type: "product",
                            size: selectedSize || null,
                            colorCode: selectedColor || null,
                            maxQuantity: resolveCartMaxQuantity(selectedVariantStock, product.stock_quantity),
                        });
                        trackEvent("add_to_cart", {
                            entityType: "product",
                            entityId: product.id,
                            metadata: { title: productTitle, price: productPrice, size: selectedSize || null, color_code: selectedColor || null },
                        });
                        pixelAddToCart({ contentId: product.id, contentName: productTitle, value: productPrice });
                    }}
                    disabled={!canAddToCart}
                    className="col-span-2 flex min-h-[56px] w-full min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-earth py-3.5 font-bold text-white shadow-[0_18px_40px_rgba(104,72,59,0.18)] transition-colors hover:bg-[color-mix(in_srgb,var(--wusha-earth)_88%,black)] disabled:cursor-not-allowed disabled:opacity-30 sm:min-w-[220px]"
                    whileHover={canAddToCart ? { scale: 1.02 } : {}}
                    whileTap={canAddToCart ? { scale: 0.98 } : {}}
                >
                    <ShoppingBag className="w-4 h-4" />
                    {canAddToCart ? "أضف للسلة" : "غير متوفر"}
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
