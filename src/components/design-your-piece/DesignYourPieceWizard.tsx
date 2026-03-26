"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — صمم قطعتك بنفسك
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
    MapPin,
    Maximize2,
    Minimize2,
    Loader2,
    UserCircle,
    Lock,
    Wand2,
    Layers3,
    BadgeCheck,
} from "lucide-react";
import { useAuth, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCartStore } from "@/stores/cartStore";
import { getGarmentColors, getColorSizes } from "@/app/actions/smart-store";
import type {
    CustomDesignGarment,
    CustomDesignColor,
    CustomDesignSize,
    CustomDesignStyle,
    CustomDesignArtStyle,
    CustomDesignColorPackage,
    CustomDesignStudioItem,
    GarmentStudioMockup,
    CustomDesignPreset,
    CustomDesignOptionCompatibility,
} from "@/types/database";
import {
    getCompatibilityLookup,
    rankDesignCandidates,
    rankDesignPresets,
    type DesignIntelligenceMetadata,
    type PrintPosition,
    type PrintSize,
    type RankedDesignCandidate,
} from "@/lib/design-intelligence";

// ─── Types ──────────────────────────────────────────────

interface WizardState {
    step: number;
    preset: CustomDesignPreset | null;
    garment: CustomDesignGarment | null;
    color: CustomDesignColor | null;
    size: CustomDesignSize | null;
    method: "from_text" | "from_image" | "studio" | null;
    studioItem: CustomDesignStudioItem | null;
    style: CustomDesignStyle | null;
    artStyle: CustomDesignArtStyle | null;
    colorPackage: CustomDesignColorPackage | null;
    customColors: string[];
    textPrompt: string;
    imageFile: File | null;
    imagePreview: string | null;
    printPosition: PrintPosition | null;
    printSize: PrintSize | null;
    isSending: boolean;
    sent: boolean;
    studioCartAdded: boolean;
    submissionError: string | null;
}

const INITIAL_STATE: WizardState = {
    step: 1,
    preset: null,
    garment: null,
    color: null,
    size: null,
    method: null,
    studioItem: null,
    style: null,
    artStyle: null,
    colorPackage: null,
    customColors: [],
    textPrompt: "",
    imageFile: null,
    imagePreview: null,
    printPosition: null,
    printSize: null,
    isSending: false,
    sent: false,
    studioCartAdded: false,
    submissionError: null,
};

const TOTAL_STEPS = 9;

const STEP_INFO = [
    { num: 1, label: "القطعة", icon: Shirt },
    { num: 2, label: "اللون", icon: Palette },
    { num: 3, label: "المقاس", icon: Ruler },
    { num: 4, label: "التصميم", icon: MapPin },
    { num: 5, label: "الطريقة", icon: Sparkles },
    { num: 6, label: "النمط", icon: Paintbrush },
    { num: 7, label: "الأسلوب", icon: SwatchBook },
    { num: 8, label: "الألوان", icon: Palette },
    { num: 9, label: "الإرسال", icon: Send },
];

interface Props {
    garments: CustomDesignGarment[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
    studioItems: CustomDesignStudioItem[];
    garmentStudioMockups: GarmentStudioMockup[];
    presets: CustomDesignPreset[];
    compatibilities: CustomDesignOptionCompatibility[];
    aiModelShortcutEnabled?: boolean;
    dtfStudioShortcutEnabled?: boolean;
}

function getPresetOverrideLabels(state: WizardState) {
    if (!state.preset) return [];

    const overrides: string[] = [];
    if (state.preset.garment_id && state.garment?.id !== state.preset.garment_id) overrides.push("القطعة");
    if (state.preset.design_method && state.method !== state.preset.design_method) overrides.push("الطريقة");
    if (state.preset.style_id && state.style?.id !== state.preset.style_id) overrides.push("النمط");
    if (state.preset.art_style_id && state.artStyle?.id !== state.preset.art_style_id) overrides.push("الأسلوب");
    if (state.preset.color_package_id && state.colorPackage?.id !== state.preset.color_package_id) overrides.push("البالِت");
    if (state.preset.studio_item_id && state.studioItem?.id !== state.preset.studio_item_id) overrides.push("عنصر الستيديو");
    if (state.preset.print_position && state.printPosition !== state.preset.print_position) overrides.push("موقع الطباعة");
    if (state.preset.print_size && state.printSize !== state.preset.print_size) overrides.push("حجم الطباعة");

    return overrides;
}

// ─── Main Wizard ────────────────────────────────────────

import { OrderTracker, getStoredOrderAccess, storeOrderId, clearOrderId } from "./OrderTracker";
import { getDesignOrderPublic } from "@/app/actions/smart-store";

export function DesignYourPieceWizard({
    garments,
    styles,
    artStyles,
    colorPackages,
    studioItems,
    garmentStudioMockups,
    presets,
    compatibilities,
    aiModelShortcutEnabled = false,
    dtfStudioShortcutEnabled = false,
}: Props) {
    const { isSignedIn } = useAuth();
    const { addItem, toggleCart } = useCartStore();
    const [state, setState] = useState<WizardState>(INITIAL_STATE);
    const [colors, setColors] = useState<CustomDesignColor[]>([]);
    const [sizes, setSizes] = useState<CustomDesignSize[]>([]);
    const [loadingColors, setLoadingColors] = useState(false);
    const [loadingSizes, setLoadingSizes] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
    const [checkingOrder, setCheckingOrder] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const presetOverrideLabels = getPresetOverrideLabels(state);
    const presetIsFullyAligned = presetOverrideLabels.length === 0;

    const presetStyleLookup = getCompatibilityLookup(compatibilities, "preset", state.preset?.id, "style");
    const garmentStyleLookup = getCompatibilityLookup(compatibilities, "garment", state.garment?.id, "style");
    const styleArtLookup = getCompatibilityLookup(compatibilities, "style", state.style?.id, "art_style");
    const garmentArtLookup = getCompatibilityLookup(compatibilities, "garment", state.garment?.id, "art_style");
    const styleColorLookup = getCompatibilityLookup(compatibilities, "style", state.style?.id, "color_package");
    const artColorLookup = getCompatibilityLookup(compatibilities, "art_style", state.artStyle?.id, "color_package");
    const garmentColorLookup = getCompatibilityLookup(compatibilities, "garment", state.garment?.id, "color_package");
    const garmentStudioLookup = getCompatibilityLookup(compatibilities, "garment", state.garment?.id, "studio_item");

    const featuredPresets = rankDesignPresets(
        presets.filter((preset) => preset.is_featured),
        {
            garmentId: state.garment?.id,
            method: state.method ?? undefined,
            printPosition: state.printPosition,
            printSize: state.printSize,
            metadataAnchors: [
                { label: "النمط المختار", metadata: state.style?.metadata, weight: 0.95 },
                { label: "الأسلوب المختار", metadata: state.artStyle?.metadata, weight: 0.9 },
                { label: "البالِت المختارة", metadata: state.colorPackage?.metadata, weight: 0.8 },
            ],
        }
    );

    const styleRecommendations = rankDesignCandidates(styles, {
        preferredId: state.preset?.style_id,
        method: state.method ?? undefined,
        printPosition: state.printPosition,
        lookups: [
            { lookup: presetStyleLookup, label: "الـ preset", weight: 1.05 },
            { lookup: garmentStyleLookup, label: "القطعة الحالية", weight: 0.7 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: state.preset?.metadata, weight: 0.7 },
        ],
    });

    const artStyleRecommendations = rankDesignCandidates(artStyles, {
        preferredId: state.preset?.art_style_id,
        method: state.method ?? undefined,
        printPosition: state.printPosition,
        lookups: [
            { lookup: styleArtLookup, label: "النمط المختار", weight: 1.05 },
            { lookup: garmentArtLookup, label: "القطعة الحالية", weight: 0.55 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: state.preset?.metadata, weight: 0.65 },
            { label: "النمط المختار", metadata: state.style?.metadata, weight: 1 },
        ],
    });

    const colorPackageRecommendations = rankDesignCandidates(colorPackages, {
        preferredId: state.preset?.color_package_id,
        method: state.method ?? undefined,
        printPosition: state.printPosition,
        lookups: [
            { lookup: styleColorLookup, label: "النمط المختار", weight: 0.95 },
            { lookup: artColorLookup, label: "الأسلوب المختار", weight: 0.9 },
            { lookup: garmentColorLookup, label: "القطعة الحالية", weight: 0.55 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: state.preset?.metadata, weight: 0.55 },
            { label: "النمط المختار", metadata: state.style?.metadata, weight: 0.85 },
            { label: "الأسلوب المختار", metadata: state.artStyle?.metadata, weight: 0.95 },
        ],
    });

    const studioRecommendations = rankDesignCandidates(studioItems, {
        preferredId: state.preset?.studio_item_id,
        method: state.method === "studio" ? "studio" : undefined,
        printPosition: state.printPosition,
        lookups: [
            { lookup: garmentStudioLookup, label: "القطعة الحالية", weight: 0.8 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: state.preset?.metadata, weight: 0.6 },
            { label: "النمط المختار", metadata: state.style?.metadata, weight: 0.45 },
        ],
    }).map((entry) => entry.item);

    const applyPreset = useCallback((preset: CustomDesignPreset) => {
        const garment = preset.garment_id ? garments.find((item) => item.id === preset.garment_id) ?? null : null;
        const style = preset.style_id ? styles.find((item) => item.id === preset.style_id) ?? null : null;
        const artStyle = preset.art_style_id ? artStyles.find((item) => item.id === preset.art_style_id) ?? null : null;
        const colorPackage = preset.color_package_id ? colorPackages.find((item) => item.id === preset.color_package_id) ?? null : null;
        const studioItem = preset.studio_item_id ? studioItems.find((item) => item.id === preset.studio_item_id) ?? null : null;

        setState((current) => ({
            ...current,
            preset,
            garment: garment ?? current.garment,
            style: style ?? current.style,
            artStyle: artStyle ?? current.artStyle,
            colorPackage: colorPackage ?? current.colorPackage,
            studioItem: studioItem ?? current.studioItem,
            method: preset.design_method ?? current.method,
            printPosition: preset.print_position ?? current.printPosition,
            printSize: preset.print_size ?? current.printSize,
            submissionError: null,
        }));
    }, [artStyles, colorPackages, garments, studioItems, styles]);

    // Check for existing active order on mount
    useEffect(() => {
        const storedAccess = getStoredOrderAccess();
        if (!storedAccess) { setCheckingOrder(false); return; }
        getDesignOrderPublic(storedAccess.id, storedAccess.token).then((order) => {
            if (order && !['completed', 'cancelled'].includes(order.status)) {
                setActiveOrderId(storedAccess.id);
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
        getGarmentColors(state.garment.id)
            .then((c) => {
                setColors(c);
            })
            .catch((err) => {
                console.error("Failed to fetch colors:", err);
                setColors([]);
            })
            .finally(() => {
                setLoadingColors(false);
            });
    }, [state.garment]);

    // Fetch sizes when garment+color change
    useEffect(() => {
        if (!state.garment) return;
        setLoadingSizes(true);
        getColorSizes(state.garment.id, state.color?.id)
            .then((s) => {
                setSizes(s);
            })
            .catch((err) => {
                console.error("Failed to fetch sizes:", err);
                setSizes([]);
            })
            .finally(() => {
                setLoadingSizes(false);
            });
    }, [state.garment, state.color]);

    const goNext = () => setState((s) => {
        if (s.step === 5 && s.method === "studio") return { ...s, step: 9 };
        return { ...s, step: Math.min(s.step + 1, TOTAL_STEPS) };
    });
    const goBack = () => setState((s) => {
        if (s.step === 9 && s.method === "studio") return { ...s, step: 5 };
        return { ...s, step: Math.max(s.step - 1, 1) };
    });

    const triggerSend = () => {
        if (!isSignedIn) {
            setShowAuthModal(true);
            return;
        }
        handleSend();
    };

    const handleSend = useCallback(async () => {
        setState((s) => ({ ...s, isSending: true, submissionError: null }));

        let orderNumber: number | undefined;

        // 0. Studio Cart Injection
        if (state.method === "studio" && state.studioItem) {
            let finalPrice = state.studioItem.price || 0;
            if (state.garment) {
                try {
                    const { getGarmentPricing } = await import("@/app/actions/smart-store");
                    const pricing = await getGarmentPricing(state.garment.name, state.garment.id);
                    let printP = pricing.base_price;
                    if (state.printPosition === "chest") printP = state.printSize === "large" ? pricing.price_chest_large : pricing.price_chest_small;
                    else if (state.printPosition === "back") printP = state.printSize === "large" ? pricing.price_back_large : pricing.price_back_small;
                    else if (state.printPosition?.startsWith("shoulder")) printP = state.printSize === "large" ? pricing.price_shoulder_large : pricing.price_shoulder_small;
                    finalPrice += printP;
                } catch (e) {
                    console.error("Failed to fetch accurate pricing for Studio add to cart", e);
                }
            }

            try {
                const { submitDesignOrder } = await import("@/app/actions/smart-store");
                const result = await submitDesignOrder({
                    garment_id: state.garment?.id ?? undefined,
                    garment_name: state.garment?.name ?? "—",
                    color_id: state.color?.id ?? undefined,
                    color_name: state.color?.name ?? "—",
                    color_hex: state.color?.hex_code ?? "#000000",
                    size_id: state.size?.id ?? undefined,
                    size_name: state.size?.name ?? "—",
                    design_method: "studio",
                    studio_item_id: state.studioItem?.id ?? undefined,
                    text_prompt: state.studioItem?.name ?? undefined,
                    reference_image_url: state.studioItem?.mockup_image_url || state.studioItem?.main_image_url || undefined,
                    preset_id: state.preset?.id ?? undefined,
                    preset_name: state.preset?.name ?? undefined,
                    preset_fully_aligned: presetIsFullyAligned,
                    print_position: state.printPosition ?? undefined,
                    print_size: state.printSize ?? undefined,
                });
                if ("error" in result) {
                    setState((s) => ({
                        ...s,
                        isSending: false,
                        submissionError: result.error || "تعذر إنشاء طلب الاستوديو الآن."
                    }));
                    return;
                }
            } catch (err) {
                console.error("submitDesignOrder (studio) failed:", err);
                setState((s) => ({
                    ...s,
                    isSending: false,
                    submissionError: "تعذر إنشاء طلب الاستوديو الآن. حاول مرة أخرى."
                }));
                return;
            }

            const cartMockup = garmentStudioMockups.find(
                m => m.garment_id === state.garment?.id && m.studio_item_id === state.studioItem!.id
            );
            addItem({
                id: `studio-${state.studioItem.id}-${Date.now()}`,
                title: `تصميم ستيديو: ${state.studioItem.name}`,
                price: finalPrice,
                image_url: cartMockup?.mockup_front_url || state.studioItem.main_image_url || state.garment?.image_url || "",
                artist_name: "ستيديو وشّى",
                type: "custom_design",
                customGarment: `${state.garment?.name} (${state.color?.name})`,
                customPosition: `${state.printPosition === "chest" ? "الصدر" : state.printPosition === "back" ? "الظهر" : "أخرى"} - ${state.size?.name || state.printSize}`,
            });

            toggleCart(true);
            setState((s) => ({ ...s, isSending: false, studioCartAdded: true }));
            return;
        }

        // 1. Upload reference image if exists
        let referenceImageUrl: string | undefined;
        if (state.imageFile) {
            try {
                const { uploadDesignReferenceImage } = await import("@/app/actions/smart-store");
                const formData = new FormData();
                formData.append("file", state.imageFile);
                const uploadResult = await uploadDesignReferenceImage(formData);
                if (uploadResult.success) {
                    referenceImageUrl = uploadResult.url;
                } else {
                    console.error("Image upload failed:", uploadResult.error);
                    setState((s) => ({ ...s, isSending: false, submissionError: uploadResult.error || "تعذر رفع الصورة المرجعية الآن." }));
                    return;
                }
            } catch (err) {
                console.error("Image upload failed:", err);
                setState((s) => ({ ...s, isSending: false, submissionError: "تعذر رفع الصورة المرجعية الآن. حاول مرة أخرى." }));
                return;
            }
        }

        // 2. Submit design order to database
        try {
            const { submitDesignOrder } = await import("@/app/actions/smart-store");
            const result = await submitDesignOrder({
                garment_id: state.garment?.id ?? undefined,
                garment_name: state.garment?.name ?? "—",
                garment_image_url: state.garment?.image_url ?? undefined,
                color_id: state.color?.id ?? undefined,
                color_name: state.color?.name ?? "—",
                color_hex: state.color?.hex_code ?? "#000000",
                color_image_url: state.color?.image_url ?? undefined,
                size_id: state.size?.id ?? undefined,
                size_name: state.size?.name ?? "—",
                design_method: state.method ?? "from_text",
                text_prompt: state.textPrompt || undefined,
                reference_image_url: referenceImageUrl,
                preset_id: state.preset?.id ?? undefined,
                preset_name: state.preset?.name ?? undefined,
                preset_fully_aligned: presetIsFullyAligned,
                style_id: state.style?.id ?? undefined,
                style_name: state.style?.name ?? "—",
                style_image_url: state.style?.image_url ?? undefined,
                art_style_id: state.artStyle?.id ?? undefined,
                art_style_name: state.artStyle?.name ?? "—",
                art_style_image_url: state.artStyle?.image_url ?? undefined,
                color_package_id: state.colorPackage?.id ?? undefined,
                color_package_name: state.colorPackage?.name ?? undefined,
                custom_colors: state.customColors.length > 0 ? state.customColors : undefined,
                print_position: state.printPosition ?? undefined,
                print_size: state.printSize ?? undefined,
            });
            if ("error" in result) {
                console.error("Order creation error:", result.error);
                setState((s) => ({ ...s, isSending: false, submissionError: result.error || "تعذر إنشاء الطلب الآن." }));
                return;
            }

            if (!result.orderId) {
                setState((s) => ({ ...s, isSending: false, submissionError: "تعذر إنشاء الطلب الآن. حاول مرة أخرى." }));
                return;
            }

            storeOrderId(result.orderId, result.trackerToken);
            orderNumber = result.orderNumber;
            setActiveOrderId(result.orderId);
        } catch (err) {
            console.error("submitDesignOrder failed:", err);
            setState((s) => ({ ...s, isSending: false, submissionError: "تعذر إرسال الطلب الآن. حاول مرة أخرى." }));
            return;
        }

        // 2. Build summary message with order number
        const printLocation = state.printPosition === "chest" ? "الصدر" : state.printPosition === "back" ? "الظهر" : state.printPosition === "shoulder_right" ? "الكتف الأيمن" : state.printPosition === "shoulder_left" ? "الكتف الأيسر" : "—";
        const printSizeAr = state.printSize === "large" ? "مقاس كبير" : state.printSize === "small" ? "مقاس صغير" : "—";

        const lines = [
            `مرحباً فريق وشّى 👋`,
            `لقد انتهيت للتو من تصميم قطعتي الميزة عبر ميزة (صمم قطعتك) وأرغب بتأكيد الطلب! ✨`,
            orderNumber ? `رقم الطلب المرجعي: #${orderNumber}` : "",
            "",
            `📌 **وهذه تفاصيل قطعتي:**`,
            `📦 **القطعة:** ${state.garment?.name ?? "—"}`,
            `🎨 **اللون:** ${state.color?.name ?? "—"} (${state.color?.hex_code ?? ""})`,
            `📏 **المقاس:** ${state.size?.name ?? "—"}`,
            `📍 **مكان وحجم التصميم:** ${printLocation} (${printSizeAr})`,
            `✍️ **طريقة التصميم:** ${state.method === "from_text" ? "من الوصف النصي" : state.method === "from_image" ? "من صورة مرجعية" : "ستيديو وشّى"}`,
        ];

        if (state.method === "studio" && state.studioItem) {
            lines.push(
                `✨ **تصميم ستيديو وشّى:** ${state.studioItem.name}`
            );
            if (state.studioItem.price > 0) {
                lines.push(`💰 **السعر الإضافي للتصميم:** +${state.studioItem.price} ر.س`);
            }
        } else {
            lines.push(
                `🖌️ **نمط التصميم:** ${state.style?.name ?? "—"}`,
                `🎭 **أسلوب الرسم:** ${state.artStyle?.name ?? "—"}`
            );

            if (state.colorPackage) {
                lines.push(`🌈 **الألوان المفضلة:** باقة ${state.colorPackage.name}`);
            } else if (state.customColors.length > 0) {
                lines.push(`🎨 **ألوان مخصصة:** ${state.customColors.join(" - ")}`);
            } else {
                lines.push(`🌈 **الألوان المفضلة:** حسب رؤية المصمم`);
            }

            if (state.textPrompt) {
                lines.push("", `📝 **ما أتخيله للتصميم:**`, `"${state.textPrompt}"`);
            }
            if (state.imagePreview) {
                lines.push("", "📸 لقد قمت بإرفاق صورة توضح الفكرة التي أريدها.");
            }
        }

        lines.push("", "بانتظار تواصلكم معي لتأكيد التفاصيل وتجهيز الطلب، شكراً لكم! 🤍");

        const summaryText = lines.join("\n");

        // 3. Enable Reamaze and send message
        document.body.classList.add("reamaze-active");
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
                <p className="text-theme-subtle text-sm">جاري التحقق من الطلبات...</p>
            </div>
        );
    }

    if (activeOrderId) {
        return <OrderTracker orderId={activeOrderId} trackerToken={getStoredOrderAccess()?.token} />;
    }

    return (
        <div className="space-y-8">
            {/* ─── Header ─── */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                        </span>
                        نموذج تجريبي قيد التطوير (Beta)
                    </div>
                    {aiModelShortcutEnabled ? (
                        <Link
                            href="/design/ai"
                            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200 transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/15"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            جرّب النموذج الجديد
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </Link>
                    ) : null}
                    {dtfStudioShortcutEnabled ? (
                        <Link
                            href="/design/dtf-studio"
                            className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-100 transition-colors hover:border-sky-300/35 hover:bg-sky-500/15"
                        >
                            <Wand2 className="h-3.5 w-3.5" />
                            استوديو DTF المطور
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </Link>
                    ) : null}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-l from-gold via-gold-light to-gold bg-clip-text text-transparent">
                    صمّم قطعتك بنفسك
                </h1>
                <p className="text-theme-subtle mt-3 text-sm sm:text-base max-w-xl mx-auto">
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
                  ${isDone ? "bg-gold text-bg" : isActive ? "bg-gold/20 text-gold border-2 border-gold" : "bg-theme-subtle text-theme-faint border border-theme-soft"}
                `}>
                                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                </div>
                                <span className={`text-[10px] font-medium hidden sm:block ${isActive ? "text-gold" : "text-theme-faint"}`}>
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
                <div className="h-1 bg-theme-soft rounded-full mt-3 overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-l from-gold to-gold-light rounded-full"
                        animate={{ width: `${(state.step / TOTAL_STEPS) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            </div>

            {(featuredPresets.length > 0 || state.preset) && (
                <div className="max-w-5xl mx-auto">
                    <div className="rounded-3xl border border-gold/15 bg-[linear-gradient(135deg,rgba(206,174,127,0.10),rgba(255,255,255,0.02))] p-5 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold">
                                    <Wand2 className="h-3.5 w-3.5" />
                                    Design Intelligence
                                </div>
                                <h2 className="mt-3 text-lg font-bold text-theme">Presets جاهزة بدل البدء من الصفر</h2>
                                <p className="mt-1 text-sm text-theme-subtle">
                                    اختر اتجاهًا إبداعيًا جاهزًا وسيقوم النظام بتعبئة النمط والأسلوب والبالِت المناسبة مبدئيًا.
                                </p>
                            </div>
                            {state.preset ? (
                                <div className={`rounded-2xl px-4 py-3 text-sm ${presetIsFullyAligned ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200" : "border border-gold/20 bg-gold/10 text-gold"}`}>
                                    <span className="font-bold">{presetIsFullyAligned ? "المفعّل الآن:" : "مبني على preset:"}</span> {state.preset.name}
                                    {!presetIsFullyAligned ? (
                                        <p className="mt-1 text-xs leading-6 text-theme-subtle">
                                            خصصت يدويًا: {presetOverrideLabels.join("، ")}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => setState((current) => ({ ...current, preset: null }))}
                                        className="mt-2 inline-flex rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[11px] font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold"
                                    >
                                        فك الارتباط عن الـ preset
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <div className="md:col-span-2 xl:col-span-3">
                                <RecommendationInsightPanel
                                    entry={featuredPresets[0]}
                                    title="أقرب Preset الآن"
                                    desc="هذا الاقتراح يتغير حسب القطعة، طريقة التنفيذ، وقراراتك الحالية داخل الويزرد."
                                />
                            </div>
                            {featuredPresets.map((entry) => {
                                const preset = entry.item;
                                const isActive = state.preset?.id === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className={`rounded-2xl border p-4 text-right transition-all ${
                                            isActive
                                                ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                                                : "border-theme-soft bg-theme-faint hover:border-gold/30 hover:bg-theme-subtle"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-theme-subtle">
                                                    <BadgeCheck className="h-3 w-3" />
                                                    {preset.badge || "Curated"}
                                                </div>
                                                <p className="mt-3 text-base font-bold text-theme">{preset.name}</p>
                                                {preset.description ? (
                                                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-theme-subtle">{preset.description}</p>
                                                ) : null}
                                            </div>
                                            <Layers3 className={`h-5 w-5 shrink-0 ${isActive ? "text-gold" : "text-theme-faint"}`} />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {entry.signals.slice(0, 2).map((signal) => (
                                                <span key={signal} className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200">
                                                    {signal}
                                                </span>
                                            ))}
                                            {preset.design_method ? (
                                                <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
                                                    {preset.design_method === "from_text" ? "من نص" : preset.design_method === "from_image" ? "من صورة" : "ستيديو وشّى"}
                                                </span>
                                            ) : null}
                                            {preset.print_position ? (
                                                <span className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-subtle">
                                                    {preset.print_position === "chest" ? "صدر" : preset.print_position === "back" ? "ظهر" : preset.print_position === "shoulder_right" ? "كتف أيمن" : "كتف أيسر"}
                                                </span>
                                            ) : null}
                                            {preset.metadata?.creative_direction ? (
                                                <span className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-subtle">
                                                    {preset.metadata.creative_direction}
                                                </span>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Step Content ─── */}
            <div className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state.step}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-3xl border border-theme-soft bg-theme-faint backdrop-blur-xl p-6 sm:p-8 lg:p-10 min-h-[400px]"
                    >
                        {state.step === 1 && (
                            <StepGarment garments={garments} selected={state.garment} onSelect={(g) => setState((s) => ({ ...s, garment: g, color: null, size: null }))} onNext={goNext} />
                        )}
                        {state.step === 2 && (
                            <StepColor colors={colors} loading={loadingColors} selected={state.color} onSelect={(c) => setState((s) => ({ ...s, color: c, size: null }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 3 && (
                            <StepSize sizes={sizes} loading={loadingSizes} selected={state.size} onSelect={(sz) => setState((s) => ({ ...s, size: sz }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 4 && (
                            <StepPrintPlacement
                                garment={state.garment}
                                selectedPosition={state.printPosition}
                                selectedSize={state.printSize}
                                onSelectPosition={(p) => setState((s) => ({ ...s, printPosition: p }))}
                                onSelectSize={(sz) => setState((s) => ({ ...s, printSize: sz }))}
                                onBack={goBack}
                                onNext={goNext}
                            />
                        )}
                        {state.step === 5 && (
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
                                studioItems={studioRecommendations}
                                selectedStudioItem={state.studioItem}
                                onSelectStudioItem={(si) => setState((s) => ({ ...s, studioItem: si }))}
                                selectedGarment={state.garment}
                                garmentStudioMockups={garmentStudioMockups}
                                onBack={goBack}
                                onNext={goNext}
                            />
                        )}
                        {state.step === 6 && (
                            <StepStyle items={styleRecommendations} selected={state.style} onSelect={(s) => setState((st) => ({ ...st, style: s }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 7 && (
                            <StepArtStyle items={artStyleRecommendations} selected={state.artStyle} onSelect={(a) => setState((s) => ({ ...s, artStyle: a }))} onBack={goBack} onNext={goNext} />
                        )}
                        {state.step === 8 && (
                            <StepColorPalette
                                packages={colorPackageRecommendations}
                                selectedPackage={state.colorPackage}
                                onSelectPackage={(p) => setState((s) => ({ ...s, colorPackage: p }))}
                                customColors={state.customColors}
                                onCustomColorsChange={(c) => setState((s) => ({ ...s, customColors: c }))}
                                onBack={goBack}
                                onNext={goNext}
                            />
                        )}
                        {state.step === 9 && (
                            <StepSubmit state={state} garmentStudioMockups={garmentStudioMockups} onBack={goBack} onSend={triggerSend} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showAuthModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,10,10,0.96))] p-6 shadow-2xl"
                        >
                            <button
                                type="button"
                                onClick={() => setShowAuthModal(false)}
                                className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/[0.04] p-2 text-theme-subtle transition-colors hover:text-theme"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
                                <Lock className="h-6 w-6" />
                            </div>
                            <h3 className="mt-5 text-2xl font-black text-theme">أكمل الدخول أولاً</h3>
                            <p className="mt-3 text-sm leading-7 text-theme-subtle">
                                إرسال طلب التصميم يتطلب تسجيل الدخول حتى نحفظ الطلب ونربطه بحسابك وتستطيع متابعته لاحقًا.
                            </p>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <SignInButton>
                                    <button className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-gold to-gold-light px-4 py-3 text-sm font-bold text-bg transition-transform hover:scale-[1.01]">
                                        تسجيل الدخول
                                    </button>
                                </SignInButton>
                                <SignUpButton>
                                    <button className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold">
                                        إنشاء حساب
                                    </button>
                                </SignUpButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Shared UI
// ═══════════════════════════════════════════════════════════

const btnPrimary = "flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 disabled:opacity-40";
const btnBack = "flex items-center gap-2 px-5 py-3 rounded-2xl border border-theme-soft text-theme-subtle text-sm hover:bg-theme-subtle transition-all";

function StepHeader({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-theme">{title}</h2>
            <p className="text-theme-subtle mt-1 text-sm">{desc}</p>
        </div>
    );
}

function getLuxuryTierLabel(value: DesignIntelligenceMetadata["luxury_tier"] | null | undefined) {
    if (value === "signature") return "Signature";
    if (value === "editorial") return "Editorial";
    if (value === "core") return "Core";
    return null;
}

function getEnergyLabel(value: DesignIntelligenceMetadata["energy"] | null | undefined) {
    if (value === "high") return "طاقة عالية";
    if (value === "medium") return "طاقة متوازنة";
    if (value === "low") return "طاقة هادئة";
    return null;
}

function getComplexityLabel(value: DesignIntelligenceMetadata["complexity"] | null | undefined) {
    if (value === "bold") return "تكوين جريء";
    if (value === "balanced") return "تكوين متوازن";
    if (value === "minimal") return "تكوين ناعم";
    return null;
}

type ExplainableRecommendationItem = {
    name: string;
    description?: string | null;
    story?: string | null;
    metadata?: DesignIntelligenceMetadata | null;
};

function RecommendationInsightPanel<T extends ExplainableRecommendationItem>({
    entry,
    title,
    desc,
}: {
    entry: RankedDesignCandidate<T> | null | undefined;
    title: string;
    desc: string;
}) {
    if (!entry) return null;

    const item = entry.item;
    const highlight = item.metadata?.story_hook || item.story || item.description || desc;
    const luxuryTier = getLuxuryTierLabel(item.metadata?.luxury_tier);
    const energy = getEnergyLabel(item.metadata?.energy);
    const complexity = getComplexityLabel(item.metadata?.complexity);

    return (
        <div className="mb-5 rounded-[28px] border border-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),rgba(255,255,255,0.02)_58%)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] font-bold text-gold">
                        <Wand2 className="h-3.5 w-3.5" />
                        {title}
                    </div>
                    <h3 className="mt-3 text-base font-bold text-theme sm:text-lg">{item.name}</h3>
                    <p className="mt-1 text-sm leading-7 text-theme-subtle">{highlight}</p>
                </div>

                <div className="flex flex-wrap gap-2 sm:max-w-[45%] sm:justify-end">
                    {entry.relation ? (
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                            entry.relation === "avoid"
                                ? "border border-red-400/20 bg-red-500/10 text-red-200"
                                : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        }`}>
                            {entry.relation === "signature" ? "ترشيح Signature" : entry.relation === "recommended" ? "موصى به" : "أقل انسجامًا"}
                        </span>
                    ) : null}
                    {luxuryTier ? (
                        <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-bold text-gold">
                            {luxuryTier}
                        </span>
                    ) : null}
                    {energy ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold text-theme-subtle">
                            {energy}
                        </span>
                    ) : null}
                    {complexity ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold text-theme-subtle">
                            {complexity}
                        </span>
                    ) : null}
                    {item.metadata?.palette_family ? (
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-bold text-theme-subtle">
                            {item.metadata.palette_family}
                        </span>
                    ) : null}
                </div>
            </div>

            {entry.signals.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {entry.signals.slice(0, 3).map((signal) => (
                        <span key={signal} className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[10px] font-bold text-theme">
                            {signal}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function NavButtons({ onBack, onNext, nextLabel, nextDisabled }: { onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean }) {
    return (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-theme-subtle">
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
                <div className="text-center py-20 text-theme-faint">
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
                  ${isSelected ? "border-gold shadow-lg shadow-gold/20" : "border-theme-soft hover:border-white/20"}
                `}
                            >
                                {g.image_url ? (
                                    <img src={g.image_url} alt={g.name} className="w-full aspect-[3/4] object-cover rounded-xl bg-theme-subtle" />
                                ) : (
                                    <div className="w-full aspect-[3/4] rounded-xl bg-theme-subtle flex items-center justify-center">
                                        <Shirt className="w-12 h-12 text-theme-faint" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-sm font-bold text-theme">{g.name}</p>
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
                <div className="text-center py-20 text-theme-faint">
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
                  ${isSelected ? "border-gold bg-gold/5" : "border-theme-subtle hover:border-white/20"}
                `}
                            >
                                {c.image_url ? (
                                    <img src={c.image_url} alt={c.name} className="w-full aspect-square object-cover rounded-xl" />
                                ) : (
                                    <div
                                        className="w-16 h-16 rounded-2xl border-2 border-theme-soft shadow-inner"
                                        style={{ backgroundColor: c.hex_code }}
                                    />
                                )}
                                <span className={`text-xs font-medium ${isSelected ? "text-gold" : "text-theme-soft"}`}>{c.name}</span>
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
                <div className="text-center py-20 text-theme-faint">
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
                  ${isSelected ? "border-gold bg-gold/10 shadow-lg shadow-gold/10" : "border-theme-subtle hover:border-white/20"}
                `}
                            >
                                <span className={`text-xl font-bold ${isSelected ? "text-gold" : "text-theme-soft"}`}>{sz.name}</span>
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

function StepMethod({
    selected, onSelect, textPrompt, onTextChange, imagePreview, onImageChange,
    studioItems, selectedStudioItem, onSelectStudioItem,
    selectedGarment, garmentStudioMockups,
    onBack, onNext
}: {
    selected: "from_text" | "from_image" | "studio" | null;
    onSelect: (m: "from_text" | "from_image" | "studio") => void;
    textPrompt: string;
    onTextChange: (t: string) => void;
    imagePreview: string | null;
    onImageChange: (file: File | null, preview: string | null) => void;
    studioItems: CustomDesignStudioItem[];
    selectedStudioItem: CustomDesignStudioItem | null;
    onSelectStudioItem: (s: CustomDesignStudioItem | null) => void;
    selectedGarment: CustomDesignGarment | null;
    garmentStudioMockups: GarmentStudioMockup[];
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
        (selected === "from_image" && !!imagePreview) ||
        (selected === "studio" && !!selectedStudioItem)
    );

    return (
        <>
            <StepHeader title="طريقة التصميم" desc="كيف تبغى تصمم قطعتك؟" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { id: "from_text" as const, label: "من نص", desc: "صف التصميم اللي تبغاه بالكلمات", icon: Type, emoji: "✍️" },
                    { id: "from_image" as const, label: "من صورة", desc: "ارفع صورة مرجعية لتصميمك", icon: ImageIcon, emoji: "🖼️" },
                    { id: "studio" as const, label: "ستيديو وشّى", desc: "اختر تصميماً جاهزاً ومميزاً", icon: Sparkles, emoji: "✨" },
                ].map((m) => {
                    const isActive = selected === m.id;
                    return (
                        <motion.button
                            key={m.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect(m.id)}
                            className={`
                relative p-5 sm:p-6 rounded-2xl border-2 text-right transition-all
                ${isActive ? "border-gold bg-gold/5" : "border-theme-soft hover:border-white/20 hover:bg-theme-faint"}
              `}
                        >
                            <div className="text-4xl mb-4">{m.emoji}</div>
                            <p className={`text-lg font-bold ${isActive ? "text-gold" : "text-theme"}`}>{m.label}</p>
                            <p className="text-xs text-theme-subtle mt-1">{m.desc}</p>
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
                            className="w-full px-5 py-4 rounded-2xl bg-theme-subtle border border-theme-soft text-theme placeholder:text-theme-faint focus:outline-none focus:border-gold/40 transition-colors text-sm resize-none"
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
                                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-2xl border border-theme-soft" />
                                <button
                                    onClick={() => onImageChange(null, null)}
                                    className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-theme" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-gold/30 cursor-pointer transition-colors bg-theme-faint">
                                <Upload className="w-10 h-10 text-theme-faint" />
                                <span className="text-sm text-theme-subtle">اسحب الصورة هنا أو اضغط للرفع</span>
                                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                            </label>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* WASHA Studio Selection — عرض تفاعلي مميز */}
            <AnimatePresence>
                {selected === "studio" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        {studioItems.length === 0 ? (
                            <div className="text-center py-10 text-theme-subtle border-2 border-dashed border-theme-soft rounded-2xl">
                                <p>لا توجد تصاميم متاحة حالياً في ستيديو وشّى.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-center gap-2 px-1">
                                    <div className="w-6 h-6 rounded-lg bg-gold/15 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-gold" /></div>
                                    <span className="text-xs font-bold text-gold">تصاميم ستيديو وشّى الحصرية</span>
                                    <span className="text-[10px] text-theme-faint">({studioItems.length} تصميم)</span>
                                </div>

                                {/* Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {studioItems.map((item) => {
                                        const isSelected = selectedStudioItem?.id === item.id;
                                        // Find mockup for current garment × this studio item
                                        const mockup = selectedGarment
                                            ? garmentStudioMockups.find(m => m.garment_id === selectedGarment.id && m.studio_item_id === item.id)
                                            : null;

                                        // Collect all available images for gallery
                                        const galleryImages: { url: string; label: string }[] = [];
                                        if (mockup?.mockup_front_url) galleryImages.push({ url: mockup.mockup_front_url, label: "أمام" });
                                        if (mockup?.mockup_back_url) galleryImages.push({ url: mockup.mockup_back_url, label: "خلف" });
                                        if (mockup?.mockup_model_url) galleryImages.push({ url: mockup.mockup_model_url, label: "موديل" });
                                        // Fallback to studio item images if no mockup
                                        if (galleryImages.length === 0) {
                                            if (item.model_image_url) galleryImages.push({ url: item.model_image_url, label: "موديل" });
                                            if (item.mockup_image_url) galleryImages.push({ url: item.mockup_image_url, label: "موكب" });
                                            if (item.main_image_url) galleryImages.push({ url: item.main_image_url, label: "التصميم" });
                                        }

                                        return (
                                            <StudioItemCard
                                                key={item.id}
                                                item={item}
                                                isSelected={isSelected}
                                                galleryImages={galleryImages}
                                                hasMockup={!!mockup}
                                                onSelect={() => onSelectStudioItem(item)}
                                            />
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-theme-subtle text-center pt-2">اختيارك لتصميم ستيديو وشّى سيأخذك مباشرة لتأكيد الطلب 🚀</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!canProceed} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  StudioItemCard — بطاقة تصميم ستيديو تفاعلية مع معرض صور
// ═══════════════════════════════════════════════════════════

function StudioItemCard({ item, isSelected, galleryImages, hasMockup, onSelect }: {
    item: CustomDesignStudioItem;
    isSelected: boolean;
    galleryImages: { url: string; label: string }[];
    hasMockup: boolean;
    onSelect: () => void;
}) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-cycle images on hover
    useEffect(() => {
        if (!isHovered || galleryImages.length <= 1) return;
        const interval = setInterval(() => {
            setActiveIdx((prev) => (prev + 1) % galleryImages.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [isHovered, galleryImages.length]);

    const currentImage = galleryImages[activeIdx]?.url;

    return (
        <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setActiveIdx(0); }}
            className={`
                relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-right group
                ${isSelected
                    ? "border-gold shadow-xl shadow-gold/25 ring-1 ring-gold/30"
                    : "border-theme-soft hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10"}
            `}
        >
            {/* Image Gallery */}
            <div className="relative aspect-[4/5] overflow-hidden bg-theme-subtle">
                <AnimatePresence mode="wait">
                    {currentImage ? (
                        <motion.img
                            key={activeIdx}
                            src={currentImage}
                            alt={item.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <Sparkles className="w-10 h-10 text-theme-faint" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                {/* Gallery dots */}
                {galleryImages.length > 1 && (
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {galleryImages.map((img, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                                className={`transition-all duration-300 rounded-full ${
                                    i === activeIdx
                                        ? "w-5 h-1.5 bg-gold"
                                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                                }`}
                            />
                        ))}
                    </div>
                )}

                {/* Image label pill */}
                {galleryImages.length > 1 && galleryImages[activeIdx] && (
                    <motion.div
                        key={`label-${activeIdx}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-3 right-3 px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded-md border border-white/10 z-10"
                    >
                        {galleryImages[activeIdx].label}
                    </motion.div>
                )}

                {/* Price badge */}
                {item.price > 0 && (
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-gold text-xs font-bold border border-gold/20 z-10">
                        +{item.price} ر.س
                    </div>
                )}

                {/* Mockup badge */}
                {hasMockup && (
                    <div className="absolute bottom-16 right-3 px-2 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-white text-[9px] font-bold border border-emerald-400/30 z-10 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        موكب جاهز
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 text-right">
                <p className={`font-bold text-sm truncate transition-colors ${isSelected ? "text-gold" : "text-theme group-hover:text-gold/80"}`}>
                    {item.name}
                </p>
                {item.description && (
                    <p className="text-[11px] text-theme-subtle line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                )}
                {galleryImages.length > 1 && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-theme-faint">
                        <ImageIcon className="w-3 h-3" />
                        <span>{galleryImages.length} صور</span>
                    </div>
                )}
            </div>

            {/* Selected checkmark */}
            {isSelected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gold flex items-center justify-center shadow-lg z-20"
                >
                    <Check className="w-4 h-4 text-bg" />
                </motion.div>
            )}
        </motion.button>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 5: Style
// ═══════════════════════════════════════════════════════════

function StepStyle({ items, selected, onSelect, onBack, onNext }: {
    items: RankedDesignCandidate<CustomDesignStyle>[];
    selected: CustomDesignStyle | null;
    onSelect: (s: CustomDesignStyle) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر النمط" desc="حدد نمط التصميم اللي يعجبك" />
            <RecommendationInsightPanel
                entry={items[0]}
                title="أقرب نمط الآن"
                desc="هذا الترشيح مرتب حسب القطعة الحالية، موضع الطباعة، وطريقة التصميم التي اخترتها."
            />
            {items.length === 0 ? (
                <div className="text-center py-20 text-theme-faint"><p>لا توجد أنماط متاحة حالياً</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {items.map((entry) => {
                        const s = entry.item;
                        const isSelected = selected?.id === s.id;
                        return (
                            <motion.button
                                key={s.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(s)}
                                className={`
                  relative rounded-2xl overflow-hidden border-2 transition-all p-1
                  ${isSelected ? "border-gold shadow-lg shadow-gold/20" : "border-theme-soft hover:border-white/20"}
                `}
                            >
                                {s.image_url ? (
                                    <img src={s.image_url} alt={s.name} className="w-full aspect-square object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center">
                                        <Sparkles className="w-10 h-10 text-theme-faint" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-sm font-bold text-theme">{s.name}</p>
                                    {s.description && <p className="text-[10px] text-theme-subtle mt-0.5 line-clamp-1">{s.description}</p>}
                                    {s.metadata?.creative_direction && (
                                        <p className="mt-1 text-[10px] font-bold text-gold/90">{s.metadata.creative_direction}</p>
                                    )}
                                </div>
                                {(s.metadata?.moods?.length || s.metadata?.luxury_tier) && (
                                    <div className="absolute right-3 top-3 flex max-w-[75%] flex-wrap justify-end gap-1">
                                        {s.metadata?.luxury_tier ? (
                                            <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-1 text-[9px] font-bold text-gold">
                                                {s.metadata.luxury_tier}
                                            </span>
                                        ) : null}
                                        {s.metadata?.moods?.slice(0, 1).map((mood) => (
                                            <span key={mood} className="rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[9px] font-bold text-theme">
                                                {mood}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {(entry.signals.length > 0 || entry.relation) && (
                                    <div className="absolute left-3 right-3 top-3 flex flex-wrap gap-1">
                                        {entry.relation ? (
                                            <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                                                entry.relation === "avoid"
                                                    ? "border border-red-400/20 bg-red-500/10 text-red-200"
                                                    : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                            }`}>
                                                {entry.relation === "signature" ? "Signature" : entry.relation === "recommended" ? "موصى به" : "أقل انسجامًا"}
                                            </span>
                                        ) : null}
                                        {entry.signals.slice(0, 2).map((signal) => (
                                            <span key={signal} className="rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[9px] font-bold text-theme">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                )}
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
    items: RankedDesignCandidate<CustomDesignArtStyle>[];
    selected: CustomDesignArtStyle | null;
    onSelect: (a: CustomDesignArtStyle) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <StepHeader title="اختر الأسلوب" desc="حدد أسلوب الرسم للتصميم" />
            <RecommendationInsightPanel
                entry={items[0]}
                title="أقرب أسلوب الآن"
                desc="هذا الترشيح مبني على النمط المختار، القطعة الحالية، ونبرة التنفيذ الأقرب لطلبك."
            />
            {items.length === 0 ? (
                <div className="text-center py-20 text-theme-faint"><p>لا توجد أساليب متاحة حالياً</p></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((entry) => {
                        const a = entry.item;
                        const isSelected = selected?.id === a.id;
                        return (
                            <motion.button
                                key={a.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelect(a)}
                                className={`
                  relative rounded-2xl overflow-hidden border-2 transition-all p-1
                  ${isSelected ? "border-gold shadow-lg shadow-gold/20" : "border-theme-soft hover:border-white/20"}
                `}
                            >
                                {a.image_url ? (
                                    <img src={a.image_url} alt={a.name} className="w-full aspect-square object-cover rounded-xl" />
                                ) : (
                                    <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center">
                                        <Paintbrush className="w-10 h-10 text-theme-faint" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-sm font-bold text-theme">{a.name}</p>
                                    {a.metadata?.creative_direction && (
                                        <p className="mt-1 text-[10px] font-bold text-gold/90">{a.metadata.creative_direction}</p>
                                    )}
                                </div>
                                {(entry.relation || entry.signals.length > 0) ? (
                                    <div className="absolute right-3 top-3">
                                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                                            entry.relation === "avoid"
                                                ? "border border-red-400/20 bg-red-500/10 text-red-200"
                                                : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                        }`}>
                                            {entry.relation === "avoid" ? "أقل انسجامًا" : entry.relation === "signature" ? "تركيبة Signature" : "موصى به"}
                                        </span>
                                    </div>
                                ) : null}
                                {entry.signals.length > 0 ? (
                                    <div className="absolute left-3 top-3 flex max-w-[60%] flex-wrap gap-1 justify-start">
                                        {entry.signals.slice(0, 2).map((signal) => (
                                            <span key={signal} className="rounded-full border border-white/10 bg-black/35 px-2 py-1 text-[9px] font-bold text-theme">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
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
    packages: RankedDesignCandidate<CustomDesignColorPackage>[];
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
            <RecommendationInsightPanel
                entry={packages[0]}
                title="أقرب بالِت الآن"
                desc="رتبنا الألوان بحسب النمط، الأسلوب، ودرجة الفخامة والطاقة المتولدة من اختياراتك."
            />

            {/* Packages */}
            {packages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                    {packages.map((entry) => {
                        const pkg = entry.item;
                        const isSelected = selectedPackage?.id === pkg.id;
                        return (
                            <motion.button
                                key={pkg.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { onSelectPackage(isSelected ? null : pkg); setShowCustom(false); }}
                                className={`
                  p-5 rounded-2xl border-2 transition-all text-right
                  ${isSelected ? "border-gold bg-gold/5" : "border-theme-soft hover:border-white/20"}
                `}
                            >
                                <p className={`font-bold text-sm mb-3 ${isSelected ? "text-gold" : "text-theme"}`}>{pkg.name}</p>
                                {pkg.metadata?.palette_family && (
                                    <p className="mb-3 text-[10px] font-bold text-theme-subtle">{pkg.metadata.palette_family}</p>
                                )}
                                <div className="flex gap-1.5 flex-wrap">
                                    {(Array.isArray(pkg.colors) ? pkg.colors : []).map((c: any, i: number) => (
                                        <div key={i} className="w-7 h-7 rounded-full border border-theme-soft shadow-sm" style={{ backgroundColor: c.hex }} title={c.name} />
                                    ))}
                                </div>
                                {(entry.relation || entry.signals.length > 0) ? (
                                    <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                                        entry.relation === "avoid"
                                            ? "border border-red-400/20 bg-red-500/10 text-red-200"
                                            : "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                    }`}>
                                        {entry.relation === "avoid" ? "أقل انسجامًا" : entry.relation === "signature" ? "Palette Signature" : "موصى به"}
                                    </div>
                                ) : null}
                                {entry.signals.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {entry.signals.slice(0, 2).map((signal) => (
                                            <span key={signal} className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-subtle">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
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
                className={`mb-4 text-sm font-medium transition-colors ${showCustom ? "text-gold" : "text-theme-subtle hover:text-theme-soft"}`}
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
                                <span className="text-sm text-theme-subtle font-mono">{c}</span>
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

// ═══════════════════════════════════════════════════════════
//  Step 8: Print Placement & Pricing
// ═══════════════════════════════════════════════════════════

const PRINT_POSITIONS: { id: PrintPosition; label: string; emoji: string; desc: string }[] = [
    { id: "chest", label: "الصدر", emoji: "👕", desc: "تصميم على الجهة الأمامية" },
    { id: "back", label: "الظهر", emoji: "🔄", desc: "تصميم على الجهة الخلفية" },
    { id: "shoulder_right", label: "الكتف الأيمن", emoji: "➡️", desc: "شعار على الكتف الأيمن" },
    { id: "shoulder_left", label: "الكتف الأيسر", emoji: "⬅️", desc: "شعار على الكتف الأيسر" },
];

const PRINT_SIZES: { id: PrintSize; label: string; desc: string; icon: any }[] = [
    { id: "large", label: "مقاس كبير", desc: "تغطية واسعة وبارزة", icon: Maximize2 },
    { id: "small", label: "مقاس صغير", desc: "تصميم أنيق ومحدود", icon: Minimize2 },
];

function getPrintPrice(pricing: any, pos: PrintPosition, sz: PrintSize): number {
    if (!pricing) return 0;
    if (pos === "shoulder_right" || pos === "shoulder_left") {
        return sz === "large" ? (pricing.price_shoulder_large ?? 0) : (pricing.price_shoulder_small ?? 0);
    }
    if (pos === "back") {
        return sz === "large" ? (pricing.price_back_large ?? 0) : (pricing.price_back_small ?? 0);
    }
    return sz === "large" ? (pricing.price_chest_large ?? 0) : (pricing.price_chest_small ?? 0);
}

import { getGarmentPricing } from "@/app/actions/smart-store";

function StepPrintPlacement({ garment, selectedPosition, selectedSize, onSelectPosition, onSelectSize, onBack, onNext }: {
    garment: CustomDesignGarment | null;
    selectedPosition: PrintPosition | null;
    selectedSize: PrintSize | null;
    onSelectPosition: (p: PrintPosition) => void;
    onSelectSize: (sz: PrintSize) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const [pricing, setPricing] = useState<any>(null);
    const [loadingPricing, setLoadingPricing] = useState(true);

    useEffect(() => {
        if (!garment) { setLoadingPricing(false); return; }
        getGarmentPricing(garment.name, garment.id).then((p) => {
            setPricing(p);
            setLoadingPricing(false);
        });
    }, [garment]);

    const currentPrice = selectedPosition && selectedSize && pricing
        ? getPrintPrice(pricing, selectedPosition, selectedSize)
        : null;

    return (
        <>
            <StepHeader title="موقع وحجم التصميم" desc="حدد مكان التصميم وحجمه على القطعة + شاهد السعر" />

            {/* Position Selector */}
            <div className="mb-6">
                <p className="text-sm font-bold text-theme mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> اختر موقع التصميم</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PRINT_POSITIONS.map((pos) => {
                        const isActive = selectedPosition === pos.id;
                        return (
                            <motion.button
                                key={pos.id}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelectPosition(pos.id)}
                                className={`relative p-4 rounded-2xl border-2 transition-all text-center ${isActive
                                    ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                                    : "border-theme-soft hover:border-white/20 bg-theme-faint"
                                    }`}
                            >
                                <div className="text-3xl mb-2">{pos.emoji}</div>
                                <p className={`text-sm font-bold ${isActive ? "text-gold" : "text-theme"}`}>{pos.label}</p>
                                <p className="text-[10px] text-fg/35 mt-0.5">{pos.desc}</p>
                                {isActive && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="absolute top-2 left-2 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                                        <Check className="w-3 h-3 text-bg" />
                                    </motion.div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Size Selector */}
            <AnimatePresence>
                {selectedPosition && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mb-6 overflow-hidden"
                    >
                        <p className="text-sm font-bold text-theme mb-3 flex items-center gap-2"><Maximize2 className="w-4 h-4 text-gold" /> اختر حجم التصميم</p>
                        <div className="grid grid-cols-2 gap-4">
                            {PRINT_SIZES.map((sz) => {
                                const isActive = selectedSize === sz.id;
                                const price = pricing ? getPrintPrice(pricing, selectedPosition, sz.id) : null;
                                const SzIcon = sz.icon;
                                return (
                                    <motion.button
                                        key={sz.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onSelectSize(sz.id)}
                                        className={`relative p-5 rounded-2xl border-2 transition-all ${isActive
                                            ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                                            : "border-theme-soft hover:border-white/20 bg-theme-faint"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <SzIcon className={`w-8 h-8 ${isActive ? "text-gold" : "text-theme-faint"}`} />
                                            <div className="text-right">
                                                <p className={`font-bold ${isActive ? "text-gold" : "text-theme"}`}>{sz.label}</p>
                                                <p className="text-[10px] text-fg/35">{sz.desc}</p>
                                            </div>
                                        </div>
                                        {!loadingPricing && price !== null && (
                                            <div className={`text-xl font-bold mt-2 ${isActive ? "text-gold" : "text-theme-subtle"}`}>
                                                {price > 0 ? `${price} ر.س` : "مجاني"}
                                            </div>
                                        )}
                                        {loadingPricing && (
                                            <div className="mt-2"><Loader2 className="w-5 h-5 animate-spin text-theme-faint" /></div>
                                        )}
                                        {isActive && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className="absolute top-3 left-3 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                                                <Check className="w-3 h-3 text-bg" />
                                            </motion.div>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Price Summary */}
            <AnimatePresence>
                {currentPrice !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 rounded-2xl border border-gold/20 mb-4"
                        style={{ background: "linear-gradient(135deg, rgba(206,174,127,0.08) 0%, rgba(206,174,127,0.02) 100%)" }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-theme-subtle">سعر التصميم</p>
                                <p className="text-xs text-theme-faint mt-0.5">
                                    {PRINT_POSITIONS.find(p => p.id === selectedPosition)?.label} — {PRINT_SIZES.find(s => s.id === selectedSize)?.label}
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-gold">{currentPrice > 0 ? `${currentPrice} ر.س` : "مجاني"}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <NavButtons onBack={onBack} onNext={onNext} nextDisabled={!selectedPosition || !selectedSize} />
        </>
    );
}

// ═══════════════════════════════════════════════════════════
//  Step 9: Submit
// ═══════════════════════════════════════════════════════════

function StepSubmit({ state, garmentStudioMockups, onBack, onSend }: { state: WizardState; garmentStudioMockups: GarmentStudioMockup[]; onBack: () => void; onSend: () => void }) {
    const [previewIdx, setPreviewIdx] = useState(0);
    const presetOverrideLabels = getPresetOverrideLabels(state);
    const presetIsFullyAligned = presetOverrideLabels.length === 0;

    // Find pre-made mockup for this garment × studio item
    const mockup = (state.method === "studio" && state.garment && state.studioItem)
        ? garmentStudioMockups.find(m => m.garment_id === state.garment!.id && m.studio_item_id === state.studioItem!.id)
        : null;

    // Build gallery images from mockup
    const mockupGallery: { url: string; label: string }[] = [];
    if (mockup?.mockup_front_url) mockupGallery.push({ url: mockup.mockup_front_url, label: "الأمام" });
    if (mockup?.mockup_back_url) mockupGallery.push({ url: mockup.mockup_back_url, label: "الخلف" });
    if (mockup?.mockup_model_url) mockupGallery.push({ url: mockup.mockup_model_url, label: "موديل" });

    const hasMockupGallery = mockupGallery.length > 0;

    if (state.studioCartAdded) {
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
                <h2 className="text-2xl font-bold text-theme mb-2">تمت الإضافة للسلة! 🛒</h2>
                <p className="text-theme-subtle max-w-md mx-auto">
                    تم تحويل تصميمك الحصري من وشّى ستيديو إلى السلة بنجاح. يمكنك استكمال الدفع الآن!
                </p>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 flex gap-4 justify-center">
                    <Link
                        href="/cart"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition-all duration-300"
                    >
                        إتمام الطلب
                        <ArrowLeft className="w-4 h-4 ml-1" />
                    </Link>
                </motion.div>
            </motion.div>
        );
    }

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
                <h2 className="text-2xl font-bold text-theme mb-2">تم إرسال طلبك! 🎉</h2>
                <p className="text-theme-subtle max-w-md mx-auto">
                    تم إرسال تفاصيل طلبك لفريقنا. بيتواصل معاك موظفنا في أقرب وقت لتنفيذ التصميم.
                </p>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 inline-block"
                >
                    <Link
                        href="/support"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-theme-subtle border border-theme-soft text-theme-subtle text-sm hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all duration-300 cursor-pointer"
                    >
                        <MessageCircle className="w-4 h-4" />
                        تقدر تتابع طلبك وتتواصل مع فريق الدعم من هنا
                    </Link>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <>
            <StepHeader title="مراجعة وإرسال" desc={state.method === "studio" ? "احصل على قطعتك بلمسة استيديو وشّى" : "تأكد من تفاصيل طلبك قبل الإرسال"} />

            {state.method === "studio" ? (
                <div className="mb-8">
                    {/* Preview: Use pre-made mockup gallery or fallback to CSS overlay */}
                    {hasMockupGallery ? (
                        <div className="relative w-full max-w-md mx-auto mb-6">
                            {/* Main image */}
                            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-gold/20 bg-theme-subtle/30 backdrop-blur-md shadow-2xl shadow-gold/10">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={previewIdx}
                                        src={mockupGallery[previewIdx].url}
                                        alt={mockupGallery[previewIdx].label}
                                        initial={{ opacity: 0, scale: 1.02 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </AnimatePresence>
                                <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-xs font-bold rounded-lg border border-white/10 uppercase tracking-widest">WUSHA STUDIO</div>
                                {/* Label pill */}
                                <motion.div
                                    key={`submit-label-${previewIdx}`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute bottom-4 left-4 z-20 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-xs font-bold rounded-lg border border-white/10"
                                >
                                    {mockupGallery[previewIdx].label}
                                </motion.div>
                            </div>
                            {/* Thumbnail strip */}
                            {mockupGallery.length > 1 && (
                                <div className="flex justify-center gap-3 mt-4">
                                    {mockupGallery.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPreviewIdx(i)}
                                            className={`relative w-16 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                                                i === previewIdx
                                                    ? "border-gold shadow-lg shadow-gold/20 ring-1 ring-gold/30"
                                                    : "border-theme-soft hover:border-gold/40 opacity-60 hover:opacity-100"
                                            }`}
                                        >
                                            <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5">{img.label}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Fallback: CSS overlay compositing */
                        <div className="relative w-full max-w-sm mx-auto aspect-square rounded-3xl overflow-hidden border border-gold/20 bg-theme-subtle/30 backdrop-blur-md mb-6 shadow-2xl shadow-gold/10">
                            {state.color?.image_url && (
                                <img src={state.color.image_url} alt="Garment" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                            )}
                            {state.studioItem?.main_image_url && (
                                <motion.img 
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                                    src={state.studioItem.main_image_url} 
                                    alt="Overlay" 
                                    className={`absolute z-10 drop-shadow-2xl mix-blend-multiply dark:mix-blend-screen transition-all ${
                                        state.printPosition === "chest" && state.printSize === "large" ? "w-1/2 left-1/4 top-1/4" :
                                        state.printPosition === "chest" && state.printSize === "small" ? "w-1/4 left-[60%] top-1/4" :
                                        state.printPosition === "back" && state.printSize === "large" ? "w-[55%] left-[22.5%] top-1/4" :
                                        state.printPosition === "back" && state.printSize === "small" ? "w-1/3 left-1/3 top-1/4" :
                                        "w-1/3 left-1/3 top-1/4"
                                    }`} 
                                />
                            )}
                            <div className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-xs font-bold rounded-lg border border-white/10 uppercase tracking-widest">WUSHA STUDIO</div>
                        </div>
                    )}
                    <div className="space-y-4">
                        {state.preset && (
                            <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
                                <p className="text-xs font-bold text-gold">{presetIsFullyAligned ? "Preset جاهزة" : "Preset كبداية إبداعية"}</p>
                                <p className="mt-1 text-sm font-bold text-theme">{state.preset.name}</p>
                                {state.preset.story ? <p className="mt-1 text-xs leading-6 text-theme-subtle">{state.preset.story}</p> : null}
                                {!presetIsFullyAligned ? (
                                    <p className="mt-2 text-xs leading-6 text-theme-subtle">
                                        تم تخصيص الطلب يدويًا في: {presetOverrideLabels.join("، ")}
                                    </p>
                                ) : null}
                            </div>
                        )}
                        <SummaryRow label="القطعة واللون" value={`${state.garment?.name} (${state.color?.name})`} color={state.color?.hex_code} />
                        <SummaryRow label="التصميم" value={state.studioItem?.name} />
                        <SummaryRow label="مكان الطباعة" value={`${state.printPosition === "chest" ? "الصدر" : state.printPosition === "back" ? "الظهر" : "أخرى"} - ${state.size?.name}`} />
                    </div>
                </div>
            ) : (
                <div className="space-y-4 mb-8">
                    {state.preset && (
                        <div className="rounded-xl border border-gold/20 bg-gold/5 p-4">
                            <p className="text-xs font-bold text-gold">{presetIsFullyAligned ? "Preset جاهزة" : "Preset كبداية إبداعية"}</p>
                            <p className="mt-1 text-sm font-bold text-theme">{state.preset.name}</p>
                            {state.preset.story ? <p className="mt-1 text-xs leading-6 text-theme-subtle">{state.preset.story}</p> : null}
                            {!presetIsFullyAligned ? (
                                <p className="mt-2 text-xs leading-6 text-theme-subtle">
                                    تم تخصيص الطلب يدويًا في: {presetOverrideLabels.join("، ")}
                                </p>
                            ) : null}
                        </div>
                    )}
                    <SummaryRow label="القطعة" value={state.garment?.name} />
                    <SummaryRow label="اللون" value={state.color?.name} color={state.color?.hex_code} />
                    <SummaryRow label="المقاس" value={state.size?.name} />
                    <SummaryRow
                        label="مكان وحجم التصميم"
                        value={
                            (state.printPosition === "chest" ? "الصدر" : state.printPosition === "back" ? "الظهر" : state.printPosition === "shoulder_right" ? "الكتف الأيمن" : state.printPosition === "shoulder_left" ? "الكتف الأيسر" : "—")
                            + " — " +
                            (state.printSize === "large" ? "مقاس كبير" : state.printSize === "small" ? "مقاس صغير" : "—")
                        }
                    />
                    <SummaryRow label="طريقة التصميم" value={state.method === "from_text" ? "من نص" : state.method === "from_image" ? "من صورة" : undefined} />
                    <SummaryRow label="النمط" value={state.style?.name} />
                    <SummaryRow label="الأسلوب" value={state.artStyle?.name} />
                    {state.colorPackage && <SummaryRow label="باقة الألوان" value={state.colorPackage.name} />}
                    {state.customColors.length > 0 && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-theme-subtle border border-theme-subtle">
                            <span className="text-sm text-theme-subtle">ألوان مخصصة</span>
                            <div className="flex gap-1">
                                {state.customColors.map((c, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full border border-theme-soft" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                    )}
                    {state.textPrompt && (
                        <div className="p-4 rounded-xl bg-theme-subtle border border-theme-subtle">
                            <span className="text-xs text-theme-subtle block mb-1">وصف التصميم</span>
                            <p className="text-sm text-theme-soft">{state.textPrompt}</p>
                        </div>
                    )}
                    {state.imagePreview && (
                        <div className="p-4 rounded-xl bg-theme-subtle border border-theme-subtle">
                            <span className="text-xs text-theme-subtle block mb-2">الصورة المرجعية</span>
                            <img src={state.imagePreview} alt="Reference" className="max-h-32 rounded-xl" />
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4 pt-6 border-t border-theme-subtle">
                {state.submissionError && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:px-5">
                        {state.submissionError}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className={btnBack}>
                        <ArrowRight className="w-4 h-4" />
                        السابق
                    </button>
                    <button
                        onClick={onSend}
                        disabled={state.isSending}
                        className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-50 ${
                            state.method === "studio" 
                            ? "bg-theme text-bg hover:bg-gold hover:text-bg" 
                            : "bg-gradient-to-r from-gold to-gold-light text-bg hover:shadow-xl hover:shadow-gold/30"
                        }`}
                    >
                        {state.isSending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                                {state.method === "studio" ? "جاري الإضافة..." : "جاري الإرسال..."}
                            </>
                        ) : (
                            <>
                                {state.method === "studio" ? (
                                    <>
                                        <Send className="w-4 h-4" />
                                        إضافة للسلة
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        إرسال الطلب
                                    </>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

function SummaryRow({ label, value, color }: { label: string; value?: string; color?: string }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-theme-subtle border border-theme-subtle">
            <span className="text-sm text-theme-subtle">{label}</span>
            <div className="flex items-center gap-2">
                {color && <div className="w-4 h-4 rounded-full border border-theme-soft" style={{ backgroundColor: color }} />}
                <span className="text-sm font-medium text-theme">{value ?? "—"}</span>
            </div>

        </div>
    );
}
