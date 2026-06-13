"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Home, Zap } from "lucide-react";
import { getAdminBreadcrumbs, getAdminPageMeta } from "@/lib/admin-navigation";

interface AdminHeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
    const pathname = usePathname();
    const crumbs = getAdminBreadcrumbs(pathname);
    const pageMeta = getAdminPageMeta(pathname);
    const displayTitle = title ?? pageMeta.title;
    const displaySubtitle = subtitle ?? pageMeta.description;

    return (
        <header className="mb-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-theme-subtle mb-4 flex-wrap">
                {crumbs.map((c, i) => (
                    <span key={c.href} className="flex items-center gap-2">
                        {i === 0 ? (
                            <Home className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                        )}
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-theme flex items-center gap-3">
                        {displayTitle}
                        {pathname === "/dashboard" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium">
                                <Zap className="w-3.5 h-3.5" />
                                مباشر
                            </span>
                        )}
                    </h1>
                    {displaySubtitle && <p className="text-theme-subtle mt-1 text-sm">{displaySubtitle}</p>}
                </div>
                {actions && (
                    <div className="w-full min-w-0 lg:w-auto lg:max-w-[min(760px,54vw)]">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}
