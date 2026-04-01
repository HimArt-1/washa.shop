"use client";

import { motion } from "framer-motion";
import { MessageSquareText } from "lucide-react";
import { usePathname } from "next/navigation";

export function FloatingChatButton() {
    const pathname = usePathname();

    // Show ONLY on specific high-conversion pages
    const allowedPathPrefixes = ["/store", "/design", "/support"];
    const isHome = pathname === "/";
    const isAllowed = isHome || allowedPathPrefixes.some(prefix => pathname?.startsWith(prefix));

    if (!isAllowed) return null;

    return (
        <motion.div
            className="fixed bottom-6 right-6 z-50"
            style={{
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
                right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.5 }}
        >
            <motion.button
                data-reamaze-lightbox="true"
                className="relative group w-14 h-14 bg-gradient-to-br from-[#ceae7f] to-[#a07d3f] rounded-full flex items-center justify-center shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-shadow duration-300 border border-gold/30"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="تحدث معنا"
            >
                <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <MessageSquareText className="w-6 h-6 text-black drop-shadow-sm relative z-10 transition-transform group-hover:rotate-12 group-hover:scale-110 duration-300" />

                {/* Tooltip */}
                <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-3 px-3 py-1.5 bg-surface border border-theme-soft rounded-lg text-theme text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    فريق الدعم
                    <div className="absolute top-full right-1/2 translate-x-1/2 -mt-px border-4 border-transparent border-t-surface" />
                </div>

                {/* Pulse ring */}
                <motion.div
                    className="absolute inset-0 border-2 border-gold/30 rounded-full"
                    animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                />
            </motion.button>
        </motion.div>
    );
}
