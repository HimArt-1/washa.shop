"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedOut } from "@clerk/nextjs";

export function FloatingJoinButton() {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    // Don't show on the join page itself or dashboard
    const hidden = pathname === "/join" || pathname?.startsWith("/dashboard") || pathname?.startsWith("/studio");

    useEffect(() => {
        // Delay show so it doesn't flash on page load
        const t = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(t);
    }, []);

    if (hidden) return null;

    return (
        <SignedOut>
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed bottom-6 left-6 z-50"
                    style={{
                        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
                        left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.3 }}
                >
                    <Link href="/join">
                        <motion.div
                            className="relative group"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* Glow */}
                            <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Button */}
                            <div className="relative w-14 h-14 bg-gradient-to-br from-[#ceae7f] to-[#a07d3f] rounded-full flex items-center justify-center shadow-lg shadow-gold/20 group-hover:shadow-gold/40 transition-shadow duration-300">
                                <UserPlus className="w-6 h-6 text-black" />
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-surface border border-theme-soft rounded-lg text-theme text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                انضم معنا
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-surface" />
                            </div>

                            {/* Pulse ring */}
                            <motion.div
                                className="absolute inset-0 border-2 border-gold/30 rounded-full"
                                animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            />
                        </motion.div>
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
        </SignedOut>
    );
}
