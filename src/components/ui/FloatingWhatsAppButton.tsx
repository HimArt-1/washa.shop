"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

interface FloatingWhatsAppButtonProps {
    phoneNumber?: string;
}

export function FloatingWhatsAppButton({ phoneNumber = "+966532235005" }: FloatingWhatsAppButtonProps) {
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);

    // Keep transactional and workspace screens clear of floating controls.
    const hidden =
        pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/studio") ||
        pathname?.startsWith("/store") ||
        pathname?.startsWith("/products/") ||
        pathname?.startsWith("/checkout");

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 2000);
        return () => clearTimeout(t);
    }, []);

    if (hidden) return null;

    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[\s+]/g, "")}`;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed bottom-4 left-4 z-50 sm:bottom-6 sm:left-6"
                    style={{
                        bottom: "calc(env(safe-area-inset-bottom, 0px) + clamp(1rem, 3vw, 1.5rem))",
                        left: "calc(env(safe-area-inset-left, 0px) + clamp(1rem, 3vw, 1.5rem))",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.3 }}
                >
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <motion.div
                            className="relative group"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {/* Glow - Official WhatsApp Green */}
                            <div className="absolute inset-0 bg-[#25D366]/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            {/* Button - WhatsApp Identity */}
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#168f68] shadow-lg shadow-green-900/15 transition-all duration-300 group-hover:bg-[#12805e] group-hover:shadow-green-900/25 sm:h-14 sm:w-14">
                                <MessageCircle className="h-6 w-6 fill-white/10 text-white sm:h-8 sm:w-8" />
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-surface border border-theme-soft rounded-lg text-theme text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                تواصل معنا عبر واتساب
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-surface" />
                            </div>

                            {/* Pulse ring - Green */}
                            <motion.div
                                className="absolute inset-0 border-2 border-[#25D366]/30 rounded-full"
                                animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            />
                        </motion.div>
                    </a>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
