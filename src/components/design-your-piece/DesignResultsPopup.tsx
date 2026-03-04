"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Check, Loader2, FileText, Download,
    ShoppingCart, MapPin, Maximize2, Minimize2,
    ChevronLeft, ChevronRight
} from "lucide-react";
import { getGarmentPricing, confirmDesignOrder } from "@/app/actions/smart-store";
import { useCartStore } from "@/stores/cartStore";
import type { CustomDesignOrder } from "@/types/database";

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

export function DesignResultsPopup({
    order,
    onClose,
    onConfirm,
    onCancel,
}: {
    order: CustomDesignOrder;
    onClose: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [position, setPosition] = useState<PrintPosition | null>(null);
    const [size, setSize] = useState<PrintSize | null>(null);
    const [pricing, setPricing] = useState<any>(null);
    const [loadingPricing, setLoadingPricing] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [activeImage, setActiveImage] = useState(0);
    const addItem = useCartStore((s) => s.addItem);

    const images = [order.result_design_url, order.result_mockup_url].filter(Boolean) as string[];

    useEffect(() => {
        getGarmentPricing(order.garment_name).then((p) => {
            setPricing(p);
            setLoadingPricing(false);
        });
    }, [order.garment_name]);

    const currentPrice = position && size && pricing ? getPrice(pricing, position, size) : 0;

    const handleConfirm = async () => {
        if (!position || !size) return;
        setConfirming(true);

        await confirmDesignOrder(order.id, position, size, currentPrice);

        // Add to cart
        addItem({
            id: `custom-${order.id}`,
            title: `تصميم مخصص — ${order.garment_name}`,
            price: currentPrice,
            image_url: order.result_mockup_url || order.result_design_url || "",
            artist_name: "وشّى",
            size: order.size_name,
            type: "custom_design",
            maxQuantity: 1,
            customDesignUrl: order.result_design_url ?? undefined,
            customGarment: order.garment_name,
            customPosition: `${POSITIONS.find(p => p.id === position)?.label} — ${SIZE_LABELS[size].label}`,
        });

        setConfirming(false);
        onConfirm();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

            {/* Popup */}
            <motion.div
                initial={{ scale: 0.9, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 40 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden"
                style={{
                    background: "linear-gradient(145deg, rgba(17,17,17,0.97) 0%, rgba(26,26,26,0.95) 100%)",
                    border: "1px solid rgba(206,174,127,0.15)",
                    boxShadow: "0 0 80px rgba(206,174,127,0.1), 0 40px 100px rgba(0,0,0,0.8)",
                }}
            >
                {/* Glow Effects */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
                    <div className="absolute top-0 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gold/5 rounded-full blur-[100px]" />
                </div>

                <div className="relative p-5 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto w-full">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <motion.h2
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl sm:text-3xl font-bold"
                            >
                                <span className="bg-gradient-to-l from-purple-400 via-pink-400 to-gold bg-clip-text text-transparent">
                                    ✨ تصميمك جاهز
                                </span>
                            </motion.h2>
                            <p className="text-fg/40 text-sm mt-1">طلب #{order.order_number} — {order.garment_name}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors shrink-0">
                            <X className="w-5 h-5 text-fg/40" />
                        </button>
                    </div>

                    {/* ─── Images Display ─── */}
                    <div className="space-y-4 w-full">
                        {order.result_mockup_url && (
                            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/30 w-full group">
                                <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-xs font-bold text-white z-10 border border-white/10 uppercase tracking-widest">
                                    الموك آب النهائي
                                </div>
                                <img
                                    src={order.result_mockup_url}
                                    alt="Mockup"
                                    className="w-full aspect-square sm:aspect-video object-contain bg-black/50 hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        )}

                        {order.result_design_url && (
                            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black/30 w-full group">
                                <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-xs font-bold text-white z-10 border border-white/10 uppercase tracking-widest">
                                    ملف التصميم
                                </div>
                                <img
                                    src={order.result_design_url}
                                    alt="Raw Design"
                                    className="w-full h-64 sm:h-80 object-contain bg-black/50 hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        )}

                        {!order.result_mockup_url && !order.result_design_url && (
                            <div className="p-10 border border-white/[0.08] rounded-2xl bg-white/[0.02] flex items-center justify-center text-fg/30 text-sm">
                                لم يتم إرفاق صور للعرض.
                            </div>
                        )}
                    </div>

                    {/* PDF Download */}
                    {order.result_pdf_url && (
                        <a href={order.result_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg/70 text-sm hover:bg-white/[0.06] transition-colors w-fit">
                            <FileText className="w-4 h-4" /> تحميل PDF <Download className="w-3.5 h-3.5" />
                        </a>
                    )}

                    {/* ═══ Print Position Selector ═══ */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4 w-full"
                    >
                        <h3 className="text-lg font-bold text-fg flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gold" /> اختر موقع الطباعة
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {POSITIONS.map((pos) => {
                                const isActive = position === pos.id;
                                return (
                                    <motion.button
                                        key={pos.id}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setPosition(pos.id)}
                                        className={`relative p-4 rounded-2xl border-2 transition-all text-center ${isActive
                                            ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                                            : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                                            }`}
                                    >
                                        <div className="text-3xl mb-2">{pos.emoji}</div>
                                        <p className={`text-sm font-bold ${isActive ? "text-gold" : "text-fg"}`}>{pos.label}</p>
                                        <p className="text-[10px] text-fg/35 mt-0.5">{pos.desc}</p>
                                        {isActive && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                                <Check className="w-3.5 h-3.5 text-bg" />
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* ═══ Print Size Selector ═══ */}
                    <AnimatePresence>
                        {position && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="space-y-4 overflow-hidden w-full"
                            >
                                <h3 className="text-lg font-bold text-fg flex items-center gap-2 mt-4">
                                    <Maximize2 className="w-5 h-5 text-gold" /> اختر حجم الطباعة
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {(["large", "small"] as PrintSize[]).map((sz) => {
                                        const isActive = size === sz;
                                        const priceForSize = pricing ? getPrice(pricing, position, sz) : 0;
                                        return (
                                            <motion.button
                                                key={sz}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSize(sz)}
                                                className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-start ${isActive
                                                    ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                                                    : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 mb-2 w-full">
                                                    {sz === "large"
                                                        ? <Maximize2 className={`w-8 h-8 ${isActive ? "text-gold" : "text-fg/30"}`} />
                                                        : <Minimize2 className={`w-8 h-8 ${isActive ? "text-gold" : "text-fg/30"}`} />
                                                    }
                                                    <div className="text-right flex-1">
                                                        <p className={`font-bold ${isActive ? "text-gold" : "text-fg"}`}>{SIZE_LABELS[sz].label}</p>
                                                        <p className="text-[10px] text-fg/35">{SIZE_LABELS[sz].desc}</p>
                                                    </div>
                                                </div>
                                                {!loadingPricing && (
                                                    <div className={`text-xl font-bold mt-2 self-start ${isActive ? "text-gold" : "text-fg/60"}`}>
                                                        {priceForSize > 0 ? `${priceForSize} ر.س` : "مجاني"}
                                                    </div>
                                                )}
                                                {isActive && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                        className="absolute top-3 left-3 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                                        <Check className="w-3.5 h-3.5 text-bg" />
                                                    </motion.div>
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══ Price Summary + Actions ═══ */}
                    <AnimatePresence>
                        {position && size && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0 }}
                                className="rounded-2xl p-4 sm:p-5 border border-gold/20 w-full"
                                style={{ background: "linear-gradient(135deg, rgba(206,174,127,0.08) 0%, rgba(206,174,127,0.02) 100%)" }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-fg/50">ملخص الطلب</p>
                                        <p className="text-xs text-fg/30 mt-1">
                                            {order.garment_name} — {POSITIONS.find(p => p.id === position)?.label} — {SIZE_LABELS[size].label}
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-3xl font-bold text-gold">{currentPrice > 0 ? `${currentPrice}` : "مجاني"}</p>
                                        {currentPrice > 0 && <p className="text-xs text-fg/40">ر.س</p>}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleConfirm}
                                        disabled={confirming}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition-all disabled:opacity-50"
                                    >
                                        {confirming
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : <ShoppingCart className="w-5 h-5" />
                                        }
                                        {confirming ? "جاري التأكيد..." : "تأكيد وأضف للسلة 🛒"}
                                    </button>
                                    <button
                                        onClick={onCancel}
                                        disabled={confirming}
                                        className="sm:w-20 px-5 py-4 rounded-2xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50 flex justify-center items-center"
                                        title="إلغاء الطلب"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
