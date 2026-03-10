"use client";

import { motion } from "framer-motion";

interface AdminCardProps {
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export function AdminCard({ title, subtitle, action, children, className = "", noPadding }: AdminCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl border border-theme-soft bg-surface/60 backdrop-blur-xl overflow-hidden shadow-lg shadow-black/20 hover:border-gold/10 transition-all duration-500 ${className}`}
        >
            {(title || action) && (
                <div className="px-6 py-4 border-b border-theme-subtle flex items-center justify-between gap-4">
                    <div>
                        {title && <h3 className="font-bold text-theme text-sm">{title}</h3>}
                        {subtitle && <p className="text-xs text-theme-subtle mt-0.5">{subtitle}</p>}
                    </div>
                    {action && <div className="shrink-0">{action}</div>}
                </div>
            )}
            <div className={noPadding ? "" : "p-6"}>{children}</div>
        </motion.div>
    );
}
