"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Command,
    ExternalLink,
    LayoutDashboard,
    Users,
    ShoppingCart,
    FileText,
    Package,
    Palette,
    Settings,
    Sparkles,
    CreditCard,
    ShieldAlert,
    CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
    getAdminNotificationCategoryLabel,
    getAdminNotificationSeverityLabel,
} from "@/lib/admin-notification-meta";
import type { AdminNotification } from "@/types/database";
import { PushSubscribeButton } from "@/components/notifications/PushSubscribeButton";
import { useNotificationStore } from "@/stores/notificationStore";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toast } from "sonner";

const COMMAND_ITEMS = [
    { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "المستخدمون", icon: Users },
    { href: "/dashboard/orders", label: "الطلبات", icon: ShoppingCart },
    { href: "/dashboard/applications", label: "طلبات الانضمام", icon: FileText },
    { href: "/dashboard/artworks", label: "الأعمال الفنية", icon: Palette },
    { href: "/dashboard/products-inventory", label: "التنفيذ والمخزون", icon: Package },
    { href: "/dashboard/exclusive-designs", label: "التصاميم الحصرية", icon: Palette },
    { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
    { href: "/store", label: "المتجر العام", icon: ExternalLink, external: true },
    { href: "/studio", label: "الاستوديو", icon: Sparkles },
];

function getAdminNotificationIcon(notification: AdminNotification) {
    switch (notification.category) {
        case "payments":
            return CreditCard;
        case "applications":
            return FileText;
        case "design":
            return Palette;
        case "support":
        case "security":
            return ShieldAlert;
        case "orders":
            return ShoppingCart;
        default:
            return Package;
    }
}

function getSeverityBadgeClasses(notification: AdminNotification) {
    switch (notification.severity) {
        case "critical":
            return "border-rose-500/20 bg-rose-500/10 text-rose-300";
        case "warning":
            return "border-amber-500/20 bg-amber-500/10 text-amber-300";
        case "info":
        default:
            return "border-sky-500/20 bg-sky-500/10 text-sky-300";
    }
}

function getCategoryBadgeClasses(notification: AdminNotification) {
    switch (notification.category) {
        case "payments":
            return "border-emerald-500/15 bg-emerald-500/10 text-emerald-300";
        case "applications":
            return "border-violet-500/15 bg-violet-500/10 text-violet-300";
        case "support":
            return "border-orange-500/15 bg-orange-500/10 text-orange-300";
        case "design":
            return "border-fuchsia-500/15 bg-fuchsia-500/10 text-fuchsia-300";
        case "security":
            return "border-rose-500/15 bg-rose-500/10 text-rose-300";
        case "system":
            return "border-slate-500/15 bg-slate-500/10 text-slate-300";
        case "orders":
        default:
            return "border-gold/15 bg-gold/10 text-gold";
    }
}

function getPageMeta(pathname: string) {
    const exactMatch = COMMAND_ITEMS.find((item) => item.href === pathname && !item.external);
    if (exactMatch) {
        return {
            title: exactMatch.label,
            description: "تنقل أسرع بين المراكز التشغيلية مع بحث أقرب إلى العمل الفعلي.",
        };
    }

    if (pathname.startsWith("/dashboard/support/")) {
        return {
            title: "مساحة تذكرة الدعم",
            description: "راجع الحالة والحوار والإجراءات من شاشة واحدة.",
        };
    }

    if (pathname.startsWith("/dashboard/design-orders/")) {
        return {
            title: "مساحة طلب التصميم",
            description: "تابع التنفيذ وأرسل النتائج وتحرك بين الحالات دون فقد السياق.",
        };
    }

    if (pathname.startsWith("/dashboard/applications/")) {
        return {
            title: "مراجعة طلب الانضمام",
            description: "اعتماد أو رفض الطلبات مع رؤية أوضح للبيانات والمرفقات.",
        };
    }

    if (pathname.startsWith("/dashboard/users/")) {
        return {
            title: "ملف المستخدم",
            description: "نظرة مركزة على الحساب والهوية والنشاط من شاشة واحدة.",
        };
    }

    return {
        title: "لوحة الإدارة",
        description: "ملاحة تشغيلية أنظف بين الطلبات والدعم والمنتجات والإعدادات.",
    };
}

import { OrderRadar } from "@/components/admin/orders/OrderRadar";

export function AdminTopBar() {
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const { notifications, unreadCount, fetchInitial, addNotification, markAsRead, markAllAsRead } = useNotificationStore();
    const notificationSummary = { critical: 0, warning: 0, info: 0 };
    const pageMeta = getPageMeta(pathname);

    useEffect(() => {
        setMounted(true);
    }, []);

    for (const notification of notifications) {
        if (notificationSummary[notification.severity] !== undefined) {
            notificationSummary[notification.severity] += 1;
        }
    }

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    useEffect(() => {
        setNotificationsOpen(false);
    }, [pathname]);

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        
        const channel = supabase
            .channel('admin_notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_notifications',
                },
                (payload) => {
                    const newNotification = payload.new as AdminNotification;
                    addNotification(newNotification);
                    
                    // Show a toast
                    toast.success(newNotification.title, {
                        description: newNotification.message,
                        duration: 8000,
                        action: {
                            label: 'عرض',
                            onClick: () => {
                                if (newNotification.link) {
                                    router.push(newNotification.link);
                                }
                            }
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [addNotification, router]);

    const filtered = query.trim()
        ? COMMAND_ITEMS.filter((i) =>
            i.label.toLowerCase().includes(query.toLowerCase())
        )
        : COMMAND_ITEMS;

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen((o) => !o);
            }
            if (e.key === "Escape") setSearchOpen(false);
        },
        []
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    const selectItem = (item: (typeof COMMAND_ITEMS)[0]) => {
        if (item.external) {
            window.open(item.href, "_blank");
        } else {
            router.push(item.href);
        }
        setSearchOpen(false);
        setQuery("");
    };

    return (
        <>
            <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--wusha-surface)_95%,transparent)] backdrop-blur-xl border-b border-theme-subtle">
                <div className="flex flex-col gap-3 px-4 py-3 pr-16 sm:px-6 sm:pr-6 lg:px-8 lg:pr-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold tracking-[0.2em] text-theme-faint">ADMIN NAVIGATION</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <h1 className="text-lg font-bold text-theme sm:text-xl">{pageMeta.title}</h1>
                                <span className="inline-flex items-center rounded-full border border-gold/15 bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold">
                                    Cmd/Ctrl + K
                                </span>
                            </div>
                            <p className="mt-1 line-clamp-1 text-xs text-theme-faint sm:text-sm">{pageMeta.description}</p>
                        </div>

                        <button
                            onClick={() => setSearchOpen(true)}
                            className="flex w-full items-center gap-3 rounded-xl border border-theme-soft bg-theme-subtle px-4 py-2.5 text-right transition-all duration-300 hover:border-gold/30 hover:bg-theme-soft sm:mr-auto sm:min-w-[260px] sm:w-auto"
                        >
                            <Search className="w-4 h-4 text-theme-subtle shrink-0" />
                            <span className="text-sm text-theme-subtle flex-1">بحث سريع...</span>
                            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-theme-subtle text-[10px] text-theme-subtle font-mono">
                                <Command className="w-3 h-3" />K
                            </kbd>
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <Link
                            href="/"
                            className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-theme-soft bg-theme-faint px-3 py-2 text-xs font-bold text-theme-soft transition-colors hover:border-gold/20 hover:text-gold"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            الموقع العام
                        </Link>
                        <ThemeToggle />
                        <button
                            onClick={() => setNotificationsOpen(!notificationsOpen)}
                            className="relative p-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/25 transition-colors"
                            aria-label="تنبيهات الإدارة"
                        >
                            <ShieldAlert className="w-5 h-5" />
                            {mounted && unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-gold text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center px-1">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>
                        <div className="[&_.cl-userButtonBox]:flex [&_.cl-userButtonTrigger]:rounded-xl">
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "w-10 h-10 border-2 border-gold/20 hover:border-gold/40 transition-colors",
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            </header>
            <OrderRadar />

            {/* Command Palette Modal */}
            <AnimatePresence>
                {searchOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSearchOpen(false)}
                            className="fixed inset-0 z-[100] bg-[color-mix(in_srgb,var(--wusha-bg)_70%,transparent)] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -20 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-[101] mx-4"
                        >
                            <div className="rounded-2xl border border-theme-soft bg-[var(--wusha-surface)]/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-theme-subtle">
                                    <Search className="w-5 h-5 text-gold" />
                                    <input
                                        autoFocus
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="ابحث عن صفحة أو إجراء..."
                                        className="flex-1 bg-transparent text-theme text-lg placeholder:text-theme-faint focus:outline-none"
                                        dir="rtl"
                                    />
                                    <kbd className="px-2 py-1 rounded bg-theme-subtle text-[10px] text-theme-subtle font-mono">
                                        ESC
                                    </kbd>
                                </div>
                                <div className="max-h-[320px] overflow-y-auto py-2">
                                    {filtered.map((item, i) => {
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href;
                                        return (
                                            <button
                                                key={item.href}
                                                onClick={() => selectItem(item)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${isActive
                                                        ? "bg-gold/10 text-gold"
                                                        : "hover:bg-theme-subtle text-theme-strong"
                                                    }`}
                                            >
                                                <Icon className="w-5 h-5 shrink-0 text-theme-subtle" />
                                                <span className="flex-1 font-medium">{item.label}</span>
                                                {item.external && (
                                                    <ExternalLink className="w-4 h-4 text-theme-faint" />
                                                )}
                                            </button>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <div className="px-4 py-8 text-center text-theme-subtle text-sm">
                                            لا توجد نتائج
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Notifications Dropdown */}
            <AnimatePresence>
                {notificationsOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setNotificationsOpen(false)}
                            className="fixed inset-0 z-40"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        className="fixed left-3 right-3 top-16 sm:left-auto sm:right-6 sm:w-[400px] z-50 rounded-2xl border border-theme-soft bg-[var(--wusha-surface)]/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-theme-subtle">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl border border-amber-500/15 bg-amber-500/10 text-amber-300 flex items-center justify-center">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <div>
                                            <h3 className="font-bold text-theme">تنبيهات الإدارة</h3>
                                            <p className="text-[11px] text-theme-faint">قناة داخلية منفصلة للطلبات والمدفوعات والدعم</p>
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center rounded-full border border-rose-500/15 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                                                    {notificationSummary.critical} حرج
                                                </span>
                                                <span className="inline-flex items-center rounded-full border border-amber-500/15 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                                    {notificationSummary.warning} تحذير
                                                </span>
                                                <span className="inline-flex items-center rounded-full border border-sky-500/15 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                                                    {notificationSummary.info} معلومة
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <PushSubscribeButton scope="admin" variant="admin" />
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={async () => {
                                                await markAllAsRead();
                                            }}
                                            className="text-xs text-gold hover:text-gold-light flex items-center gap-1"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            تعليم الكل كمقروء
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setNotificationsOpen(false)}
                                        className="text-theme-subtle hover:text-theme text-sm"
                                    >
                                        إغلاق
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-[360px] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((n) => {
                                        const Icon = getAdminNotificationIcon(n);
                                        return (
                                            <Link
                                                key={n.id}
                                                href={n.link || "#"}
                                                onClick={async () => {
                                                    if (!n.is_read) {
                                                        await markAsRead(n.id);
                                                    }
                                                    setNotificationsOpen(false);
                                                }}
                                                className={`flex items-start gap-3 px-4 py-3 border-b border-theme-faint hover:bg-theme-subtle transition-colors ${!n.is_read ? "bg-gold/5" : ""
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl shrink-0 border flex items-center justify-center ${!n.is_read
                                                    ? "border-amber-500/15 bg-amber-500/10 text-amber-300"
                                                    : "border-theme-soft bg-theme-subtle text-theme-subtle"
                                                    }`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-theme text-sm">{n.title}</p>
                                                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
                                                    </div>
                                                    {n.message && <p className="text-xs text-theme-subtle mt-0.5">{n.message}</p>}
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCategoryBadgeClasses(n)}`}>
                                                            {getAdminNotificationCategoryLabel(n.category)}
                                                        </span>
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getSeverityBadgeClasses(n)}`}>
                                                            {getAdminNotificationSeverityLabel(n.severity)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-theme-faint mt-1" dir="ltr">
                                                        {new Date(n.created_at).toLocaleString("ar-SA", {
                                                            month: "short",
                                                            day: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-16 text-theme-subtle text-sm">
                                        لا توجد إشعارات
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
