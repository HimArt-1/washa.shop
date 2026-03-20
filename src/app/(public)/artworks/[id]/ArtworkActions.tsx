"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { Share2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

export function ArtworkActions({ artwork }: { artwork: any }) {
    const addItem = useCartStore((s) => s.addItem);
    const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");
    const utilityButtonBase = "inline-flex items-center justify-center p-3.5 rounded-2xl border border-theme-soft bg-theme-faint text-theme-subtle transition-colors hover:bg-theme-subtle";

    const handleShare = async () => {
        if (typeof window === "undefined") return;

        if (navigator.share) {
            await navigator.share({
                title: artwork.title,
                text: `${artwork.title} — وشّى`,
                url: window.location.href,
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            setShareFeedback("copied");
            window.setTimeout(() => setShareFeedback("idle"), 1800);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
            {artwork.price && (
                <motion.button
                    onClick={() => addItem({
                        id: artwork.id,
                        title: artwork.title,
                        price: Number(artwork.price),
                        image_url: artwork.image_url,
                        artist_name: artwork.artist?.display_name || "فنان وشّى",
                        type: "artwork",
                    })}
                    className="flex min-h-[56px] min-w-[220px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gold py-3.5 font-bold text-[var(--wusha-bg)] shadow-[0_18px_40px_rgba(154,123,61,0.2)] transition-colors hover:bg-gold-light"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <ShoppingBag className="w-4 h-4" />
                    أضف للسلة
                </motion.button>
            )}
            <motion.button
                onClick={handleShare}
                className={`min-h-[56px] ${utilityButtonBase} hover:text-gold hover:border-gold/30`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Share2 className="w-5 h-5" />
            </motion.button>
            </div>

            {shareFeedback === "copied" && (
                <div className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
                    تم نسخ رابط العمل الفني
                </div>
            )}
        </div>
    );
}
