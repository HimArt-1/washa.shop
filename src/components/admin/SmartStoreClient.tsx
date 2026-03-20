"use client";

import { useState, useCallback, useRef } from "react";
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
} from "@/types/database";

// ─── Types ──────────────────────────────────────────────

type TabId = "garments" | "colors" | "sizes" | "styles" | "artStyles" | "colorPackages" | "studioItems" | "mockups";

interface Props {
    garments: CustomDesignGarment[];
    colors: CustomDesignColor[];
    sizes: CustomDesignSize[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
    studioItems: CustomDesignStudioItem[];
    garmentStudioMockups: GarmentStudioMockup[];
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
];

// ─── Component ──────────────────────────────────────────

export function SmartStoreClient({ garments, colors, sizes, styles, artStyles, colorPackages, studioItems, garmentStudioMockups }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>("garments");
    const router = useRouter();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? "theme-surface-panel text-gold border-gold/30" : "bg-theme-faint text-theme-subtle border border-theme-subtle hover:text-theme-strong hover:bg-theme-subtle"}`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {activeTab === "garments" && <GarmentsTab items={garments} onRefresh={() => router.refresh()} />}
                    {activeTab === "colors" && <ColorsTab items={colors} garments={garments} onRefresh={() => router.refresh()} />}
                    {activeTab === "sizes" && <SizesTab items={sizes} garments={garments} colors={colors} onRefresh={() => router.refresh()} />}
                    {activeTab === "styles" && <StylesTab items={styles} onRefresh={() => router.refresh()} />}
                    {activeTab === "artStyles" && <ArtStylesTab items={artStyles} onRefresh={() => router.refresh()} />}
                    {activeTab === "colorPackages" && <ColorPackagesTab items={colorPackages} onRefresh={() => router.refresh()} />}
                    {activeTab === "studioItems" && <StudioItemsTab items={studioItems} onRefresh={() => router.refresh()} />}
                    {activeTab === "mockups" && <MockupsTab items={garmentStudioMockups} garments={garments} studioItems={studioItems} onRefresh={() => router.refresh()} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Shared UI Helpers
// ═══════════════════════════════════════════════════════════

function SectionCard({ children, title, onAdd }: { children: React.ReactNode; title: string; onAdd: () => void }) {
    return (
        <div className="theme-surface-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-theme">{title}</h2>
                <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" /> إضافة
                </button>
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
                className="theme-surface-panel relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
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

function getActionError(result: any) {
    if (!result) return "حدث خطأ غير متوقع.";
    if (typeof result.error === "string" && result.error.trim()) return result.error;
    if (result.success === false && typeof result.message === "string" && result.message.trim()) return result.message;
    return null;
}

// ─── Image Uploader ─────────────────────────────────────

function ImageUploader({ value, onChange, folder, label }: {
    value: string;
    onChange: (url: string) => void;
    folder: string;
    label?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const result = await uploadSmartStoreImage(folder, formData);

            if (result.success) {
                setPreview(result.url);
                onChange(result.url);
            } else {
                setPreview(value);
                alert(result.error || "فشل رفع الصورة");
            }
        } catch (error) {
            console.error("Smart-store image upload failed", error);
            setPreview(value);
            alert("تعذر رفع الصورة الآن. حاول مرة أخرى.");
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
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-theme-subtle border border-dashed border-theme-soft hover:border-gold/30 cursor-pointer transition-colors text-sm text-theme-subtle hover:text-theme-soft w-fit">
                <Upload className="w-4 h-4" />
                {uploading ? "جاري الرفع..." : (preview || value) ? "تغيير الصورة" : "رفع صورة من الجهاز"}
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
            </label>
            {/* Hidden input for form */}
            <input type="hidden" name={label === "صورة أمام" ? "image_front_url" : label === "صورة خلف" ? "image_back_url" : "image_url"} value={preview || value || ""} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Garments Tab
// ═══════════════════════════════════════════════════════════

function GarmentsTab({ items, onRefresh }: { items: CustomDesignGarment[]; onRefresh: () => void }) {
    const [editing, setEditing] = useState<CustomDesignGarment | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);

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
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ القطعة الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, imageUrl]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذه القطعة؟ سيتم حذف جميع الألوان والمقاسات المرتبطة.")) return;
        setError(null);
        try {
            const result = await deleteGarment(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف القطعة الآن.");
        }
    }, [onRefresh]);

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
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder="garments" />
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
                                <button onClick={() => handleDelete(g.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل القطعة" : "إضافة قطعة جديدة"}>{form}</Modal>
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Colors Tab
// ═══════════════════════════════════════════════════════════

function ColorsTab({ items, garments, onRefresh }: { items: CustomDesignColor[]; garments: CustomDesignGarment[]; onRefresh: () => void }) {
    const [editing, setEditing] = useState<CustomDesignColor | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterGarment, setFilterGarment] = useState<string>("all");
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);

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
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حفظ اللون الآن.");
        } finally {
            setLoading(false);
        }
    }, [editing, onRefresh, imageUrl]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا اللون؟")) return;
        setError(null);
        try {
            const result = await deleteColor(id);
            const actionError = getActionError(result);
            if (actionError) {
                setError(actionError);
                return;
            }
            onRefresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "تعذر حذف اللون الآن.");
        }
    }, [onRefresh]);

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
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder="colors" />
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
                                    <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل اللون" : "إضافة لون جديد"}>{form}</Modal>
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Generic Items Tab (Styles, Art Styles)
// ═══════════════════════════════════════════════════════════

function GenericItemsTab<T extends { id: string; name: string; description?: string | null; image_url?: string | null; sort_order?: number; is_active: boolean }>({
    items, title, onUpsert, onDelete, onRefresh, folder,
}: {
    items: T[]; title: string; onUpsert: (fd: FormData) => Promise<any>; onDelete: (id: string) => Promise<any>; onRefresh: () => void; folder: string;
}) {
    const [editing, setEditing] = useState<T | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);

    const openAdd = () => { setIsAdding(true); setImageUrl(""); setError(null); };
    const openEdit = (item: T) => { setEditing(item); setImageUrl(item.image_url ?? ""); setError(null); };
    const closeModal = () => { setEditing(null); setIsAdding(false); setImageUrl(""); setError(null); };

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

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا العنصر؟")) return;
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
        }
    }, [onRefresh, onDelete]);

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
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder={folder} />
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
                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {item.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-theme-subtle rounded-lg"><Pencil className="w-3.5 h-3.5 text-theme-subtle" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل العنصر" : "إضافة عنصر جديد"}>{form}</Modal>
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
    const [filterGarment, setFilterGarment] = useState<string>("all");
    const [frontUrl, setFrontUrl] = useState("");
    const [backUrl, setBackUrl] = useState("");
    const [error, setError] = useState<string | null>(null);

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

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا المقاس؟")) return;
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
        }
    }, [onRefresh]);

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
                <ImageUploader value={frontUrl} onChange={setFrontUrl} folder="sizes" label="صورة أمام" />
            </FormField>
            <FormField label="صورة خلف">
                <ImageUploader value={backUrl} onChange={setBackUrl} folder="sizes" label="صورة خلف" />
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
                                    <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل المقاس" : "إضافة مقاس جديد"}>{form}</Modal>
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
    const [packageColors, setPackageColors] = useState<{ hex: string; name: string }[]>([]);
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState<string | null>(null);

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

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذه الباقة؟")) return;
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
        }
    }, [onRefresh]);

    const openEdit = (item: CustomDesignColorPackage) => {
        setEditing(item);
        setPackageColors(Array.isArray(item.colors) ? item.colors : []);
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
                <ImageUploader value={imageUrl} onChange={setImageUrl} folder="color-packages" />
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
                                    <button onClick={() => handleDelete(pkg.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل الباقة" : "إضافة باقة جديدة"}>{form}</Modal>
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
    const [mainImage, setMainImage] = useState("");
    const [mockupImage, setMockupImage] = useState("");
    const [modelImage, setModelImage] = useState("");
    const [error, setError] = useState<string | null>(null);

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

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا التصميم من ستيديو وشّى؟")) return;
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
        }
    }, [onRefresh]);

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
                <ImageUploader value={mainImage} onChange={setMainImage} folder="studio-items" label="الصورة الرئيسية" />
            </FormField>
            <FormField label="صورة الـ Mockup (التفاصيل)">
                <ImageUploader value={mockupImage} onChange={setMockupImage} folder="studio-items" label="صورة الموكب" />
            </FormField>
            <FormField label="صورة على المودل">
                <ImageUploader value={modelImage} onChange={setModelImage} folder="studio-items" label="صورة المودل" />
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
                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل تصميم الاستوديو" : "إضافة تصميم استوديو جديد"}>{form}</Modal>
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
    const [filterGarment, setFilterGarment] = useState<string>("all");
    const [frontUrl, setFrontUrl] = useState("");
    const [backUrl, setBackUrl] = useState("");
    const [modelUrl, setModelUrl] = useState("");
    const [error, setError] = useState<string | null>(null);

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

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا الموكب؟")) return;
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
        }
    }, [onRefresh]);

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
                <ImageUploader value={frontUrl} onChange={setFrontUrl} folder="garment-mockups" label="صورة أمام" />
            </FormField>
            <FormField label="صورة الموكب — خلف (اختياري)">
                <ImageUploader value={backUrl} onChange={setBackUrl} folder="garment-mockups" label="صورة خلف" />
            </FormField>
            <FormField label="صورة على موديل (اختياري)">
                <ImageUploader value={modelUrl} onChange={setModelUrl} folder="garment-mockups" label="صورة المودل" />
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
                                    <button onClick={() => handleDelete(m.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={closeModal} title={editing ? "تعديل الموكب" : "إضافة موكب جاهز جديد"}>{form}</Modal>
        </SectionCard>
    );
}
