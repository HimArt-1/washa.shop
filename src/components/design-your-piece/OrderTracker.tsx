"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Order Tracker + Results Popup
//  تتبع الطلب + نافذة النتائج المذهلة
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock, Check, Loader2, X, Eye,
    Shirt, Palette, Ruler, Sparkles, Paintbrush, SwatchBook,
    FileText, Download, MessageCircle,
    AlertCircle, CheckCircle2, Ban,
    ShoppingCart, MapPin, Maximize2, Minimize2,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import {
    getDesignOrderPublic,
    cancelDesignOrderByCustomer,
} from "@/app/actions/smart-store";
import type { CustomDesignOrder, CustomDesignOrderStatus } from "@/types/database";
import { DesignOrderChat } from "./DesignOrderChat";
import { DesignResultsPopup } from "./DesignResultsPopup";

// ─── localStorage Keys ──────────────────────────────────

const STORAGE_KEY = "wusha_design_order_access";

type StoredDesignOrderAccess = {
    id: string;
    token: string | null;
};

export function getStoredOrderAccess(): StoredDesignOrderAccess | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === "string") {
            return {
                id: parsed.id,
                token: typeof parsed.token === "string" ? parsed.token : null,
            };
        }
    } catch {
        return { id: raw, token: null };
    }

    return null;
}

export function getStoredOrderId(): string | null {
    return getStoredOrderAccess()?.id ?? null;
}

export function getStoredOrderToken(orderId?: string): string | null {
    const access = getStoredOrderAccess();
    if (!access) return null;
    if (orderId && access.id !== orderId) return null;
    return access.token;
}

export function storeOrderId(id: string, token?: string | null) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, token: token ?? null }));
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
        desc: "تم الانتهاء من التصميم — راجع النتائج وحدد موقع التصميم",
        color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: Eye, step: 3,
    },
    completed: {
        label: "مكتمل ✅",
        desc: "تم اعتماد التصميم وإضافته للسلة",
        color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, step: 4,
    },
    cancelled: {
        label: "ملغي",
        desc: "تم إلغاء هذا الطلب",
        color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: Ban, step: 0,
    },
    modification_requested: {
        label: "طلب تعديل",
        desc: "تم إرسال طلب تعديل للإدارة — سيتم تنفيذ التعديلات قريباً",
        color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Eye, step: 2,
    },
};

const PROGRESS_STEPS = [
    { label: "تم الاستلام", status: "new" as const },
    { label: "قيد التنفيذ", status: "in_progress" as const },
    { label: "جاهز للمراجعة", status: "awaiting_review" as const },
    { label: "مكتمل", status: "completed" as const },
];

// ─── Print Positions ──────────────────────────────────

type PrintPosition = "chest" | "back" | "shoulder_right" | "shoulder_left";
type PrintSize = "large" | "small";

const POSITIONS: { id: PrintPosition; label: string; emoji: string; desc: string }[] = [
    { id: "chest", label: "الصدر", emoji: "👕", desc: "تصميم على الجهة الأمامية" },
    { id: "back", label: "الظهر", emoji: "🔄", desc: "تصميم على الجهة الخلفية" },
    { id: "shoulder_right", label: "الكتف الأيمن", emoji: "➡️", desc: "شعار على الكتف الأيمن" },
    { id: "shoulder_left", label: "الكتف الأيسر", emoji: "⬅️", desc: "شعار على الكتف الأيسر" },
];

const SIZE_LABELS: Record<PrintSize, { label: string; desc: string }> = {
    large: { label: "مقاس كبير", desc: "تغطية واسعة وبارزة" },
    small: { label: "مقاس صغير", desc: "تصميم أنيق ومحدود" },
};

function getPrice(pricing: any, position: PrintPosition, size: PrintSize): number {
    if (position === "shoulder_right" || position === "shoulder_left") {
        return size === "large" ? (pricing?.price_shoulder_large ?? 0) : (pricing?.price_shoulder_small ?? 0);
    }
    if (position === "back") {
        return size === "large" ? (pricing?.price_back_large ?? 0) : (pricing?.price_back_small ?? 0);
    }
    return size === "large" ? (pricing?.price_chest_large ?? 0) : (pricing?.price_chest_small ?? 0);
}

// ─── Main Component ─────────────────────────────────────

export function OrderTracker({ orderId, trackerToken }: { orderId: string; trackerToken?: string | null }) {
    const router = useRouter();
    const [order, setOrder] = useState<CustomDesignOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showResultsPopup, setShowResultsPopup] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchOrder = useCallback(async () => {
        const token = trackerToken ?? getStoredOrderToken(orderId);
        const data = await getDesignOrderPublic(orderId, token);
        setOrder(data);
        setLoading(false);

        // Auto-show popup when results are ready
        if (data && data.status === "awaiting_review" && !showResultsPopup) {
            setShowResultsPopup(true);
        }
    }, [orderId, showResultsPopup, trackerToken]);

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 8000);
        return () => clearInterval(interval);
    }, [fetchOrder]);

    const handleCancelRequest = () => {
        if (!order || actionLoading) return;
        setActionError(null);
        setShowResultsPopup(false);
        setShowCancelConfirm(true);
    };

    const handleCancelConfirm = async () => {
        if (!order) return;
        setActionLoading(true);
        setActionError(null);

        try {
            const result = await cancelDesignOrderByCustomer(order.id);
            if (result?.error) {
                setActionError(result.error);
                return;
            }

            setShowCancelConfirm(false);
            await fetchOrder();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "تعذر إلغاء الطلب الآن.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleNewOrder = () => {
        clearOrderId();
        router.push("/design");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
                <p className="text-theme-subtle text-sm">جاري تحميل حالة الطلب...</p>
            </div>
        );
    }

    if (!order) {
        clearOrderId();
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-16 h-16 mx-auto text-theme-faint mb-4" />
                <p className="text-theme-subtle mb-4">لم يتم العثور على الطلب</p>
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
            {/* Results Popup */}
            <AnimatePresence>
                {showResultsPopup && order.status === "awaiting_review" && (
                    <DesignResultsPopup
                        order={order}
                        onClose={() => setShowResultsPopup(false)}
                        onConfirm={async () => { await fetchOrder(); setShowResultsPopup(false); }}
                        onCancel={handleCancelRequest}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCancelConfirm && order && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !actionLoading && setShowCancelConfirm(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.96 }}
                            className="theme-surface-panel relative z-10 w-full max-w-md rounded-[2rem] p-6 sm:p-7"
                        >
                            <div className="mb-4 flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                                    <Ban className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-theme">تأكيد إلغاء الطلب</h3>
                                    <p className="mt-1 text-sm text-theme-faint">
                                        سيتم إلغاء طلب التصميم #{order.order_number} نهائيًا ولن تتمكن من التراجع بعد التنفيذ.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm text-theme-soft">
                                {order.garment_name} · {order.size_name} · {order.color_name}
                            </div>

                            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    disabled={actionLoading}
                                    className="min-h-[46px] rounded-2xl border border-theme-soft px-5 text-sm font-bold text-theme-soft transition-colors hover:border-gold/20 hover:text-gold disabled:opacity-50"
                                >
                                    تراجع
                                </button>
                                <button
                                    onClick={handleCancelConfirm}
                                    disabled={actionLoading}
                                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                                    تأكيد الإلغاء
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-l from-gold via-gold-light to-gold bg-clip-text text-transparent">
                    طلبك #{order.order_number}
                </h1>
                <p className="text-theme-subtle mt-2 text-sm">تتبع حالة تصميمك المخصص</p>
            </motion.div>

            {actionError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:px-5">
                    {actionError}
                </div>
            )}

            {/* Progress Timeline */}
            {order.status !== "cancelled" && (
                <div className="relative">
                    <div className="flex items-center justify-between">
                        {PROGRESS_STEPS.map((ps, i) => {
                            const isDone = currentStep > (i + 1);
                            const isCurrent = currentStep === (i + 1);
                            return (
                                <div key={ps.status} className="flex-1 flex flex-col items-center relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isDone ? "bg-gold text-bg" : isCurrent ? "bg-gold/20 text-gold border-2 border-gold animate-pulse" : "bg-theme-soft text-theme-faint"}`}>
                                        {isDone ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                                    </div>
                                    <span className={`text-[10px] mt-2 font-medium text-center ${isCurrent ? "text-gold" : isDone ? "text-theme-soft" : "text-theme-faint"}`}>{ps.label}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="absolute top-5 left-[12%] right-[12%] h-0.5 bg-theme-soft">
                        <motion.div className="h-full bg-gradient-to-l from-gold to-gold-light rounded-full"
                            animate={{ width: `${Math.max(0, ((currentStep - 1) / (PROGRESS_STEPS.length - 1)) * 100)}%` }}
                            transition={{ duration: 0.8 }} />
                    </div>
                </div>
            )}

            {/* Status Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-6 rounded-2xl border ${st.bg}`}>
                <div className="flex items-center gap-3 mb-2">
                    <st.icon className={`w-6 h-6 ${st.color} ${order.status === "in_progress" ? "animate-spin" : ""}`} />
                    <h3 className={`text-lg font-bold ${st.color}`}>{st.label}</h3>
                </div>
                <p className="text-theme-subtle text-sm">{st.desc}</p>
                {(order.status === "new" || order.status === "in_progress") && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 flex items-center gap-2 text-sm text-theme-subtle"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                        </span>
                        الصفحة تتحدث تلقائياً عند تغيّر الحالة
                    </motion.div>
                )}
            </motion.div>

            {/* Order Details */}
            <div className="rounded-2xl border border-theme-soft bg-theme-faint p-5">
                <h3 className="font-bold text-theme mb-4">تفاصيل الطلب</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <MiniCard icon={Shirt} label="القطعة" value={order.garment_name} />
                    <MiniCard icon={Palette} label="اللون" value={order.color_name} color={order.color_hex} />
                    <MiniCard icon={Ruler} label="المقاس" value={order.size_name} />
                    <MiniCard icon={Sparkles} label="النمط" value={order.style_name} />
                    <MiniCard icon={Paintbrush} label="الأسلوب" value={order.art_style_name} />
                    <MiniCard icon={SwatchBook} label="الألوان" value={order.color_package_name ?? "مخصصة"} />
                </div>
            </div>

            {/* Awaiting Review — Open Popup Button */}
            {order.status === "awaiting_review" && !showResultsPopup && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                    <button onClick={() => setShowResultsPopup(true)} className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-theme font-bold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all animate-pulse">
                        <Eye className="w-5 h-5 inline-block ml-2" />
                        معاينة التصميم واختيار مواصفاته
                    </button>
                </motion.div>
            )}

            {/* Completed — show final summary */}
            {order.status === "completed" && (order.result_design_url || order.result_mockup_url) && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
                    <h3 className="font-bold text-emerald-300 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> التصميم المعتمد</h3>
                    {order.print_position && order.print_size && (
                        <div className="flex gap-3 text-xs text-theme-subtle">
                            <span>📍 {POSITIONS.find(p => p.id === order.print_position)?.label ?? order.print_position}</span>
                            <span>📐 {SIZE_LABELS[order.print_size as PrintSize]?.label ?? order.print_size}</span>
                            {order.final_price && <span className="text-gold font-bold">{order.final_price} ر.س</span>}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {order.result_design_url && <ResultPreview label="التصميم" url={order.result_design_url} />}
                        {order.result_mockup_url && <ResultPreview label="المعاينة" url={order.result_mockup_url} />}
                    </div>
                </div>
            )}

            {/* Terminal States — New Order */}
            {isTerminal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-4">
                    <button onClick={handleNewOrder} className="px-8 py-3 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all">
                        طلب تصميم جديد
                    </button>
                </motion.div>
            )}

            {/* Embedded Order Chat */}
            {!isTerminal && (
                <div className="mt-8">
                    <DesignOrderChat orderId={order.id} trackerToken={trackerToken ?? getStoredOrderToken(order.id)} />
                </div>
            )}
        </div>
    );
}

// ─── Sub Components ─────────────────────────────────────

function MiniCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
    return (
        <div className="p-3 rounded-xl bg-theme-subtle border border-theme-subtle text-center">
            <div className="flex items-center justify-center mb-1.5">
                {color ? <div className="w-5 h-5 rounded-md" style={{ backgroundColor: color }} /> : <Icon className="w-4 h-4 text-theme-faint" />}
            </div>
            <p className="text-[10px] text-fg/35">{label}</p>
            <p className="text-xs font-medium text-theme truncate">{value}</p>
        </div>
    );
}

function ResultPreview({ label, url }: { label: string; url: string }) {
    return (
        <div className="rounded-xl overflow-hidden border border-theme-soft">
            <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={label} className="w-full aspect-[4/3] object-cover hover:scale-105 transition-transform duration-500" />
            </a>
            <div className="px-3 py-2 bg-theme-subtle"><p className="text-[10px] text-theme-subtle">{label}</p></div>
        </div>
    );
}
