"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText } from "lucide-react";
import { usePathname } from "next/navigation";

export function FloatingSupportButton() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    const supportPathPrefixes = ["/support", "/account/support"];
    const isSupportPath = supportPathPrefixes.some(prefix => pathname?.startsWith(prefix));
    
    const hidden = !isSupportPath || pathname?.startsWith("/dashboard") || pathname?.startsWith("/studio");

    useEffect(() => {
        if (isSupportPath) {
            setVisible(true);
            return;
        }

        const t = setTimeout(() => setVisible(true), 2500);
        return () => clearTimeout(t);
    }, [isSupportPath]);

    if (hidden) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed bottom-6 right-6 z-50"
                    style={{
                        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)",
                        right: "calc(env(safe-area-inset-right, 0px) + 1.5rem)",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.5 }}
                >
                    <motion.button
                        data-reamaze-lightbox="true"
                        className="relative group w-14 h-14 bg-gradient-to-br from-[#ceae7f] to-[#a07d3f] rounded-full flex items-center justify-center shadow-lg shadow-gold/20 group-hover:shadow-gold/40 transition-all duration-300 border border-gold/30"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="تحدث معنا"
                    >
                        {/* Glow - Gold */}
                        <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <MessageSquareText className="w-7 h-7 text-black relative z-10" />

                        {/* Tooltip */}
                        <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-3 px-3 py-1.5 bg-surface border border-theme-soft rounded-lg text-theme text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            فريق الدعم
                            <div className="absolute top-full right-1/2 translate-x-1/2 -mt-px border-4 border-transparent border-t-surface" />
                        </div>

                        {/* Pulse ring - Gold */}
                        <motion.div
                            className="absolute inset-0 border-2 border-gold/30 rounded-full"
                            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                        />
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
