"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Home, Zap } from "lucide-react";

const ROUTES: Record<string, { label: string; parent?: string }> = {
    "/dashboard": { label: "نظرة عامة" },
    "/dashboard/analytics": { label: "التحليلات", parent: "/dashboard" },
    "/dashboard/sales": { label: "إدارة المبيعات", parent: "/dashboard" },
    "/dashboard/products-inventory": { label: "إدارة المنتجات والمخزون", parent: "/dashboard" },
    "/dashboard/users-clerk": { label: "مستخدمي Clerk", parent: "/dashboard" },
    "/dashboard/users": { label: "المستخدمون", parent: "/dashboard" },
    "/dashboard/orders": { label: "الطلبات", parent: "/dashboard" },
    "/dashboard/applications": { label: "طلبات الانضمام", parent: "/dashboard" },
    "/dashboard/artworks": { label: "الأعمال الفنية", parent: "/dashboard" },
    "/dashboard/categories": { label: "الفئات", parent: "/dashboard" },
    "/dashboard/exclusive-designs": { label: "تصاميم وشّى الحصرية", parent: "/dashboard" },
    "/dashboard/newsletter": { label: "النشرة البريدية", parent: "/dashboard" },
    "/dashboard/settings": { label: "الإعدادات", parent: "/dashboard" },
};

function getBreadcrumbs(pathname: string) {
    const exact = ROUTES[pathname];
    if (exact) {
        const crumbs: { href: string; label: string }[] = [{ href: "/dashboard", label: "لوحة الإدارة" }];
        if (pathname !== "/dashboard") {
            crumbs.push({ href: pathname, label: exact.label });
        }
        return crumbs;
    }
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((p, i) => ({
        href: "/" + parts.slice(0, i + 1).join("/"),
        label: p === "dashboard" ? "لوحة الإدارة" : p,
    }));
}

interface AdminHeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
    const pathname = usePathname();
    const crumbs = getBreadcrumbs(pathname);
    const currentRoute = ROUTES[pathname];
    const displayTitle = title ?? currentRoute?.label ?? "لوحة الإدارة";

    return (
        <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-theme-subtle mb-4 flex-wrap">
                <Link href="/dashboard" className="hover:text-gold transition-colors flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    الرئيسية
                </Link>
                {crumbs.map((c, i) => (
                    <span key={c.href} className="flex items-center gap-2">
                        <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                        {i === crumbs.length - 1 ? (
                            <span className="text-theme font-medium">{c.label}</span>
                        ) : (
                            <Link href={c.href} className="hover:text-gold transition-colors">
                                {c.label}
                            </Link>
                        )}
                    </span>
                ))}
            </nav>

            {/* Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-theme flex items-center gap-3">
                        {displayTitle}
                        {pathname === "/dashboard" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium">
                                <Zap className="w-3.5 h-3.5" />
                                مباشر
                            </span>
                        )}
                    </h1>
                    {subtitle && <p className="text-theme-subtle mt-1 text-sm">{subtitle}</p>}
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
        </motion.header>
    );
}
