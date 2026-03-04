"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — Order Tracker
//  يعرض حالة الطلب والنتائج للعميل
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Check, Loader2, X, Eye,
    Shirt, Palette, Ruler, Sparkles, Paintbrush, SwatchBook,
    Image as ImageIcon, FileText, Download, MessageCircle,
    AlertCircle, CheckCircle2, Ban,
} from "lucide-react";
import {
    getDesignOrderPublic,
    approveDesignOrder,
    cancelDesignOrderByCustomer,
} from "@/app/actions/smart-store";
import type { CustomDesignOrder, CustomDesignOrderStatus } from "@/types/database";

// ─── localStorage Keys ──────────────────────────────────

const STORAGE_KEY = "wusha_design_order_id";

export function getStoredOrderId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
}

export function storeOrderId(id: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, id);
}

export function clearOrderId() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
}

// ─── Status Config ──────────────────────────────────────

const STATUS_CONFIG: Record<CustomDesignOrderStatus, {
    label: string; desc: string; color: string; bg: string; icon: any; step: number;
}> = {
    new: {
        label: "تم استلام الطلب",
        desc: "تم تلقي طلبك وسيبدأ فريقنا بالعمل عليه قريباً",
        color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: Clock, step: 1,
    },
    in_progress: {
        label: "قيد التنفيذ",
        desc: "فريق التصميم يعمل على طلبك الآن",
        color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Loader2, step: 2,
    },
    awaiting_review: {
        label: "جاهز للمراجعة",
        desc: "تم الانتهاء من التصميم — راجع النتائج واعتمد أو ألغِ",
        color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: Eye, step: 3,
    },
    completed: {
        label: "مكتمل ✅",
        desc: "تم اعتماد التصميم بنجاح",
        color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, step: 4,
    },
    cancelled: {
        label: "ملغي",
        desc: "تم إلغاء هذا الطلب",
        color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: Ban, step: 0,
    },
};

const PROGRESS_STEPS = [
    { label: "تم الاستلام", status: "new" as const },
    { label: "قيد التنفيذ", status: "in_progress" as const },
    { label: "جاهز للمراجعة", status: "awaiting_review" as const },
    { label: "مكتمل", status: "completed" as const },
];

// ─── Main Component ─────────────────────────────────────

export function OrderTracker({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<CustomDesignOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showChat, setShowChat] = useState(false);

    const fetchOrder = useCallback(async () => {
        const data = await getDesignOrderPublic(orderId);
        setOrder(data);
        setLoading(false);
    }, [orderId]);

    useEffect(() => {
        fetchOrder();
        // Poll every 15s for updates
        const interval = setInterval(fetchOrder, 15000);
        return () => clearInterval(interval);
    }, [fetchOrder]);

    const handleApprove = async () => {
        if (!order || !confirm("هل أنت متأكد من اعتماد التصميم؟")) return;
        setActionLoading(true);
        await approveDesignOrder(order.id);
        await fetchOrder();
        setActionLoading(false);
    };

    const handleCancel = async () => {
        if (!order || !confirm("هل أنت متأكد من إلغاء الطلب؟ لا يمكن التراجع.")) return;
        setActionLoading(true);
        await cancelDesignOrderByCustomer(order.id);
        await fetchOrder();
        setActionLoading(false);
    };

    const handleNewOrder = () => {
        clearOrderId();
        window.location.reload();
    };

    // Toggle Reamaze chat visibility based on order status
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (order && !["completed", "cancelled"].includes(order.status)) {
            // Active order — show Reamaze
            document.body.classList.add("reamaze-active");
        } else {
            // No active order — hide Reamaze
            document.body.classList.remove("reamaze-active");
        }
        return () => {
            document.body.classList.remove("reamaze-active");
        };
    }, [order]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
                <p className="text-fg/40 text-sm">جاري تحميل حالة الطلب...</p>
            </div>
        );
    }

    if (!order) {
        // Order not found — clear and show wizard
        clearOrderId();
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-16 h-16 mx-auto text-fg/20 mb-4" />
                <p className="text-fg/50 mb-4">لم يتم العثور على الطلب</p>
                <button onClick={handleNewOrder} className="px-6 py-3 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm">
                    ابدأ طلب جديد
                </button>
            </div>
        );
    }

    const st = STATUS_CONFIG[order.status];
    const currentStep = st.step;
    const isTerminal = order.status === "completed" || order.status === "cancelled";

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* ─── Header ─── */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-l from-gold via-gold-light to-gold bg-clip-text text-transparent">
                    طلبك #{order.order_number}
                </h1>
                <p className="text-fg/50 mt-2 text-sm">تتبع حالة تصميمك المخصص</p>
            </motion.div>

            {/* ─── Progress Timeline ─── */}
            {order.status !== "cancelled" && (
                <div className="relative">
                    <div className="flex items-center justify-between">
                        {PROGRESS_STEPS.map((ps, i) => {
                            const isDone = currentStep > (i + 1);
                            const isCurrent = currentStep === (i + 1);
                            return (
                                <div key={ps.status} className="flex-1 flex flex-col items-center relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isDone ? "bg-gold text-bg" : isCurrent ? "bg-gold/20 text-gold border-2 border-gold animate-pulse" : "bg-white/[0.06] text-fg/25"}`}>
                                        {isDone ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                                    </div>
                                    <span className={`text-[10px] mt-2 font-medium text-center ${isCurrent ? "text-gold" : isDone ? "text-fg/60" : "text-fg/25"}`}>{ps.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Line connecting steps */}
                    <div className="absolute top-5 left-[12%] right-[12%] h-0.5 bg-white/[0.08]">
                        <motion.div
                            className="h-full bg-gradient-to-l from-gold to-gold-light rounded-full"
                            animate={{ width: `${Math.max(0, ((currentStep - 1) / (PROGRESS_STEPS.length - 1)) * 100)}%` }}
                            transition={{ duration: 0.8 }}
                        />
                    </div>
                </div>
            )}

            {/* ─── Status Card ─── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${st.bg}`}
            >
                <div className="flex items-center gap-3 mb-2">
                    <st.icon className={`w-6 h-6 ${st.color} ${order.status === "in_progress" ? "animate-spin" : ""}`} />
                    <h3 className={`text-lg font-bold ${st.color}`}>{st.label}</h3>
                </div>
                <p className="text-fg/50 text-sm">{st.desc}</p>
            </motion.div>

            {/* ─── Order Details ─── */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <h3 className="font-bold text-fg mb-4">تفاصيل الطلب</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <MiniCard icon={Shirt} label="القطعة" value={order.garment_name} />
                    <MiniCard icon={Palette} label="اللون" value={order.color_name} color={order.color_hex} />
                    <MiniCard icon={Ruler} label="المقاس" value={order.size_name} />
                    <MiniCard icon={Sparkles} label="النمط" value={order.style_name} />
                    <MiniCard icon={Paintbrush} label="الأسلوب" value={order.art_style_name} />
                    <MiniCard icon={SwatchBook} label="الألوان" value={order.color_package_name ?? "مخصصة"} />
                </div>
                {order.text_prompt && (
                    <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-[10px] text-fg/30 mb-1">وصف التصميم</p>
                        <p className="text-sm text-fg/70">{order.text_prompt}</p>
                    </div>
                )}
            </div>

            {/* ─── Results (when available) ─── */}
            {order.status === "awaiting_review" && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-4"
                >
                    <h3 className="font-bold text-purple-300 flex items-center gap-2">
                        <Eye className="w-5 h-5" /> نتائج التصميم
                    </h3>
                    <p className="text-sm text-fg/50">تم الانتهاء من تصميمك — راجع النتائج وقرر</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {order.result_design_url && (
                            <ResultPreview label="التصميم" url={order.result_design_url} type="image" />
                        )}
                        {order.result_mockup_url && (
                            <ResultPreview label="المعاينة (Mockup)" url={order.result_mockup_url} type="image" />
                        )}
                    </div>
                    {order.result_pdf_url && (
                        <a href={order.result_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg/70 text-sm hover:bg-white/[0.06] transition-colors w-fit">
                            <FileText className="w-4 h-4" />
                            تحميل ملف PDF
                            <Download className="w-3.5 h-3.5 mr-auto" />
                        </a>
                    )}

                    {/* Approve / Cancel */}
                    <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                        <button onClick={handleApprove} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-bold text-sm hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50">
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            اعتماد التصميم ✓
                        </button>
                        <button onClick={handleCancel} disabled={actionLoading} className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50">
                            <X className="w-4 h-4" />
                            إلغاء
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Results for completed */}
            {order.status === "completed" && (order.result_design_url || order.result_mockup_url) && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
                    <h3 className="font-bold text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> التصميم المعتمد
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {order.result_design_url && <ResultPreview label="التصميم" url={order.result_design_url} type="image" />}
                        {order.result_mockup_url && <ResultPreview label="المعاينة" url={order.result_mockup_url} type="image" />}
                    </div>
                    {order.result_pdf_url && (
                        <a href={order.result_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg/70 text-sm hover:bg-white/[0.06] transition-colors w-fit">
                            <FileText className="w-4 h-4" /> تحميل PDF <Download className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            )}

            {/* ─── New Order Button (terminal states) ─── */}
            {isTerminal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-4">
                    <button onClick={handleNewOrder} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all">
                        طلب تصميم جديد
                    </button>
                </motion.div>
            )}

            {/* ─── Chat Button (active orders only) ─── */}
            {!isTerminal && (
                <div className="text-center">
                    <button
                        onClick={() => {
                            // Try to open Reamaze
                            const btn = document.querySelector("[data-reamaze-widget]") as HTMLElement;
                            if (btn) btn.click();
                        }}
                        className="flex items-center gap-2 mx-auto px-5 py-3 rounded-2xl border border-gold/20 text-gold text-sm font-medium hover:bg-gold/5 transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" />
                        تواصل معنا بخصوص الطلب
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Sub Components ─────────────────────────────────────

function MiniCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
    return (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <div className="flex items-center justify-center mb-1.5">
                {color ? <div className="w-5 h-5 rounded-md" style={{ backgroundColor: color }} /> : <Icon className="w-4 h-4 text-fg/30" />}
            </div>
            <p className="text-[10px] text-fg/35">{label}</p>
            <p className="text-xs font-medium text-fg truncate">{value}</p>
        </div>
    );
}

function ResultPreview({ label, url, type }: { label: string; url: string; type: "image" | "pdf" }) {
    return (
        <div className="rounded-xl overflow-hidden border border-white/[0.08]">
            {type === "image" ? (
                <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={label} className="w-full aspect-[4/3] object-cover hover:scale-105 transition-transform duration-500" />
                </a>
            ) : (
                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-4 text-fg/60 hover:text-fg transition-colors">
                    <FileText className="w-5 h-5" /> {label}
                </a>
            )}
            <div className="px-3 py-2 bg-white/[0.03]">
                <p className="text-[10px] text-fg/40">{label}</p>
            </div>
        </div>
    );
}
