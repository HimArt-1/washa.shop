"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    isCollapsed?: boolean;
}

export function SidebarItem({ icon: Icon, label, href, isCollapsed }: SidebarItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link href={href} className="relative group w-full">
            <div
                className={clsx(
                    "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                    isActive
                        ? "bg-gold/10 text-gold"
                        : "text-theme-subtle hover:text-theme-soft hover:bg-theme-subtle"
                )}
            >
                <Icon className={clsx("w-5 h-5 transition-colors", isActive ? "text-gold" : "text-theme-subtle group-hover:text-theme-soft")} />

                {!isCollapsed && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium text-sm whitespace-nowrap"
                    >
                        {label}
                    </motion.span>
                )}

                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gold rounded-l-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </div>
        </Link>
    );
}
