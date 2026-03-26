"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Check, Loader2, FileText, Download,
    ShoppingCart, MapPin, Maximize2, Minimize2,
    Plus, Edit3, Send
} from "lucide-react";
import { getGarmentPricing, confirmDesignOrder, submitModificationRequest } from "@/app/actions/smart-store";
import { useCartStore } from "@/stores/cartStore";
import { AdditionalDesignMiniWizard } from "./AdditionalDesignMiniWizard";
import { storeOrderId } from "./OrderTracker";
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
    // من المرحلة الرابعة في الويزرد — القيم محفوظة، لا نعيد الاختيار في المرحلة الأخيرة
    const position = ((order.print_position as PrintPosition) || "chest") as PrintPosition;
    const size = ((order.print_size as PrintSize) || "large") as PrintSize;
    const [mainConfirmed, setMainConfirmed] = useState(false);
    const [showAdditionalWizard, setShowAdditionalWizard] = useState(false);
    const [showModificationForm, setShowModificationForm] = useState(false);
    const [modificationText, setModificationText] = useState("");
    const [modificationSubmitting, setModificationSubmitting] = useState(false);
    const [additionalError, setAdditionalError] = useState<string | null>(null);
    const [pricing, setPricing] = useState<any>(null);
    const [loadingPricing, setLoadingPricing] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [activeImage, setActiveImage] = useState(0);
    const addItem = useCartStore((s) => s.addItem);

    const images = [order.result_design_url, order.result_mockup_url].filter(Boolean) as string[];

    useEffect(() => {
        getGarmentPricing(order.garment_name, order.garment_id).then((p) => {
            setPricing(p);
            setLoadingPricing(false);
        });
    }, [order.garment_id, order.garment_name]);

    const basePrice = pricing?.base_price ?? 0;
    const designPrice = position && size && pricing ? getPrice(pricing, position, size) : 0;
    const currentPrice = order.is_sent_to_customer
        ? (order.final_price || 0)
        : (position && size && pricing ? basePrice + designPrice : 0);

    const isReadyToConfirm = order.is_sent_to_customer || (position && size);

    const handleConfirm = async (): Promise<boolean> => {
        if (!isReadyToConfirm) return false;
        setConfirming(true);

        const posArg = order.is_sent_to_customer ? null : position;
        const sizeArg = order.is_sent_to_customer ? null : size;

        const res = await confirmDesignOrder(order.id, posArg, sizeArg, currentPrice);
        if (res?.error) {
            setAdditionalError(res.error);
            setConfirming(false);
            return false;
        }

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
            customPosition: order.is_sent_to_customer
                ? "حسب المواصفات المعتمدة"
                : `${POSITIONS.find(p => p.id === position)?.label} — ${SIZE_LABELS[size!].label}`,
        });

        setConfirming(false);
        setMainConfirmed(true);
        return true;
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
                    background: `linear-gradient(145deg, color-mix(in srgb, var(--wusha-surface) 97%, transparent) 0%, color-mix(in srgb, var(--wusha-surface-2) 95%, transparent) 100%)`,
                    border: "1px solid var(--glass-border)",
                    boxShadow: `0 0 80px var(--neon-gold), 0 40px 100px color-mix(in srgb, var(--wusha-bg) 80%, transparent)`,
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
                            <p className="text-theme-subtle text-sm mt-1">طلب #{order.order_number} — {order.garment_name}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl bg-theme-subtle hover:bg-white/10 transition-colors shrink-0">
                            <X className="w-5 h-5 text-theme-subtle" />
                        </button>
                    </div>

                    {/* ─── Images Display ─── */}
                    <div className="space-y-4 w-full">
                        {images.length > 0 ? (
                            <div className="relative rounded-2xl overflow-hidden border border-theme-soft bg-black/30 w-full group">
                                <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-xs font-bold text-theme z-10 border border-theme-soft uppercase tracking-widest">
                                    {images.length > 1 ? `صورة ${activeImage + 1} من ${images.length}` : (order.result_mockup_url ? "الموك آب النهائي" : "ملف التصميم")}
                                </div>
                                <img
                                    src={images[Math.min(activeImage, images.length - 1)]}
                                    alt=""
                                    className="w-full aspect-square sm:aspect-video object-contain bg-black/50 hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        ) : (
                            <div className="p-10 border border-theme-soft rounded-2xl bg-theme-faint flex items-center justify-center text-theme-faint text-sm">
                                لم يتم إرفاق صور للعرض.
                            </div>
                        )}
                    </div>

                    {/* PDF Download */}
                    {order.result_pdf_url && (
                        <a href={order.result_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme-soft text-sm hover:bg-theme-soft transition-colors w-fit">
                            <FileText className="w-4 h-4" /> تحميل PDF <Download className="w-3.5 h-3.5" />
                        </a>
                    )}

                    {/* ═══ بعد التأكيد: انشاء تصميم إضافي | إغلاق ═══ */}
                    {mainConfirmed && !showAdditionalWizard && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5 space-y-4"
                        >
                            <div className="flex items-center gap-2 text-emerald-400">
                                <Check className="w-6 h-6" />
                                <p className="font-bold">تم التأكيد! تم إضافة التصميم للسلة 🎉</p>
                            </div>
                            <p className="text-sm text-theme-soft">يمكنك إضافة تصميم إضافي على نفس القطعة في موقع مختلف، أو إغلاق النافذة.</p>
                            <div className="flex gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowAdditionalWizard(true)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gold/20 text-gold font-bold text-sm hover:bg-gold/30 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    انشاء تصميم إضافي
                                </motion.button>
                                <button
                                    onClick={onConfirm}
                                    className="px-6 py-3 rounded-xl border border-theme-soft text-theme-soft text-sm hover:bg-theme-subtle transition-all"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ معالج التصميم الإضافي ═══ */}
                    {showAdditionalWizard && (
                        <div className="rounded-2xl p-5 border border-gold/20 bg-gold/5">
                            <AdditionalDesignMiniWizard
                                order={{ ...order, status: "completed" } as CustomDesignOrder}
                                mainPosition={position}
                                onBack={() => { setShowAdditionalWizard(false); setAdditionalError(null); }}
                                onSuccess={({ orderId, trackerToken }) => {
                                    storeOrderId(orderId, trackerToken);
                                    onConfirm();
                                }}
                                onError={(msg) => setAdditionalError(msg)}
                            />
                            {additionalError && (
                                <p className="mt-3 text-sm text-red-400">{additionalError}</p>
                            )}
                        </div>
                    )}

                    {/* ═══ تعديل التصميم — نموذج طلب التعديل ═══ */}
                    {showModificationForm && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 space-y-4"
                        >
                            <h3 className="font-bold text-theme flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-amber-400" /> طلب تعديل التصميم
                            </h3>
                            <p className="text-sm text-theme-soft">اكتب تفاصيل التعديل المطلوب. سيتم إرجاع الطلب للإدارة لتنفيذ التعديلات.</p>
                            <textarea
                                value={modificationText}
                                onChange={(e) => setModificationText(e.target.value)}
                                placeholder="مثال: أريد تكبير حجم الشعار قليلاً، أو تغيير اللون إلى أغمق..."
                                className="w-full px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm placeholder:text-theme-faint focus:outline-none focus:border-gold/40 resize-none"
                                rows={4}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={async () => {
                                        if (!modificationText.trim()) return;
                                        setModificationSubmitting(true);
                                        const res = await submitModificationRequest(order.id, modificationText);
                                        setModificationSubmitting(false);
                                        if (res.error) {
                                            setAdditionalError(res.error);
                                        } else {
                                            setShowModificationForm(false);
                                            onConfirm();
                                        }
                                    }}
                                    disabled={modificationSubmitting || !modificationText.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-sm hover:bg-amber-500/30 disabled:opacity-50"
                                >
                                    {modificationSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    إرسال طلب التعديل
                                </button>
                                <button onClick={() => setShowModificationForm(false)} className="px-4 py-3 rounded-xl border border-theme-soft text-theme-soft text-sm">
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ المرحلة الأخيرة: مصغرات الموكاب + مصغرات التعديلات فقط (الموقع والحجم من المرحلة ٤) ═══ */}
                    {!order.is_sent_to_customer && !mainConfirmed && !showModificationForm && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-5 w-full"
                        >
                            {/* صور مصغرة — عند إدراج أكثر من صورة للموكاب */}
                            {images.length > 1 && (
                                <div className="rounded-2xl p-4 bg-theme-faint border border-theme-subtle">
                                    <p className="text-xs font-medium text-theme-subtle mb-3 uppercase tracking-wider">صور مصغرة — الموكاب</p>
                                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                                        {images.map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveImage(i)}
                                                className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 transition-all duration-200 ${activeImage === i ? "border-gold ring-2 ring-gold/20 shadow-lg shadow-gold/10" : "border-theme-soft hover:border-white/20 hover:scale-[1.02]"}`}
                                            >
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* صور مصغرة — التصميم الأول والتعديلات عند وجود تعديلات */}
                            {(order.modification_design_url || order.modification_request) && (
                                <div className="rounded-2xl p-4 bg-theme-faint border border-theme-subtle">
                                    <p className="text-xs font-medium text-theme-subtle mb-3 uppercase tracking-wider">التصميم الأول والتعديلات</p>
                                    <div className="flex gap-3 overflow-x-auto pb-1">
                                        {order.result_design_url && (
                                            <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-white/[0.12]">
                                                <img src={order.result_design_url} alt="التصميم الأول" className="w-full h-full object-cover" />
                                                <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 backdrop-blur-sm text-[10px] text-center text-theme-soft font-medium">الأول</div>
                                            </div>
                                        )}
                                        {order.modification_design_url && (
                                            <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-gold/40">
                                                <img src={order.modification_design_url} alt="بعد التعديل" className="w-full h-full object-cover" />
                                                <div className="absolute inset-x-0 bottom-0 py-1 bg-gold/20 backdrop-blur-sm text-[10px] text-center text-gold font-bold">بعد التعديل</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(position && size) && (
                                <div className="p-3 rounded-xl bg-gold/10 border border-gold/20 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        {basePrice > 0 && <span className="text-theme-soft">القطعة: {basePrice} ر.س</span>}
                                        {designPrice > 0 && <span className="text-theme-soft">التصميم: {designPrice} ر.س</span>}
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gold/20">
                                        <span className="text-sm text-theme-soft">السعر النهائي</span>
                                        <span className="text-xl font-bold text-gold">{currentPrice > 0 ? `${currentPrice} ر.س` : "مجاني"}</span>
                                    </div>
                                </div>
                            )}

                            {/* الأزرار الثلاثة */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-theme-subtle">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleConfirm}
                                    disabled={confirming}
                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 disabled:opacity-50"
                                >
                                    {confirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    تأكيد التصميم
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={async () => {
                                        if (!mainConfirmed) {
                                            const ok = await handleConfirm();
                                            if (ok) setShowAdditionalWizard(true);
                                        } else {
                                            setShowAdditionalWizard(true);
                                        }
                                    }}
                                    disabled={confirming}
                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-gold/30 bg-gold/10 text-gold font-bold text-sm hover:bg-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="إضافة تصميم إضافي على نفس القطعة"
                                >
                                    <Plus className="w-5 h-5" />
                                    انشاء تصميم إضافي
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowModificationForm(true)}
                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-theme-soft hover:border-amber-500/30 bg-theme-faint hover:bg-amber-500/5 transition-all text-theme"
                                >
                                    <Edit3 className="w-5 h-5 text-amber-400" />
                                    <span className="font-bold text-sm">تعديل التصميم</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* زر الإلغاء */}
                    {!mainConfirmed && !showAdditionalWizard && !showModificationForm && (
                        <div className="flex justify-end">
                            <button
                                onClick={onCancel}
                                disabled={confirming}
                                className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                title="إلغاء الطلب"
                            >
                                إلغاء الطلب
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
