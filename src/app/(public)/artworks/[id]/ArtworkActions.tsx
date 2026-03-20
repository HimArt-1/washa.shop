"use client";

import { useCartStore } from "@/stores/cartStore";
import { Share2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

export function ArtworkActions({ artwork }: { artwork: any }) {
    const addItem = useCartStore((s) => s.addItem);
    const utilityButtonBase = "p-3.5 rounded-2xl border border-theme-soft bg-theme-faint text-theme-subtle transition-colors hover:bg-theme-subtle";

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: artwork.title,
                text: `${artwork.title} — وشّى`,
                url: window.location.href,
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert("تم نسخ الرابط!");
        }
    };

    return (
        <div className="flex gap-3">
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
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gold text-[var(--wusha-bg)] font-bold rounded-2xl hover:bg-gold-light transition-colors shadow-[0_18px_40px_rgba(154,123,61,0.2)]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <ShoppingBag className="w-4 h-4" />
                    أضف للسلة
                </motion.button>
            )}
            <motion.button
                onClick={handleShare}
                className={`${utilityButtonBase} hover:text-gold hover:border-gold/30`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Share2 className="w-5 h-5" />
            </motion.button>
        </div>
    );
}
