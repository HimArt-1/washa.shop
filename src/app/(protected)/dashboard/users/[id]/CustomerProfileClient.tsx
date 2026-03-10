"use client";

import { motion } from "framer-motion";
import {
    ShoppingCart, DollarSign, Ticket, User, Mail, Calendar, Globe,
    Shield, Star, Package, Clock, CheckCircle2, AlertTriangle, X,
    MessageSquare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";

// ─── Helpers ────────────────────────────────────────────

function getRoleBadge(role: string) {
    switch (role) {
        case "admin": return { label: "مدير النظام", color: "text-red-400 bg-red-500/10 border-red-500/20" };
        case "wushsha": return { label: "وشّاي", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
        case "subscriber": return { label: "مشترك", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
        default: return { label: role, color: "text-theme-subtle bg-theme-subtle border-theme-soft" };
    }
}

function getTicketStatusInfo(status: string) {
    switch (status) {
        case "open": return { label: "مفتوحة", color: "text-blue-400" };
        case "in_progress": return { label: "قيد المعالجة", color: "text-amber-400" };
        case "resolved": return { label: "تم الحل", color: "text-emerald-400" };
        case "closed": return { label: "مغلقة", color: "text-theme-faint" };
        default: return { label: status, color: "text-theme-subtle" };
    }
}

// ─── Props ──────────────────────────────────────────────

interface Props {
    profile: Record<string, unknown>;
    orders: any[];
    tickets: any[];
    stats: {
        totalOrders: number;
        totalSpent: number;
        paidOrders: number;
        openTickets: number;
    };
}

// ─── Main Component ─────────────────────────────────────

export function CustomerProfileClient({ profile, orders, tickets, stats }: Props) {
    const role = getRoleBadge(String(profile.role || "subscriber"));
    const avatarUrl = profile.avatar_url ? String(profile.avatar_url) : null;
    const joinDate = profile.created_at
        ? new Date(String(profile.created_at)).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
        : "—";

    return (
        <div className="space-y-6">
            {/* ─── Profile Card ─── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm p-6">
                <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl border-2 border-gold/20 bg-theme-subtle overflow-hidden shrink-0 flex items-center justify-center">
                        {avatarUrl ? (
                            <Image src={avatarUrl} alt="" width={80} height={80} className="object-cover w-full h-full" />
                        ) : (
                            <User className="w-8 h-8 text-theme-faint" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-black text-theme">{String(profile.display_name || "مستخدم")}</h2>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${role.color}`}>
                                {role.label}
                            </span>
                            {Boolean(profile.is_verified) && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    ✓ موثّق
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-theme-subtle">@{String(profile.username || "—")}</p>
                        {profile.bio ? <p className="text-xs text-theme-faint mt-2 line-clamp-2">{String(profile.bio)}</p> : null}

                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                            <span className="text-[11px] text-theme-faint flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> انضم {joinDate}
                            </span>
                            {profile.website ? (
                                <a href={String(profile.website)} target="_blank" rel="noopener"
                                    className="text-[11px] text-gold hover:text-gold-light flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> {String(profile.website).replace(/https?:\/\//, "")}
                                </a>
                            ) : null}
                            {profile.wushsha_level ? (
                                <span className="text-[11px] text-purple-400 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> مستوى {String(profile.wushsha_level)}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ─── Stats Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "إجمالي الطلبات", value: stats.totalOrders, icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/20" },
                    { label: "المدفوعة", value: stats.paidOrders, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
                    { label: "إجمالي الإنفاق", value: `${stats.totalSpent.toLocaleString()} ر.س`, icon: DollarSign, color: "text-gold", bg: "bg-gold/5 border-gold/20" },
                    { label: "تذاكر مفتوحة", value: stats.openTickets, icon: Ticket, color: stats.openTickets > 0 ? "text-amber-400" : "text-theme-faint", bg: stats.openTickets > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-theme-faint border-theme-subtle" },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                        className={`p-4 rounded-2xl border backdrop-blur-sm ${s.bg}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                            <span className="text-[11px] text-theme-subtle font-medium">{s.label}</span>
                        </div>
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* ─── Two-Column Layout ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Order History */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="lg:col-span-2 rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-theme-faint flex items-center justify-between">
                        <h3 className="text-sm font-bold text-theme-strong flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-gold" /> سجل الطلبات
                        </h3>
                        <span className="text-[10px] text-theme-faint">{orders.length} طلب</span>
                    </div>
                    {orders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-theme-faint">
                                        <th className="text-right px-5 py-2.5 text-theme-faint font-medium text-[11px]">رقم الطلب</th>
                                        <th className="text-right px-4 py-2.5 text-theme-faint font-medium text-[11px]">المبلغ</th>
                                        <th className="text-right px-4 py-2.5 text-theme-faint font-medium text-[11px]">الحالة</th>
                                        <th className="text-right px-4 py-2.5 text-theme-faint font-medium text-[11px]">الدفع</th>
                                        <th className="text-right px-4 py-2.5 text-theme-faint font-medium text-[11px]">العناصر</th>
                                        <th className="text-right px-5 py-2.5 text-theme-faint font-medium text-[11px]">التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order: any) => (
                                        <tr key={order.id} className="border-b border-theme-faint hover:bg-theme-faint transition-colors">
                                            <td className="px-5 py-3 font-mono text-xs text-gold">{order.order_number}</td>
                                            <td className="px-4 py-3 font-bold text-theme text-xs">{Number(order.total).toLocaleString()} ر.س</td>
                                            <td className="px-4 py-3"><StatusBadge status={order.status} type="order" /></td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold ${order.payment_status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                                                    {order.payment_status === "paid" ? "مدفوع" : order.payment_status === "failed" ? "فشل" : "معلق"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-theme-subtle text-xs">{order.order_items?.length || 0} عنصر</td>
                                            <td className="px-5 py-3 text-theme-faint text-[11px]" dir="ltr">
                                                {new Date(order.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric", year: "numeric" })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-theme-faint">
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">لا توجد طلبات</p>
                        </div>
                    )}
                </motion.div>

                {/* Support Tickets */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-theme-faint flex items-center justify-between">
                        <h3 className="text-sm font-bold text-theme-strong flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gold" /> تذاكر الدعم
                        </h3>
                        <span className="text-[10px] text-theme-faint">{tickets.length} تذكرة</span>
                    </div>
                    {tickets.length > 0 ? (
                        <div className="divide-y divide-white/[0.03]">
                            {tickets.map((t: any) => {
                                const statusInfo = getTicketStatusInfo(t.status);
                                return (
                                    <Link key={t.id} href={`/dashboard/support/${t.id}`}>
                                        <div className="px-5 py-3 hover:bg-theme-faint transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-bold text-theme-soft truncate flex-1">{t.subject}</p>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-theme-faint">
                                                {new Date(t.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-10 text-center text-theme-faint">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">لا توجد تذاكر</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
