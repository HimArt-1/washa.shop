"use client";

import React from "react";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Eye,
    Loader2,
    Paintbrush,
    Save,
    Search,
    Settings2,
    UserCircle2,
    X,
    XCircle,
} from "lucide-react";
import { updateDesignPromptTemplate } from "@/app/actions/smart-store";
import type { CustomDesignOrder, CustomDesignOrderStatus } from "@/types/database";

// ─── Constants ───────────────────────────────────────────

const STATUS_MAP: Record<CustomDesignOrderStatus, { label: string; color: string; icon: React.ElementType }> = {
    new: { label: "جديد", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: AlertCircle },
    in_progress: { label: "قيد التنفيذ", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    awaiting_review: { label: "بانتظار المراجعة", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Eye },
    completed: { label: "مكتمل", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: X },
    modification_requested: { label: "طلب تعديل", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertCircle },
};

const FILTER_STATUSES = [
    { value: "all", label: "الكل" },
    { value: "new", label: "جديد" },
    { value: "in_progress", label: "قيد التنفيذ" },
    { value: "awaiting_review", label: "بانتظار المراجعة" },
    { value: "modification_requested", label: "طلب تعديل" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
];

// ─── Types ───────────────────────────────────────────────

type AdminProfile = { id: string; display_name: string; avatar_url: string | null };

interface DesignOrderStats {
    new: number;
    in_progress: number;
    awaiting_review: number;
    modification_requested: number;
    completed: number;
    cancelled: number;
    revenue: number;
}

interface Props {
    orders: CustomDesignOrder[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentStatus: string;
    promptTemplate: string;
    stats: DesignOrderStats;
    adminList: AdminProfile[];
    hideStatsSummary?: boolean;
}

// ─── Main Component ─────────────────────────────────────

export function DesignOrdersClient({
    orders,
    count,
    totalPages,
    currentPage,
    currentStatus,
    promptTemplate,
    stats,
    adminList,
    hideStatsSummary = false,
}: Props) {
    const router = useRouter();
    const [showSettings, setShowSettings] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("all");

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        sp.set("page", params.page || String(currentPage));
        sp.set("status", params.status || currentStatus);
        router.push(`/dashboard/design-orders?${sp.toString()}`);
    };

    // Client-side filtering for search + admin filter
    const filteredOrders = useMemo(() => {
        let result = orders;
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(o =>
                String(o.order_number).includes(q) ||
                o.garment_name.toLowerCase().includes(q) ||
                (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
                (o.customer_email && o.customer_email.toLowerCase().includes(q))
            );
        }
        if (filterAdmin !== "all") {
            result = result.filter(o =>
                filterAdmin === "unassigned" ? !o.assigned_to : o.assigned_to === filterAdmin
            );
        }
        return result;
    }, [orders, searchTerm, filterAdmin]);

    const getAdminName = (id: string | null) => {
        if (!id) return null;
        return adminList.find(a => a.id === id)?.display_name ?? null;
    };

    return (
        <div className="space-y-6">
            {!hideStatsSummary ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={AlertCircle} label="جديد" value={stats.new} color="text-blue-400" bg="bg-blue-400/10" onClick={() => navigate({ status: "new", page: "1" })} active={currentStatus === "new"} />
                    <StatCard icon={Clock} label="قيد التنفيذ" value={stats.in_progress} color="text-amber-400" bg="bg-amber-400/10" onClick={() => navigate({ status: "in_progress", page: "1" })} active={currentStatus === "in_progress"} />
                    <StatCard icon={Eye} label="بانتظار المراجعة" value={stats.awaiting_review} color="text-purple-400" bg="bg-purple-400/10" onClick={() => navigate({ status: "awaiting_review", page: "1" })} active={currentStatus === "awaiting_review"} />
                    <StatCard icon={AlertCircle} label="طلب تعديل" value={stats.modification_requested} color="text-amber-400" bg="bg-amber-500/10" onClick={() => navigate({ status: "modification_requested", page: "1" })} active={currentStatus === "modification_requested"} />
                    <StatCard icon={CheckCircle2} label="مكتمل" value={stats.completed} color="text-emerald-400" bg="bg-emerald-400/10" onClick={() => navigate({ status: "completed", page: "1" })} active={currentStatus === "completed"} />
                    <StatCard icon={XCircle} label="ملغي" value={stats.cancelled} color="text-red-400" bg="bg-red-400/10" onClick={() => navigate({ status: "cancelled", page: "1" })} active={currentStatus === "cancelled"} />
                    <StatCard icon={DollarSign} label="الإيرادات" value={`${stats.revenue.toLocaleString()} ر.س`} color="text-gold" bg="bg-gold/10" />
                </div>
            ) : null}

            {/* ══ Toolbar ══ */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                    {FILTER_STATUSES.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => navigate({ status: s.value, page: "1" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${currentStatus === s.value ? "bg-gold/15 text-gold border-gold/30" : "bg-theme-subtle text-theme-subtle border-theme-subtle hover:bg-white/[0.05]"}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-theme-subtle">{count} طلب</span>
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-subtle border border-theme-soft text-theme-soft text-xs hover:text-theme transition-colors">
                        <Settings2 className="w-3.5 h-3.5" /> إعدادات البرومبت
                    </button>
                </div>
            </div>

            {/* ══ Search & Admin Filter ══ */}
            <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="بحث بالاسم أو رقم الطلب..."
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm placeholder:text-theme-faint focus:outline-none focus:border-gold/30 transition-colors"
                    />
                </div>
                {/* Admin Filter */}
                <select
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value)}
                    className="px-4 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm focus:outline-none focus:border-gold/30 transition-colors min-w-[180px]"
                >
                    <option value="all">كل الأدمن</option>
                    <option value="unassigned">غير معيّن</option>
                    {adminList.map(a => (
                        <option key={a.id} value={a.id}>{a.display_name}</option>
                    ))}
                </select>
            </div>

            {/* ══ Orders Table ══ */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-theme-faint">
                    <Paintbrush className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد طلبات تصميم {searchTerm ? `تطابق "${searchTerm}"` : currentStatus !== "all" && `بحالة "${FILTER_STATUSES.find(s => s.value === currentStatus)?.label}"`}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle">
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">#</th>
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">العميل</th>
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">القطعة</th>
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">الحالة</th>
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">المسؤول</th>
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">النتائج</th>
                                <th className="text-right text-xs text-theme-subtle font-medium px-4 py-3">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order) => {
                                const st = STATUS_MAP[order.status];
                                const StIcon = st.icon;
                                const adminName = getAdminName(order.assigned_to);
                                return (
                                    <tr
                                        key={order.id}
                                        onClick={() => router.push(`/dashboard/design-orders/${order.id}`)}
                                        className={`border-b border-theme-faint hover:bg-theme-subtle transition-colors cursor-pointer group ${order.status === "new" ? "bg-blue-500/5" : ""}`}
                                    >
                                        {/* Order Number */}
                                        <td className="px-4 py-3 relative pl-6">
                                            {order.status === "new" && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" title="طلب جديد" />
                                            )}
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 text-gold text-xs font-bold">
                                                {order.order_number}
                                            </span>
                                        </td>
                                        {/* Customer */}
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-theme text-sm truncate max-w-[140px]">
                                                {order.customer_name || "—"}
                                            </p>
                                            {order.customer_phone && (
                                                <p className="text-[10px] text-theme-faint mt-0.5" dir="ltr">{order.customer_phone}</p>
                                            )}
                                        </td>
                                        {/* Garment */}
                                        <td className="px-4 py-3">
                                            <p className="text-theme-strong text-sm">{order.garment_name}</p>
                                            <p className="text-[10px] text-theme-faint mt-0.5">{order.color_name} · {order.size_name}</p>
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${st.color}`}>
                                                <StIcon className="w-3 h-3" />
                                                {st.label}
                                            </span>
                                        </td>
                                        {/* Assigned Admin */}
                                        <td className="px-4 py-3">
                                            {adminName ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-theme-soft">
                                                    <UserCircle2 className="w-3.5 h-3.5 text-gold/50" />
                                                    {adminName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-theme-faint">غير معيّن</span>
                                            )}
                                        </td>
                                        {/* Results */}
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                {order.result_design_url && <div className="w-2 h-2 rounded-full bg-emerald-400" title="تصميم" />}
                                                {order.result_mockup_url && <div className="w-2 h-2 rounded-full bg-blue-400" title="موكاب" />}
                                                {order.result_pdf_url && <div className="w-2 h-2 rounded-full bg-amber-400" title="PDF" />}
                                                {!order.result_design_url && !order.result_mockup_url && !order.result_pdf_url && (
                                                    <span className="text-[10px] text-theme-faint">—</span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Date */}
                                        <td className="px-4 py-3 text-xs text-theme-faint whitespace-nowrap">
                                            {new Date(order.created_at).toLocaleDateString("ar-SA")}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button disabled={currentPage <= 1} onClick={() => navigate({ page: String(currentPage - 1) })} className="p-2 rounded-lg bg-theme-subtle border border-theme-soft disabled:opacity-30">
                        <ChevronRight className="w-4 h-4 text-theme-soft" />
                    </button>
                    <span className="text-sm text-theme-subtle">{currentPage} / {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => navigate({ page: String(currentPage + 1) })} className="p-2 rounded-lg bg-theme-subtle border border-theme-soft disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4 text-theme-soft" />
                    </button>
                </div>
            )}

            {/* Prompt Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <PromptSettingsModal template={promptTemplate} onClose={() => { setShowSettings(false); router.refresh(); }} />
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Stats Card
// ═══════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, color, bg, onClick, active }: {
    icon: React.ElementType; label: string; value: string | number; color: string; bg: string; onClick?: () => void; active?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl border transition-all text-right ${active ? "border-gold/30 bg-gold/[0.07]" : "border-theme-subtle bg-theme-faint hover:bg-theme-subtle"} ${onClick ? "cursor-pointer" : "cursor-default"}`}
        >
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-lg font-bold text-theme">{value}</p>
            <p className="text-[10px] text-theme-subtle mt-0.5">{label}</p>
        </button>
    );
}

// ═══════════════════════════════════════════════════════════
//  Prompt Settings Modal
// ═══════════════════════════════════════════════════════════

function PromptSettingsModal({ template, onClose }: { template: string; onClose: () => void }) {
    const [value, setValue] = useState(template);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await updateDesignPromptTemplate(value);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-2xl rounded-2xl bg-surface border border-theme-soft p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-theme flex items-center gap-2"><Settings2 className="w-5 h-5 text-gold" /> إعدادات البرومبت الموحد</h3>
                    <button onClick={onClose} className="p-2 hover:bg-theme-subtle rounded-lg"><X className="w-5 h-5 text-theme-subtle" /></button>
                </div>

                <p className="text-xs text-theme-subtle mb-3">
                    استخدم المتغيرات: <code className="text-gold/70">{"{{garment_name}}"}</code> <code className="text-gold/70">{"{{color_name}}"}</code> <code className="text-gold/70">{"{{color_hex}}"}</code> <code className="text-gold/70">{"{{style_name}}"}</code> <code className="text-gold/70">{"{{art_style_name}}"}</code> <code className="text-gold/70">{"{{colors}}"}</code> <code className="text-gold/70">{"{{user_prompt}}"}</code>
                </p>

                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm font-mono placeholder:text-theme-faint focus:outline-none focus:border-gold/40 resize-none"
                    rows={14}
                />

                <div className="flex items-center gap-3 mt-4">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saving ? "جاري الحفظ..." : saved ? "تم الحفظ!" : "حفظ القالب"}
                    </button>
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-theme-soft text-theme-soft text-sm hover:bg-theme-subtle">إلغاء</button>
                </div>
            </motion.div>
        </div>
    );
}
