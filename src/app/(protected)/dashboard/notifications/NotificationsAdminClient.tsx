"use client";

import { motion } from "framer-motion";
import {
    Bell, AlertTriangle, ShoppingCart, UserPlus, Package, Clock, CheckCircle,
} from "lucide-react";

interface NotificationsAdminClientProps {
    notifications: any[];
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

export function NotificationsAdminClient({ notifications, alerts }: NotificationsAdminClientProps) {
    return (
        <div className="space-y-6">
            {/* ─── Smart Alert Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Low Stock */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                    className={`p-5 rounded-2xl border backdrop-blur-sm ${alerts.lowStock > 0
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-theme-faint border-theme-subtle"}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alerts.lowStock > 0 ? "bg-amber-500/10" : "bg-theme-subtle"}`}>
                            <AlertTriangle className={`w-5 h-5 ${alerts.lowStock > 0 ? "text-amber-400" : "text-theme-faint"}`} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-theme-strong">مخزون منخفض</p>
                            <p className="text-[10px] text-theme-faint">منتجات بكمية ≤ 5</p>
                        </div>
                    </div>
                    <p className={`text-3xl font-black ${alerts.lowStock > 0 ? "text-amber-400" : "text-theme-faint"}`}>
                        {alerts.lowStock}
                    </p>
                </motion.div>

                {/* Pending Orders */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className={`p-5 rounded-2xl border backdrop-blur-sm ${alerts.pendingOrders > 0
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-theme-faint border-theme-subtle"}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alerts.pendingOrders > 0 ? "bg-blue-500/10" : "bg-theme-subtle"}`}>
                            <ShoppingCart className={`w-5 h-5 ${alerts.pendingOrders > 0 ? "text-blue-400" : "text-theme-faint"}`} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-theme-strong">طلبات معلقة</p>
                            <p className="text-[10px] text-theme-faint">بانتظار المعالجة</p>
                        </div>
                    </div>
                    <p className={`text-3xl font-black ${alerts.pendingOrders > 0 ? "text-blue-400" : "text-theme-faint"}`}>
                        {alerts.pendingOrders}
                    </p>
                </motion.div>

                {/* New Users */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className={`p-5 rounded-2xl border backdrop-blur-sm ${alerts.newUsersToday > 0
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-theme-faint border-theme-subtle"}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alerts.newUsersToday > 0 ? "bg-emerald-500/10" : "bg-theme-subtle"}`}>
                            <UserPlus className={`w-5 h-5 ${alerts.newUsersToday > 0 ? "text-emerald-400" : "text-theme-faint"}`} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-theme-strong">مستخدمون جدد</p>
                            <p className="text-[10px] text-theme-faint">انضموا اليوم</p>
                        </div>
                    </div>
                    <p className={`text-3xl font-black ${alerts.newUsersToday > 0 ? "text-emerald-400" : "text-theme-faint"}`}>
                        {alerts.newUsersToday}
                    </p>
                </motion.div>
            </div>

            {/* ─── Notifications List ─── */}
            <div className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-theme-subtle flex items-center gap-2">
                    <Bell className="w-4 h-4 text-gold" />
                    <h3 className="text-sm font-bold text-theme-strong">سجل الإشعارات</h3>
                    <span className="text-xs text-theme-faint mr-auto">{notifications.length} إشعار</span>
                </div>
                {notifications.length === 0 ? (
                    <div className="p-16 text-center text-theme-faint">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">لا توجد إشعارات</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04] max-h-[500px] overflow-y-auto styled-scrollbar">
                        {notifications.map((n: any, i: number) => (
                            <motion.div
                                key={n.id}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-theme-faint transition-colors ${!n.read ? "bg-gold/[0.02]" : ""}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? "bg-gold/10" : "bg-theme-subtle"}`}>
                                    <Bell className={`w-3.5 h-3.5 ${!n.read ? "text-gold" : "text-theme-faint"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${!n.read ? "text-theme-strong font-medium" : "text-theme-subtle"}`}>
                                        {n.title || n.message || "إشعار"}
                                    </p>
                                    {n.body && <p className="text-xs text-theme-faint truncate mt-0.5">{n.body}</p>}
                                </div>
                                <span className="text-[10px] text-theme-faint shrink-0">{timeAgo(n.created_at)}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
