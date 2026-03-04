"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
    Eye, X, Check, Copy, Upload, FileText, Image as ImageIcon,
    ChevronLeft, ChevronRight, Clock, Loader2, Slash,
    Paintbrush, Palette, Ruler, Shirt, Sparkles, SwatchBook,
    AlertCircle, CheckCircle2, Settings2, Save,
} from "lucide-react";
import {
    updateDesignOrderStatus,
    uploadDesignResult,
    skipDesignResults,
    updateDesignOrderNotes,
    updateDesignPromptTemplate,
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

const STATUS_MAP: Record<CustomDesignOrderStatus, { label: string; color: string; icon: any }> = {
    new: { label: "جديد", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: AlertCircle },
    in_progress: { label: "قيد التنفيذ", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    awaiting_review: { label: "بانتظار المراجعة", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Eye },
    completed: { label: "مكتمل", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: X },
};

const NEXT_STATUSES: Record<string, CustomDesignOrderStatus[]> = {
    new: ["in_progress", "cancelled"],
    in_progress: ["awaiting_review", "cancelled"],
    awaiting_review: ["completed", "in_progress"],
    completed: [],
    cancelled: [],
};

const FILTER_STATUSES = [
    { value: "all", label: "الكل" },
    { value: "new", label: "جديد" },
    { value: "in_progress", label: "قيد التنفيذ" },
    { value: "awaiting_review", label: "بانتظار المراجعة" },
    { value: "completed", label: "مكتمل" },
    { value: "cancelled", label: "ملغي" },
];

// ─── Props ───────────────────────────────────────────────

interface Props {
    orders: CustomDesignOrder[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentStatus: string;
    promptTemplate: string;
}

// ─── Main Component ─────────────────────────────────────

export function DesignOrdersClient({ orders, count, totalPages, currentPage, currentStatus, promptTemplate }: Props) {
    const router = useRouter();
    const [selectedOrder, setSelectedOrder] = useState<CustomDesignOrder | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        sp.set("page", params.page || String(currentPage));
        sp.set("status", params.status || currentStatus);
        router.push(`/dashboard/design-orders?${sp.toString()}`);
    };

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {FILTER_STATUSES.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => navigate({ status: s.value, page: "1" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${currentStatus === s.value ? "bg-gold/15 text-gold border-gold/30" : "bg-white/[0.03] text-fg/50 border-white/[0.06] hover:bg-white/[0.05]"}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <span className="text-xs text-fg/40">{count} طلب</span>
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-fg/60 text-xs hover:text-fg transition-colors">
                        <Settings2 className="w-3.5 h-3.5" /> إعدادات البرومبت
                    </button>
                </div>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
                <div className="text-center py-20 text-fg/30">
                    <Paintbrush className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد طلبات تصميم {currentStatus !== "all" && `بحالة "${FILTER_STATUSES.find(s => s.value === currentStatus)?.label}"`}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => {
                        const st = STATUS_MAP[order.status];
                        const StIcon = st.icon;
                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                onClick={() => setSelectedOrder(order)}
                            >
                                {/* Order Number */}
                                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center font-bold text-gold text-sm">
                                    #{order.order_number}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-fg text-sm truncate">
                                        {order.garment_name} — {order.color_name} — {order.size_name}
                                    </p>
                                    <p className="text-xs text-fg/40 mt-0.5">
                                        {order.style_name} · {order.art_style_name}
                                        {order.customer_name && ` · ${order.customer_name}`}
                                    </p>
                                </div>
                                {/* Status Badge */}
                                <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${st.color}`}>
                                    <StIcon className="w-3.5 h-3.5" />
                                    {st.label}
                                </span>
                                {/* Results indicator */}
                                <div className="flex gap-1">
                                    {order.result_design_url && <div className="w-2 h-2 rounded-full bg-emerald-400" title="تصميم" />}
                                    {order.result_mockup_url && <div className="w-2 h-2 rounded-full bg-blue-400" title="موكاب" />}
                                    {order.result_pdf_url && <div className="w-2 h-2 rounded-full bg-amber-400" title="PDF" />}
                                </div>
                                {/* Date */}
                                <span className="text-xs text-fg/30 hidden sm:block">
                                    {new Date(order.created_at).toLocaleDateString("ar-SA")}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button disabled={currentPage <= 1} onClick={() => navigate({ page: String(currentPage - 1) })} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] disabled:opacity-30">
                        <ChevronRight className="w-4 h-4 text-fg/60" />
                    </button>
                    <span className="text-sm text-fg/50">{currentPage} / {totalPages}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => navigate({ page: String(currentPage + 1) })} className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4 text-fg/60" />
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <OrderDetailModal order={selectedOrder} onClose={() => { setSelectedOrder(null); router.refresh(); }} />
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
//  Order Detail Modal
// ═══════════════════════════════════════════════════════════

function OrderDetailModal({ order, onClose }: { order: CustomDesignOrder; onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [notes, setNotes] = useState(order.admin_notes ?? "");
    const [uploading, setUploading] = useState<string | null>(null);

    const st = STATUS_MAP[order.status];
    const nextStatuses = NEXT_STATUSES[order.status] || [];

    const handleStatusChange = async (newStatus: CustomDesignOrderStatus) => {
        setLoading(true);
        await updateDesignOrderStatus(order.id, newStatus);
        setLoading(false);
        onClose();
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

    const handleUpload = async (field: "result_design_url" | "result_mockup_url" | "result_pdf_url", file: File) => {
        setUploading(field);
        const url = await uploadFile(file, `design-orders/${order.id}`);
        if (url) {
            const res = await uploadDesignResult(order.id, field, url);
            if (res.error) {
                alert(`فشل التحديث في قاعدة البيانات: ${res.error}`);
            } else {
                // Mutate local state so UI updates immediately
                order[field] = url;
            }
        } else {
            alert("فشل رفع الملف. يرجى المحاولة مرة أخرى.");
        }
        setUploading(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full max-w-3xl rounded-2xl bg-surface border border-white/[0.08] p-6 shadow-2xl mb-12"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center font-bold text-gold">#{order.order_number}</div>
                        <div>
                            <h3 className="font-bold text-fg">طلب تصميم #{order.order_number}</h3>
                            <p className="text-xs text-fg/40">{new Date(order.created_at).toLocaleString("ar-SA")}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${st.color}`}>
                            {st.label}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5 text-fg/40" /></button>
                    </div>
                </div>

                {/* Customer Info */}
                {(order.customer_name || order.customer_email) && (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4 text-sm">
                        <p className="text-fg/50">👤 {order.customer_name ?? "—"} {order.customer_email && `· ${order.customer_email}`} {order.customer_phone && `· ${order.customer_phone}`}</p>
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

                {/* User Prompt / Image */}
                {order.text_prompt && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                        <p className="text-xs text-fg/40 mb-1">📝 وصف العميل:</p>
                        <p className="text-sm text-fg/80">{order.text_prompt}</p>
                    </div>
                )}
                {order.reference_image_url && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                        <p className="text-xs text-fg/40 mb-2">🖼️ الصورة المرجعية:</p>
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
                    <pre className="text-xs text-fg/70 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">{order.ai_prompt}</pre>
                </div>

                {/* Results Upload */}
                {!order.skip_results && order.status !== "cancelled" && (
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-6 space-y-3">
                        <p className="text-sm font-bold text-fg mb-2">📎 النتائج المطلوبة</p>
                        <ResultUpload label="صورة التصميم" field="result_design_url" currentUrl={order.result_design_url} uploading={uploading === "result_design_url"} onUpload={(f) => handleUpload("result_design_url", f)} icon={ImageIcon} />
                        <ResultUpload label="صورة الموكاب" field="result_mockup_url" currentUrl={order.result_mockup_url} uploading={uploading === "result_mockup_url"} onUpload={(f) => handleUpload("result_mockup_url", f)} icon={ImageIcon} />
                        <ResultUpload label="ملف PDF" field="result_pdf_url" currentUrl={order.result_pdf_url} uploading={uploading === "result_pdf_url"} onUpload={(f) => handleUpload("result_pdf_url", f)} icon={FileText} accept=".pdf" />
                    </div>
                )}

                {order.skip_results && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 mb-6 text-xs text-amber-400 flex items-center gap-2">
                        <Slash className="w-4 h-4" /> تم تجاوز النتائج — تم تنفيذ الطلب خارجياً
                    </div>
                )}

                {/* Admin Notes */}
                <div className="mb-6">
                    <label className="text-sm text-fg/50 mb-1.5 block">ملاحظات الإدارة</label>
                    <div className="flex gap-2">
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg text-sm placeholder:text-fg/25 focus:outline-none focus:border-gold/40 resize-none" rows={2} placeholder="أضف ملاحظات..." />
                        <button onClick={handleSaveNotes} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg/50 hover:text-fg text-xs self-end">حفظ</button>
                    </div>
                </div>

                {/* Customer Chat */}
                <div className="mb-6">
                    <DesignOrderAdminChat orderId={order.id} />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.06]">
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
                        <button onClick={handleSkip} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium border border-white/[0.08] text-fg/50 hover:bg-white/[0.04] transition-colors mr-auto">
                            <Slash className="w-3.5 h-3.5" /> تجاوز (/)
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────

function DetailCard({ icon: Icon, label, value, color, imageUrl }: { icon: any; label: string; value: string; color?: string; imageUrl?: string | null }) {
    return (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            {imageUrl ? (
                <img src={imageUrl} alt={label} className="w-full h-16 object-cover rounded-lg mb-2" />
            ) : (
                <div className="flex items-center justify-center mb-2">
                    {color ? <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: color }} /> : <Icon className="w-5 h-5 text-fg/30" />}
                </div>
            )}
            <p className="text-[10px] text-fg/40">{label}</p>
            <p className="text-xs font-medium text-fg truncate">{value}</p>
        </div>
    );
}

function ResultUpload({ label, field, currentUrl, uploading, onUpload, icon: Icon, accept }: {
    label: string; field: string; currentUrl: string | null; uploading: boolean; onUpload: (f: File) => void; icon: any; accept?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <Icon className="w-5 h-5 text-fg/30 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-fg/70">{label}</p>
                {currentUrl ? (
                    <a href={currentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gold hover:underline truncate block">✅ تم الرفع — عرض</a>
                ) : (
                    <p className="text-[10px] text-fg/30">لم يتم الرفع بعد</p>
                )}
            </div>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-dashed border-white/[0.12] hover:border-gold/30 cursor-pointer text-xs text-fg/50 whitespace-nowrap transition-colors">
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
                className="relative z-10 w-full max-w-2xl rounded-2xl bg-surface border border-white/[0.08] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-fg flex items-center gap-2"><Settings2 className="w-5 h-5 text-gold" /> إعدادات البرومبت الموحد</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5 text-fg/40" /></button>
                </div>

                <p className="text-xs text-fg/40 mb-3">
                    استخدم المتغيرات: <code className="text-gold/70">{"{{garment_name}}"}</code> <code className="text-gold/70">{"{{color_name}}"}</code> <code className="text-gold/70">{"{{color_hex}}"}</code> <code className="text-gold/70">{"{{style_name}}"}</code> <code className="text-gold/70">{"{{art_style_name}}"}</code> <code className="text-gold/70">{"{{colors}}"}</code> <code className="text-gold/70">{"{{user_prompt}}"}</code>
                </p>

                <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg text-sm font-mono placeholder:text-fg/25 focus:outline-none focus:border-gold/40 resize-none"
                    rows={14}
                />

                <div className="flex items-center gap-3 mt-4">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saving ? "جاري الحفظ..." : saved ? "تم الحفظ!" : "حفظ القالب"}
                    </button>
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-fg/60 text-sm hover:bg-white/[0.04]">إلغاء</button>
                </div>
            </motion.div>
        </div>
    );
}
