"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Package, Users, Search, Filter, Clock } from "lucide-react";

const typeIcons: Record<string, any> = {
    order: ShoppingCart,
    product: Package,
    user: Users,
};

const typeLabels: Record<string, string> = {
    order: "طلب",
    product: "منتج",
    user: "مستخدم",
};

const typeColors: Record<string, string> = {
    order: "text-blue-400 bg-blue-400/10",
    product: "text-gold bg-gold/10",
    user: "text-emerald-400 bg-emerald-400/10",
};

interface Activity {
    id: string;
    type: "order" | "product" | "user";
    action: string;
    detail: string;
    timestamp: string;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

export function ActivityLogClient({ activities }: { activities: Activity[] }) {
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    const filtered = useMemo(() => {
        let result = activities;
        if (filterType !== "all") result = result.filter((a) => a.type === filterType);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((a) =>
                a.action.toLowerCase().includes(q) || a.detail.toLowerCase().includes(q)
            );
        }
        return result;
    }, [activities, filterType, search]);

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث في السجل..."
                        className="w-full pr-10 pl-4 py-2 bg-theme-subtle border border-theme-subtle rounded-lg text-sm text-theme placeholder:text-theme-faint focus:outline-none focus:border-gold/30 transition-all" />
                </div>

                <div className="flex items-center gap-1.5">
                    {["all", "order", "product", "user"].map((t) => (
                        <button key={t} onClick={() => setFilterType(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === t
                                ? "bg-gold text-bg" : "bg-theme-subtle text-theme-subtle hover:bg-theme-soft border border-theme-faint"}`}>
                            {t === "all" ? "الكل" : typeLabels[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-16 text-center text-theme-faint">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">لا توجد أنشطة مسجلة</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {filtered.map((activity, index) => {
                            const Icon = typeIcons[activity.type] || Package;
                            const color = typeColors[activity.type] || "text-theme-subtle bg-theme-subtle";

                            return (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-theme-faint transition-colors"
                                >
                                    {/* Icon */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-theme-strong text-sm truncate">{activity.action}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${color} font-medium`}>
                                                {typeLabels[activity.type]}
                                            </span>
                                        </div>
                                        <p className="text-xs text-theme-faint mt-0.5 truncate">{activity.detail}</p>
                                    </div>

                                    {/* Timestamp */}
                                    <span className="text-[11px] text-theme-faint shrink-0 font-medium">
                                        {timeAgo(activity.timestamp)}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
