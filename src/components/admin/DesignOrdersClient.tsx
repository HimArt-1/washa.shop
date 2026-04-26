"use client";

import React from "react";

import { useMemo, useState, useEffect } from "react";
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
    Sparkles,
    UserCircle2,
    X,
    XCircle,
    LayoutGrid,
    List,
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
    currentMethod: "studio" | "from_text" | "from_image" | "all";
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
    currentMethod,
    promptTemplate,
    stats,
    adminList,
    hideStatsSummary = false,
}: Props) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("all");
    const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");

    useEffect(() => { setMounted(true); }, []);

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        sp.set("page", params.page || String(currentPage));
        sp.set("status", params.status || currentStatus);
        sp.set("method", params.method ?? currentMethod);
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
                {/* Method Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate({ method: "all", page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${currentMethod === "all" ? "bg-theme-subtle text-theme border-theme-subtle" : "bg-theme-faint text-theme-faint border-theme-subtle hover:text-theme-subtle"}`}
                    >
                        الكل
                    </button>
                    <button
                        onClick={() => navigate({ method: "studio", page: "1" })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${currentMethod === "studio" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-theme-faint text-theme-faint border-theme-subtle hover:text-theme-subtle"}`}
                    >
                        <Sparkles className="w-3 h-3" />
                        WASHA AI
                    </button>
                </div>
                {/* Status Filter */}
                <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                    {FILTER_STATUSES.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => navigate({ status: s.value, page: "1" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${currentStatus === s.value ? "bg-gold/15 text-gold border-gold/30" : "bg-theme-faint text-theme-subtle border-theme-subtle hover:bg-[color:var(--surface-elevated)]"}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-theme-subtle">{count} طلب</span>
                    
                    <div className="flex items-center rounded-lg border border-theme-subtle bg-theme-faint overflow-hidden">
                        <button onClick={() => setViewMode("kanban")} className={`p-1.5 transition-colors ${viewMode === "kanban" ? "bg-theme-subtle text-theme" : "text-theme-soft hover:text-theme"}`} title="Kanban View">
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode("table")} className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-theme-subtle text-theme" : "text-theme-soft hover:text-theme"}`} title="Table View">
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 rounded-lg border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs text-theme-soft transition-colors hover:text-theme">
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
                        className="input-dark w-full rounded-xl py-2.5 pr-10 pl-4 text-sm transition-colors"
                    />
                </div>
                {/* Admin Filter */}
                <select
                    value={filterAdmin}
                    onChange={(e) => setFilterAdmin(e.target.value)}
                    className="input-dark min-w-[180px] rounded-xl px-4 py-2.5 text-sm transition-colors"
                >
                    <option value="all">كل الأدمن</option>
                    <option value="unassigned">غير معيّن</option>
                    {adminList.map(a => (
                        <option key={a.id} value={a.id}>{a.display_name}</option>
                    ))}
                </select>
            </div>

            {/* ══ Orders Content ══ */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-theme-faint">
                    <Paintbrush className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد طلبات تصميم {searchTerm ? `تطابق "${searchTerm}"` : currentStatus !== "all" && `بحالة "${FILTER_STATUSES.find(s => s.value === currentStatus)?.label}"`}</p>
                </div>
            ) : viewMode === "kanban" ? (
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
                    {FILTER_STATUSES.filter(s => s.value !== "all").map(status => {
                        const statusOrders = filteredOrders.filter(o => o.status === status.value);
                        if (currentStatus !== "all" && currentStatus !== status.value) return null;
                        
                        return (
                            <div key={status.value} className="flex-shrink-0 w-[320px] snap-center">
                                <div className="flex items-center justify-between mb-3 px-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_MAP[status.value as CustomDesignOrderStatus]?.color.split(' ')[1]}`} />
                                        <h3 className="font-bold text-sm text-theme">{status.label}</h3>
                                    </div>
                                    <span className="text-xs bg-theme-faint text-theme-subtle px-2 py-0.5 rounded-full font-mono">{statusOrders.length}</span>
                                </div>
                                
                                <div className="space-y-3 min-h-[150px] p-2 rounded-xl bg-theme-faint/30 border border-theme-faint">
                                    {statusOrders.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-theme-faint py-8 border-2 border-dashed border-theme-faint rounded-lg">لا يوجد طلبات</div>
                                    ) : (
                                        statusOrders.map(order => (
                                            <div 
                                                key={order.id} 
                                                onClick={() => router.push(`/dashboard/design-orders/${order.id}`)}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg ${order.status === "new" ? "bg-surface border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]" : "bg-surface border-theme-faint hover:border-theme-subtle"}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-gold/10 text-gold text-[10px] font-bold font-mono">
                                                        #{order.order_number}
                                                    </span>
                                                    <span className="text-[10px] text-theme-faint">{mounted ? new Date(order.created_at).toLocaleDateString("ar-SA") : order.created_at?.split("T")[0]}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 mb-3">
                                                    {order.design_method === "studio" && order.dtf_mockup_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={order.dtf_mockup_url} alt="mockup" className="w-12 h-12 rounded-lg object-cover border border-emerald-500/20" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-theme-faint flex items-center justify-center">
                                                            <Paintbrush className="w-5 h-5 text-theme-subtle" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-bold text-sm text-theme truncate">{order.garment_name}</h4>
                                                        <p className="text-[11px] text-theme-soft truncate mt-0.5">{order.customer_name || "عميل غير معروف"}</p>
                                                        {order.design_method === "studio" && (
                                                            <span className="inline-flex mt-1 items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                                                                <Sparkles className="w-2.5 h-2.5" />
                                                                WASHA AI
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between pt-3 border-t border-theme-faint mt-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {getAdminName(order.assigned_to) ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-theme-soft">
                                                                <UserCircle2 className="w-3 h-3 text-gold/50" />
                                                                {getAdminName(order.assigned_to)?.split(' ')[0]}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-theme-faint">غير معيّن</span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Results Indicators */}
                                                    <div className="flex gap-1">
                                                        {order.design_method === "studio" ? (
                                                            <>
                                                                <div className={`w-2 h-2 rounded-full ${order.dtf_mockup_url ? "bg-emerald-400" : "bg-theme-faint"}`} title="موكب AI" />
                                                                <div className={`w-2 h-2 rounded-full ${order.dtf_extracted_url ? "bg-sky-400" : "bg-theme-faint"}`} title="ملف DTF" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                {order.result_design_url && <div className="w-2 h-2 rounded-full bg-emerald-400" title="تصميم" />}
                                                                {order.result_mockup_url && <div className="w-2 h-2 rounded-full bg-blue-400" title="موكاب" />}
                                                                {order.result_pdf_url && <div className="w-2 h-2 rounded-full bg-amber-400" title="PDF" />}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="theme-surface-panel overflow-x-auto rounded-2xl">
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
                                        className={`border-b border-theme-faint transition-colors cursor-pointer group hover:bg-theme-faint ${order.status === "new" ? "bg-blue-500/5" : ""}`}
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
                                            <div className="flex items-start gap-2">
                                                {order.design_method === "studio" && order.dtf_mockup_url && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={order.dtf_mockup_url}
                                                        alt="mockup"
                                                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-emerald-500/20"
                                                    />
                                                )}
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-theme-strong text-sm">{order.garment_name}</p>
                                                        {order.design_method === "studio" && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                                                                <Sparkles className="w-2.5 h-2.5" />
                                                                WASHA AI
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-theme-faint mt-0.5">{order.color_name} · {order.size_name}</p>
                                                    {order.preset_name ? (
                                                        <p className={`mt-1 inline-flex rounded-full px-2 py-1 text-[9px] font-bold ${
                                                            order.preset_fully_aligned
                                                                ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                                                : "border border-gold/20 bg-gold/10 text-gold"
                                                        }`}>
                                                            {order.preset_fully_aligned ? `Preset: ${order.preset_name}` : `Preset start: ${order.preset_name}`}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
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
                                            <div className="flex flex-col gap-1">
                                                {order.design_method === "studio" ? (
                                                    <div className="flex gap-1">
                                                        <div className={`w-2 h-2 rounded-full ${order.dtf_mockup_url ? "bg-emerald-400" : "bg-theme-faint"}`} title="موكب AI" />
                                                        <div className={`w-2 h-2 rounded-full ${order.dtf_extracted_url ? "bg-sky-400" : "bg-theme-faint"}`} title="ملف DTF" />
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        {order.result_design_url && <div className="w-2 h-2 rounded-full bg-emerald-400" title="تصميم" />}
                                                        {order.result_mockup_url && <div className="w-2 h-2 rounded-full bg-blue-400" title="موكاب" />}
                                                        {order.result_pdf_url && <div className="w-2 h-2 rounded-full bg-amber-400" title="PDF" />}
                                                        {!order.result_design_url && !order.result_mockup_url && !order.result_pdf_url && (
                                                            <span className="text-[10px] text-theme-faint">—</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {/* Date */}
                                        <td className="px-4 py-3 text-xs text-theme-faint whitespace-nowrap">
                                            {mounted ? new Date(order.created_at).toLocaleDateString("ar-SA") : order.created_at?.split("T")[0]}
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
                    <button disabled={currentPage <= 1} onClick={() => navigate({ page: String(currentPage - 1) })} className="rounded-lg border border-theme-subtle bg-theme-faint p-2 disabled:opacity-30">
                        <ChevronRight className="w-4 h-4 text-theme-soft" />
                    </button>
                    <span className="text-sm text-theme-subtle">{currentPage} / {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => navigate({ page: String(currentPage + 1) })} className="rounded-lg border border-theme-subtle bg-theme-faint p-2 disabled:opacity-30">
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
                className="theme-surface-panel relative z-10 w-full max-w-2xl rounded-2xl p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-theme flex items-center gap-2"><Settings2 className="w-5 h-5 text-gold" /> إعدادات البرومبت الموحد</h3>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-theme-faint"><X className="w-5 h-5 text-theme-subtle" /></button>
                </div>

                <p className="text-xs text-theme-subtle mb-3">
                    استخدم المتغيرات: <code className="text-gold/70">{"{{garment_name}}"}</code> <code className="text-gold/70">{"{{color_name}}"}</code> <code className="text-gold/70">{"{{color_hex}}"}</code> <code className="text-gold/70">{"{{style_name}}"}</code> <code className="text-gold/70">{"{{art_style_name}}"}</code> <code className="text-gold/70">{"{{colors}}"}</code> <code className="text-gold/70">{"{{user_prompt}}"}</code>
                </p>

                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="input-dark w-full rounded-xl px-4 py-3 text-sm font-mono resize-none"
                    rows={14}
                />

                <div className="flex items-center gap-3 mt-4">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-light px-6 py-2.5 text-sm font-bold text-[var(--wusha-bg)] transition-all hover:shadow-lg hover:shadow-gold/20 disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saving ? "جاري الحفظ..." : saved ? "تم الحفظ!" : "حفظ القالب"}
                    </button>
                    <button onClick={onClose} className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm text-theme-soft hover:bg-[color:var(--surface-elevated)]">إلغاء</button>
                </div>
            </motion.div>
        </div>
    );
}
