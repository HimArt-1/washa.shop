"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WUSHA — صمم قطعتك بنفسك
//  includes auto-order creation via submitDesignOrder
//  Design Your Piece — Interactive Multi-Step Wizard
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight,
    ArrowLeft,
    Shirt,
    Palette,
    Ruler,
    Type,
    ImageIcon,
    Sparkles,
    Paintbrush,
    SwatchBook,
    Send,
    Check,
    Upload,
    X,
    MessageCircle,
} from "lucide-react";
import { getGarmentColors, getColorSizes } from "@/app/actions/smart-store";
import type {
    CustomDesignGarment,
    CustomDesignColor,
    CustomDesignSize,
    CustomDesignStyle,
    CustomDesignArtStyle,
    CustomDesignColorPackage,
} from "@/types/database";

// ─── Types ──────────────────────────────────────────────

interface WizardState {
    step: number;
    garment: CustomDesignGarment | null;
    color: CustomDesignColor | null;
    size: CustomDesignSize | null;
    method: "from_text" | "from_image" | null;
    style: CustomDesignStyle | null;
    artStyle: CustomDesignArtStyle | null;
    colorPackage: CustomDesignColorPackage | null;
    customColors: string[];
    textPrompt: string;
    imageFile: File | null;
    imagePreview: string | null;
    isSending: boolean;
    sent: boolean;
}

const INITIAL_STATE: WizardState = {
    step: 1,
    garment: null,
    color: null,
    size: null,
    method: null,
    style: null,
    artStyle: null,
    colorPackage: null,
    customColors: [],
    textPrompt: "",
    imageFile: null,
    imagePreview: null,
    isSending: false,
    sent: false,
};

const TOTAL_STEPS = 8;

const STEP_INFO = [
    { num: 1, label: "القطعة", icon: Shirt },
    { num: 2, label: "اللون", icon: Palette },
    { num: 3, label: "المقاس", icon: Ruler },
    { num: 4, label: "الطريقة", icon: Sparkles },
    { num: 5, label: "النمط", icon: Paintbrush },
    { num: 6, label: "الأسلوب", icon: SwatchBook },
    { num: 7, label: "الألوان", icon: Palette },
    { num: 8, label: "الإرسال", icon: Send },
];

interface Props {
    garments: CustomDesignGarment[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
}

// ─── Main Wizard ────────────────────────────────────────

import { OrderTracker, getStoredOrderId, storeOrderId, clearOrderId } from "./OrderTracker";
import { getDesignOrderPublic } from "@/app/actions/smart-store";

export function DesignYourPieceWizard({ garments, styles, artStyles, colorPackages }: Props) {
    const [state, setState] = useState<WizardState>(INITIAL_STATE);
    const [colors, setColors] = useState<CustomDesignColor[]>([]);
    const [sizes, setSizes] = useState<CustomDesignSize[]>([]);
    const [loadingColors, setLoadingColors] = useState(false);
    const [loadingSizes, setLoadingSizes] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [checkingOrder, setCheckingOrder] = useState(true);

    // Check for existing active order on mount
    useEffect(() => {
        const storedId = getStoredOrderId();
        if (!storedId) { setCheckingOrder(false); return; }
        getDesignOrderPublic(storedId).then((order) => {
            if (order && !['completed', 'cancelled'].includes(order.status)) {
                setActiveOrderId(storedId);
            } else {
                clearOrderId();
            }
            setCheckingOrder(false);
        }).catch(() => { clearOrderId(); setCheckingOrder(false); });
    }, []);

    // Fetch colors when garment changes
    useEffect(() => {
        if (!state.garment) return;
        setLoadingColors(true);
        getGarmentColors(state.garment.id).then((c) => {
            setColors(c);
            setLoadingColors(false);
        });
    }, [state.garment]);

    // Fetch sizes when garment+color change
    useEffect(() => {
        if (!state.garment) return;
        setLoadingSizes(true);
        getColorSizes(state.garment.id, state.color?.id).then((s) => {
            setSizes(s);
            setLoadingSizes(false);
        });
    }, [state.garment, state.color]);

    const goNext = () => setState((s) => ({ ...s, step: Math.min(s.step + 1, TOTAL_STEPS) }));
    const goBack = () => setState((s) => ({ ...s, step: Math.max(s.step - 1, 1) }));

    const handleSend = useCallback(async () => {
        setState((s) => ({ ...s, isSending: true }));

        // 1. Submit design order to database
        try {
            const { submitDesignOrder } = await import("@/app/actions/smart-store");
            const result = await submitDesignOrder({
                garment_name: state.garment?.name ?? "—",
                garment_image_url: state.garment?.image_url ?? undefined,
                color_name: state.color?.name ?? "—",
                color_hex: state.color?.hex_code ?? "#000000",
                color_image_url: state.color?.image_url ?? undefined,
                size_name: state.size?.name ?? "—",
                design_method: state.method ?? "from_text",
                text_prompt: state.textPrompt || undefined,
                reference_image_url: state.imagePreview ?? undefined,
                style_name: state.style?.name ?? "—",
                style_image_url: state.style?.image_url ?? undefined,
                art_style_name: state.artStyle?.name ?? "—",
                art_style_image_url: state.artStyle?.image_url ?? undefined,
                color_package_name: state.colorPackage?.name ?? undefined,
                custom_colors: state.customColors.length > 0 ? state.customColors : undefined,
            });
            if (result.error) {
                console.error("Order creation error:", result.error);
            } else if (result.orderId) {
                storeOrderId(result.orderId);
                setActiveOrderId(result.orderId);
            }
        } catch (err) {
            console.error("submitDesignOrder failed:", err);
        }

        // 2. Build summary message in Arabic
        const lines = [
            "🎨 *طلب تصميم قطعة جديد*",
            "",
            `📦 القطعة: ${state.garment?.name ?? "—"}`,
            `🎨 اللون: ${state.color?.name ?? "—"} ${state.color?.hex_code ?? ""}`,
            `📏 المقاس: ${state.size?.name ?? "—"}`,
            `✍️ طريقة التصميم: ${state.method === "from_text" ? "من نص" : "من صورة"}`,
            `🖌️ النمط: ${state.style?.name ?? "—"}`,
            `🎭 الأسلوب: ${state.artStyle?.name ?? "—"}`,
        ];

        if (state.colorPackage) {
            lines.push(`🌈 باقة الألوان: ${state.colorPackage.name}`);
        }
        if (state.customColors.length > 0) {
            lines.push(`🎨 ألوان مخصصة: ${state.customColors.join(", ")}`);
        }
        if (state.textPrompt) {
            lines.push("", `📝 وصف التصميم:`, state.textPrompt);
        }
        if (state.imagePreview) {
            lines.push("", "📸 تم إرفاق صورة مرجعية");
        }

        const summaryText = lines.join("\n");

        // 3. Also send via Reamaze as backup
        try {
            if (typeof window !== "undefined" && (window as any)._support) {
                const reamazeWidget = document.querySelector("[data-reamaze-widget]") as HTMLElement;
                if (reamazeWidget) reamazeWidget.click();
                setTimeout(() => {
                    const textarea = document.querySelector(".reamaze-widget textarea, .reamaze-shoutbox textarea") as HTMLTextAreaElement;
                    if (textarea) {
                        textarea.value = summaryText;
                        textarea.dispatchEvent(new Event("input", { bubbles: true }));
                        setTimeout(() => {
                            const submitBtn = document.querySelector(".reamaze-widget button[type='submit'], .reamaze-shoutbox button[type='submit']") as HTMLButtonElement;
                            if (submitBtn) submitBtn.click();
                        }, 500);
                    }
                }, 1000);
            }
        } catch {
            await navigator.clipboard.writeText(summaryText).catch(() => { });
        }

        setState((s) => ({ ...s, isSending: false, sent: true }));
    }, [state]);

    if (checkingOrder) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-4" />
                <p className="text-fg/40 text-sm">جاري التحقق من الطلبات...</p>
            </div>
        );
    }

    if (activeOrderId) {
        return <OrderTracker orderId={activeOrderId} />;
    }

    return (
        <div className="space-y-8">
            {/* ─── Header ─── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-l from-gold via-gold-light to-gold bg-clip-text text-transparent">
                    صمّم قطعتك بنفسك
                </h1>
                <p className="text-fg/50 mt-3 text-sm sm:text-base max-w-xl mx-auto">
                    اختر قطعتك ولونها، حدد نمط التصميم، وأرسل طلبك — ننفذه لك بالضبط
                </p>
            </motion.div>

            {/* ─── Progress Bar ─── */}
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-1">
                    {STEP_INFO.map((s, i) => {
                        const Icon = s.icon;
                        const isActive = state.step === s.num;
                        const isDone = state.step > s.num;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-500
                  ${isDone ? "bg-gold text-bg" : isActive ? "bg-gold/20 text-gold border-2 border-gold" : "bg-white/[0.04] text-fg/30 border border-white/[0.08]"}
                `}>
                                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                </div>
                                <span className={`text-[10px] font-medium hidden sm:block ${isActive ? "text-gold" : "text-fg/30"}`}>
                                    {s.label}
                                </span>
                                {i < STEP_INFO.length - 1 && (
                                    <div className="sr-only" />
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Progress line */}
                <div className="h-1 bg-white/[0.06] rounded-full mt-3 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-l from-gold to-gold-light rounded-full"
                        animate={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            </div>

            {/* ─── Step Content ─── */}
            <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state.step}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 lg:p-10 min-h-[400px]"
                    >
                        {state.step === 1 && (
                            <StepGarment garments={garments} selected={state.garment} onSelect={(g) => setState((s) => ({ ...s, garment: g, color: null, size: null }))} onNext={goNext} />
                        )}
                        {state.step === 2 && (
                            <StepColor colors={colors} loading={loadingColors} selected={state.color} onSelect={(c) => setState((s) => ({ ...s, color: c }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 3 && (
                            <StepSize sizes={sizes} loading={loadingSizes} selected={state.size} onSelect={(sz) => setState((s) => ({ ...s, size: sz }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 4 && (
                            <StepMethod
                                selected={state.method}
                                onSelect={(m) => setState((s) => ({ ...s, method: m }))}
                                textPrompt={state.textPrompt}
                                onTextChange={(t) => setState((s) => ({ ...s, textPrompt: t }))}
                                imagePreview={state.imagePreview}
                                onImageChange={(file, preview) => setState((s) => {
                                    if (s.imagePreview) URL.revokeObjectURL(s.imagePreview);
                                    return { ...s, imageFile: file, imagePreview: preview };
                                })}
                                onBack={goBack}
                                onNext={goNext}
                            />
                        )}
                        {state.step === 5 && (
                            <StepStyle items={styles} selected={state.style} onSelect={(s) => setState((st) => ({ ...st, style: s }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 6 && (
                            <StepArtStyle items={artStyles} selected={state.artStyle} onSelect={(a) => setState((s) => ({ ...s, artStyle: a }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 7 && (
                            <StepColorPalette
                                packages={colorPackages}
                                selectedPackage={state.colorPackage}
                                onSelectPackage={(p) => setState((s) => ({ ...s, colorPackage: p }))}
                                customColors={state.customColors}
                                onCustomColorsChange={(c) => setState((s) => ({ ...s, customColors: c }))}
                                onBack={goBack}
                                onNext={goNext}
                            />
                        )}
                        {state.step === 8 && (
                            <StepSubmit state={state} onBack={goBack} onSend={handleSend} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Shared UI
// ═══════════════════════════════════════════════════════════

const btnPrimary = "flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 disabled:opacity-40";
const btnBack = "flex items-center gap-2 px-5 py-3 rounded-2xl border border-white/[0.08] text-fg/50 text-sm hover:bg-white/[0.04] transition-all";

function StepHeader({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-fg">{title}</h2>
            <p className="text-fg/40 mt-1 text-sm">{desc}</p>
        </div>
    );
}

function NavButtons({ onBack, onNext, nextLabel, nextDisabled }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
    return (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
            {onBack ? (
                <button onClick={onBack} className={btnBack}>
                    <ArrowRight className="w-4 h-4" />
                    السابق
                </button>
            ) : <div />}
            <button onClick={onNext} disabled={nextDisabled} className={btnPrimary}>
                {nextLabel ?? "التالي"}
                <ArrowLeft className="w-4 h-4" />
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 1: Garment
// ═══════════════════════════════════════════════════════════

function StepGarment({ garments, selected, onSelect, onNext }: {
    garments: CustomDesignGarment[];
    selected: CustomDesignGarment | null;
    onSelect: (g: CustomDesignGarment) => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر القطعة" desc="حدد نوع الملابس اللي تبغى تصمم عليها" />
            {garments.length === 0 ? (
                <div className="text-center py-20 text-fg/30">
                    <Shirt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>لا توجد قطع متاحة حالياً</p>
                    <p className="text-xs mt-1">يتم إضافة القطع من لوحة الإدارة</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {garments.map((g) => {
                        const isSelected = selected?.id === g.id;
                        return (
                            <motion.button
                                key={g.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(g)}
                                className={`
                  relative rounded-2xl overflow-hidden border-2 transition-all duration-300 p-1
                  ${isSelected ? "border-gold shadow-lg shadow-gold/20" : "border-white/[0.08] hover:border-white/20"}
                `}
                            >
                                {g.image_url ? (
                                    <img src={g.image_url} alt={g.name} className="w-full aspect-[3/4] object-cover rounded-xl bg-white/5" />
                                ) : (
                                    <div className="w-full aspect-[3/4] rounded-xl bg-white/[0.04] flex items-center justify-center">
                                        <Shirt className="w-12 h-12 text-fg/20" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-sm font-bold text-white">{g.name}</p>
                                </div>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gold flex items-center justify-center"
                                    >
                                        <Check className="w-4 h-4 text-bg" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            )}
            <NavButtons onNext={onNext} nextDisabled={!selected} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 2: Color
// ═══════════════════════════════════════════════════════════

function StepColor({ colors, loading, selected, onSelect, onBack, onNext }: {
    colors: CustomDesignColor[];
    loading: boolean;
    selected: CustomDesignColor | null;
    onSelect: (c: CustomDesignColor) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر اللون" desc="اختر لون القطعة المفضل عندك" />
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
            ) : colors.length === 0 ? (
                <div className="text-center py-20 text-fg/30">
                    <p>لا توجد ألوان متاحة لهذه القطعة</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {colors.map((c) => {
                        const isSelected = selected?.id === c.id;
                        return (
                            <motion.button
                                key={c.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelect(c)}
                                className={`
                  flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all
                  ${isSelected ? "border-gold bg-gold/5" : "border-white/[0.06] hover:border-white/20"}
                `}
                            >
                                {c.image_url ? (
                                    <img src={c.image_url} alt={c.name} className="w-full aspect-square object-cover rounded-xl" />
                                ) : (
                                    <div
                                        className="w-16 h-16 rounded-2xl border-2 border-white/10 shadow-inner"
                                        style={{ backgroundColor: c.hex_code }}
                                    />
                                )}
                                <span className={`text-xs font-medium ${isSelected ? "text-gold" : "text-fg/60"}`}>{c.name}</span>
                                {isSelected && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                                        <Check className="w-3 h-3 text-bg" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            )}
            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!selected} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 3: Size
// ═══════════════════════════════════════════════════════════

function StepSize({ sizes, loading, selected, onSelect, onBack, onNext }: {
    sizes: CustomDesignSize[];
    loading: boolean;
    selected: CustomDesignSize | null;
    onSelect: (s: CustomDesignSize) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر المقاس" desc="حدد المقاس المناسب لك" />
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
            ) : sizes.length === 0 ? (
                <div className="text-center py-20 text-fg/30">
                    <p>لا توجد مقاسات متاحة</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {sizes.map((sz) => {
                        const isSelected = selected?.id === sz.id;
                        return (
                            <motion.button
                                key={sz.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelect(sz)}
                                className={`
                  flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all
                  ${isSelected ? "border-gold bg-gold/10 shadow-lg shadow-gold/10" : "border-white/[0.06] hover:border-white/20"}
                `}
                            >
                                <span className={`text-xl font-bold ${isSelected ? "text-gold" : "text-fg/60"}`}>{sz.name}</span>
                                {isSelected && <Check className="w-4 h-4 text-gold" />}
                            </motion.button>
                        );
                    })}
                </div>
            )}
            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!selected} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 4: Design Method
// ═══════════════════════════════════════════════════════════

function StepMethod({ selected, onSelect, textPrompt, onTextChange, imagePreview, onImageChange, onBack, onNext }: {
    selected: "from_text" | "from_image" | null;
    onSelect: (m: "from_text" | "from_image") => void;
    textPrompt: string;
    onTextChange: (t: string) => void;
    imagePreview: string | null;
    onImageChange: (file: File | null, preview: string | null) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file) {
            onImageChange(file, URL.createObjectURL(file));
        }
    };

    const canProceed = selected && (
        (selected === "from_text" && textPrompt.trim().length > 0) ||
        (selected === "from_image" && !!imagePreview)
    );

    return (
        <>
            <StepHeader title="طريقة التصميم" desc="كيف تبغى تصمم قطعتك؟" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                    { id: "from_text" as const, label: "من نص", desc: "صف التصميم اللي تبغاه بالكلمات", icon: Type, emoji: "✍️" },
                    { id: "from_image" as const, label: "من صورة", desc: "ارفع صورة مرجعية لتصميمك", icon: ImageIcon, emoji: "🖼️" },
                ].map((m) => {
                    const isActive = selected === m.id;
                    return (
                        <motion.button
                            key={m.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect(m.id)}
                            className={`
                relative p-6 sm:p-8 rounded-2xl border-2 text-right transition-all
                ${isActive ? "border-gold bg-gold/5" : "border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]"}
              `}
                        >
                            <div className="text-4xl mb-4">{m.emoji}</div>
                            <p className={`text-lg font-bold ${isActive ? "text-gold" : "text-fg"}`}>{m.label}</p>
                            <p className="text-xs text-fg/40 mt-1">{m.desc}</p>
                            {isActive && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-4 left-4 w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-bg" />
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Text input */}
            <AnimatePresence>
                {selected === "from_text" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <textarea
                            value={textPrompt}
                            onChange={(e) => onTextChange(e.target.value)}
                            placeholder="اكتب وصف التصميم اللي تبغاه... مثال: خط عربي بكلمة 'حلم' بلون ذهبي على خلفية سوداء"
                            className="w-full px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-fg placeholder:text-fg/25 focus:outline-none focus:border-gold/40 transition-colors text-sm resize-none"
                            rows={4}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image upload */}
            <AnimatePresence>
                {selected === "from_image" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        {imagePreview ? (
                            <div className="relative inline-block">
                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-2xl border border-white/10" />
                                <button
                                    onClick={() => onImageChange(null, null)}
                                    className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-gold/30 cursor-pointer transition-colors bg-white/[0.02]">
                                <Upload className="w-10 h-10 text-fg/30" />
                                <span className="text-sm text-fg/40">اسحب الصورة هنا أو اضغط للرفع</span>
                                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                            </label>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 5: Style
// ═══════════════════════════════════════════════════════════

function StepStyle({ items, selected, onSelect, onBack, onNext }: {
    items: CustomDesignStyle[];
    selected: CustomDesignStyle | null;
    onSelect: (s: CustomDesignStyle) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر النمط" desc="حدد نمط التصميم اللي يعجبك" />
            {items.length === 0 ? (
                <div className="text-center py-20 text-fg/30"><p>لا توجد أنماط متاحة حالياً</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {items.map((s) => {
                        const isSelected = selected?.id === s.id;
                        return (
                            <motion.button
                                key={s.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(s)}
                                className={`
                  relative rounded-2xl overflow-hidden border-2 transition-all p-1
                  ${isSelected ? "border-gold shadow-lg shadow-gold/20" : "border-white/[0.08] hover:border-white/20"}
                `}
                            >
                                {s.image_url ? (
                                    <img src={s.image_url} alt={s.name} className="w-full aspect-square object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center">
                                        <Sparkles className="w-10 h-10 text-fg/15" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-sm font-bold text-white">{s.name}</p>
                                    {s.description && <p className="text-[10px] text-white/50 mt-0.5 line-clamp-1">{s.description}</p>}
                                </div>
                                {isSelected && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gold flex items-center justify-center">
                                        <Check className="w-4 h-4 text-bg" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            )}
            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!selected} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 6: Art Style
// ═══════════════════════════════════════════════════════════

function StepArtStyle({ items, selected, onSelect, onBack, onNext }: {
    items: CustomDesignArtStyle[];
    selected: CustomDesignArtStyle | null;
    onSelect: (a: CustomDesignArtStyle) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر الأسلوب" desc="حدد أسلوب الرسم للتصميم" />
            {items.length === 0 ? (
                <div className="text-center py-20 text-fg/30"><p>لا توجد أساليب متاحة حالياً</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((a) => {
                        const isSelected = selected?.id === a.id;
                        return (
                            <motion.button
                                key={a.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(a)}
                                className={`
                  relative rounded-2xl overflow-hidden border-2 transition-all p-1
                  ${isSelected ? "border-gold shadow-lg shadow-gold/20" : "border-white/[0.08] hover:border-white/20"}
                `}
                            >
                                {a.image_url ? (
                                    <img src={a.image_url} alt={a.name} className="w-full aspect-square object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center">
                                        <Paintbrush className="w-10 h-10 text-fg/15" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-sm font-bold text-white">{a.name}</p>
                                </div>
                                {isSelected && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gold flex items-center justify-center">
                                        <Check className="w-4 h-4 text-bg" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            )}
            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!selected} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 7: Color Palette
// ═══════════════════════════════════════════════════════════

function StepColorPalette({ packages, selectedPackage, onSelectPackage, customColors, onCustomColorsChange, onBack, onNext }: {
    packages: CustomDesignColorPackage[];
    selectedPackage: CustomDesignColorPackage | null;
    onSelectPackage: (p: CustomDesignColorPackage | null) => void;
    customColors: string[];
    onCustomColorsChange: (c: string[]) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const [showCustom, setShowCustom] = useState(false);

    const canProceed = !!selectedPackage || customColors.length > 0;

    return (
        <>
            <StepHeader title="اختر الألوان" desc="حدد باقة ألوان جاهزة أو خصص ألوانك" />

            {/* Packages */}
            {packages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {packages.map((pkg) => {
                        const isSelected = selectedPackage?.id === pkg.id;
                        return (
                            <motion.button
                                key={pkg.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { onSelectPackage(isSelected ? null : pkg); setShowCustom(false); }}
                                className={`
                  p-5 rounded-2xl border-2 transition-all text-right
                  ${isSelected ? "border-gold bg-gold/5" : "border-white/[0.08] hover:border-white/20"}
                `}
                            >
                                <p className={`font-bold text-sm mb-3 ${isSelected ? "text-gold" : "text-fg"}`}>{pkg.name}</p>
                                <div className="flex gap-1.5 flex-wrap">
                                    {(Array.isArray(pkg.colors) ? pkg.colors : []).map((c: any, i: number) => (
                                        <div key={i} className="w-7 h-7 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: c.hex }} title={c.name} />
                                    ))}
                                </div>
                                {isSelected && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 flex items-center gap-1 text-gold text-xs">
                                        <Check className="w-3.5 h-3.5" /> محدد
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            )}

            {/* Custom Colors Toggle */}
            <button
                onClick={() => { setShowCustom(!showCustom); onSelectPackage(null); }}
                className={`mb-4 text-sm font-medium transition-colors ${showCustom ? "text-gold" : "text-fg/40 hover:text-fg/60"}`}
            >
                🎨 تخصيص ألوان يدوياً
            </button>

            <AnimatePresence>
                {showCustom && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                        {customColors.map((c, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={c}
                                    onChange={(e) => {
                                        const arr = [...customColors];
                                        arr[i] = e.target.value;
                                        onCustomColorsChange(arr);
                                    }}
                                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                                />
                                <span className="text-sm text-fg/50 font-mono">{c}</span>
                                <button onClick={() => onCustomColorsChange(customColors.filter((_, j) => j !== i))} className="p-1.5 hover:bg-red-500/10 rounded-lg">
                                    <X className="w-4 h-4 text-red-400/60" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => onCustomColorsChange([...customColors, "#ceae7f"])}
                            className="text-xs text-gold hover:text-gold-light transition-colors"
                        >
                            + أضف لون
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 8: Submit
// ═══════════════════════════════════════════════════════════

function StepSubmit({ state, onBack, onSend }: { state: WizardState; onBack: () => void; onSend: () => void }) {
    if (state.sent) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-gold-light mx-auto mb-6 flex items-center justify-center"
                >
                    <Check className="w-10 h-10 text-bg" />
                </motion.div>
                <h2 className="text-2xl font-bold text-fg mb-2">تم إرسال طلبك! 🎉</h2>
                <p className="text-fg/50 max-w-md mx-auto">
                    تم إرسال تفاصيل طلبك لفريقنا. بيتواصل معاك موظفنا في أقرب وقت لتنفيذ التصميم.
                </p>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-fg/50 text-sm"
                >
                    <MessageCircle className="w-4 h-4" />
                    تقدر تتابع طلبك من نافذة الدردشة
                </motion.div>
            </motion.div>
        );
    }

    return (
        <>
            <StepHeader title="مراجعة وإرسال" desc="تأكد من تفاصيل طلبك قبل الإرسال" />

            <div className="space-y-4 mb-8">
                <SummaryRow label="القطعة" value={state.garment?.name} />
                <SummaryRow label="اللون" value={state.color?.name} color={state.color?.hex_code} />
                <SummaryRow label="المقاس" value={state.size?.name} />
                <SummaryRow label="طريقة التصميم" value={state.method === "from_text" ? "من نص" : state.method === "from_image" ? "من صورة" : undefined} />
                <SummaryRow label="النمط" value={state.style?.name} />
                <SummaryRow label="الأسلوب" value={state.artStyle?.name} />
                {state.colorPackage && <SummaryRow label="باقة الألوان" value={state.colorPackage.name} />}
                {state.customColors.length > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-sm text-fg/50">ألوان مخصصة</span>
                        <div className="flex gap-1">
                            {state.customColors.map((c, i) => (
                                <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                )}
                {state.textPrompt && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-xs text-fg/40 block mb-1">وصف التصميم</span>
                        <p className="text-sm text-fg/70">{state.textPrompt}</p>
                    </div>
                )}
                {state.imagePreview && (
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <span className="text-xs text-fg/40 block mb-2">الصورة المرجعية</span>
                        <img src={state.imagePreview} alt="Reference" className="max-h-32 rounded-xl" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
                <button onClick={onBack} className={btnBack}>
                    <ArrowRight className="w-4 h-4" />
                    السابق
                </button>
                <button
                    onClick={onSend}
                    disabled={state.isSending}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-xl hover:shadow-gold/30 transition-all duration-300 disabled:opacity-50"
                >
                    {state.isSending ? (
                        <>
                            <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                            جاري الإرسال...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            إرسال الطلب
                        </>
                    )}
                </button>
            </div>
        </>
    );
}

function SummaryRow({ label, value, color }: { label: string; value?: string; color?: string }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-sm text-fg/50">{label}</span>
            <div className="flex items-center gap-2">
                {color && <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />}
                <span className="text-sm font-medium text-fg">{value ?? "—"}</span>
            </div>
        </div>
    );
}
