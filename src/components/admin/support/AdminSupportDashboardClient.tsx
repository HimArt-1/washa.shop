"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Clock, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import Image from "next/image";

export function AdminSupportDashboardClient({ initialTickets }: { initialTickets: any[] }) {
    const [tickets] = useState(initialTickets);
    const [filter, setFilter] = useState("all");

    const filteredTickets = tickets.filter(t => filter === "all" || t.status === filter);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case "open": return { label: "جديدة", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" };
            case "in_progress": return { label: "قيد المعالجة", icon: Clock, color: "text-gold", bg: "bg-gold/10 border-gold/20" };
            case "resolved": return { label: "تم الحل", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" };
            case "closed": return { label: "مغلقة", icon: X, color: "text-theme-subtle", bg: "bg-theme-subtle border-theme-soft" };
            default: return { label: status, icon: MessageSquare, color: "text-theme-soft", bg: "bg-theme-subtle border-theme-soft" };
        }
    };

    const getPriorityInfo = (prio: string) => {
        switch (prio) {
            case "high": return { label: "عالية", color: "text-red-400" };
            case "normal": return { label: "عادية", color: "text-theme-soft" };
            case "low": return { label: "منخفضة", color: "text-theme-subtle" };
            default: return { label: prio, color: "text-theme-soft" };
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-2 bg-theme-faint border border-theme-subtle p-2 rounded-2xl overflow-x-auto scrollbar-hide">
                {[
                    { id: "all", label: "الكل" },
                    { id: "open", label: "الجديدة" },
                    { id: "in_progress", label: "قيد المعالجة" },
                    { id: "resolved", label: "المحلولة" },
                    { id: "closed", label: "المغلقة" }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${filter === f.id
                                ? "bg-white/10 text-theme"
                                : "text-theme-subtle hover:text-theme hover:bg-theme-subtle"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-theme-faint border border-theme-subtle rounded-3xl text-center">
                    <MessageSquare className="w-12 h-12 text-theme-faint mb-4" />
                    <h3 className="text-xl font-bold text-theme mb-2">لا يوجد تذاكر!</h3>
                    <p className="text-theme-subtle">لا توجد تذاكر تطابق الفلتر الحالي.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTickets.map((ticket, i) => {
                        const status = getStatusInfo(ticket.status);
                        const prio = getPriorityInfo(ticket.priority);
                        const userAvatar = ticket.profile?.avatar_url || "/images/default-avatar.png";
                        const userName = ticket.profile?.display_name || "مستخدم مجهول";

                        return (
                            <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="bg-theme-faint hover:bg-theme-subtle border border-theme-subtle hover:border-gold/30 rounded-2xl p-5 sm:p-6 transition-all duration-300 group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <Image
                                            src={userAvatar}
                                            alt={userName}
                                            width={44}
                                            height={44}
                                            className="rounded-full object-cover shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${status.bg} ${status.color}`}>
                                                    <status.icon className="w-2.5 h-2.5" />
                                                    <span>{status.label}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold ${prio.color}`}>{prio.label}</span>
                                            </div>
                                            <h4 className="text-base sm:text-lg font-bold text-theme group-hover:text-gold transition-colors truncate">
                                                {ticket.subject}
                                            </h4>
                                            <p className="text-sm text-theme-subtle truncate flex items-center gap-2 mt-0.5">
                                                <span>{userName}</span>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center text-theme-subtle group-hover:text-theme-strong transition-colors">
                                        <span className="text-sm">عرض التذكرة</span>
                                    </div>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
