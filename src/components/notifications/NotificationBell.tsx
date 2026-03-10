"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, ExternalLink, User } from "lucide-react";
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

export function NotificationBell() {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    useEffect(() => {
        fetchNotifications();

        // Simple polling every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

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

    const fetchNotifications = async () => {
        const data = await getUserNotifications(15);
        setNotifications(data);
        setIsLoading(false);
    };

    const handleNotificationClick = async (n: UserNotification) => {
        if (!n.is_read) {
            // Optimistic update
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
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-500 rounded-full border border-[#080808]"
                    >
                        <span className="text-[9px] font-bold text-theme leading-none">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    </motion.div>
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 sm:-right-4 mt-2 w-80 sm:w-96 bg-[#0c0c0c] border border-theme-soft rounded-2xl shadow-2xl z-[120] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-theme-subtle bg-theme-faint">
                            <h3 className="font-bold text-theme">الإشعارات</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-gold hover:text-gold/80 flex items-center gap-1 transition-colors"
                                >
                                    <Check className="w-3 h-3" />
                                    تحديد الكل كمقروء
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                            {isLoading ? (
                                <div className="p-8 text-center text-theme-subtle text-sm">
                                    جاري التحميل...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-theme-subtle flex items-center justify-center mb-4 border border-theme-subtle">
                                        <Bell className="w-6 h-6 text-theme-faint" />
                                    </div>
                                    <p className="text-theme-soft font-medium text-sm">لا توجد إشعارات حالياً</p>
                                    <p className="text-theme-faint text-xs mt-1">سنخبرك بكل جديد هنا</p>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={`
                                                relative p-4 flex gap-4 cursor-pointer transition-colors border-b border-white/[0.02] last:border-0
                                                ${!n.is_read ? "bg-gold/[0.04] hover:bg-gold/[0.08]" : "hover:bg-theme-faint"}
                                            `}
                                        >
                                            {!n.is_read && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gold" />
                                            )}

                                            <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-theme-soft flex items-center justify-center shrink-0">
                                                {n.type === "order_update" ? (
                                                    <Check className={`w-4 h-4 ${!n.is_read ? "text-gold" : "text-theme-subtle"}`} />
                                                ) : n.type === "support_reply" ? (
                                                    <User className={`w-4 h-4 ${!n.is_read ? "text-blue-400" : "text-theme-subtle"}`} />
                                                ) : (
                                                    <Bell className={`w-4 h-4 ${!n.is_read ? "text-theme-strong" : "text-theme-subtle"}`} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className={`text-sm font-bold truncate ${!n.is_read ? "text-theme" : "text-theme-soft"}`}>
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
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Link */}
                        <div className="p-3 border-t border-theme-subtle bg-theme-faint">
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
