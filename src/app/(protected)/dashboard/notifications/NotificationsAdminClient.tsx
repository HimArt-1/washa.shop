"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle,
    CreditCard,
    FileText,
    Loader2,
    Palette,
    ShieldAlert,
    ShoppingCart,
    UserPlus,
} from "lucide-react";
import {
    ADMIN_NOTIFICATION_CATEGORIES,
    ADMIN_NOTIFICATION_SEVERITIES,
    getAdminNotificationCategoryLabel,
    getAdminNotificationSeverityLabel,
} from "@/lib/admin-notification-meta";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { cn } from "@/lib/utils";
import type {
    AdminNotification,
    AdminNotificationCategory,
    AdminNotificationSeverity,
} from "@/types/database";

interface NotificationsAdminClientProps {
    notifications: AdminNotification[];
    alerts: {
        lowStock: number;
        pendingOrders: number;
        newUsersToday: number;
    };
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} ي`;
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function getNotificationIcon(notification: AdminNotification) {
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
        case "system":
        default:
            return ShieldAlert;
    }
}

function getSeverityClasses(severity: AdminNotificationSeverity) {
    switch (severity) {
        case "critical":
            return {
                badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
                accent: "border-r-rose-400",
                icon: "border-rose-500/15 bg-rose-500/10 text-rose-300",
            };
        case "warning":
            return {
                badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
                accent: "border-r-amber-400",
                icon: "border-amber-500/15 bg-amber-500/10 text-amber-300",
            };
        case "info":
        default:
            return {
                badge: "border-sky-500/20 bg-sky-500/10 text-sky-300",
                accent: "border-r-sky-400",
                icon: "border-sky-500/15 bg-sky-500/10 text-sky-300",
            };
    }
}

function getCategoryClasses(category: AdminNotificationCategory) {
    switch (category) {
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

function FilterChip(props: {
    active: boolean;
    label: string;
    count?: number;
    onClick: () => void;
}) {
    const { active, label, count, onClick } = props;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                active
                    ? "border-gold/30 bg-gold/10 text-gold"
                    : "border-theme-soft bg-theme-subtle text-theme-subtle hover:border-gold/20 hover:text-theme"
            )}
        >
            <span>{label}</span>
            {typeof count === "number" && (
                <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    active ? "bg-gold/15 text-gold" : "bg-theme-faint text-theme-faint"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}

export function NotificationsAdminClient({ notifications, alerts }: NotificationsAdminClientProps) {
    const [items, setItems] = useState(notifications);
    const [categoryFilter, setCategoryFilter] = useState<AdminNotificationCategory | "all">("all");
    const [severityFilter, setSeverityFilter] = useState<AdminNotificationSeverity | "all">("all");
    const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
    const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null);
    const [isMarkingAll, startMarkAllTransition] = useTransition();
    const [isMarkingOne, startSingleTransition] = useTransition();

    useEffect(() => {
        setItems(notifications);
    }, [notifications]);

    const categoryCounts = {
        orders: 0,
        payments: 0,
        applications: 0,
        support: 0,
        design: 0,
        system: 0,
        security: 0,
    } satisfies Record<AdminNotificationCategory, number>;

    const severityCounts = {
        critical: 0,
        warning: 0,
        info: 0,
    } satisfies Record<AdminNotificationSeverity, number>;

    let unreadCount = 0;

    for (const notification of items) {
        categoryCounts[notification.category] += 1;
        severityCounts[notification.severity] += 1;
        if (!notification.is_read) unreadCount += 1;
    }

    const filteredNotifications = items.filter((notification) => {
        if (categoryFilter !== "all" && notification.category !== categoryFilter) return false;
        if (severityFilter !== "all" && notification.severity !== severityFilter) return false;
        if (readFilter === "unread" && notification.is_read) return false;
        return true;
    });

    const handleMarkRead = (id: string) => {
        if (pendingNotificationId || isMarkingOne) return;

        startSingleTransition(async () => {
            setPendingNotificationId(id);
            try {
                const result = await markNotificationRead(id);
                if (!result?.success) {
                    throw new Error(result?.error || "فشل تحديث الإشعار");
                }
                setItems((prev) =>
                    prev.map((notification) =>
                        notification.id === id ? { ...notification, is_read: true } : notification
                    )
                );
            } catch (error) {
                window.alert(error instanceof Error ? error.message : "فشل تحديث الإشعار");
            } finally {
                setPendingNotificationId(null);
            }
        });
    };

    const handleMarkAllRead = () => {
        if (unreadCount === 0 || isMarkingAll) return;

        startMarkAllTransition(async () => {
            try {
                const result = await markAllNotificationsRead();
                if (!result?.success) {
                    throw new Error(result?.error || "فشل تحديث الإشعارات");
                }
                setItems((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
            } catch (error) {
                window.alert(error instanceof Error ? error.message : "فشل تحديث الإشعارات");
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className={cn(
                        "rounded-2xl border p-5 backdrop-blur-sm",
                        alerts.lowStock > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-theme-subtle bg-theme-faint"
                    )}
                >
                    <div className="mb-2 flex items-center gap-3">
                        <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            alerts.lowStock > 0 ? "bg-amber-500/10" : "bg-theme-subtle"
                        )}>
                            <AlertTriangle className={cn("h-5 w-5", alerts.lowStock > 0 ? "text-amber-400" : "text-theme-faint")} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-theme-strong">مخزون منخفض</p>
                            <p className="text-[10px] text-theme-faint">منتجات بكمية ≤ 5</p>
                        </div>
                    </div>
                    <p className={cn("text-3xl font-black", alerts.lowStock > 0 ? "text-amber-400" : "text-theme-faint")}>
                        {alerts.lowStock}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "rounded-2xl border p-5 backdrop-blur-sm",
                        alerts.pendingOrders > 0 ? "border-blue-500/20 bg-blue-500/5" : "border-theme-subtle bg-theme-faint"
                    )}
                >
                    <div className="mb-2 flex items-center gap-3">
                        <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            alerts.pendingOrders > 0 ? "bg-blue-500/10" : "bg-theme-subtle"
                        )}>
                            <ShoppingCart className={cn("h-5 w-5", alerts.pendingOrders > 0 ? "text-blue-400" : "text-theme-faint")} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-theme-strong">طلبات معلقة</p>
                            <p className="text-[10px] text-theme-faint">بانتظار المعالجة</p>
                        </div>
                    </div>
                    <p className={cn("text-3xl font-black", alerts.pendingOrders > 0 ? "text-blue-400" : "text-theme-faint")}>
                        {alerts.pendingOrders}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn(
                        "rounded-2xl border p-5 backdrop-blur-sm",
                        alerts.newUsersToday > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-theme-subtle bg-theme-faint"
                    )}
                >
                    <div className="mb-2 flex items-center gap-3">
                        <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl",
                            alerts.newUsersToday > 0 ? "bg-emerald-500/10" : "bg-theme-subtle"
                        )}>
                            <UserPlus className={cn("h-5 w-5", alerts.newUsersToday > 0 ? "text-emerald-400" : "text-theme-faint")} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-theme-strong">مستخدمون جدد</p>
                            <p className="text-[10px] text-theme-faint">انضموا اليوم</p>
                        </div>
                    </div>
                    <p className={cn("text-3xl font-black", alerts.newUsersToday > 0 ? "text-emerald-400" : "text-theme-faint")}>
                        {alerts.newUsersToday}
                    </p>
                </motion.div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm">
                <div className="space-y-4 border-b border-theme-subtle px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-gold" />
                            <h3 className="text-sm font-bold text-theme-strong">سجل تنبيهات الإدارة</h3>
                        </div>
                        <span className="mr-auto text-xs text-theme-faint">
                            {filteredNotifications.length} من {items.length} إشعار
                        </span>
                        <span className="inline-flex items-center rounded-full border border-theme-soft bg-theme-subtle px-2.5 py-1 text-[11px] text-theme-subtle">
                            غير المقروء: {unreadCount}
                        </span>
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0 || isMarkingAll}
                            className="inline-flex items-center gap-2 rounded-full border border-theme-soft bg-theme-subtle px-3 py-1.5 text-[11px] font-bold text-theme-soft transition-colors hover:border-gold/20 hover:text-theme disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isMarkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            تعليم الكل كمقروء
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                            <FilterChip
                                active={categoryFilter === "all"}
                                label="كل التصنيفات"
                                count={items.length}
                                onClick={() => setCategoryFilter("all")}
                            />
                            {ADMIN_NOTIFICATION_CATEGORIES.map((category) => (
                                <FilterChip
                                    key={category}
                                    active={categoryFilter === category}
                                    label={getAdminNotificationCategoryLabel(category)}
                                    count={categoryCounts[category]}
                                    onClick={() => setCategoryFilter(category)}
                                />
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <FilterChip
                                active={severityFilter === "all"}
                                label="كل المستويات"
                                count={items.length}
                                onClick={() => setSeverityFilter("all")}
                            />
                            {ADMIN_NOTIFICATION_SEVERITIES.map((severity) => (
                                <FilterChip
                                    key={severity}
                                    active={severityFilter === severity}
                                    label={getAdminNotificationSeverityLabel(severity)}
                                    count={severityCounts[severity]}
                                    onClick={() => setSeverityFilter(severity)}
                                />
                            ))}
                            <FilterChip
                                active={readFilter === "all"}
                                label="الكل"
                                count={items.length}
                                onClick={() => setReadFilter("all")}
                            />
                            <FilterChip
                                active={readFilter === "unread"}
                                label="غير المقروء"
                                count={unreadCount}
                                onClick={() => setReadFilter("unread")}
                            />
                        </div>
                    </div>
                </div>

                {filteredNotifications.length === 0 ? (
                    <div className="p-16 text-center text-theme-faint">
                        <CheckCircle className="mx-auto mb-3 h-12 w-12 opacity-30" />
                        <p className="text-sm">لا توجد إشعارات تطابق الفلاتر الحالية</p>
                    </div>
                ) : (
                    <div className="styled-scrollbar max-h-[560px] divide-y divide-theme-faint overflow-y-auto">
                        {filteredNotifications.map((notification, index) => {
                            const Icon = getNotificationIcon(notification);
                            const severity = getSeverityClasses(notification.severity);
                            return (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={cn(
                                        "border-r-2 px-5 py-4 transition-colors hover:bg-theme-faint",
                                        severity.accent,
                                        !notification.is_read && "bg-gold/[0.02]"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                                            notification.is_read ? "border-theme-soft bg-theme-subtle text-theme-subtle" : severity.icon
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className={cn(
                                                    "truncate text-sm",
                                                    notification.is_read ? "text-theme-subtle" : "font-medium text-theme-strong"
                                                )}>
                                                    {notification.title || notification.message || "تنبيه"}
                                                </p>
                                                {!notification.is_read && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                                            </div>
                                            {notification.message && (
                                                <p className="mt-1 text-xs leading-6 text-theme-faint">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                                    getCategoryClasses(notification.category)
                                                )}>
                                                    {getAdminNotificationCategoryLabel(notification.category)}
                                                </span>
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                                    severity.badge
                                                )}>
                                                    {getAdminNotificationSeverityLabel(notification.severity)}
                                                </span>
                                                <span className="text-[10px] text-theme-faint">
                                                    {timeAgo(notification.created_at)}
                                                </span>
                                                {notification.link ? (
                                                    <Link
                                                        href={notification.link}
                                                        className="text-[10px] font-semibold text-gold hover:text-gold-light"
                                                    >
                                                        فتح
                                                    </Link>
                                                ) : null}
                                                {!notification.is_read ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkRead(notification.id)}
                                                        disabled={pendingNotificationId === notification.id}
                                                        className="inline-flex items-center gap-1 rounded-full border border-theme-soft bg-theme-subtle px-2 py-0.5 text-[10px] font-medium text-theme-soft transition-colors hover:border-gold/20 hover:text-theme disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {pendingNotificationId === notification.id ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <CheckCircle className="h-3 w-3" />
                                                        )}
                                                        تعليم كمقروء
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
