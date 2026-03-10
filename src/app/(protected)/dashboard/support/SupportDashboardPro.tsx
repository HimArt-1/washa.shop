"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, Clock, CheckCircle2, X, Search, AlertTriangle,
    ArrowUpDown, User, Calendar, Filter, BarChart3, Headphones,
    ShieldCheck, Zap, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import Image from "next/image";

// ─── Status / Priority Helpers ─────────────────────────

function getStatusInfo(status: string) {
    switch (status) {
        case "open": return { label: "جديدة", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", dot: "bg-blue-400" };
        case "in_progress": return { label: "قيد المعالجة", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" };
        case "resolved": return { label: "تم الحل", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" };
        case "closed": return { label: "مغلقة", icon: X, color: "text-theme-subtle", bg: "bg-theme-subtle border-theme-subtle", dot: "bg-fg/30" };
        default: return { label: status, icon: MessageSquare, color: "text-theme-soft", bg: "bg-theme-subtle border-theme-soft", dot: "bg-fg/30" };
    }
}

function getPriorityInfo(prio: string) {
    switch (prio) {
        case "high": return { label: "عاجلة", color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle };
        case "normal": return { label: "عادية", color: "text-theme-subtle", bg: "bg-theme-subtle", icon: Zap };
        case "low": return { label: "منخفضة", color: "text-theme-faint", bg: "bg-theme-faint", icon: Clock };
        default: return { label: prio, color: "text-theme-subtle", bg: "bg-theme-subtle", icon: Zap };
    }
}

// ─── Main Component ────────────────────────────────────

export function SupportDashboardPro({ initialTickets }: { initialTickets: any[] }) {
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"date" | "priority">("date");

    // ─── Stats
    const stats = useMemo(() => {
        const open = initialTickets.filter((t) => t.status === "open").length;
        const inProgress = initialTickets.filter((t) => t.status === "in_progress").length;
        const resolved = initialTickets.filter((t) => t.status === "resolved").length;
        const highPriority = initialTickets.filter((t) => t.priority === "high" && t.status !== "closed" && t.status !== "resolved").length;
        const avgResTime = (() => {
            const resolvedTickets = initialTickets.filter((t) => t.status === "resolved" || t.status === "closed");
            if (resolvedTickets.length === 0) return 0;
            const total = resolvedTickets.reduce((sum, t) => {
                return sum + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
            }, 0);
            return Math.round(total / resolvedTickets.length / (1000 * 60 * 60)); // hours
        })();
        return { total: initialTickets.length, open, inProgress, resolved, highPriority, avgResTime };
    }, [initialTickets]);

    // ─── Filtered + Sorted
    const filteredTickets = useMemo(() => {
        let result = [...initialTickets];

        // Status filter
        if (filter !== "all") result = result.filter((t) => t.status === filter);

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((t) =>
                t.subject?.toLowerCase().includes(q) ||
                t.profile?.display_name?.toLowerCase().includes(q) ||
                t.id?.toLowerCase().includes(q)
            );
        }

        // Sort
        if (sortBy === "priority") {
            const pOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };
            result.sort((a, b) => (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1));
        } else {
            result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        }

        return result;
    }, [initialTickets, filter, search, sortBy]);

    return (
        <div className="space-y-6">
            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                    { label: "إجمالي التذاكر", value: stats.total, icon: Headphones, color: "text-theme-soft", accent: "bg-theme-subtle border-theme-subtle" },
                    { label: "جديدة", value: stats.open, icon: MessageSquare, color: "text-blue-400", accent: stats.open > 0 ? "bg-blue-500/5 border-blue-500/20" : "bg-theme-subtle border-theme-subtle" },
                    { label: "قيد المعالجة", value: stats.inProgress, icon: Clock, color: "text-amber-400", accent: stats.inProgress > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-theme-subtle border-theme-subtle" },
                    { label: "عاجلة مفتوحة", value: stats.highPriority, icon: AlertTriangle, color: "text-red-400", accent: stats.highPriority > 0 ? "bg-red-500/5 border-red-500/20" : "bg-theme-subtle border-theme-subtle" },
                    { label: "معدل الحل", value: stats.avgResTime > 0 ? `${stats.avgResTime}س` : "—", icon: TrendingUp, color: "text-emerald-400", accent: "bg-emerald-500/5 border-emerald-500/20" },
                ].map((s, i) => (
                    <motion.div key={i}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-2xl border backdrop-blur-sm ${s.accent}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                            <span className="text-[11px] text-theme-subtle font-medium">{s.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* ─── Toolbar ─── */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالعنوان أو اسم العميل..."
                        className="w-full pr-10 pl-4 py-2 bg-theme-subtle border border-theme-subtle rounded-lg text-sm text-theme placeholder:text-theme-faint focus:outline-none focus:border-gold/30 transition-all" />
                </div>

                {/* Status Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                        { id: "all", label: "الكل" },
                        { id: "open", label: "الجديدة" },
                        { id: "in_progress", label: "قيد المعالجة" },
                        { id: "resolved", label: "المحلولة" },
                        { id: "closed", label: "المغلقة" },
                    ].map((f) => (
                        <button key={f.id} onClick={() => setFilter(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.id
                                ? "bg-gold text-bg shadow-[0_2px_10px_rgba(206,174,127,0.3)]"
                                : "bg-theme-subtle text-theme-subtle hover:text-theme-soft hover:bg-theme-soft border border-theme-faint"}`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Sort Toggle */}
                <button onClick={() => setSortBy(sortBy === "date" ? "priority" : "date")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-subtle border border-theme-subtle rounded-lg text-xs text-theme-subtle hover:text-theme-strong hover:bg-theme-soft transition-all">
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    {sortBy === "date" ? "بالتاريخ" : "بالأولوية"}
                </button>
            </div>

            {/* ─── Tickets List ─── */}
            <div className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm overflow-hidden">
                {filteredTickets.length === 0 ? (
                    <div className="p-16 text-center text-theme-faint">
                        <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">{search ? "لا توجد نتائج" : "لا توجد تذاكر"}</p>
                        <p className="text-xs text-theme-faint mt-1">جميع الأمور تسير على ما يرام!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {filteredTickets.map((ticket, i) => {
                            const status = getStatusInfo(ticket.status);
                            const priority = getPriorityInfo(ticket.priority);
                            const userAvatar = ticket.profile?.avatar_url;
                            const userName = ticket.profile?.display_name || "مستخدم";

                            return (
                                <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="flex items-center gap-4 px-5 py-4 hover:bg-theme-faint transition-all group cursor-pointer"
                                    >
                                        {/* Priority Dot */}
                                        <div className="relative shrink-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${status.bg} border`}>
                                                {userAvatar ? (
                                                    <Image src={userAvatar} alt={userName} width={40} height={40} className="object-cover" />
                                                ) : (
                                                    <User className={`w-5 h-5 ${status.color}`} />
                                                )}
                                            </div>
                                            {/* Priority indicator */}
                                            {ticket.priority === "high" && (
                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-bg flex items-center justify-center">
                                                    <span className="text-[8px] text-theme font-black">!</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="text-sm font-bold text-theme-strong group-hover:text-gold transition-colors truncate">
                                                    {ticket.subject}
                                                </h4>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <span className="text-theme-subtle">{userName}</span>
                                                <span className="text-theme-faint">•</span>
                                                <span className="text-theme-faint">{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}</span>
                                            </div>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${priority.bg} ${priority.color}`}>
                                                {priority.label}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${status.bg} ${status.color}`}>
                                                <status.icon className="w-2.5 h-2.5" />
                                                {status.label}
                                            </span>
                                        </div>
                                    </motion.div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Footer Stats ─── */}
            <div className="flex items-center justify-between text-[11px] text-theme-faint px-1">
                <span>عرض {filteredTickets.length} من {initialTickets.length} تذكرة</span>
                <span>تم الحل: {stats.resolved} تذكرة</span>
            </div>
        </div>
    );
}
