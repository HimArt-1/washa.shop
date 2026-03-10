"use client";

import React from "react";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
    Eye, X, Check, Copy, Upload, FileText, Image as ImageIcon,
    ChevronLeft, ChevronRight, Clock, Loader2, Slash,
    Paintbrush, Palette, Ruler, Shirt, Sparkles, SwatchBook,
    AlertCircle, CheckCircle2, Settings2, Save,
    Search, UserCircle2, DollarSign, TrendingUp, XCircle,
    Users,
} from "lucide-react";
import {
    updateDesignOrderStatus,
    uploadDesignResult,
    skipDesignResults,
    updateDesignOrderNotes,
    updateDesignPromptTemplate,
    sendDesignOrderToCustomer,
    assignDesignOrder,
    rejectDesignOrder,
} from "@/app/actions/smart-store";
import type { CustomDesignOrder, CustomDesignOrderStatus } from "@/types/database";
import { DesignOrderAdminChat } from "./DesignOrderAdminChat";

// ─── Storage Upload ──────────────────────────────────────

function getStorageClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

async function uploadFile(file: File, folder: string): Promise<string | null> {
    const sb = getStorageClient();
    const ext = file.name.split(".").pop() ?? "png";
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("smart-store").upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = sb.storage.from("smart-store").getPublicUrl(fileName);
    return data.publicUrl;
}

// ─── Constants ───────────────────────────────────────────

const STATUS_MAP: Record<CustomDesignOrderStatus, { label: string; color: string; icon: React.ElementType }> = {
    new: { label: "جديد", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: AlertCircle },
    in_progress: { label: "قيد التنفيذ", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    awaiting_review: { label: "بانتظار المراجعة", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Eye },
    completed: { label: "مكتمل", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: X },
    modification_requested: { label: "طلب تعديل", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertCircle },
};

const NEXT_STATUSES: Record<string, CustomDesignOrderStatus[]> = {
    new: ["in_progress", "cancelled"],
    in_progress: ["awaiting_review", "cancelled"],
    awaiting_review: ["completed", "in_progress"],
    completed: [],
    cancelled: [],
    modification_requested: ["in_progress", "cancelled"],
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
}

// ─── Main Component ─────────────────────────────────────

export function DesignOrdersClient({ orders, count, totalPages, currentPage, currentStatus, promptTemplate, stats, adminList }: Props) {
    const router = useRouter();
    const [selectedOrder, setSelectedOrder] = useState<CustomDesignOrder | null>(null);
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
            {/* ══ Stats Cards ══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard icon={AlertCircle} label="جديد" value={stats.new} color="text-blue-400" bg="bg-blue-400/10" onClick={() => navigate({ status: "new", page: "1" })} active={currentStatus === "new"} />
                <StatCard icon={Clock} label="قيد التنفيذ" value={stats.in_progress} color="text-amber-400" bg="bg-amber-400/10" onClick={() => navigate({ status: "in_progress", page: "1" })} active={currentStatus === "in_progress"} />
                <StatCard icon={Eye} label="بانتظار المراجعة" value={stats.awaiting_review} color="text-purple-400" bg="bg-purple-400/10" onClick={() => navigate({ status: "awaiting_review", page: "1" })} active={currentStatus === "awaiting_review"} />
                <StatCard icon={AlertCircle} label="طلب تعديل" value={stats.modification_requested} color="text-amber-400" bg="bg-amber-500/10" onClick={() => navigate({ status: "modification_requested", page: "1" })} active={currentStatus === "modification_requested"} />
                <StatCard icon={CheckCircle2} label="مكتمل" value={stats.completed} color="text-emerald-400" bg="bg-emerald-400/10" onClick={() => navigate({ status: "completed", page: "1" })} active={currentStatus === "completed"} />
                <StatCard icon={XCircle} label="ملغي" value={stats.cancelled} color="text-red-400" bg="bg-red-400/10" onClick={() => navigate({ status: "cancelled", page: "1" })} active={currentStatus === "cancelled"} />
                <StatCard icon={DollarSign} label="الإيرادات" value={`${stats.revenue.toLocaleString()} ر.س`} color="text-gold" bg="bg-gold/10" />
            </div>

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
                                        onClick={() => setSelectedOrder(order)}
                                        className="border-b border-theme-faint hover:bg-theme-subtle transition-colors cursor-pointer group"
                                    >
                                        {/* Order Number */}
                                        <td className="px-4 py-3">
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

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <OrderDetailModal
                        order={selectedOrder}
                        adminList={adminList}
                        onClose={() => { setSelectedOrder(null); router.refresh(); }}
                        onOrderUpdated={(o) => setSelectedOrder(o)}
                    />
                )}
            </AnimatePresence>

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
//  Order Detail Modal
// ═══════════════════════════════════════════════════════════

function OrderDetailModal({ order, adminList, onClose, onOrderUpdated }: { order: CustomDesignOrder; adminList: AdminProfile[]; onClose: () => void; onOrderUpdated?: (o: CustomDesignOrder) => void }) {
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [notes, setNotes] = useState(order.admin_notes ?? "");
    const [uploading, setUploading] = useState<string | null>(null);
    const [finalPrice, setFinalPrice] = useState(order.final_price?.toString() || "");
    const [assignedTo, setAssignedTo] = useState(order.assigned_to ?? "");
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);

    const st = STATUS_MAP[order.status];
    const nextStatuses = NEXT_STATUSES[order.status] || [];
    const isNewOrder = order.status === "new";

    const handleStatusChange = async (newStatus: CustomDesignOrderStatus) => {
        setLoading(true);
        await updateDesignOrderStatus(order.id, newStatus);
        setLoading(false);
        onClose();
    };

    const handleAssign = async (adminId: string) => {
        setAssignedTo(adminId);
        await assignDesignOrder(order.id, adminId || null);
    };

    const handleSendToCustomer = async () => {
        const priceNum = parseFloat(finalPrice);
        if (isNaN(priceNum) || priceNum <= 0) {
            alert("يرجى إدخال سعر صحيح أكبر من الصفر.");
            return;
        }
        if (!confirm("هل أنت متأكد من تسعير الطلب وإرساله للعميل؟ سيتم تغيير حالة الطلب وتسليمه كمنتج جاهز للسلة.")) return;

        setLoading(true);
        const res = await sendDesignOrderToCustomer(order.id, priceNum);
        if (res.error) {
            alert("فشل الإرسال: " + res.error);
        } else {
            order.is_sent_to_customer = true;
            order.final_price = priceNum;
            order.status = "awaiting_review";
            alert("تم تسعير الطلب وإرساله بنجاح!");
        }
        setLoading(false);
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(order.ai_prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSkip = async () => {
        if (!confirm("تجاوز النتائج وإكمال الطلب؟")) return;
        setLoading(true);
        await skipDesignResults(order.id);
        setLoading(false);
        onClose();
    };

    const handleSaveNotes = async () => {
        await updateDesignOrderNotes(order.id, notes);
    };

    const handleUpload = async (field: "result_design_url" | "result_mockup_url" | "result_pdf_url" | "modification_design_url", file: File) => {
        setUploading(field);
        const url = await uploadFile(file, `design-orders/${order.id}`);
        if (url) {
            const res = await uploadDesignResult(order.id, field, url);
            if (res.error) {
                alert(`فشل التحديث في قاعدة البيانات: ${res.error}`);
            } else {
                order[field] = url;
            }
        } else {
            alert("فشل رفع الملف. يرجى المحاولة مرة أخرى.");
        }
        setUploading(null);
    };

    // نافذة القبول أولاً — للطلبات الجديدة فقط
    if (isNewOrder) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 w-full max-w-md rounded-2xl bg-surface border border-theme-soft p-6 shadow-2xl"
                >
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-theme">طلب تصميم جديد #{order.order_number}</h3>
                        <p className="text-sm text-theme-subtle mt-1">{order.garment_name} — {order.color_name}</p>
                    </div>
                    {!showRejectForm ? (
                        <div className="flex gap-3">
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    await updateDesignOrderStatus(order.id, "in_progress");
                                    setLoading(false);
                                    onOrderUpdated?.({ ...order, status: "in_progress" });
                                }}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                قبول الطلب
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500/20 text-red-400 font-bold border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                                رفض الطلب
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-theme">سبب الرفض (إجباري)</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="اكتب سبب رفض الطلب..."
                                className="w-full px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm resize-none"
                                rows={3}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        if (!rejectReason.trim()) { alert("يرجى ذكر سبب الرفض"); return; }
                                        setLoading(true);
                                        const res = await rejectDesignOrder(order.id, rejectReason);
                                        setLoading(false);
                                        if (res.error) alert(res.error);
                                        else onClose();
                                    }}
                                    disabled={loading || !rejectReason.trim()}
                                    className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold disabled:opacity-50"
                                >
                                    {loading ? "جاري..." : "تأكيد الرفض"}
                                </button>
                                <button onClick={() => setShowRejectForm(false)} className="px-4 py-3 rounded-xl border border-theme-soft text-theme-soft">
                                    رجوع
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-3xl rounded-2xl bg-surface border border-theme-soft p-6 shadow-2xl mb-12"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center font-bold text-gold">#{order.order_number}</div>
                        <div>
                            <h3 className="font-bold text-theme">طلب تصميم #{order.order_number}</h3>
                            <p className="text-xs text-theme-subtle">{new Date(order.created_at).toLocaleString("ar-SA")}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${st.color}`}>
                            {st.label}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-theme-subtle rounded-lg"><X className="w-5 h-5 text-theme-subtle" /></button>
                    </div>
                </div>

                {/* Assign Admin */}
                <div className="p-3 rounded-xl bg-theme-subtle border border-theme-subtle mb-4 flex items-center gap-3">
                    <Users className="w-5 h-5 text-gold/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-theme-subtle mb-1">الأدمن المسؤول</p>
                        <select
                            value={assignedTo}
                            onChange={(e) => handleAssign(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-theme-subtle border border-theme-soft text-theme text-sm focus:outline-none focus:border-gold/30 transition-colors"
                        >
                            <option value="">غير معيّن</option>
                            {adminList.map(a => (
                                <option key={a.id} value={a.id}>{a.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Customer Info */}
                {(order.customer_name || order.customer_email) && (
                    <div className="p-3 rounded-xl bg-theme-subtle border border-theme-subtle mb-4 text-sm">
                        <p className="text-theme-subtle">👤 {order.customer_name ?? "—"} {order.customer_email && `· ${order.customer_email}`} {order.customer_phone && `· ${order.customer_phone}`}</p>
                    </div>
                )}

                {/* Design Selections Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <DetailCard icon={Shirt} label="القطعة" value={order.garment_name} imageUrl={order.garment_image_url} />
                    <DetailCard icon={Palette} label="اللون" value={`${order.color_name}`} color={order.color_hex} imageUrl={order.color_image_url} />
                    <DetailCard icon={Ruler} label="المقاس" value={order.size_name} />
                    <DetailCard icon={Sparkles} label="النمط" value={order.style_name} imageUrl={order.style_image_url} />
                    <DetailCard icon={SwatchBook} label="الأسلوب" value={order.art_style_name} imageUrl={order.art_style_image_url} />
                    <DetailCard icon={Palette} label="الألوان" value={order.color_package_name ?? (order.custom_colors?.length > 0 ? `${order.custom_colors.length} ألوان` : "—")} />
                </div>

                {/* طلب التعديل من العميل */}
                {order.modification_request && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                        <p className="text-xs text-amber-400 font-bold mb-1">✏️ طلب تعديل التصميم من العميل:</p>
                        <p className="text-sm text-theme-strong">{order.modification_request}</p>
                    </div>
                )}

                {/* User Prompt / Image */}
                {order.text_prompt && (
                    <div className="p-4 rounded-xl bg-theme-subtle border border-theme-subtle mb-4">
                        <p className="text-xs text-theme-subtle mb-1">📝 وصف العميل:</p>
                        <p className="text-sm text-theme-strong">{order.text_prompt}</p>
                    </div>
                )}
                {order.reference_image_url && (
                    <div className="p-4 rounded-xl bg-theme-subtle border border-theme-subtle mb-4">
                        <p className="text-xs text-theme-subtle mb-2">🖼️ الصورة المرجعية:</p>
                        <img src={order.reference_image_url} alt="Reference" className="max-h-40 rounded-xl" />
                    </div>
                )}

                {/* AI Prompt */}
                <div className="rounded-xl bg-gradient-to-br from-gold/5 to-transparent border border-gold/20 p-4 mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-bold text-gold flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Prompt</p>
                        <button onClick={handleCopyPrompt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 text-gold text-xs font-medium hover:bg-gold/20 transition-colors">
                            {copied ? <><Check className="w-3.5 h-3.5" /> تم النسخ!</> : <><Copy className="w-3.5 h-3.5" /> نسخ</>}
                        </button>
                    </div>
                    <pre className="text-xs text-theme-soft whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">{order.ai_prompt}</pre>
                </div>

                {/* Results Upload */}
                {!order.skip_results && order.status !== "cancelled" && (
                    <div className="rounded-xl bg-theme-faint border border-theme-subtle p-4 mb-6 space-y-3">
                        <p className="text-sm font-bold text-theme mb-2">📎 النتائج المطلوبة</p>
                        <ResultUpload label="صورة التصميم" field="result_design_url" currentUrl={order.result_design_url} uploading={uploading === "result_design_url"} onUpload={(f) => handleUpload("result_design_url", f)} icon={ImageIcon} />
                        <ResultUpload label="صورة الموكاب" field="result_mockup_url" currentUrl={order.result_mockup_url} uploading={uploading === "result_mockup_url"} onUpload={(f) => handleUpload("result_mockup_url", f)} icon={ImageIcon} />
                        <ResultUpload label="ملف PDF" field="result_pdf_url" currentUrl={order.result_pdf_url} uploading={uploading === "result_pdf_url"} onUpload={(f) => handleUpload("result_pdf_url", f)} icon={FileText} accept=".pdf" />
                        {order.modification_request && (
                            <ResultUpload label="التصميم بعد التعديل" field="modification_design_url" currentUrl={order.modification_design_url ?? null} uploading={uploading === "modification_design_url"} onUpload={(f) => handleUpload("modification_design_url", f)} icon={ImageIcon} />
                        )}
                    </div>
                )}

                {order.skip_results && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-6 text-xs text-amber-400 flex items-center gap-2">
                        <Slash className="w-4 h-4" /> تم تجاوز النتائج — تم تنفيذ الطلب خارجياً
                    </div>
                )}

                {/* Admin Notes */}
                <div className="mb-6">
                    <label className="text-sm text-theme-subtle mb-1.5 block">ملاحظات الإدارة</label>
                    <div className="flex gap-2">
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm placeholder:text-theme-faint focus:outline-none focus:border-gold/40 resize-none" rows={2} placeholder="أضف ملاحظات..." />
                        <button onClick={handleSaveNotes} className="px-3 py-2 rounded-xl bg-theme-subtle border border-theme-soft text-theme-subtle hover:text-theme text-xs self-end">حفظ</button>
                    </div>
                </div>

                {/* Customer Chat */}
                <div className="mb-6">
                    <DesignOrderAdminChat orderId={order.id} />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-theme-subtle">
                    {nextStatuses.map((ns) => {
                        const nsInfo = STATUS_MAP[ns];
                        return (
                            <button key={ns} onClick={() => handleStatusChange(ns)} disabled={loading} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${nsInfo.color} hover:opacity-80`}>
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <nsInfo.icon className="w-3.5 h-3.5" />}
                                {nsInfo.label}
                            </button>
                        );
                    })}
                    {!order.skip_results && order.status !== "completed" && order.status !== "cancelled" && (
                        <button onClick={handleSkip} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-theme-soft text-theme-subtle hover:bg-theme-subtle transition-colors mr-auto">
                            <Slash className="w-3.5 h-3.5" /> تجاوز (/)
                        </button>
                    )}
                </div>

                {/* Fulfillment / Send to Customer */}
                {!order.is_sent_to_customer && order.user_id && order.status !== "cancelled" && (
                    <div className="mt-6 p-4 rounded-xl bg-gold/5 border border-gold/20">
                        <h4 className="text-sm font-bold text-gold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> إرسال التصميم للعميل كمنتج</h4>
                        <p className="text-xs text-theme-soft mb-4">
                            عند الانتهاء من تجهيز التصميم وتسعير التطريز/الطباعة بناءً على التفاصيل، أدخل السعر النهائي وأرسله لتنبيه العميل ليتمكن من إضافته للسلة والدفع.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-subtle text-sm">ر.س</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={finalPrice}
                                    onChange={(e) => setFinalPrice(e.target.value)}
                                    placeholder="السعر النهائي..."
                                    className="w-full px-4 pr-12 py-2.5 rounded-xl bg-theme-subtle border border-gold/30 text-theme text-sm placeholder:text-theme-faint focus:outline-none focus:border-gold/60"
                                />
                            </div>
                            <button
                                onClick={handleSendToCustomer}
                                disabled={loading || !finalPrice}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50 sm:w-auto w-full"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                اعتماد وإرسال للعميل
                            </button>
                        </div>
                    </div>
                )}
                {order.is_sent_to_customer && (
                    <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
                        <span className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> تم الاعتماد والإرسال للعميل بنجاح</span>
                        <span className="font-bold text-lg">{order.final_price} ر.س</span>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────

function DetailCard({ icon: Icon, label, value, color, imageUrl }: { icon: React.ElementType; label: string; value: string; color?: string; imageUrl?: string | null }) {
    return (
        <div className="p-3 rounded-xl bg-theme-subtle border border-theme-subtle text-center">
            {imageUrl ? (
                <img src={imageUrl} alt={label} className="w-full h-16 object-cover rounded-lg mb-2" />
            ) : (
                <div className="flex items-center justify-center mb-2">
                    {color ? <div className="w-8 h-8 rounded-lg border border-theme-soft" style={{ backgroundColor: color }} /> : <Icon className="w-5 h-5 text-theme-faint" />}
                </div>
            )}
            <p className="text-[10px] text-theme-subtle">{label}</p>
            <p className="text-xs font-medium text-theme truncate">{value}</p>
        </div>
    );
}

function ResultUpload({ label, field, currentUrl, uploading, onUpload, icon: Icon, accept }: {
    label: string; field: string; currentUrl: string | null; uploading: boolean; onUpload: (f: File) => void; icon: React.ElementType; accept?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-theme-faint border border-theme-faint">
            <Icon className="w-5 h-5 text-theme-faint shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-theme-soft">{label}</p>
                {currentUrl ? (
                    <a href={currentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gold hover:underline truncate block">✅ تم الرفع — عرض</a>
                ) : (
                    <p className="text-[10px] text-theme-faint">لم يتم الرفع بعد</p>
                )}
            </div>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-subtle border border-dashed border-white/[0.12] hover:border-gold/30 cursor-pointer text-xs text-theme-subtle whitespace-nowrap transition-colors">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "جاري..." : currentUrl ? "تغيير" : "رفع"}
                <input ref={inputRef} type="file" accept={accept ?? "image/*"} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} className="hidden" disabled={uploading} />
            </label>
        </div>
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
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
