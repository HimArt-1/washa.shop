"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, MapPin, Maximize2, Minimize2, Loader2, Paintbrush, SwatchBook, Sparkles } from "lucide-react";
import { getDesignStyles, getArtStyles, getColorPackages, getGarmentPricing, submitAdditionalDesignOrder } from "@/app/actions/smart-store";
import type { CustomDesignOrder } from "@/types/database";
import type { CustomDesignStyle, CustomDesignArtStyle, CustomDesignColorPackage } from "@/types/database";

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

export function AdditionalDesignMiniWizard({
    order,
    mainPosition,
    onBack,
    onSuccess,
    onError,
}: {
    order: CustomDesignOrder;
    mainPosition: PrintPosition | null;
    onBack: () => void;
    onSuccess: (orderId: string) => void;
    onError: (msg: string) => void;
}) {
    const [step, setStep] = useState(1);
    const [position, setPosition] = useState<PrintPosition | null>(null);
    const [size, setSize] = useState<PrintSize | null>(null);
    const [styles, setStyles] = useState<CustomDesignStyle[]>([]);
    const [artStyles, setArtStyles] = useState<CustomDesignArtStyle[]>([]);
    const [colorPackages, setColorPackages] = useState<CustomDesignColorPackage[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<CustomDesignStyle | null>(null);
    const [selectedArtStyle, setSelectedArtStyle] = useState<CustomDesignArtStyle | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<CustomDesignColorPackage | null>(null);
    const [customColors, setCustomColors] = useState<string[]>([]);
    const [pricing, setPricing] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const excludedPositions = mainPosition ? [mainPosition] : [];
    const availablePositions = POSITIONS.filter((p) => !excludedPositions.includes(p.id));

    useEffect(() => {
        Promise.all([
            getDesignStyles(),
            getArtStyles(),
            getColorPackages(),
            getGarmentPricing(order.garment_name),
        ]).then(([s, a, c, p]) => {
            setStyles(s);
            setArtStyles(a);
            setColorPackages(c);
            setPricing(p);
            const styleMatch = s.find((x) => x.name === order.style_name);
            const artMatch = a.find((x) => x.name === order.art_style_name);
            const pkgMatch = c.find((x) => x.name === order.color_package_name);
            setSelectedStyle(styleMatch || null);
            setSelectedArtStyle(artMatch || null);
            setSelectedPackage(pkgMatch || null);
            const cc = Array.isArray(order.custom_colors)
                ? order.custom_colors.map((x) => (typeof x === "string" ? x : (x as { hex?: string })?.hex)).filter(Boolean) as string[]
                : [];
            setCustomColors(cc.length > 0 ? cc : []);
            setLoading(false);
        });
    }, [order]);

    const currentPrice = position && size && pricing ? getPrice(pricing, position, size) : 0;

    const handleSubmit = async () => {
        if (!position || !size || !selectedStyle || !selectedArtStyle) return;
        const canProceed = !!selectedPackage || customColors.length > 0;
        if (!canProceed) {
            onError("اختر باقة ألوان أو خصص ألوانك");
            return;
        }
        setSubmitting(true);
        const result = await submitAdditionalDesignOrder(order.id, {
            print_position: position,
            print_size: size,
            style_name: selectedStyle.name,
            style_image_url: selectedStyle.image_url,
            art_style_name: selectedArtStyle.name,
            art_style_image_url: selectedArtStyle.image_url,
            color_package_name: selectedPackage?.name ?? null,
            custom_colors: customColors.length > 0 ? customColors : undefined,
        });
        setSubmitting(false);
        if ("error" in result) {
            onError(result.error);
            return;
        }
        onSuccess((result as any).orderId);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-gold mb-4" />
                <p className="text-fg/50 text-sm">جاري تحميل الخيارات...</p>
            </div>
        );
    }

    const totalSteps = 4;
    const canProceedStep1 = position && size;
    const canProceedStep2 = !!selectedStyle;
    const canProceedStep3 = !!selectedArtStyle;
    const canProceedStep4 = !!selectedPackage || customColors.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-fg">إنشاء تصميم إضافي</h3>
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full transition-colors ${step >= s ? "bg-gold" : "bg-white/20"}`}
                        />
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-fg/60">
                            اختر موقعاً مختلفاً عن التصميم الأساسي ({mainPosition ? POSITIONS.find((p) => p.id === mainPosition)?.label : "—"})
                        </p>
                        <div>
                            <p className="text-sm font-bold text-fg mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gold" /> موقع التصميم
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {availablePositions.map((pos) => {
                                    const isActive = position === pos.id;
                                    return (
                                        <motion.button
                                            key={pos.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { setPosition(pos.id); setSize(null); }}
                                            className={`relative p-4 rounded-2xl border-2 transition-all text-center ${isActive ? "border-gold bg-gold/10" : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"}`}
                                        >
                                            <div className="text-2xl mb-1">{pos.emoji}</div>
                                            <p className={`text-sm font-bold ${isActive ? "text-gold" : "text-fg"}`}>{pos.label}</p>
                                            {isActive && <Check className="absolute top-2 left-2 w-4 h-4 text-gold" />}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                        {position && (
                            <div>
                                <p className="text-sm font-bold text-fg mb-3 flex items-center gap-2">
                                    <Maximize2 className="w-4 h-4 text-gold" /> حجم التصميم
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["large", "small"] as PrintSize[]).map((sz) => {
                                        const isActive = size === sz;
                                        const price = pricing ? getPrice(pricing, position, sz) : 0;
                                        return (
                                            <motion.button
                                                key={sz}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setSize(sz)}
                                                className={`relative p-4 rounded-2xl border-2 transition-all ${isActive ? "border-gold bg-gold/10" : "border-white/[0.08] hover:border-white/20"}`}
                                            >
                                                <p className={`font-bold ${isActive ? "text-gold" : "text-fg"}`}>{SIZE_LABELS[sz].label}</p>
                                                <p className="text-xs text-fg/50 mt-1">{price > 0 ? `${price} ر.س` : "مجاني"}</p>
                                                {isActive && <Check className="absolute top-2 left-2 w-4 h-4 text-gold" />}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-fg/60">معيّن تلقائياً من التصميم الأساسي — يمكنك التغيير</p>
                        <p className="text-sm font-bold text-fg flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-gold" /> النمط
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {styles.map((s) => {
                                const isSelected = selectedStyle?.id === s.id;
                                return (
                                    <motion.button
                                        key={s.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedStyle(s)}
                                        className={`relative rounded-2xl overflow-hidden border-2 p-1 ${isSelected ? "border-gold" : "border-white/[0.08] hover:border-white/20"}`}
                                    >
                                        {s.image_url ? (
                                            <img src={s.image_url} alt={s.name} className="w-full aspect-square object-cover rounded-xl" />
                                        ) : (
                                            <div className="w-full aspect-square rounded-xl bg-white/[0.04] flex items-center justify-center">
                                                <Sparkles className="w-8 h-8 text-fg/20" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-xs font-bold text-white">{s.name}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                                <Check className="w-3.5 h-3.5 text-bg" />
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-fg/60">معيّن تلقائياً — يمكنك التغيير</p>
                        <p className="text-sm font-bold text-fg flex items-center gap-2">
                            <Paintbrush className="w-4 h-4 text-gold" /> الأسلوب
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {artStyles.map((a) => {
                                const isSelected = selectedArtStyle?.id === a.id;
                                return (
                                    <motion.button
                                        key={a.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedArtStyle(a)}
                                        className={`relative rounded-2xl overflow-hidden border-2 p-1 ${isSelected ? "border-gold" : "border-white/[0.08] hover:border-white/20"}`}
                                    >
                                        {a.image_url ? (
                                            <img src={a.image_url} alt={a.name} className="w-full aspect-square object-cover rounded-xl" />
                                        ) : (
                                            <div className="w-full aspect-square rounded-xl bg-white/[0.04] flex items-center justify-center">
                                                <Paintbrush className="w-8 h-8 text-fg/20" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-xs font-bold text-white truncate">{a.name}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                                <Check className="w-3.5 h-3.5 text-bg" />
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div
                        key="step4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-fg/60">معيّن تلقائياً — يمكنك التغيير</p>
                        <p className="text-sm font-bold text-fg flex items-center gap-2">
                            <SwatchBook className="w-4 h-4 text-gold" /> الألوان
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {colorPackages.map((pkg) => {
                                const isSelected = selectedPackage?.id === pkg.id;
                                return (
                                    <motion.button
                                        key={pkg.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => { setSelectedPackage(isSelected ? null : pkg); setCustomColors([]); }}
                                        className={`p-4 rounded-2xl border-2 text-right ${isSelected ? "border-gold bg-gold/5" : "border-white/[0.08] hover:border-white/20"}`}
                                    >
                                        <p className={`font-bold text-sm mb-2 ${isSelected ? "text-gold" : "text-fg"}`}>{pkg.name}</p>
                                        <div className="flex gap-1 flex-wrap">
                                            {(Array.isArray(pkg.colors) ? pkg.colors : []).map((c: any, i: number) => (
                                                <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} />
                                            ))}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-gold mt-2" />}
                                    </motion.button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => { setSelectedPackage(null); setCustomColors(customColors.length > 0 ? customColors : ["#ceae7f"]); }}
                            className="text-sm text-gold hover:text-gold-light"
                        >
                            🎨 تخصيص ألوان يدوياً
                        </button>
                        {customColors.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                {customColors.map((c, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                        <input
                                            type="color"
                                            value={c}
                                            onChange={(e) => {
                                                const arr = [...customColors];
                                                arr[i] = e.target.value;
                                                setCustomColors(arr);
                                            }}
                                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                        />
                                        <button onClick={() => setCustomColors(customColors.filter((_, j) => j !== i))} className="text-red-400 text-xs">×</button>
                                    </div>
                                ))}
                                <button onClick={() => setCustomColors([...customColors, "#ceae7f"])} className="text-xs text-gold">+ لون</button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-between pt-4 border-t border-white/[0.06]">
                <button
                    onClick={step === 1 ? onBack : () => setStep((s) => s - 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-fg/60 text-sm hover:bg-white/[0.04]"
                >
                    <ArrowRight className="w-4 h-4" /> {step === 1 ? "رجوع" : "السابق"}
                </button>
                {step < 4 ? (
                    <button
                        onClick={() => setStep((s) => s + 1)}
                        disabled={
                            (step === 1 && !canProceedStep1) ||
                            (step === 2 && !canProceedStep2) ||
                            (step === 3 && !canProceedStep3)
                        }
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gold/20 text-gold font-bold text-sm disabled:opacity-40"
                    >
                        التالي <ArrowLeft className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !canProceedStep4}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {submitting ? "جاري الإرسال..." : "إرسال التصميم الإضافي"}
                    </button>
                )}
            </div>

            {step === 1 && position && size && (
                <div className="p-3 rounded-xl bg-gold/10 border border-gold/20 text-center">
                    <span className="text-gold font-bold">{currentPrice > 0 ? `${currentPrice} ر.س` : "مجاني"}</span>
                    <span className="text-fg/50 text-sm mr-1"> — سعر التصميم الإضافي</span>
                </div>
            )}
        </motion.div>
    );
}
