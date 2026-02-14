"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    subtitle?: string;
    growth?: number;     // percentage
    delay?: number;
    variant?: "default" | "gold" | "accent" | "forest";
}

const variantStyles = {
    default: {
        icon: "bg-white/5 text-fg/60",
        glow: "",
    },
    gold: {
        icon: "bg-gold/10 text-gold",
        glow: "hover:shadow-[0_0_40px_rgba(206,174,127,0.12)]",
    },
    accent: {
        icon: "bg-accent/10 text-accent",
        glow: "hover:shadow-[0_0_40px_rgba(157,139,177,0.12)]",
    },
    forest: {
        icon: "bg-forest/10 text-forest",
        glow: "hover:shadow-[0_0_40px_rgba(42,122,90,0.12)]",
    },
};

export function StatCard({
    title,
    value,
    icon: Icon,
    subtitle,
    growth,
    delay = 0,
    variant = "default",
}: StatCardProps) {
    const styles = variantStyles[variant];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`
                relative overflow-hidden rounded-2xl border border-white/[0.06]
                bg-surface/70 backdrop-blur-sm p-6
                transition-all duration-500 group
                hover:border-white/[0.12] ${styles.glow}
            `}
        >
            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${styles.icon}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {growth !== undefined && growth !== 0 && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${growth > 0
                                ? "bg-forest/10 text-forest"
                                : "bg-red-500/10 text-red-400"
                            }`}>
                            {growth > 0 ? "+" : ""}{growth}%
                        </span>
                    )}
                </div>

                <p className="text-fg/40 text-sm font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold text-fg tracking-tight">{value}</p>
                {subtitle && (
                    <p className="text-fg/30 text-xs mt-2">{subtitle}</p>
                )}
            </div>
        </motion.div>
    );
}
