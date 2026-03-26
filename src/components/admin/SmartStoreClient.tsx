"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Pencil,
    Trash2,
    Shirt,
    Palette,
    Ruler,
    Sparkles,
    Paintbrush,
    SwatchBook,
    Upload,
    X,
    Check,
    Image as ImageIcon,
    Loader2,
    Camera,
    ImagePlus,
    Layers,
    Search,
} from "lucide-react";
import {
    upsertGarment,
    upsertColor,
    upsertSize,
    upsertStyle,
    upsertArtStyle,
    upsertColorPackage,
    deleteGarment,
    deleteColor,
    deleteSize,
    deleteStyle,
    deleteArtStyle,
    deleteColorPackage,
    upsertStudioItem,
    deleteStudioItem,
    upsertDesignPreset,
    deleteDesignPreset,
    upsertDesignCompatibility,
    deleteDesignCompatibility,
    upsertGarmentStudioMockup,
    deleteGarmentStudioMockup,
    uploadSmartStoreImage,
} from "@/app/actions/smart-store";
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
    normalizeColorTokens,
    normalizeDesignMetadata,
    rankDesignCandidates,
    rankDesignPresets,
    type DesignMethod,
    type PrintPosition,
    type PrintSize,
    type RankedDesignCandidate,
} from "@/lib/design-intelligence";

// ─── Types ──────────────────────────────────────────────

type TabId = "garments" | "colors" | "sizes" | "styles" | "artStyles" | "colorPackages" | "studioItems" | "mockups" | "presets" | "intelligence";

interface Props {
    garments: CustomDesignGarment[];
    colors: CustomDesignColor[];
    sizes: CustomDesignSize[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
    studioItems: CustomDesignStudioItem[];
    garmentStudioMockups: GarmentStudioMockup[];
    presets: CustomDesignPreset[];
    compatibilities: CustomDesignOptionCompatibility[];
}

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: "garments", label: "القطع", icon: Shirt },
    { id: "colors", label: "الألوان", icon: Palette },
    { id: "sizes", label: "المقاسات", icon: Ruler },
    { id: "styles", label: "الأنماط", icon: Sparkles },
    { id: "artStyles", label: "الأساليب", icon: Paintbrush },
    { id: "colorPackages", label: "باقات الألوان", icon: SwatchBook },
    { id: "studioItems", label: "ستيديو وشّى", icon: Camera },
    { id: "mockups", label: "موكبات التصاميم", icon: ImagePlus },
    { id: "presets", label: "الـ Presets", icon: Layers },
    { id: "intelligence", label: "خريطة الذكاء", icon: Sparkles },
];

// ─── Component ──────────────────────────────────────────

export function SmartStoreClient({ garments, colors, sizes, styles, artStyles, colorPackages, studioItems, garmentStudioMockups, presets, compatibilities }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>("garments");
    const router = useRouter();
    const [garmentsState, setGarmentsState] = useState(garments);
    const [colorsState, setColorsState] = useState(colors);

    useEffect(() => {
        setGarmentsState(garments);
    }, [garments]);

    useEffect(() => {
        setColorsState(colors);
    }, [colors]);

    return (
        <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex min-h-[42px] shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? "theme-surface-panel text-gold border-gold/30" : "bg-theme-faint text-theme-subtle border border-theme-subtle hover:text-theme-strong hover:bg-theme-subtle"}`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {activeTab === "garments" && <GarmentsTab items={garmentsState} setItems={setGarmentsState} onFallbackRefresh={() => router.refresh()} />}
                    {activeTab === "colors" && <ColorsTab items={colorsState} garments={garmentsState} setItems={setColorsState} onFallbackRefresh={() => router.refresh()} />}
                    {activeTab === "sizes" && <SizesTab items={sizes} garments={garmentsState} colors={colorsState} onRefresh={() => router.refresh()} />}
                    {activeTab === "styles" && <StylesTab items={styles} onRefresh={() => router.refresh()} />}
                    {activeTab === "artStyles" && <ArtStylesTab items={artStyles} onRefresh={() => router.refresh()} />}
                    {activeTab === "colorPackages" && <ColorPackagesTab items={colorPackages} onRefresh={() => router.refresh()} />}
                    {activeTab === "studioItems" && <StudioItemsTab items={studioItems} onRefresh={() => router.refresh()} />}
                    {activeTab === "mockups" && <MockupsTab items={garmentStudioMockups} garments={garmentsState} studioItems={studioItems} onRefresh={() => router.refresh()} />}
                    {activeTab === "presets" && <PresetsTab items={presets} garments={garmentsState} styles={styles} artStyles={artStyles} colorPackages={colorPackages} studioItems={studioItems} onRefresh={() => router.refresh()} />}
                    {activeTab === "intelligence" && (
                        <IntelligenceTab
                            compatibilities={compatibilities}
                            garments={garmentsState}
                            styles={styles}
                            artStyles={artStyles}
                            colorPackages={colorPackages}
                            studioItems={studioItems}
                            presets={presets}
                            onRefresh={() => router.refresh()}
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Shared UI Helpers
// ═══════════════════════════════════════════════════════════

function SectionCard({ children, title, onAdd }: { children: React.ReactNode; title: string; onAdd?: () => void }) {
    return (
        <div className="theme-surface-panel rounded-2xl p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-theme">{title}</h2>
                {onAdd ? (
                    <button onClick={onAdd} className="inline-flex min-h-[42px] items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-sm font-medium">
                        <Plus className="w-4 h-4" /> إضافة
                    </button>
                ) : null}
            </div>
            {children}
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-theme-soft">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "input-dark w-full px-4 py-2.5 rounded-xl text-sm";
const btnPrimary = "px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-[var(--wusha-bg)] font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all";
const btnSecondary = "px-4 py-2.5 rounded-xl border border-theme-soft bg-theme-faint text-theme-soft text-sm hover:bg-theme-subtle transition-colors";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="theme-surface-panel relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-5 shadow-2xl sm:p-6"
            >
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-theme">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-theme-subtle rounded-lg transition-colors">
                        <X className="w-5 h-5 text-theme-subtle" />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="text-center py-16 text-theme-faint"><p className="text-sm">{text}</p></div>;
}

function InlineError({ message }: { message: string | null }) {
    if (!message) return null;
    return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {message}
        </div>
    );
}

function getMethodLabel(method: DesignMethod | "") {
    if (method === "from_text") return "من نص";
    if (method === "from_image") return "من صورة";
    if (method === "studio") return "ستيديو وشّى";
    return "غير محدد";
}

function getPrintPositionLabel(position: PrintPosition | "") {
    if (position === "chest") return "الصدر";
    if (position === "back") return "الظهر";
    if (position === "shoulder_right") return "الكتف الأيمن";
    if (position === "shoulder_left") return "الكتف الأيسر";
    return "غير محدد";
}

function getPrintSizeLabel(size: PrintSize | "") {
    if (size === "large") return "كبير";
    if (size === "small") return "صغير";
    return "غير محدد";
}

function getRelationBadgeClass(relation: CustomDesignOptionCompatibility["relation"] | null) {
    if (relation === "signature") return "border border-gold/20 bg-gold/10 text-gold";
    if (relation === "avoid") return "border border-red-500/20 bg-red-500/10 text-red-300";
    return "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
}

function getRelationLabel(relation: CustomDesignOptionCompatibility["relation"] | null) {
    if (relation === "signature") return "Signature";
    if (relation === "recommended") return "موصى به";
    if (relation === "avoid") return "أقل انسجامًا";
    return null;
}

function getActionError(result: any) {
    if (!result) return "حدث خطأ غير متوقع.";
    if (typeof result.error === "string" && result.error.trim()) return result.error;
    if (result.success === false && typeof result.message === "string" && result.message.trim()) return result.message;
    return null;
}

function MetadataFields({
    defaults,
    mode,
}: {
    defaults?: {
        creative_direction?: string | null;
        energy?: string | null;
        complexity?: string | null;
        luxury_tier?: string | null;
        story_hook?: string | null;
        palette_family?: string | null;
        keywords?: string[];
        moods?: string[];
        audiences?: string[];
        placements?: string[];
        recommended_methods?: string[];
        notes?: string | null;
    };
    mode?: "style" | "artStyle" | "colorPackage" | "preset" | "studioItem";
}) {
    return (
        <div className="space-y-4 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
            <div>
                <p className="text-sm font-bold text-theme">طبقة الذكاء الإبداعي</p>
                <p className="mt-1 text-xs text-theme-subtle">هذه الحقول تُستخدم في التوصية والترتيب والـ presets داخل الواجهة العامة.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Creative Direction">
                    <input name="creative_direction" defaultValue={defaults?.creative_direction ?? ""} className={inputCls} placeholder="quiet luxury minimalism" />
                </FormField>
                <FormField label="Story Hook">
                    <input name="story_hook" defaultValue={defaults?.story_hook ?? ""} className={inputCls} placeholder="قطعة تبدو باهظة بدون ضجيج" />
                </FormField>
                <FormField label="Energy">
                    <select name="energy" defaultValue={defaults?.energy ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        <option value="low">هادئ</option>
                        <option value="medium">متوازن</option>
                        <option value="high">عالٍ</option>
                    </select>
                </FormField>
                <FormField label="Complexity">
                    <select name="complexity" defaultValue={defaults?.complexity ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        <option value="minimal">Minimal</option>
                        <option value="balanced">Balanced</option>
                        <option value="bold">Bold</option>
                    </select>
                </FormField>
                <FormField label="Luxury Tier">
                    <select name="luxury_tier" defaultValue={defaults?.luxury_tier ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        <option value="core">Core</option>
                        <option value="signature">Signature</option>
                        <option value="editorial">Editorial</option>
                    </select>
                </FormField>
                {mode === "colorPackage" ? (
                    <FormField label="Palette Family">
                        <input name="palette_family" defaultValue={defaults?.palette_family ?? ""} className={inputCls} placeholder="dark contrast" />
                    </FormField>
                ) : (
                    <FormField label="Recommended Methods">
                        <input name="recommended_methods" defaultValue={(defaults?.recommended_methods ?? []).join(", ")} className={inputCls} placeholder="from_text, from_image" />
                    </FormField>
                )}
                <FormField label="Keywords">
                    <input name="keywords" defaultValue={(defaults?.keywords ?? []).join(", ")} className={inputCls} placeholder="luxury, editorial, heritage" />
                </FormField>
                <FormField label="Moods">
                    <input name="moods" defaultValue={(defaults?.moods ?? []).join(", ")} className={inputCls} placeholder="هادئ, فاخر, جريء" />
                </FormField>
                <FormField label="Audiences">
                    <input name="audiences" defaultValue={(defaults?.audiences ?? []).join(", ")} className={inputCls} placeholder="drops, daily luxury, gifts" />
                </FormField>
                <FormField label="Placements">
                    <input name="placements" defaultValue={(defaults?.placements ?? []).join(", ")} className={inputCls} placeholder="chest, back, shoulder_right" />
                </FormField>
            </div>

            <FormField label="ملاحظات داخلية">
                <textarea name="notes" defaultValue={defaults?.notes ?? ""} className={inputCls} rows={3} placeholder="ما الذي يميّز هذا الخيار؟ ومتى يُفضّل استخدامه؟" />
            </FormField>
        </div>
    );
}

function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "حذف",
    loading = false,
    onClose,
    onConfirm,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    loading?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (
        <Modal open={open} onClose={loading ? () => undefined : onClose} title={title}>
            <div className="space-y-4">
                <p className="text-sm leading-relaxed text-theme-subtle">{description}</p>
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={btnSecondary + " flex-1 disabled:cursor-not-allowed disabled:opacity-40"}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// ─── Image Uploader ─────────────────────────────────────

type SmartStoreImageFieldName =
    | "image_url"
    | "image_front_url"
    | "image_back_url"
    | "mockup_front_url"
    | "mockup_back_url"
    | "mockup_model_url"
    | "main_image_url"
    | "mockup_image_url"
    | "model_image_url";

function ImageUploader({ value, onChange, folder, label, fieldName = "image_url" }: {
    value: string;
    onChange: (url: string) => void;
    folder: string;
    label?: string;
    fieldName?: SmartStoreImageFieldName;
}) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(value);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await uploadSmartStoreImage(folder, formData);

            if (result.success) {
                setPreview(result.url);
                onChange(result.url);
            } else {
                setPreview(value);
                setError(result.error || "فشل رفع الصورة");
            }
        } catch (error) {
            console.error("Smart-store image upload failed", error);
            setPreview(value);
            setError("تعذر رفع الصورة الآن. حاول مرة أخرى.");
        } finally {
            URL.revokeObjectURL(localUrl);
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    // Sync external changes
    if (!uploading && value !== preview && value !== "" && preview !== value) {
        // handled by useEffect below
    }

    return (
        <div className="space-y-2">
            {/* Preview */}
            {(preview || value) && (
                <div className="relative inline-block">
                    <img
                        src={preview || value}
                        alt={label ?? "صورة"}
                        className="h-28 max-w-full rounded-xl object-cover border border-theme-soft bg-theme-subtle"
                    />
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-theme-subtle rounded-xl">
                            <Loader2 className="w-6 h-6 text-gold animate-spin" />
                        </div>
                    )}
                    {!uploading && (preview || value) && (
                        <button
                            type="button"
                            onClick={() => { setPreview(""); onChange(""); }}
                            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                        >
                            <X className="w-3.5 h-3.5 text-theme" />
                        </button>
                    )}
                </div>
            )}
            {/* Upload button */}
            <label className="flex min-h-[42px] w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-theme-soft bg-theme-subtle px-4 py-2.5 text-sm text-theme-subtle transition-colors hover:border-gold/30 hover:text-theme-soft">
                <Upload className="w-4 h-4" />
                {uploading ? "جاري الرفع..." : (preview || value) ? "تغيير الصورة" : "رفع صورة من الجهاز"}
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                </div>
            ) : null}
            {/* Hidden input for form (explicit fieldName; do not derive from Arabic labels) */}
            <input type="hidden" name={fieldName} value={preview || value || ""} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Garments Tab
// ═══════════════════════════════════════════════════════════

function GarmentsTab({
    items,
    setItems,
    onFallbackRefresh,
}: {
    items: CustomDesignGarment[];
    setItems: React.Dispatch<React.SetStateAction<CustomDesignGarment[]>>;
    onFallbackRefresh: () => void;
}) {
    const [editing, setEditing] = useState<CustomDesignGarment | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const openAdd = () => { setIsAdding(true); setImageUrl(""); setError(null); };
    const openEdit = (g: CustomDesignGarment) => { setEditing(g); setImageUrl(g.image_url ?? ""); setError(null); };
    const closeModal = () => { setEditing(null); setIsAdding(false); setImageUrl(""); setError(null); };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("image_url", imageUrl);
            const result = await upsertGarment(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            if (result && typeof result === "object" && "row" in result && result.row) {
                const row = result.row as CustomDesignGarment;
                setItems((prev) => {
                    if (editing) return prev.map((g) => (g.id === row.id ? row : g));
                    return [...prev, row].sort(
                        (a, b) =>
                            (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "ar")
                    );
                });
            } else {
                onFallbackRefresh();
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ القطعة الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onFallbackRefresh, imageUrl, setItems]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteGarment(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            setItems((prev) => prev.filter((g) => g.id !== id));
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف القطعة الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [pendingDeleteId, setItems]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="اسم القطعة">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: تيشيرت" />
            </FormField>
            <FormField label="الرابط (slug)">
                <input name="slug" defaultValue={editing?.slug ?? ""} required className={inputCls} placeholder="مثال: tshirt" />
            </FormField>
            <FormField label="صورة القطعة">
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder="garments" fieldName="image_url" />
            </FormField>
            <FormField label="الترتيب">
                <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>

            {/* السعر الأساسي + أسعار الطباعة */}
            <div className="pt-2 border-t border-theme-subtle">
                <FormField label="سعر القطعة الأساسي (بدون الطباعة) — ر.س">
                    <input name="base_price" type="number" step="0.01" min="0" defaultValue={(editing as any)?.base_price ?? 0} className={inputCls} />
                </FormField>
                <p className="text-sm font-bold text-gold mb-3 mt-3">💰 أسعار التصاميم (الطباعة) — ر.س</p>
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="الصدر — كبير">
                        <input name="price_chest_large" type="number" step="0.01" min="0" defaultValue={editing?.price_chest_large ?? 0} className={inputCls} />
                    </FormField>
                    <FormField label="الصدر — صغير">
                        <input name="price_chest_small" type="number" step="0.01" min="0" defaultValue={editing?.price_chest_small ?? 0} className={inputCls} />
                    </FormField>
                    <FormField label="الظهر — كبير">
                        <input name="price_back_large" type="number" step="0.01" min="0" defaultValue={editing?.price_back_large ?? 0} className={inputCls} />
                    </FormField>
                    <FormField label="الظهر — صغير">
                        <input name="price_back_small" type="number" step="0.01" min="0" defaultValue={editing?.price_back_small ?? 0} className={inputCls} />
                    </FormField>
                    <FormField label="الكتف — كبير">
                        <input name="price_shoulder_large" type="number" step="0.01" min="0" defaultValue={editing?.price_shoulder_large ?? 0} className={inputCls} />
                    </FormField>
                    <FormField label="الكتف — صغير">
                        <input name="price_shoulder_small" type="number" step="0.01" min="0" defaultValue={editing?.price_shoulder_small ?? 0} className={inputCls} />
                    </FormField>
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="القطع (الملابس)" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            {items.length === 0 ? <EmptyState text="لا توجد قطع بعد. أضف أول قطعة!" /> : (
                <div className="grid gap-3">
                    {items.map((g) => (
                        <div key={g.id} className="flex items-center gap-4 p-4 rounded-xl bg-theme-faint border border-theme-subtle group">
                            {g.image_url ? (
                                <img src={g.image_url} alt={g.name} className="w-14 h-14 rounded-lg object-cover bg-theme-subtle" />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-theme-subtle flex items-center justify-center"><ImageIcon className="w-6 h-6 text-theme-faint" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-theme truncate">{g.name}</p>
                                <p className="text-xs text-theme-subtle">{g.slug} · ترتيب: {g.sort_order}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${g.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                {g.is_active ? "نشط" : "معطل"}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(g)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                <button onClick={() => setPendingDeleteId(g.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل القطعة" : "إضافة قطعة جديدة"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف القطعة"
                description="سيتم حذف هذه القطعة مع جميع الألوان والمقاسات المرتبطة بها."
                confirmLabel="حذف القطعة"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Colors Tab
// ═══════════════════════════════════════════════════════════

function ColorsTab({
    items,
    garments,
    setItems,
    onFallbackRefresh,
}: {
    items: CustomDesignColor[];
    garments: CustomDesignGarment[];
    setItems: React.Dispatch<React.SetStateAction<CustomDesignColor[]>>;
    onFallbackRefresh: () => void;
}) {
    const [editing, setEditing] = useState<CustomDesignColor | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [filterGarment, setFilterGarment] = useState<string>("all");
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const filtered = filterGarment === "all" ? items : items.filter(c => c.garment_id === filterGarment);
    const openAdd = () => { setIsAdding(true); setImageUrl(""); setError(null); };
    const openEdit = (c: CustomDesignColor) => { setEditing(c); setImageUrl(c.image_url ?? ""); setError(null); };
    const closeModal = () => { setEditing(null); setIsAdding(false); setImageUrl(""); setError(null); };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("image_url", imageUrl);
            const result = await upsertColor(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            if (result && typeof result === "object" && "row" in result && result.row) {
                const row = result.row as CustomDesignColor;
                setItems((prev) => {
                    if (editing) return prev.map((c) => (c.id === row.id ? row : c));
                    return [...prev, row].sort(
                        (a, b) =>
                            (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "ar")
                    );
                });
            } else {
                onFallbackRefresh();
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ اللون الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onFallbackRefresh, imageUrl, setItems]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteColor(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            setItems((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف اللون الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [pendingDeleteId, setItems]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="القطعة">
                <select name="garment_id" defaultValue={editing?.garment_id ?? garments[0]?.id ?? ""} required className={inputCls}>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </FormField>
            <FormField label="اسم اللون">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: أسود" />
            </FormField>
            <FormField label="كود اللون">
                <input name="hex_code" type="color" defaultValue={editing?.hex_code ?? "#000000"} required className="w-16 h-10 rounded-lg cursor-pointer bg-transparent border border-theme-soft" />
            </FormField>
            <FormField label="صورة Mockup">
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder="colors" fieldName="image_url" />
            </FormField>
            <FormField label="الترتيب">
                <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="ألوان القطع" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            <div className="mb-4">
                <select value={filterGarment} onChange={(e) => setFilterGarment(e.target.value)} className={inputCls + " max-w-xs"}>
                    <option value="all">جميع القطع</option>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>
            {filtered.length === 0 ? <EmptyState text="لا توجد ألوان بعد." /> : (
                <div className="grid gap-3">
                    {filtered.map((c) => {
                        const garmentName = garments.find(g => g.id === c.garment_id)?.name ?? "—";
                        return (
                            <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-theme-faint border border-theme-subtle group">
                                <div className="w-10 h-10 rounded-lg border border-theme-soft shadow-inner" style={{ backgroundColor: c.hex_code }} />
                                {c.image_url && <img src={c.image_url} alt={c.name} className="w-14 h-14 rounded-lg object-cover bg-theme-subtle" />}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-theme truncate">{c.name}</p>
                                    <p className="text-xs text-theme-subtle">{garmentName} · {c.hex_code}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${c.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {c.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(c)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل اللون" : "إضافة لون جديد"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف اللون"
                description="سيتم حذف هذا اللون من المكتبة الحالية."
                confirmLabel="حذف اللون"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Generic Items Tab (Styles, Art Styles)
// ═══════════════════════════════════════════════════════════

function GenericItemsTab<T extends { id: string; name: string; description?: string | null; image_url?: string | null; sort_order?: number; is_active: boolean; metadata?: unknown }>({
    items, title, onUpsert, onDelete, onRefresh, folder,
}: {
    items: T[]; title: string; onUpsert: (fd: FormData) => Promise<any>; onDelete: (id: string) => Promise<any>; onRefresh: () => void; folder: string;
}) {
    const [editing, setEditing] = useState<T | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const openAdd = () => { setIsAdding(true); setImageUrl(""); setError(null); };
    const openEdit = (item: T) => { setEditing(item); setImageUrl(item.image_url ?? ""); setError(null); };
    const closeModal = () => { setEditing(null); setIsAdding(false); setImageUrl(""); setError(null); };
    const metadataDefaults = editing ? normalizeDesignMetadata(editing.metadata) : undefined;

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("image_url", imageUrl);
            const result = await onUpsert(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ العنصر الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, onUpsert, imageUrl]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await onDelete(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف العنصر الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, onDelete, pendingDeleteId]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="الاسم">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} />
            </FormField>
            <FormField label="الوصف">
                <textarea name="description" defaultValue={editing?.description ?? ""} className={inputCls} rows={3} />
            </FormField>
            <FormField label="الصورة">
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder={folder} fieldName="image_url" />
            </FormField>
            <FormField label="الترتيب">
                <input name="sort_order" type="number" defaultValue={(editing as any)?.sort_order ?? 0} className={inputCls} />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>
            <MetadataFields defaults={metadataDefaults} mode={folder === "styles" ? "style" : "artStyle"} />
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title={title} onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            {items.length === 0 ? <EmptyState text="لا توجد عناصر بعد." /> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-theme-faint border border-theme-subtle group relative overflow-hidden">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-3 bg-theme-subtle" />
                            ) : (
                                <div className="w-full h-32 rounded-lg bg-theme-subtle flex items-center justify-center mb-3"><ImageIcon className="w-8 h-8 text-theme-faint" /></div>
                            )}
                            <p className="font-medium text-theme truncate">{item.name}</p>
                            {item.description && <p className="text-xs text-theme-subtle mt-1 line-clamp-2">{item.description}</p>}
                            {normalizeDesignMetadata(item.metadata).creative_direction && (
                                <p className="mt-2 text-[10px] font-bold text-gold/90">{normalizeDesignMetadata(item.metadata).creative_direction}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {item.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-theme-subtle rounded-lg"><Pencil className="w-3.5 h-3.5 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(item.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل العنصر" : "إضافة عنصر جديد"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف العنصر"
                description="سيتم حذف هذا العنصر من المكتبة الحالية."
                confirmLabel="حذف العنصر"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

function StylesTab({ items, onRefresh }: { items: CustomDesignStyle[]; onRefresh: () => void }) {
    return <GenericItemsTab items={items} title="أنماط التصميم" onUpsert={upsertStyle} onDelete={deleteStyle} onRefresh={onRefresh} folder="styles" />;
}

function ArtStylesTab({ items, onRefresh }: { items: CustomDesignArtStyle[]; onRefresh: () => void }) {
    return <GenericItemsTab items={items} title="أساليب الرسم" onUpsert={upsertArtStyle} onDelete={deleteArtStyle} onRefresh={onRefresh} folder="art-styles" />;
}

// ═══════════════════════════════════════════════════════════
//  Sizes Tab
// ═══════════════════════════════════════════════════════════

function SizesTab({ items, garments, colors, onRefresh }: { items: CustomDesignSize[]; garments: CustomDesignGarment[]; colors: CustomDesignColor[]; onRefresh: () => void }) {
    const [editing, setEditing] = useState<CustomDesignSize | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [filterGarment, setFilterGarment] = useState<string>("all");
    const [frontUrl, setFrontUrl] = useState("");
    const [backUrl, setBackUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const filtered = filterGarment === "all" ? items : items.filter(s => s.garment_id === filterGarment);
    const openAdd = () => { setIsAdding(true); setFrontUrl(""); setBackUrl(""); setError(null); };
    const openEdit = (s: CustomDesignSize) => { setEditing(s); setFrontUrl(s.image_front_url ?? ""); setBackUrl(s.image_back_url ?? ""); setError(null); };
    const closeModal = () => { setEditing(null); setIsAdding(false); setFrontUrl(""); setBackUrl(""); setError(null); };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("image_front_url", frontUrl);
            fd.set("image_back_url", backUrl);
            const result = await upsertSize(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ المقاس الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, frontUrl, backUrl]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteSize(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف المقاس الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, pendingDeleteId]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="القطعة">
                <select name="garment_id" defaultValue={editing?.garment_id ?? garments[0]?.id ?? ""} required className={inputCls}>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </FormField>
            <FormField label="اللون (اختياري)">
                <select name="color_id" defaultValue={editing?.color_id ?? ""} className={inputCls}>
                    <option value="">بدون تخصيص لون</option>
                    {colors.map((c) => <option key={c.id} value={c.id}>{c.name} ({garments.find(g => g.id === c.garment_id)?.name})</option>)}
                </select>
            </FormField>
            <FormField label="اسم المقاس">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: XL" />
            </FormField>
            <FormField label="صورة أمام">
                <ImageUploader value={frontUrl} onChange={setFrontUrl} folder="sizes" label="صورة أمام" fieldName="image_front_url" />
            </FormField>
            <FormField label="صورة خلف">
                <ImageUploader value={backUrl} onChange={setBackUrl} folder="sizes" label="صورة خلف" fieldName="image_back_url" />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="المقاسات" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            <div className="mb-4">
                <select value={filterGarment} onChange={(e) => setFilterGarment(e.target.value)} className={inputCls + " max-w-xs"}>
                    <option value="all">جميع القطع</option>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>
            {filtered.length === 0 ? <EmptyState text="لا توجد مقاسات بعد." /> : (
                <div className="grid gap-3">
                    {filtered.map((s) => {
                        const garmentName = garments.find(g => g.id === s.garment_id)?.name ?? "—";
                        const colorName = s.color_id ? colors.find(c => c.id === s.color_id)?.name : null;
                        return (
                            <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-theme-faint border border-theme-subtle group">
                                <div className="w-10 h-10 rounded-lg bg-theme-subtle flex items-center justify-center font-bold text-gold text-sm">{s.name}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-theme truncate">{garmentName} — {s.name}</p>
                                    {colorName && <p className="text-xs text-theme-subtle">لون: {colorName}</p>}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {s.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(s)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(s.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل المقاس" : "إضافة مقاس جديد"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف المقاس"
                description="سيتم حذف هذا المقاس من القطعة الحالية."
                confirmLabel="حذف المقاس"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Color Packages Tab
// ═══════════════════════════════════════════════════════════

function ColorPackagesTab({ items, onRefresh }: { items: CustomDesignColorPackage[]; onRefresh: () => void }) {
    const [editing, setEditing] = useState<CustomDesignColorPackage | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [packageColors, setPackageColors] = useState<{ hex: string; name: string }[]>([]);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const metadataDefaults = editing ? normalizeDesignMetadata(editing.metadata) : undefined;

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("colors", JSON.stringify(packageColors));
            fd.set("image_url", imageUrl);
            const result = await upsertColorPackage(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            setEditing(null);
            setIsAdding(false);
            setPackageColors([]);
            setImageUrl("");
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ الباقة الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, packageColors, imageUrl]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteColorPackage(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف الباقة الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, pendingDeleteId]);

    const openEdit = (item: CustomDesignColorPackage) => {
        setEditing(item);
        setPackageColors(normalizeColorTokens(item.colors));
        setImageUrl(item.image_url ?? "");
        setError(null);
    };

    const openAdd = () => {
        setIsAdding(true);
        setPackageColors([{ hex: "#ceae7f", name: "ذهبي" }, { hex: "#000000", name: "أسود" }]);
        setImageUrl("");
        setError(null);
    };

    const closeModal = () => { setEditing(null); setIsAdding(false); setPackageColors([]); setImageUrl(""); setError(null); };

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="اسم الباقة">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: باقة ذهبية" />
            </FormField>
            <FormField label="صورة الباقة">
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder="color-packages" fieldName="image_url" />
            </FormField>
            <FormField label="الألوان">
                <div className="space-y-2">
                    {packageColors.map((c, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input type="color" value={c.hex} onChange={(e) => { const n = [...packageColors]; n[i] = { ...n[i], hex: e.target.value }; setPackageColors(n); }} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                            <input value={c.name} onChange={(e) => { const n = [...packageColors]; n[i] = { ...n[i], name: e.target.value }; setPackageColors(n); }} className={inputCls + " flex-1"} placeholder="اسم اللون" />
                            <button type="button" onClick={() => setPackageColors(packageColors.filter((_, j) => j !== i))} className="p-2 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4 text-red-400/60" /></button>
                        </div>
                    ))}
                    <button type="button" onClick={() => setPackageColors([...packageColors, { hex: "#888888", name: "" }])} className="text-xs text-gold hover:text-gold-light transition-colors">+ أضف لون</button>
                </div>
            </FormField>
            <FormField label="الترتيب">
                <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>
            <MetadataFields defaults={metadataDefaults} mode="colorPackage" />
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="باقات الألوان" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            {items.length === 0 ? <EmptyState text="لا توجد باقات ألوان بعد." /> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((pkg) => (
                        <div key={pkg.id} className="p-4 rounded-xl bg-theme-faint border border-theme-subtle group">
                            {pkg.image_url && <img src={pkg.image_url} alt={pkg.name} className="w-full h-24 object-cover rounded-lg mb-2 bg-theme-subtle" />}
                            <p className="font-medium text-theme mb-2">{pkg.name}</p>
                            {normalizeDesignMetadata(pkg.metadata).palette_family && (
                                <p className="mb-2 text-[10px] font-bold text-gold/90">{normalizeDesignMetadata(pkg.metadata).palette_family}</p>
                            )}
                            <div className="flex gap-1 mb-3">
                                {(Array.isArray(pkg.colors) ? pkg.colors : []).map((c: any, i: number) => (
                                    <div key={i} className="w-6 h-6 rounded-full border border-theme-soft" style={{ backgroundColor: c.hex }} title={c.name} />
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-1 rounded-full ${pkg.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {pkg.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-theme-subtle rounded-lg"><Pencil className="w-3.5 h-3.5 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(pkg.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل الباقة" : "إضافة باقة جديدة"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف باقة الألوان"
                description="سيتم حذف باقة الألوان الحالية من المكتبة."
                confirmLabel="حذف الباقة"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  WASHA Studio Tab
// ═══════════════════════════════════════════════════════════

function StudioItemsTab({ items, onRefresh }: { items: CustomDesignStudioItem[]; onRefresh: () => void }) {
    const [editing, setEditing] = useState<CustomDesignStudioItem | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [mainImage, setMainImage] = useState("");
    const [mockupImage, setMockupImage] = useState("");
    const [modelImage, setModelImage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const openAdd = () => { setIsAdding(true); setMainImage(""); setMockupImage(""); setModelImage(""); setError(null); };
    const openEdit = (s: CustomDesignStudioItem) => {
        setEditing(s);
        setMainImage(s.main_image_url ?? "");
        setMockupImage(s.mockup_image_url ?? "");
        setModelImage(s.model_image_url ?? "");
        setError(null);
    };
    const closeModal = () => { setEditing(null); setIsAdding(false); setMainImage(""); setMockupImage(""); setModelImage(""); setError(null); };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("main_image_url", mainImage);
            fd.set("mockup_image_url", mockupImage);
            fd.set("model_image_url", modelImage);

            const result = await upsertStudioItem(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ تصميم الاستوديو الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, mainImage, mockupImage, modelImage]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteStudioItem(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف تصميم الاستوديو الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, pendingDeleteId]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="اسم التصميم">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: تصميم تراثي ملكي" />
            </FormField>
            <FormField label="وصف التصميم">
                <textarea name="description" defaultValue={editing?.description ?? ""} className={inputCls} rows={3} placeholder="وصف قصير للتصميم..." />
            </FormField>
            <FormField label="السعر الإضافي (ر.س)">
                <input name="price" type="number" step="0.01" min="0" defaultValue={editing?.price ?? 0} className={inputCls} />
            </FormField>
            <FormField label="صورة التصميم الرئيسية">
                <ImageUploader value={mainImage} onChange={setMainImage} folder="studio-items" label="الصورة الرئيسية" fieldName="main_image_url" />
            </FormField>
            <FormField label="صورة الـ Mockup (التفاصيل)">
                <ImageUploader value={mockupImage} onChange={setMockupImage} folder="studio-items" label="صورة الموكب" fieldName="mockup_image_url" />
            </FormField>
            <FormField label="صورة على المودل">
                <ImageUploader value={modelImage} onChange={setModelImage} folder="studio-items" label="صورة المودل" fieldName="model_image_url" />
            </FormField>
            <FormField label="الترتيب">
                <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="ستيديو وشّى" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            {items.length === 0 ? <EmptyState text="لا توجد تصاميم ستيديو بعد." /> : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-theme-faint border border-theme-subtle group overflow-hidden relative">
                            <div className="relative mb-3 aspect-[3/4] rounded-lg overflow-hidden bg-theme-subtle">
                                {(item.model_image_url || item.mockup_image_url || item.main_image_url) ? (
                                    <img
                                        src={item.model_image_url || item.mockup_image_url || item.main_image_url!}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-theme-faint" />
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-md text-gold text-xs font-bold border border-gold/20">
                                    {item.price > 0 ? `+${item.price} ر.س` : "مجاني"}
                                </div>
                            </div>

                            <p className="font-medium text-theme mb-1 truncate">{item.name}</p>
                            {item.description && <p className="text-xs text-theme-subtle line-clamp-2 mb-3">{item.description}</p>}

                            <div className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {item.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(item)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل تصميم الاستوديو" : "إضافة تصميم استوديو جديد"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف تصميم الاستوديو"
                description="سيتم حذف هذا التصميم من مكتبة ستيديو وشّى."
                confirmLabel="حذف التصميم"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Garment × Studio Mockups Tab — موكبات التصاميم الجاهزة
// ═══════════════════════════════════════════════════════════

function MockupsTab({ items, garments, studioItems, onRefresh }: {
    items: GarmentStudioMockup[];
    garments: CustomDesignGarment[];
    studioItems: CustomDesignStudioItem[];
    onRefresh: () => void;
}) {
    const [editing, setEditing] = useState<GarmentStudioMockup | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [filterGarment, setFilterGarment] = useState<string>("all");
    const [frontUrl, setFrontUrl] = useState("");
    const [backUrl, setBackUrl] = useState("");
    const [modelUrl, setModelUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const filtered = filterGarment === "all" ? items : items.filter(m => m.garment_id === filterGarment);

    const openAdd = () => { setIsAdding(true); setFrontUrl(""); setBackUrl(""); setModelUrl(""); setError(null); };
    const openEdit = (m: GarmentStudioMockup) => {
        setEditing(m);
        setFrontUrl(m.mockup_front_url ?? "");
        setBackUrl(m.mockup_back_url ?? "");
        setModelUrl(m.mockup_model_url ?? "");
        setError(null);
    };
    const closeModal = () => { setEditing(null); setIsAdding(false); setFrontUrl(""); setBackUrl(""); setModelUrl(""); setError(null); };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("mockup_front_url", frontUrl);
            fd.set("mockup_back_url", backUrl);
            fd.set("mockup_model_url", modelUrl);

            const result = await upsertGarmentStudioMockup(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ الموكب الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, frontUrl, backUrl, modelUrl]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        const id = pendingDeleteId;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteGarmentStudioMockup(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف الموكب الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, pendingDeleteId]);

    const getGarmentName = (id: string) => garments.find(g => g.id === id)?.name ?? "—";
    const getStudioName = (id: string) => studioItems.find(s => s.id === id)?.name ?? "—";
    const getStudioThumb = (id: string) => studioItems.find(s => s.id === id)?.main_image_url;
    const getGarmentThumb = (id: string) => garments.find(g => g.id === id)?.image_url;

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <FormField label="القطعة">
                <select name="garment_id" defaultValue={editing?.garment_id ?? garments[0]?.id ?? ""} required className={inputCls}>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </FormField>
            <FormField label="تصميم ستيديو وشّى">
                <select name="studio_item_id" defaultValue={editing?.studio_item_id ?? studioItems[0]?.id ?? ""} required className={inputCls}>
                    {studioItems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </FormField>

            <div className="p-3 rounded-xl bg-gold/5 border border-gold/15">
                <p className="text-xs text-gold font-bold mb-1 flex items-center gap-1.5">
                    <ImagePlus className="w-3.5 h-3.5" />
                    صور الموكب الجاهزة
                </p>
                <p className="text-[10px] text-theme-faint leading-relaxed">ارفع صور الموكب المجهّزة مسبقاً (التصميم مطبوع على القطعة). هذه الصور ستظهر للعميل مباشرة.</p>
            </div>

            <FormField label="صورة الموكب — أمام (مطلوب)">
                <ImageUploader value={frontUrl} onChange={setFrontUrl} folder="garment-mockups" label="صورة أمام" fieldName="mockup_front_url" />
            </FormField>
            <FormField label="صورة الموكب — خلف (اختياري)">
                <ImageUploader value={backUrl} onChange={setBackUrl} folder="garment-mockups" label="صورة خلف" fieldName="mockup_back_url" />
            </FormField>
            <FormField label="صورة على موديل (اختياري)">
                <ImageUploader value={modelUrl} onChange={setModelUrl} folder="garment-mockups" label="صورة المودل" fieldName="mockup_model_url" />
            </FormField>

            <FormField label="الترتيب">
                <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} />
            </FormField>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="موكبات التصاميم الجاهزة" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            {/* Info Banner */}
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-l from-gold/5 to-transparent border border-gold/10">
                <p className="text-xs text-theme-soft leading-relaxed flex items-start gap-2">
                    <Layers className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    لكل قطعة مع كل تصميم من ستيديو وشّى، ارفع صورة موكب جاهزة. العميل سيرى الموكب المحترف مباشرة بدلاً من التركيب التلقائي.
                </p>
            </div>

            {/* Filter */}
            <div className="mb-4">
                <select value={filterGarment} onChange={(e) => setFilterGarment(e.target.value)} className={inputCls + " max-w-xs"}>
                    <option value="all">جميع القطع</option>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {/* Stats */}
            {garments.length > 0 && studioItems.length > 0 && (
                <div className="mb-4 flex items-center gap-4 text-[10px] text-theme-faint">
                    <span>إجمالي التركيبات الممكنة: <strong className="text-gold">{garments.length * studioItems.length}</strong></span>
                    <span>الموكبات المرفقة: <strong className="text-emerald-400">{items.length}</strong></span>
                    <span>المتبقية: <strong className="text-amber-400">{Math.max(0, garments.length * studioItems.length - items.length)}</strong></span>
                </div>
            )}

            {filtered.length === 0 ? <EmptyState text="لا توجد موكبات بعد. أضف أول موكب جاهز!" /> : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((m) => (
                        <div key={m.id} className="p-4 rounded-xl bg-theme-faint border border-theme-subtle group overflow-hidden relative">
                            {/* Mockup Image Preview */}
                            <div className="relative mb-3 aspect-[4/5] rounded-lg overflow-hidden bg-theme-subtle">
                                {m.mockup_front_url ? (
                                    <img
                                        src={m.mockup_front_url}
                                        alt={`${getGarmentName(m.garment_id)} × ${getStudioName(m.studio_item_id)}`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <ImagePlus className="w-8 h-8 text-theme-faint" />
                                    </div>
                                )}
                                {/* Overlay badges */}
                                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                                    <div className="flex items-center gap-1.5">
                                        {getGarmentThumb(m.garment_id) && (
                                            <img src={getGarmentThumb(m.garment_id)!} alt="" className="w-7 h-7 rounded-md object-cover border border-white/20" />
                                        )}
                                        <span className="text-white/90 text-[10px] font-bold truncate">{getGarmentName(m.garment_id)}</span>
                                        <span className="text-white/40 text-[10px]">×</span>
                                        {getStudioThumb(m.studio_item_id) && (
                                            <img src={getStudioThumb(m.studio_item_id)!} alt="" className="w-7 h-7 rounded-md object-cover border border-white/20" />
                                        )}
                                        <span className="text-white/90 text-[10px] font-bold truncate">{getStudioName(m.studio_item_id)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Image count indicators */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.mockup_front_url ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    أمام {m.mockup_front_url ? "✓" : "✗"}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.mockup_back_url ? "bg-emerald-500/10 text-emerald-400" : "bg-theme-faint text-theme-faint"}`}>
                                    خلف {m.mockup_back_url ? "✓" : "—"}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.mockup_model_url ? "bg-emerald-500/10 text-emerald-400" : "bg-theme-faint text-theme-faint"}`}>
                                    موديل {m.mockup_model_url ? "✓" : "—"}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end">
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(m)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(m.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل الموكب" : "إضافة موكب جاهز جديد"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف الموكب"
                description="سيتم حذف هذا الموكب الجاهز من الربط الحالي."
                confirmLabel="حذف الموكب"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

function PresetsTab({
    items,
    garments,
    styles,
    artStyles,
    colorPackages,
    studioItems,
    onRefresh,
}: {
    items: CustomDesignPreset[];
    garments: CustomDesignGarment[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
    studioItems: CustomDesignStudioItem[];
    onRefresh: () => void;
}) {
    const [editing, setEditing] = useState<CustomDesignPreset | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [presetSearch, setPresetSearch] = useState("");
    const metadataDefaults = editing ? normalizeDesignMetadata(editing.metadata) : undefined;

    const filteredPresets = useMemo(() => {
        const q = presetSearch.trim().toLowerCase();
        if (!q) return items;
        return items.filter((p) => {
            const hay = [p.name, p.slug, p.description, p.badge, p.story, p.design_method]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
    }, [items, presetSearch]);

    const openAdd = () => {
        setIsAdding(true);
        setImageUrl("");
        setError(null);
    };

    const openEdit = (preset: CustomDesignPreset) => {
        setEditing(preset);
        setImageUrl(preset.image_url ?? "");
        setError(null);
    };

    const closeModal = () => {
        setEditing(null);
        setIsAdding(false);
        setImageUrl("");
        setError(null);
    };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            fd.set("image_url", imageUrl);
            const result = await upsertDesignPreset(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ الـ preset الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, imageUrl, onRefresh]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteDesignPreset(pendingDeleteId);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف الـ preset الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, pendingDeleteId]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="اسم الـ Preset">
                    <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} />
                </FormField>
                <FormField label="Slug">
                    <input name="slug" defaultValue={editing?.slug ?? ""} required className={inputCls} />
                </FormField>
            </div>
            <FormField label="وصف مختصر">
                <textarea name="description" defaultValue={editing?.description ?? ""} className={inputCls} rows={2} />
            </FormField>
            <FormField label="Story / Pitch">
                <textarea name="story" defaultValue={editing?.story ?? ""} className={inputCls} rows={3} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Badge">
                    <input name="badge" defaultValue={editing?.badge ?? ""} className={inputCls} />
                </FormField>
                <FormField label="صورة الـ Preset">
                    <ImageUploader value={imageUrl} onChange={setImageUrl} folder="presets" fieldName="image_url" />
                </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="القطعة">
                    <select name="garment_id" defaultValue={editing?.garment_id ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        {garments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </FormField>
                <FormField label="طريقة التصميم">
                    <select name="design_method" defaultValue={editing?.design_method ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        <option value="from_text">من نص</option>
                        <option value="from_image">من صورة</option>
                        <option value="studio">ستيديو وشّى</option>
                    </select>
                </FormField>
                <FormField label="النمط">
                    <select name="style_id" defaultValue={editing?.style_id ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        {styles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </FormField>
                <FormField label="الأسلوب">
                    <select name="art_style_id" defaultValue={editing?.art_style_id ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        {artStyles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </FormField>
                <FormField label="باقة الألوان">
                    <select name="color_package_id" defaultValue={editing?.color_package_id ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        {colorPackages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </FormField>
                <FormField label="عنصر الستوديو">
                    <select name="studio_item_id" defaultValue={editing?.studio_item_id ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        {studioItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </FormField>
                <FormField label="موضع الطباعة">
                    <select name="print_position" defaultValue={editing?.print_position ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        <option value="chest">الصدر</option>
                        <option value="back">الظهر</option>
                        <option value="shoulder_right">الكتف الأيمن</option>
                        <option value="shoulder_left">الكتف الأيسر</option>
                    </select>
                </FormField>
                <FormField label="حجم الطباعة">
                    <select name="print_size" defaultValue={editing?.print_size ?? ""} className={inputCls}>
                        <option value="">غير محدد</option>
                        <option value="large">كبير</option>
                        <option value="small">صغير</option>
                    </select>
                </FormField>
                <FormField label="الترتيب">
                    <input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} className={inputCls} />
                </FormField>
                <FormField label="Featured">
                    <select name="is_featured" defaultValue={editing?.is_featured ? "true" : "false"} className={inputCls}>
                        <option value="true">نعم</option>
                        <option value="false">لا</option>
                    </select>
                </FormField>
                <FormField label="الحالة">
                    <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                        <option value="true">نشط</option>
                        <option value="false">غير نشط</option>
                    </select>
                </FormField>
            </div>
            <MetadataFields defaults={metadataDefaults} mode="preset" />
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="الـ Presets الجاهزة" onAdd={openAdd}>
            <InlineError message={!isAdding && !editing ? error : null} />
            {items.length === 0 ? <EmptyState text="لا توجد presets بعد." /> : (
                <>
                    <div className="mb-4">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
                            <input
                                type="search"
                                value={presetSearch}
                                onChange={(e) => setPresetSearch(e.target.value)}
                                placeholder="بحث في الاسم، الـ slug، الوصف، الـ badge، طريقة التصميم..."
                                className={`${inputCls} pr-10`}
                            />
                        </label>
                    </div>
                    {filteredPresets.length === 0 ? (
                        <EmptyState text="لا توجد نتائج تطابق البحث." />
                    ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {filteredPresets.map((preset) => (
                        <div key={preset.id} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="inline-flex items-center gap-1 rounded-full border border-gold/20 bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
                                        {preset.badge || "Preset"}
                                    </div>
                                    <p className="mt-3 text-lg font-bold text-theme">{preset.name}</p>
                                    {preset.description && <p className="mt-1 text-sm text-theme-subtle">{preset.description}</p>}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(preset)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                    <button onClick={() => setPendingDeleteId(preset.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {preset.design_method ? <span className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-subtle">{preset.design_method}</span> : null}
                                {preset.metadata?.creative_direction ? <span className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-subtle">{preset.metadata.creative_direction}</span> : null}
                                {preset.is_featured ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200">Featured</span> : null}
                            </div>
                        </div>
                    ))}
                </div>
                    )}
                </>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل Preset" : "إضافة Preset جديدة"}>{form}</Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف الـ Preset"
                description="سيتم حذف هذا المسار الجاهز من مكتبة التوصيات."
                confirmLabel="حذف الـ Preset"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </SectionCard>
    );
}

function IntelligenceScenarioSummary({
    garmentName,
    method,
    printPosition,
    printSize,
    presetName,
    styleName,
    artStyleName,
    colorPackageName,
}: {
    garmentName?: string | null;
    method: DesignMethod | "";
    printPosition: PrintPosition | "";
    printSize: PrintSize | "";
    presetName?: string | null;
    styleName?: string | null;
    artStyleName?: string | null;
    colorPackageName?: string | null;
}) {
    const chips = [
        garmentName ? `القطعة: ${garmentName}` : null,
        method ? `الطريقة: ${getMethodLabel(method)}` : null,
        printPosition ? `الموضع: ${getPrintPositionLabel(printPosition)}` : null,
        printSize ? `الحجم: ${getPrintSizeLabel(printSize)}` : null,
        presetName ? `Preset: ${presetName}` : null,
        styleName ? `النمط: ${styleName}` : null,
        artStyleName ? `الأسلوب: ${artStyleName}` : null,
        colorPackageName ? `البالِت: ${colorPackageName}` : null,
    ].filter(Boolean) as string[];

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
                <span key={chip} className="rounded-full border border-theme-soft bg-theme-subtle px-3 py-1 text-[11px] font-bold text-theme-subtle">
                    {chip}
                </span>
            ))}
        </div>
    );
}

function RecommendationPreviewList<T extends { id: string; name: string; description?: string | null; story?: string | null; metadata?: unknown }>({
    title,
    desc,
    items,
}: {
    title: string;
    desc: string;
    items: RankedDesignCandidate<T>[];
}) {
    const topItems = items.slice(0, 4);

    return (
        <div className="theme-surface-panel rounded-2xl p-5">
            <div className="mb-4">
                <h3 className="text-base font-bold text-theme">{title}</h3>
                <p className="mt-1 text-xs leading-6 text-theme-subtle">{desc}</p>
            </div>

            {topItems.length === 0 ? (
                <EmptyState text="لا توجد نتائج لهذه المجموعة." />
            ) : (
                <div className="grid gap-3">
                    {topItems.map((entry, index) => {
                        const item = entry.item;
                        const metadata = normalizeDesignMetadata(item.metadata);
                        return (
                            <div key={item.id} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/10 text-[11px] font-black text-gold">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm font-bold text-theme">{item.name}</p>
                                        </div>
                                        {(item.description || item.story) ? (
                                            <p className="mt-2 text-xs leading-6 text-theme-subtle">
                                                {item.description || item.story}
                                            </p>
                                        ) : null}
                                        {metadata.creative_direction ? (
                                            <p className="mt-2 text-[11px] font-bold text-gold/90">{metadata.creative_direction}</p>
                                        ) : null}
                                        {metadata.story_hook ? (
                                            <p className="mt-1 text-[11px] leading-6 text-theme-faint">{metadata.story_hook}</p>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2 sm:max-w-[40%] sm:justify-end">
                                        <span className="rounded-full border border-theme-soft bg-theme-subtle px-3 py-1 text-[10px] font-bold text-theme-subtle">
                                            score {Math.round(entry.score)}
                                        </span>
                                        {entry.relation ? (
                                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${getRelationBadgeClass(entry.relation)}`}>
                                                {getRelationLabel(entry.relation)}
                                            </span>
                                        ) : null}
                                        {metadata.luxury_tier ? (
                                            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-bold text-gold">
                                                {metadata.luxury_tier}
                                            </span>
                                        ) : null}
                                        {metadata.palette_family ? (
                                            <span className="rounded-full border border-theme-soft bg-theme-subtle px-3 py-1 text-[10px] font-bold text-theme-subtle">
                                                {metadata.palette_family}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {entry.signals.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {entry.signals.slice(0, 3).map((signal) => (
                                            <span key={signal} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold text-theme">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function IntelligenceTab({
    compatibilities,
    garments,
    styles,
    artStyles,
    colorPackages,
    studioItems,
    presets,
    onRefresh,
}: {
    compatibilities: CustomDesignOptionCompatibility[];
    garments: CustomDesignGarment[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
    studioItems: CustomDesignStudioItem[];
    presets: CustomDesignPreset[];
    onRefresh: () => void;
}) {
    const [editing, setEditing] = useState<CustomDesignOptionCompatibility | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [sourceType, setSourceType] = useState<CustomDesignOptionCompatibility["source_type"]>("style");
    const [targetType, setTargetType] = useState<CustomDesignOptionCompatibility["target_type"]>("art_style");
    const [previewGarmentId, setPreviewGarmentId] = useState("");
    const [previewMethod, setPreviewMethod] = useState<DesignMethod | "">("");
    const [previewPrintPosition, setPreviewPrintPosition] = useState<PrintPosition | "">("");
    const [previewPrintSize, setPreviewPrintSize] = useState<PrintSize | "">("");
    const [previewPresetId, setPreviewPresetId] = useState("");
    const [previewStyleId, setPreviewStyleId] = useState("");
    const [previewArtStyleId, setPreviewArtStyleId] = useState("");
    const [previewColorPackageId, setPreviewColorPackageId] = useState("");
    const [compatListSearch, setCompatListSearch] = useState("");
    const [compatRelationFilter, setCompatRelationFilter] = useState<"all" | CustomDesignOptionCompatibility["relation"]>("all");

    const collections: Record<CustomDesignOptionCompatibility["source_type"], Array<{ id: string; name: string }>> = {
        garment: garments,
        style: styles,
        art_style: artStyles,
        color_package: colorPackages,
        studio_item: studioItems,
        preset: presets,
    };

    const resolveLabel = (type: CustomDesignOptionCompatibility["source_type"], id: string) =>
        collections[type]?.find((item) => item.id === id)?.name ?? "—";

    const openAdd = () => {
        setIsAdding(true);
        setEditing(null);
        setSourceType("style");
        setTargetType("art_style");
        setError(null);
    };

    const openEdit = (item: CustomDesignOptionCompatibility) => {
        setEditing(item);
        setIsAdding(false);
        setSourceType(item.source_type);
        setTargetType(item.target_type);
        setError(null);
    };

    const closeModal = () => {
        setEditing(null);
        setIsAdding(false);
        setError(null);
        setSourceType("style");
        setTargetType("art_style");
    };

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const fd = new FormData(e.currentTarget);
            if (editing) fd.set("id", editing.id);
            const result = await upsertDesignCompatibility(fd);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            closeModal();
            onRefresh();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "تعذر حفظ الربط الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh]);

    const handleDelete = useCallback(async () => {
        if (!pendingDeleteId) return;
        setDeleteLoading(true);
        setError(null);
        try {
            const result = await deleteDesignCompatibility(pendingDeleteId);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف الربط الآن.");
        } finally {
            setDeleteLoading(false);
            setPendingDeleteId(null);
        }
    }, [onRefresh, pendingDeleteId]);

    const signature = compatibilities.filter((item) => item.relation === "signature").slice(0, 8);
    const avoid = compatibilities.filter((item) => item.relation === "avoid").slice(0, 8);
    const recommended = compatibilities.filter((item) => item.relation === "recommended").slice(0, 8);
    const sortedCompatibilities = [...compatibilities].sort((a, b) => {
        const relationWeight = { signature: 3, recommended: 2, avoid: 1 };
        const relationDiff = relationWeight[b.relation] - relationWeight[a.relation];
        return relationDiff !== 0 ? relationDiff : b.score - a.score;
    });

    const filteredCompatibilities = useMemo(() => {
        const q = compatListSearch.trim().toLowerCase();
        const col: Record<CustomDesignOptionCompatibility["source_type"], Array<{ id: string; name: string }>> = {
            garment: garments,
            style: styles,
            art_style: artStyles,
            color_package: colorPackages,
            studio_item: studioItems,
            preset: presets,
        };
        const labelFor = (type: CustomDesignOptionCompatibility["source_type"], id: string) =>
            col[type]?.find((item) => item.id === id)?.name ?? "—";
        return sortedCompatibilities.filter((item) => {
            if (compatRelationFilter !== "all" && item.relation !== compatRelationFilter) return false;
            if (!q) return true;
            const sourceLabel = labelFor(item.source_type, item.source_id).toLowerCase();
            const targetLabel = labelFor(item.target_type as CustomDesignOptionCompatibility["source_type"], item.target_id).toLowerCase();
            const reason = (item.reason ?? "").toLowerCase();
            return (
                sourceLabel.includes(q) ||
                targetLabel.includes(q) ||
                reason.includes(q) ||
                item.source_type.toLowerCase().includes(q) ||
                item.target_type.toLowerCase().includes(q) ||
                item.relation.toLowerCase().includes(q) ||
                String(item.score).includes(q)
            );
        });
    }, [
        sortedCompatibilities,
        compatListSearch,
        compatRelationFilter,
        garments,
        styles,
        artStyles,
        colorPackages,
        studioItems,
        presets,
    ]);

    const activePresets = presets.filter((item) => item.is_active);
    const activeStyles = styles.filter((item) => item.is_active);
    const activeArtStyles = artStyles.filter((item) => item.is_active);
    const activeColorPackages = colorPackages.filter((item) => item.is_active);
    const activeStudioItems = studioItems.filter((item) => item.is_active);

    const selectedGarment = garments.find((item) => item.id === previewGarmentId) ?? null;
    const selectedPreset = activePresets.find((item) => item.id === previewPresetId) ?? null;
    const selectedStyle = activeStyles.find((item) => item.id === previewStyleId) ?? null;
    const selectedArtStyle = activeArtStyles.find((item) => item.id === previewArtStyleId) ?? null;
    const selectedColorPackage = activeColorPackages.find((item) => item.id === previewColorPackageId) ?? null;

    const presetStyleLookup = getCompatibilityLookup(compatibilities, "preset", selectedPreset?.id, "style");
    const garmentStyleLookup = getCompatibilityLookup(compatibilities, "garment", selectedGarment?.id, "style");
    const styleArtLookup = getCompatibilityLookup(compatibilities, "style", selectedStyle?.id, "art_style");
    const garmentArtLookup = getCompatibilityLookup(compatibilities, "garment", selectedGarment?.id, "art_style");
    const styleColorLookup = getCompatibilityLookup(compatibilities, "style", selectedStyle?.id, "color_package");
    const artColorLookup = getCompatibilityLookup(compatibilities, "art_style", selectedArtStyle?.id, "color_package");
    const garmentColorLookup = getCompatibilityLookup(compatibilities, "garment", selectedGarment?.id, "color_package");
    const garmentStudioLookup = getCompatibilityLookup(compatibilities, "garment", selectedGarment?.id, "studio_item");

    const previewPresets = rankDesignPresets(activePresets, {
        garmentId: selectedGarment?.id,
        method: previewMethod || undefined,
        printPosition: previewPrintPosition || undefined,
        printSize: previewPrintSize || undefined,
        metadataAnchors: [
            { label: "النمط المختار", metadata: selectedStyle?.metadata, weight: 0.95 },
            { label: "الأسلوب المختار", metadata: selectedArtStyle?.metadata, weight: 0.9 },
            { label: "البالِت المختارة", metadata: selectedColorPackage?.metadata, weight: 0.8 },
        ],
    });

    const previewStyles = rankDesignCandidates(activeStyles, {
        preferredId: selectedPreset?.style_id,
        method: previewMethod || undefined,
        printPosition: previewPrintPosition || undefined,
        lookups: [
            { lookup: presetStyleLookup, label: "الـ preset", weight: 1.05 },
            { lookup: garmentStyleLookup, label: "القطعة الحالية", weight: 0.7 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: selectedPreset?.metadata, weight: 0.7 },
        ],
    });

    const previewArtStyles = rankDesignCandidates(activeArtStyles, {
        preferredId: selectedPreset?.art_style_id,
        method: previewMethod || undefined,
        printPosition: previewPrintPosition || undefined,
        lookups: [
            { lookup: styleArtLookup, label: "النمط المختار", weight: 1.05 },
            { lookup: garmentArtLookup, label: "القطعة الحالية", weight: 0.55 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: selectedPreset?.metadata, weight: 0.65 },
            { label: "النمط المختار", metadata: selectedStyle?.metadata, weight: 1 },
        ],
    });

    const previewColorPackages = rankDesignCandidates(activeColorPackages, {
        preferredId: selectedPreset?.color_package_id,
        method: previewMethod || undefined,
        printPosition: previewPrintPosition || undefined,
        lookups: [
            { lookup: styleColorLookup, label: "النمط المختار", weight: 0.95 },
            { lookup: artColorLookup, label: "الأسلوب المختار", weight: 0.9 },
            { lookup: garmentColorLookup, label: "القطعة الحالية", weight: 0.55 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: selectedPreset?.metadata, weight: 0.55 },
            { label: "النمط المختار", metadata: selectedStyle?.metadata, weight: 0.85 },
            { label: "الأسلوب المختار", metadata: selectedArtStyle?.metadata, weight: 0.95 },
        ],
    });

    const previewStudioItems = rankDesignCandidates(activeStudioItems, {
        preferredId: selectedPreset?.studio_item_id,
        method: previewMethod === "studio" ? "studio" : undefined,
        printPosition: previewPrintPosition || undefined,
        lookups: [
            { lookup: garmentStudioLookup, label: "القطعة الحالية", weight: 0.8 },
        ],
        metadataAnchors: [
            { label: "الـ preset", metadata: selectedPreset?.metadata, weight: 0.6 },
            { label: "النمط المختار", metadata: selectedStyle?.metadata, weight: 0.45 },
        ],
    });

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InlineError message={error} />
            <div className="grid gap-4 md:grid-cols-2">
                <FormField label="نوع المصدر">
                    <select
                        name="source_type"
                        value={sourceType}
                        onChange={(event) => setSourceType(event.target.value as CustomDesignOptionCompatibility["source_type"])}
                        className={inputCls}
                    >
                        <option value="garment">قطعة</option>
                        <option value="style">نمط</option>
                        <option value="art_style">أسلوب</option>
                        <option value="color_package">باقة ألوان</option>
                        <option value="studio_item">عنصر ستوديو</option>
                        <option value="preset">Preset</option>
                    </select>
                </FormField>
                <FormField label="العنصر المصدر">
                    <select name="source_id" defaultValue={editing?.source_id ?? ""} className={inputCls} required>
                        <option value="">اختر المصدر</option>
                        {collections[sourceType].map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="نوع الهدف">
                    <select
                        name="target_type"
                        value={targetType}
                        onChange={(event) => setTargetType(event.target.value as CustomDesignOptionCompatibility["target_type"])}
                        className={inputCls}
                    >
                        <option value="garment">قطعة</option>
                        <option value="style">نمط</option>
                        <option value="art_style">أسلوب</option>
                        <option value="color_package">باقة ألوان</option>
                        <option value="studio_item">عنصر ستوديو</option>
                        <option value="preset">Preset</option>
                    </select>
                </FormField>
                <FormField label="العنصر الهدف">
                    <select name="target_id" defaultValue={editing?.target_id ?? ""} className={inputCls} required>
                        <option value="">اختر الهدف</option>
                        {collections[targetType].map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </select>
                </FormField>
                <FormField label="نوع العلاقة">
                    <select name="relation" defaultValue={editing?.relation ?? "recommended"} className={inputCls}>
                        <option value="signature">Signature</option>
                        <option value="recommended">Recommended</option>
                        <option value="avoid">Avoid</option>
                    </select>
                </FormField>
                <FormField label="الدرجة">
                    <input name="score" type="number" min={0} max={100} defaultValue={editing?.score ?? 50} className={inputCls} />
                </FormField>
            </div>
            <FormField label="التفسير">
                <textarea
                    name="reason"
                    defaultValue={editing?.reason ?? ""}
                    className={inputCls}
                    rows={3}
                    placeholder="لماذا هذه العلاقة منطقية؟ أو لماذا ينبغي تجنبها؟"
                />
            </FormField>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? "جاري الحفظ..." : "حفظ الربط"}
                </button>
                <button type="button" onClick={closeModal} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="theme-surface-panel rounded-2xl p-5">
                    <p className="text-sm text-theme-subtle">إجمالي التوافقات</p>
                    <p className="mt-2 text-3xl font-black text-theme">{compatibilities.length}</p>
                </div>
                <div className="theme-surface-panel rounded-2xl p-5">
                    <p className="text-sm text-theme-subtle">Signature Pairings</p>
                    <p className="mt-2 text-3xl font-black text-gold">{signature.length}</p>
                </div>
                <div className="theme-surface-panel rounded-2xl p-5">
                    <p className="text-sm text-theme-subtle">Presets حيّة</p>
                    <p className="mt-2 text-3xl font-black text-theme">{presets.filter((item) => item.is_active).length}</p>
                </div>
            </div>

            <SectionCard title="مختبر التوصية">
                <div className="space-y-5">
                    <p className="text-sm leading-7 text-theme-subtle">
                        جرّب سيناريو حقيقي وشاهد كيف يرتّب المحرك أفضل الـ presets والأنماط والأساليب وباقات الألوان وعناصر الستوديو بناءً على اختياراتك الحالية.
                    </p>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <FormField label="القطعة">
                            <select value={previewGarmentId} onChange={(event) => setPreviewGarmentId(event.target.value)} className={inputCls}>
                                <option value="">غير محدد</option>
                                {garments.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="طريقة التصميم">
                            <select value={previewMethod} onChange={(event) => setPreviewMethod(event.target.value as DesignMethod | "")} className={inputCls}>
                                <option value="">غير محدد</option>
                                <option value="from_text">من نص</option>
                                <option value="from_image">من صورة</option>
                                <option value="studio">ستيديو وشّى</option>
                            </select>
                        </FormField>
                        <FormField label="موضع الطباعة">
                            <select value={previewPrintPosition} onChange={(event) => setPreviewPrintPosition(event.target.value as PrintPosition | "")} className={inputCls}>
                                <option value="">غير محدد</option>
                                <option value="chest">الصدر</option>
                                <option value="back">الظهر</option>
                                <option value="shoulder_right">الكتف الأيمن</option>
                                <option value="shoulder_left">الكتف الأيسر</option>
                            </select>
                        </FormField>
                        <FormField label="حجم الطباعة">
                            <select value={previewPrintSize} onChange={(event) => setPreviewPrintSize(event.target.value as PrintSize | "")} className={inputCls}>
                                <option value="">غير محدد</option>
                                <option value="large">كبير</option>
                                <option value="small">صغير</option>
                            </select>
                        </FormField>
                        <FormField label="Preset مرجعية">
                            <select value={previewPresetId} onChange={(event) => setPreviewPresetId(event.target.value)} className={inputCls}>
                                <option value="">غير محدد</option>
                                {activePresets.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="النمط المرجعي">
                            <select value={previewStyleId} onChange={(event) => setPreviewStyleId(event.target.value)} className={inputCls}>
                                <option value="">غير محدد</option>
                                {activeStyles.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="الأسلوب المرجعي">
                            <select value={previewArtStyleId} onChange={(event) => setPreviewArtStyleId(event.target.value)} className={inputCls}>
                                <option value="">غير محدد</option>
                                {activeArtStyles.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="البالِت المرجعية">
                            <select value={previewColorPackageId} onChange={(event) => setPreviewColorPackageId(event.target.value)} className={inputCls}>
                                <option value="">غير محدد</option>
                                {activeColorPackages.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setPreviewGarmentId("");
                                setPreviewMethod("");
                                setPreviewPrintPosition("");
                                setPreviewPrintSize("");
                                setPreviewPresetId("");
                                setPreviewStyleId("");
                                setPreviewArtStyleId("");
                                setPreviewColorPackageId("");
                            }}
                            className={btnSecondary}
                        >
                            تصفير السيناريو
                        </button>
                        <IntelligenceScenarioSummary
                            garmentName={selectedGarment?.name}
                            method={previewMethod}
                            printPosition={previewPrintPosition}
                            printSize={previewPrintSize}
                            presetName={selectedPreset?.name}
                            styleName={selectedStyle?.name}
                            artStyleName={selectedArtStyle?.name}
                            colorPackageName={selectedColorPackage?.name}
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <RecommendationPreviewList
                            title="أفضل Presets"
                            desc="الترتيب هنا يتأثر بالقطعة والطريقة وموضع الطباعة وأي metadata مشتركة بين اختياراتك الحالية."
                            items={previewPresets}
                        />
                        <RecommendationPreviewList
                            title="أفضل الأنماط"
                            desc="هذه النتائج تمزج بين الـ preset المختارة، التوافقات المباشرة، والانسجام في الطاقة والفخامة والتعقيد."
                            items={previewStyles}
                        />
                        <RecommendationPreviewList
                            title="أفضل الأساليب"
                            desc="يتم ترتيب الأساليب بحسب النمط الحالي والقطعة وعلاقة الـ metadata بينهما."
                            items={previewArtStyles}
                        />
                        <RecommendationPreviewList
                            title="أفضل باقات الألوان"
                            desc="البالِت تصعد أو تهبط بحسب النمط والأسلوب وعائلة الألوان والطاقة والـ luxury tier."
                            items={previewColorPackages}
                        />
                    </div>

                    <RecommendationPreviewList
                        title="أفضل عناصر الستوديو"
                        desc="عناصر الستوديو تتأثر بالقطعة الحالية وبأي preset أو نمط يمنحها سياقًا أقوى."
                        items={previewStudioItems}
                    />
                </div>
            </SectionCard>

            <SectionCard title="إدارة خريطة التوافق" onAdd={openAdd}>
                <InlineError message={!isAdding && !editing ? error : null} />
                {sortedCompatibilities.length === 0 ? (
                    <EmptyState text="لا توجد روابط توافق بعد." />
                ) : (
                    <>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label className="relative block flex-1">
                                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
                                <input
                                    type="search"
                                    value={compatListSearch}
                                    onChange={(e) => setCompatListSearch(e.target.value)}
                                    placeholder="بحث في المصدر، الهدف، السبب، النوع، الدرجة..."
                                    className={`${inputCls} pr-10`}
                                />
                            </label>
                            <div className="w-full sm:min-w-[200px] sm:max-w-[240px]">
                                <FormField label="تصفية حسب العلاقة">
                                    <select
                                        value={compatRelationFilter}
                                        onChange={(e) => setCompatRelationFilter(e.target.value as typeof compatRelationFilter)}
                                        className={inputCls}
                                    >
                                        <option value="all">الكل</option>
                                        <option value="signature">Signature</option>
                                        <option value="recommended">Recommended</option>
                                        <option value="avoid">Avoid</option>
                                    </select>
                                </FormField>
                            </div>
                        </div>
                        {filteredCompatibilities.length === 0 ? (
                            <EmptyState text="لا توجد نتائج تطابق البحث أو التصفية." />
                        ) : (
                    <div className="grid gap-3">
                        {filteredCompatibilities.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-bold text-theme">{resolveLabel(item.source_type, item.source_id)}</span>
                                            <span className="text-theme-faint">→</span>
                                            <span className="text-sm font-bold text-theme">{resolveLabel(item.target_type, item.target_id)}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                                item.relation === "signature"
                                                    ? "border border-gold/20 bg-gold/10 text-gold"
                                                    : item.relation === "avoid"
                                                        ? "border border-red-500/20 bg-red-500/10 text-red-300"
                                                        : "border border-theme-soft bg-theme-subtle text-theme-subtle"
                                            }`}>
                                                {item.relation}
                                            </span>
                                            <span className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-subtle">
                                                score {item.score}
                                            </span>
                                            <span className="rounded-full border border-theme-soft bg-theme-subtle px-2 py-1 text-[10px] font-bold text-theme-faint">
                                                {item.source_type} → {item.target_type}
                                            </span>
                                        </div>
                                        {item.reason ? <p className="text-xs leading-6 text-theme-subtle">{item.reason}</p> : null}
                                    </div>
                                    <div className="flex gap-1 self-start">
                                        <button onClick={() => openEdit(item)} className="p-2 hover:bg-theme-subtle rounded-lg"><Pencil className="w-4 h-4 text-theme-subtle" /></button>
                                        <button onClick={() => setPendingDeleteId(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                        )}
                    </>
                )}
            </SectionCard>

            <div className="grid gap-6 lg:grid-cols-2">
                <SectionCard title="Signature Pairings">
                    <div className="grid gap-3">
                        {signature.map((item) => (
                            <div key={item.id} className="rounded-xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="font-bold text-theme">{resolveLabel(item.source_type, item.source_id)}</p>
                                <p className="mt-1 text-sm text-theme-subtle">→ {resolveLabel(item.target_type, item.target_id)}</p>
                                {item.reason ? <p className="mt-2 text-xs leading-6 text-theme-faint">{item.reason}</p> : null}
                            </div>
                        ))}
                    </div>
                </SectionCard>
                <SectionCard title="Recommended Pairings">
                    <div className="grid gap-3">
                        {recommended.map((item) => (
                            <div key={item.id} className="rounded-xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="font-bold text-theme">{resolveLabel(item.source_type, item.source_id)}</p>
                                <p className="mt-1 text-sm text-theme-subtle">→ {resolveLabel(item.target_type, item.target_id)}</p>
                                {item.reason ? <p className="mt-2 text-xs leading-6 text-theme-faint">{item.reason}</p> : null}
                            </div>
                        ))}
                    </div>
                </SectionCard>
                <SectionCard title="Avoid Pairings">
                    <div className="grid gap-3">
                        {avoid.map((item) => (
                            <div key={item.id} className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                                <p className="font-bold text-theme">{resolveLabel(item.source_type, item.source_id)}</p>
                                <p className="mt-1 text-sm text-theme-subtle">→ {resolveLabel(item.target_type, item.target_id)}</p>
                                {item.reason ? <p className="mt-2 text-xs leading-6 text-theme-faint">{item.reason}</p> : null}
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل ربط التوافق" : "إضافة ربط توافق جديد"}>
                {form}
            </Modal>
            <ConfirmDialog
                open={!!pendingDeleteId}
                title="حذف ربط التوافق"
                description="سيتم حذف هذه العلاقة من خريطة الذكاء، ولن تظهر بعدها في التوصيات."
                confirmLabel="حذف الربط"
                loading={deleteLoading}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
