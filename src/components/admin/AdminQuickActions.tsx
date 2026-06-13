"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    BarChart3,
    Bell,
    Brush,
    ExternalLink,
    FileText,
    Palette,
    ShoppingCart,
    Users,
} from "lucide-react";

type ActionDef = {
    icon: typeof FileText;
    label: string;
    href: string;
    query?: string;
    external?: boolean;
    badge?: "pending" | "orders" | "alerts";
};

const actions: ActionDef[] = [
    { icon: BarChart3, label: "التحليلات", href: "/dashboard/analytics" },
    { icon: Bell, label: "التنبيهات", href: "/dashboard/notifications", badge: "alerts" },
    { icon: FileText, label: "طلبات الانضمام", href: "/dashboard/applications", badge: "pending" },
    { icon: ShoppingCart, label: "الطلبات", href: "/dashboard/orders", query: "?status=pending", badge: "orders" },
    { icon: Users, label: "المستخدمون", href: "/dashboard/users" },
    { icon: Palette, label: "التصاميم الحصرية", href: "/dashboard/exclusive-designs" },
    { icon: Brush, label: "الأعمال الفنية", href: "/dashboard/artworks" },
    { icon: ExternalLink, label: "المتجر", href: "/store", external: true },
];

export function AdminQuickActions({
    pendingCount = 0,
    alertsUnread = 0,
    ordersNeedingReview = 0,
}: {
    pendingCount?: number;
    alertsUnread?: number;
    ordersNeedingReview?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex w-full min-w-0 flex-wrap justify-start gap-2 lg:justify-end"
            aria-label="اختصارات لوحة الإدارة"
        >
            {actions.map((a) => {
                let badgeValue: number | null = null;
                if (a.badge === "pending" && pendingCount > 0) badgeValue = pendingCount;
                if (a.badge === "alerts" && alertsUnread > 0) badgeValue = alertsUnread;
                if (a.badge === "orders" && ordersNeedingReview > 0) badgeValue = ordersNeedingReview;

                const Icon = a.icon;
                return (
                    <Link
                        key={`${a.href}${a.query || ""}`}
                        href={a.href + (a.query || "")}
                        target={a.external ? "_blank" : undefined}
                        rel={a.external ? "noopener noreferrer" : undefined}
                        className="flex min-w-[8.25rem] max-w-full flex-1 items-center gap-2 rounded-xl border border-theme-soft bg-surface/50 px-3.5 py-2.5 transition-all duration-300 hover:border-gold/20 hover:bg-surface/80 active:scale-[0.98] sm:flex-none sm:px-4"
                    >
                        <Icon className="w-4 h-4 shrink-0 text-theme-subtle group-hover:text-gold transition-colors" />
                        <span className="text-sm font-medium text-theme-soft group-hover:text-theme truncate">
                            {a.label}
                        </span>
                        {badgeValue !== null ? (
                            <span
                                className="min-w-[1.25rem] h-5 px-1 rounded-full bg-gold/20 text-gold text-[10px] font-bold flex items-center justify-center tabular-nums"
                                aria-label={`${badgeValue} عنصر`}
                            >
                                {badgeValue > 99 ? "99+" : badgeValue}
                            </span>
                        ) : null}
                    </Link>
                );
            })}
        </motion.div>
    );
}
