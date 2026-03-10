"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, FileText, ShoppingCart, Plus, Palette, ExternalLink } from "lucide-react";

const actions = [
    { icon: FileText, label: "طلبات الانضمام", href: "/dashboard/applications", badge: "pending" },
    { icon: ShoppingCart, label: "الطلبات", href: "/dashboard/orders", query: "?status=pending" },
    { icon: Users, label: "المستخدمون", href: "/dashboard/users" },
    { icon: Palette, label: "التصاميم الحصرية", href: "/dashboard/exclusive-designs" },
    { icon: Palette, label: "الأعمال الفنية", href: "/dashboard/artworks" },
    { icon: ExternalLink, label: "المتجر", href: "/store", external: true },
];

export function AdminQuickActions({ pendingCount = 0 }: { pendingCount?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2"
        >
            {actions.map((a, i) => {
                const showBadge = a.badge === "pending" && pendingCount > 0;
                const Icon = a.icon;
                const content = (
                    <Link
                        href={a.href + (a.query || "")}
                        target={a.external ? "_blank" : undefined}
                        rel={a.external ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-theme-soft bg-surface/50 hover:bg-surface/80 hover:border-gold/20 transition-all duration-300 group"
                    >
                        <Icon className="w-4 h-4 text-theme-subtle group-hover:text-gold transition-colors" />
                        <span className="text-sm font-medium text-theme-soft group-hover:text-theme">{a.label}</span>
                        {showBadge && (
                            <span className="w-5 h-5 rounded-full bg-gold/20 text-gold text-[10px] font-bold flex items-center justify-center">
                                {pendingCount}
                            </span>
                        )}
                    </Link>
                );
                return <span key={a.href}>{content}</span>;
            })}
        </motion.div>
    );
}
