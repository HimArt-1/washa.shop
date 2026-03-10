"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Palette,
    Wand2,
    Settings,
    ChevronRight,
    Menu,
    X,
} from "lucide-react";
import { SidebarItem } from "./SidebarItem";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/ui/Logo";

const menuItems = [
    { icon: LayoutDashboard, label: "لوحة التحكم", href: "/studio" },
    { icon: Wand2, label: "تصميم قطعة", href: "/studio/design-piece" },
    { icon: Palette, label: "أعمالي", href: "/studio/artworks" },
    { icon: Settings, label: "الإعدادات", href: "/account/settings" },
];

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 right-4 z-50 md:hidden p-3 bg-surface/90 backdrop-blur-xl border border-theme-subtle rounded-xl text-theme-soft"
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

            {/* Sidebar */}
            <motion.aside
                className={`
                    h-screen bg-surface/80 backdrop-blur-2xl border-l border-theme-subtle 
                    flex flex-col z-50 transition-all duration-300
                    fixed md:sticky top-0
                    ${isMobileOpen ? "right-0" : "-right-[280px] md:right-0"}
                `}
                animate={{ width: isCollapsed ? 80 : 280 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
                {/* Header */}
                <div className="p-5 flex items-center justify-between border-b border-theme-subtle">
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                            >
                                <Logo size="sm" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Desktop collapse toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-2 hover:bg-theme-subtle rounded-lg transition-colors hidden md:block"
                    >
                        <ChevronRight className={`w-4 h-4 text-theme-subtle transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
                    </button>

                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 hover:bg-theme-subtle rounded-lg transition-colors md:hidden"
                    >
                        <X className="w-5 h-5 text-theme-subtle" />
                    </button>
                </div>

                {/* Menu */}
                <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <div key={item.href} onClick={() => setIsMobileOpen(false)}>
                            <SidebarItem
                                {...item}
                                isCollapsed={isCollapsed}
                            />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-theme-subtle">
                    <div className={`flex items-center gap-3 p-3 rounded-xl bg-theme-faint border border-theme-faint ${isCollapsed ? "justify-center" : ""}`}>
                        <UserButton afterSignOutUrl="/" />
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col overflow-hidden"
                                >
                                    <span className="text-xs font-bold text-theme truncate">حسابي</span>
                                    <span className="text-[10px] text-theme-faint truncate">إدارة الملف</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
