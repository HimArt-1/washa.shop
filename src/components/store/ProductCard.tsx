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
import { SignedIn, SignedOut } from "@clerk/nextjs";

interface ProductCardProps {
    product: {
        id: string;
        title: string;
        price: number;
        image_url: string;
        type: string;
        store_name?: string;
        artist?: { display_name: string };
    };
}

export function ProductCard({ product }: ProductCardProps) {
    const router = useRouter();
    const [inWishlist, setInWishlist] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [mounted, setMounted] = useState(false);

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
        if (navigator.share) {
            await navigator.share({
                title: product.title,
                text: `${product.title} — وشّى`,
                url,
            });
        } else {
            await navigator.clipboard.writeText(url);
            alert("تم نسخ الرابط!");
        }
    };

    if (!mounted) {
        return (
            <Link
                href={`/products/${product.id}`}
                className="group rounded-2xl border border-theme-soft overflow-hidden hover:border-gold/30 transition-all duration-500 block"
            >
                <div className="aspect-square relative overflow-hidden">
                    <Image
                        src={product.image_url}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <span className="absolute top-2 right-2 text-[9px] bg-black/40 backdrop-blur-sm text-on-dark px-2 py-0.5 rounded-full">
                        {product.type}
                    </span>
                </div>
                <div className="p-3">
                    <h3 className="text-sm font-bold truncate group-hover:text-gold transition-colors" style={{ color: "var(--wusha-text)" }}>
                        {product.title}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-theme-subtle">{product.store_name || product.artist?.display_name}</span>
                        <span suppressHydrationWarning className="text-xs font-bold text-gold">{Number(product.price).toLocaleString()} ر.س</span>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={`/products/${product.id}`}
            className="group rounded-2xl border border-theme-soft overflow-hidden hover:border-gold/30 transition-all duration-500 block relative"
        >
            <div className="aspect-square relative overflow-hidden">
                <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <span className="absolute top-2 right-2 text-[9px] bg-black/40 backdrop-blur-sm text-on-dark px-2 py-0.5 rounded-full">
                    {product.type}
                </span>

                {/* Action buttons on hover */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <SignedIn>
                        <button
                            onClick={handleWishlist}
                            className={`p-2 rounded-xl backdrop-blur-md transition-colors ${inWishlist ? "bg-gold/20 text-gold" : "bg-black/40 text-on-dark hover:bg-gold/20 hover:text-gold"
                                }`}
                            title={inWishlist ? "إزالة من المحفوظات" : "إضافة للمحفوظات"}
                        >
                            <Bookmark className={`w-4 h-4 ${inWishlist ? "fill-current" : ""}`} />
                        </button>
                        <button
                            onClick={handleLike}
                            className={`p-2 rounded-xl backdrop-blur-md transition-colors flex items-center gap-1 ${liked ? "bg-red-500/20 text-red-400" : "bg-black/40 text-on-dark hover:bg-red-500/20 hover:text-red-400"
                                }`}
                            title={liked ? "إلغاء الإعجاب" : "إعجاب"}
                        >
                            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                            {likesCount > 0 && <span className="text-[10px]">{likesCount}</span>}
                        </button>
                    </SignedIn>
                    <button
                        onClick={handleShare}
                        className="p-2 rounded-xl backdrop-blur-md bg-black/40 text-on-dark hover:bg-gold/20 hover:text-gold transition-colors"
                        title="مشاركة"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-3">
                <h3 className="text-sm font-bold text-theme truncate group-hover:text-gold transition-colors">
                    {product.title}
                </h3>
                <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-theme-faint">{product.store_name || product.artist?.display_name}</span>
                    <span suppressHydrationWarning className="text-xs font-bold text-gold">{Number(product.price).toLocaleString()} ر.س</span>
                </div>
            </div>
        </Link>
    );
}
