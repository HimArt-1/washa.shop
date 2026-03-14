"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, ExternalLink, Package, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
    getUserNotifications,
    markUserNotificationRead,
    markAllUserNotificationsRead,
} from "@/app/actions/user-notifications";
import type { UserNotification } from "@/types/database";

const POLL_INTERVAL_MS = 12_000; // تحديث كل 12 ثانية لمزامنة أسرع

function getNotificationIcon(n: UserNotification) {
    if (n.type === "order_update") return Package;
    if (n.type === "support_reply") return MessageCircle;
    return Bell;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = useCallback(async () => {
        const data = await getUserNotifications(20);
        setNotifications(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleNotificationClick = async (n: UserNotification) => {
        if (!n.is_read) {
            setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
            await markUserNotificationRead(n.id);
        }
        setIsOpen(false);
        if (n.link) {
            router.push(n.link);
        }
    };

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
        await markAllUserNotificationsRead();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl text-theme-soft hover:text-gold hover:bg-theme-subtle transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="الإشعارات"
                aria-expanded={isOpen}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-[var(--wusha-surface)]"
                    >
                        <span className="text-[10px] font-bold text-white leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    </motion.div>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-[var(--wusha-surface)] border border-[var(--wusha-border)] rounded-2xl shadow-2xl z-[120] overflow-hidden"
                        style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px color-mix(in srgb, var(--wusha-text) 6%, transparent)" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[var(--wusha-border)] bg-[color-mix(in_srgb,var(--wusha-text)_4%,transparent)]">
                            <h3 className="font-bold text-[var(--wusha-text)]">الإشعارات</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-[var(--wusha-gold)] hover:opacity-80 flex items-center gap-1.5 transition-opacity"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    تحديد الكل كمقروء
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[380px] overflow-y-auto no-scrollbar">
                            {isLoading ? (
                                <div className="p-8 text-center text-theme-subtle text-sm">
                                    جاري التحميل...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-theme-subtle flex items-center justify-center mb-4 border border-theme-soft">
                                        <Bell className="w-6 h-6 text-theme-faint" />
                                    </div>
                                    <p className="text-theme-soft font-medium text-sm">لا توجد إشعارات حالياً</p>
                                    <p className="text-theme-faint text-xs mt-1">سنخبرك بكل جديد هنا</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {notifications.map((n) => {
                                        const Icon = getNotificationIcon(n);
                                        return (
                                            <div
                                                key={n.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleNotificationClick(n)}
                                                onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(n)}
                                                className={`
                                                    relative p-4 flex gap-4 cursor-pointer transition-colors border-b border-[color-mix(in_srgb,var(--wusha-text)_8%,transparent)] last:border-0
                                                    ${!n.is_read ? "bg-[color-mix(in_srgb,var(--wusha-gold)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--wusha-gold)_10%,transparent)]" : "hover:bg-theme-faint"}
                                                `}
                                            >
                                                {!n.is_read && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--wusha-gold)]" />
                                                )}

                                                <div className="w-10 h-10 rounded-full bg-theme-subtle border border-theme-soft flex items-center justify-center shrink-0">
                                                    <Icon className={`w-4 h-4 ${!n.is_read ? "text-[var(--wusha-gold)]" : "text-theme-subtle"}`} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className={`text-sm font-bold truncate ${!n.is_read ? "text-[var(--wusha-text)]" : "text-theme-soft"}`}>
                                                            {n.title}
                                                        </h4>
                                                        <span className="text-[10px] text-theme-subtle shrink-0 mt-0.5">
                                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ar })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-theme-subtle leading-relaxed line-clamp-2">
                                                        {n.message}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer Link */}
                        <div className="p-3 border-t border-[var(--wusha-border)] bg-[color-mix(in_srgb,var(--wusha-text)_3%,transparent)]">
                            <Link href="/account/settings" onClick={() => setIsOpen(false)} className="text-xs text-theme-subtle hover:text-theme flex items-center justify-center gap-1.5 transition-colors py-1">
                                <span>إعدادات الإشعارات</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
