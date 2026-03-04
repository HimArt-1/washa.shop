"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    BarChart3,
    Users,
    Warehouse,
    TrendingUp,
    UserCheck,
    ShoppingCart,
    FileText,
    Image as ImageIcon,
    ChevronRight,
    Shield,
    Sparkles,
    Menu,
    X,
    Tag,
    Package,
    Mail,
    Settings,
    Palette,
    Wand2,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

interface NavItem {
    icon: any;
    label: string;
    href: string;
    badge?: number;
}

interface NavGroup {
    title?: string;
    items: NavItem[];
}

export function AdminSidebar({ pendingApps = 0 }: { pendingApps?: number }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const pathname = usePathname();

    const navGroups: NavGroup[] = [
        {
            items: [
                { icon: LayoutDashboard, label: "نظرة عامة", href: "/dashboard" },
                { icon: BarChart3, label: "التحليلات", href: "/dashboard/analytics" },
            ],
        },
        {
            title: "المستخدمون والطلبات",
            items: [
                { icon: UserCheck, label: "مستخدمي Clerk", href: "/dashboard/users-clerk" },
                { icon: Users, label: "المستخدمون", href: "/dashboard/users" },
                { icon: ShoppingCart, label: "الطلبات", href: "/dashboard/orders" },
                { icon: FileText, label: "طلبات الانضمام", href: "/dashboard/applications", badge: pendingApps },
            ],
        },
        {
            title: "المبيعات والمخزون",
            items: [
                { icon: TrendingUp, label: "إدارة المبيعات", href: "/dashboard/sales" },
                { icon: Warehouse, label: "إدارة المخزون", href: "/dashboard/inventory" },
            ],
        },
        {
            title: "المحتوى والتصاميم",
            items: [
                { icon: ImageIcon, label: "الأعمال الفنية", href: "/dashboard/artworks" },
                { icon: Tag, label: "الفئات", href: "/dashboard/categories" },
                { icon: Package, label: "المنتجات", href: "/dashboard/products" },
                { icon: Palette, label: "تصاميم وشّى الحصرية", href: "/dashboard/exclusive-designs" },
                { icon: Wand2, label: "المتجر الذكي", href: "/dashboard/smart-store" },
            ],
        },
        {
            title: "التواصل والإعدادات",
            items: [
                { icon: Mail, label: "النشرة البريدية", href: "/dashboard/newsletter" },
                { icon: Settings, label: "الإعدادات", href: "/dashboard/settings" },
            ],
        },
    ];

    const sidebarContent = (
        <>
            {/* ─── Header ─── */}
            <div className="p-5 flex items-center justify-between border-b border-white/[0.06]">
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center gap-2.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                                <Shield className="w-4 h-4 text-bg" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-fg">لوحة الإدارة</h2>
                                <p className="text-[10px] text-fg/30 font-medium">WUSHA Admin</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Desktop: Collapse toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors hidden md:block"
                >
                    <ChevronRight
                        className={`w-4 h-4 text-fg/40 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                    />
                </button>

                {/* Mobile: Close button */}
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors md:hidden"
                >
                    <X className="w-5 h-5 text-fg/40" />
                </button>
            </div>

            {/* ─── Navigation ─── */}
            <nav className="flex-1 py-4 px-3 flex flex-col gap-6 overflow-y-auto">
                {navGroups.map((group, gi) => (
                    <div key={gi} className="space-y-1">
                        {group.title && !isCollapsed && (
                            <div className="px-3 mb-2">
                                <span className="text-[10px] font-bold text-fg/30 uppercase tracking-wider">
                                    {group.title}
                                </span>
                            </div>
                        )}
                        {group.items.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href));

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileOpen(false)}
                                    className={`
                                        relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                                        transition-all duration-300 group
                                        ${isActive
                                            ? "bg-gold/10 text-gold"
                                            : "text-fg/40 hover:text-fg/70 hover:bg-white/[0.03]"
                                        }
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-gold" : "text-fg/40 group-hover:text-fg/60"
                                        }`} />

                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -8 }}
                                                className="text-sm font-medium whitespace-nowrap flex-1"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    {item.badge && item.badge > 0 && (
                                        <span className={`
                                            ${isCollapsed ? "absolute -top-1 -right-1 w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px]"}
                                            bg-gold text-bg rounded-full flex items-center justify-center font-bold
                                        `}>
                                            {item.badge}
                                        </span>
                                    )}

                                    {isActive && (
                                        <motion.div
                                            layoutId="admin-active-pill"
                                            className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gold rounded-l-full"
                                            transition={{ duration: 0.3 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* ─── Footer ─── */}
            <div className="p-3 border-t border-white/[0.06]">
                <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] ${isCollapsed ? "justify-center" : ""
                    }`}>
                    <UserButton afterSignOutUrl="/" />
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col overflow-hidden"
                            >
                                <span className="text-xs font-bold text-fg truncate">المسؤول</span>
                                <span className="text-[10px] text-fg/30 truncate">إدارة المنصة</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Quick link back to Studio */}
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Link
                                href="/studio"
                                className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-fg/30 hover:text-fg/50 hover:bg-white/[0.02] transition-colors"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                العودة للاستوديو
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 right-4 z-50 md:hidden p-3 bg-surface/90 backdrop-blur-xl border border-white/[0.06] rounded-xl text-fg/60"
                aria-label="فتح القائمة"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                className="h-screen bg-surface/90 backdrop-blur-2xl border-l border-white/[0.08] sticky top-0 flex flex-col z-50 hidden md:flex shadow-[0_0_60px_-20px_rgba(206,174,127,0.08)]"
                animate={{ width: isCollapsed ? 80 : 280 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
                {sidebarContent}
            </motion.aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.aside
                        className="fixed right-0 top-0 h-screen w-[280px] bg-surface/95 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col z-50 md:hidden"
                        initial={{ x: 280 }}
                        animate={{ x: 0 }}
                        exit={{ x: 280 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {sidebarContent}
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
