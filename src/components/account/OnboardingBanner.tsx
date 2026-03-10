"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Sparkles, X, ChevronLeft, Palette, ShoppingBag } from "lucide-react";

const STORAGE_KEY = "wusha_onboarding_seen";

export function OnboardingBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const seen = localStorage.getItem(STORAGE_KEY);
        if (!seen) setIsVisible(true);
    }, []);

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, "1");
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mb-8 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-l from-gold/[0.08] via-gold/[0.04] to-transparent p-6"
                >
                    <button
                        onClick={dismiss}
                        className="absolute top-4 left-4 p-2 rounded-xl text-theme-faint hover:text-theme-soft hover:bg-theme-subtle transition-colors"
                        aria-label="إغلاق"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pr-10 sm:pr-0">
                        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                            <Sparkles className="w-8 h-8 text-gold" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-theme mb-1">مرحباً بك في وشّى</h3>
                            <p className="text-theme-subtle text-sm leading-relaxed mb-4">
                                ابدأ بتصفح المعرض، المتجر، أو صمّم قطعتك بالذكاء الاصطناعي
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link
                                    href="/design"
                                    onClick={dismiss}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold/20 hover:bg-gold/30 text-gold rounded-xl text-sm font-bold transition-colors"
                                >
                                    <Palette className="w-4 h-4" />
                                    صمّم قطعتك
                                </Link>
                                <Link
                                    href="/store"
                                    onClick={dismiss}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 border border-theme-soft hover:border-gold/20 text-theme-soft hover:text-gold rounded-xl text-sm font-medium transition-colors"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    تصفح المتجر
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
