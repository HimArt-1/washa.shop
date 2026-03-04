"use client";

import { useState, useCallback } from "react";
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
    ChevronDown,
    Eye,
    EyeOff,
    GripVertical,
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
} from "@/app/actions/smart-store";
import type {
    CustomDesignGarment,
    CustomDesignColor,
    CustomDesignSize,
    CustomDesignStyle,
    CustomDesignArtStyle,
    CustomDesignColorPackage,
} from "@/types/database";

// ─── Types ──────────────────────────────────────────────

type TabId = "garments" | "colors" | "sizes" | "styles" | "artStyles" | "colorPackages";

interface Props {
    garments: CustomDesignGarment[];
    colors: CustomDesignColor[];
    sizes: CustomDesignSize[];
    styles: CustomDesignStyle[];
    artStyles: CustomDesignArtStyle[];
    colorPackages: CustomDesignColorPackage[];
}

const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: "garments", label: "القطع", icon: Shirt },
    { id: "colors", label: "الألوان", icon: Palette },
    { id: "sizes", label: "المقاسات", icon: Ruler },
    { id: "styles", label: "الأنماط", icon: Sparkles },
    { id: "artStyles", label: "الأساليب", icon: Paintbrush },
    { id: "colorPackages", label: "باقات الألوان", icon: SwatchBook },
];

// ─── Component ──────────────────────────────────────────

export function SmartStoreClient({ garments, colors, sizes, styles, artStyles, colorPackages }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>("garments");
    const router = useRouter();

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                ${isActive
                                    ? "bg-gold/15 text-gold border border-gold/30"
                                    : "bg-white/[0.03] text-fg/50 border border-white/[0.06] hover:text-fg/80 hover:bg-white/[0.05]"
                                }
              `}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === "garments" && <GarmentsTab items={garments} onRefresh={() => router.refresh()} />}
                    {activeTab === "colors" && <ColorsTab items={colors} garments={garments} onRefresh={() => router.refresh()} />}
                    {activeTab === "sizes" && <SizesTab items={sizes} garments={garments} colors={colors} onRefresh={() => router.refresh()} />}
                    {activeTab === "styles" && <StylesTab items={styles} onRefresh={() => router.refresh()} />}
                    {activeTab === "artStyles" && <ArtStylesTab items={artStyles} onRefresh={() => router.refresh()} />}
                    {activeTab === "colorPackages" && <ColorPackagesTab items={colorPackages} onRefresh={() => router.refresh()} />}
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
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-fg">{title}</h2>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    إضافة
                </button>
            </div>
            {children}
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg/60">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-fg placeholder:text-fg/30 focus:outline-none focus:border-gold/40 transition-colors text-sm";
const btnPrimary = "px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all";
const btnSecondary = "px-4 py-2.5 rounded-xl border border-white/[0.08] text-fg/60 text-sm hover:bg-white/[0.04] transition-colors";

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-surface border border-white/[0.08] p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-fg">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-fg/40" />
                    </button>
                </div>
                {children}
            </motion.div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="text-center py-16 text-fg/30">
            <p className="text-sm">{text}</p>
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

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        if (editing) fd.set("id", editing.id);
        await upsertGarment(fd);
        setLoading(false);
        setEditing(null);
        setIsAdding(false);
        onRefresh();
    }, [editing, onRefresh]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذه القطعة؟ سيتم حذف جميع الألوان والمقاسات المرتبطة.")) return;
        await deleteGarment(id);
        onRefresh();
    }, [onRefresh]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="اسم القطعة">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: تيشيرت" />
            </FormField>
            <FormField label="الرابط (slug)">
                <input name="slug" defaultValue={editing?.slug ?? ""} required className={inputCls} placeholder="مثال: tshirt" />
            </FormField>
            <FormField label="رابط الصورة">
                <input name="image_url" defaultValue={editing?.image_url ?? ""} className={inputCls} placeholder="https://..." />
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
                <button type="submit" disabled={loading} className={btnPrimary}>
                    {loading ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button type="button" onClick={() => { setEditing(null); setIsAdding(false); }} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="القطع (الملابس)" onAdd={() => setIsAdding(true)}>
            {items.length === 0 ? <EmptyState text="لا توجد قطع بعد. أضف أول قطعة!" /> : (
                <div className="grid gap-3">
                    {items.map((g) => (
                        <div key={g.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group">
                            {g.image_url && (
                                <img src={g.image_url} alt={g.name} className="w-14 h-14 rounded-lg object-cover bg-white/5" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-fg truncate">{g.name}</p>
                                <p className="text-xs text-fg/40">{g.slug} · ترتيب: {g.sort_order}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${g.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                {g.is_active ? "نشط" : "معطل"}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditing(g)} className="p-2 hover:bg-white/5 rounded-lg"><Pencil className="w-4 h-4 text-fg/40" /></button>
                                <button onClick={() => handleDelete(g.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={() => { setEditing(null); setIsAdding(false); }} title={editing ? "تعديل القطعة" : "إضافة قطعة جديدة"}>
                {form}
            </Modal>
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

    const filtered = filterGarment === "all" ? items : items.filter(c => c.garment_id === filterGarment);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        if (editing) fd.set("id", editing.id);
        await upsertColor(fd);
        setLoading(false);
        setEditing(null);
        setIsAdding(false);
        onRefresh();
    }, [editing, onRefresh]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا اللون؟")) return;
        await deleteColor(id);
        onRefresh();
    }, [onRefresh]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="القطعة">
                <select name="garment_id" defaultValue={editing?.garment_id ?? garments[0]?.id ?? ""} required className={inputCls}>
                    {garments.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </FormField>
            <FormField label="اسم اللون">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: أسود" />
            </FormField>
            <FormField label="كود اللون">
                <div className="flex gap-2">
                    <input name="hex_code" defaultValue={editing?.hex_code ?? "#000000"} required className={inputCls} placeholder="#000000" />
                </div>
            </FormField>
            <FormField label="رابط الصورة (mockup)">
                <input name="image_url" defaultValue={editing?.image_url ?? ""} className={inputCls} placeholder="https://..." />
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
                <button type="button" onClick={() => { setEditing(null); setIsAdding(false); }} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="ألوان القطع" onAdd={() => setIsAdding(true)}>
            {/* Filter */}
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
                            <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group">
                                <div className="w-10 h-10 rounded-lg border border-white/10" style={{ backgroundColor: c.hex_code }} />
                                {c.image_url && <img src={c.image_url} alt={c.name} className="w-14 h-14 rounded-lg object-cover bg-white/5" />}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-fg truncate">{c.name}</p>
                                    <p className="text-xs text-fg/40">{garmentName} · {c.hex_code}</p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${c.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {c.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditing(c)} className="p-2 hover:bg-white/5 rounded-lg"><Pencil className="w-4 h-4 text-fg/40" /></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={() => { setEditing(null); setIsAdding(false); }} title={editing ? "تعديل اللون" : "إضافة لون جديد"}>
                {form}
            </Modal>
        </SectionCard>
    );
}

// ═══════════════════════════════════════════════════════════
//  Generic Items Tab (Styles, Art Styles)
// ═══════════════════════════════════════════════════════════

function GenericItemsTab<T extends { id: string; name: string; description?: string | null; image_url?: string | null; sort_order?: number; is_active: boolean }>({
    items,
    title,
    onUpsert,
    onDelete,
    onRefresh,
}: {
    items: T[];
    title: string;
    onUpsert: (fd: FormData) => Promise<any>;
    onDelete: (id: string) => Promise<any>;
    onRefresh: () => void;
}) {
    const [editing, setEditing] = useState<T | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        if (editing) fd.set("id", editing.id);
        await onUpsert(fd);
        setLoading(false);
        setEditing(null);
        setIsAdding(false);
        onRefresh();
    }, [editing, onRefresh, onUpsert]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا العنصر؟")) return;
        await onDelete(id);
        onRefresh();
    }, [onRefresh, onDelete]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="الاسم">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} />
            </FormField>
            <FormField label="الوصف">
                <textarea name="description" defaultValue={editing?.description ?? ""} className={inputCls} rows={3} />
            </FormField>
            <FormField label="رابط الصورة">
                <input name="image_url" defaultValue={editing?.image_url ?? ""} className={inputCls} placeholder="https://..." />
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
                <button type="button" onClick={() => { setEditing(null); setIsAdding(false); }} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title={title} onAdd={() => setIsAdding(true)}>
            {items.length === 0 ? <EmptyState text="لا توجد عناصر بعد." /> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <div key={item.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group relative overflow-hidden">
                            {item.image_url && (
                                <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-lg mb-3 bg-white/5" />
                            )}
                            <p className="font-medium text-fg truncate">{item.name}</p>
                            {item.description && <p className="text-xs text-fg/40 mt-1 line-clamp-2">{item.description}</p>}
                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-xs px-2 py-1 rounded-full ${item.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {item.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditing(item)} className="p-1.5 hover:bg-white/5 rounded-lg"><Pencil className="w-3.5 h-3.5 text-fg/40" /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={() => { setEditing(null); setIsAdding(false); }} title={editing ? "تعديل العنصر" : "إضافة عنصر جديد"}>
                {form}
            </Modal>
        </SectionCard>
    );
}

function StylesTab({ items, onRefresh }: { items: CustomDesignStyle[]; onRefresh: () => void }) {
    return <GenericItemsTab items={items} title="أنماط التصميم" onUpsert={upsertStyle} onDelete={deleteStyle} onRefresh={onRefresh} />;
}

function ArtStylesTab({ items, onRefresh }: { items: CustomDesignArtStyle[]; onRefresh: () => void }) {
    return <GenericItemsTab items={items} title="أساليب الرسم" onUpsert={upsertArtStyle} onDelete={deleteArtStyle} onRefresh={onRefresh} />;
}

// ═══════════════════════════════════════════════════════════
//  Sizes Tab
// ═══════════════════════════════════════════════════════════

function SizesTab({ items, garments, colors, onRefresh }: { items: CustomDesignSize[]; garments: CustomDesignGarment[]; colors: CustomDesignColor[]; onRefresh: () => void }) {
    const [editing, setEditing] = useState<CustomDesignSize | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filterGarment, setFilterGarment] = useState<string>("all");

    const filtered = filterGarment === "all" ? items : items.filter(s => s.garment_id === filterGarment);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        if (editing) fd.set("id", editing.id);
        await upsertSize(fd);
        setLoading(false);
        setEditing(null);
        setIsAdding(false);
        onRefresh();
    }, [editing, onRefresh]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذا المقاس؟")) return;
        await deleteSize(id);
        onRefresh();
    }, [onRefresh]);

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <input name="image_front_url" defaultValue={editing?.image_front_url ?? ""} className={inputCls} placeholder="https://..." />
            </FormField>
            <FormField label="صورة خلف">
                <input name="image_back_url" defaultValue={editing?.image_back_url ?? ""} className={inputCls} placeholder="https://..." />
            </FormField>
            <FormField label="الحالة">
                <select name="is_active" defaultValue={editing?.is_active !== false ? "true" : "false"} className={inputCls}>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                </select>
            </FormField>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={btnPrimary}>{loading ? "جاري الحفظ..." : "حفظ"}</button>
                <button type="button" onClick={() => { setEditing(null); setIsAdding(false); }} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="المقاسات" onAdd={() => setIsAdding(true)}>
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
                            <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center font-bold text-gold text-sm">{s.name}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-fg truncate">{garmentName} — {s.name}</p>
                                    {colorName && <p className="text-xs text-fg/40">لون: {colorName}</p>}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${s.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {s.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditing(s)} className="p-2 hover:bg-white/5 rounded-lg"><Pencil className="w-4 h-4 text-fg/40" /></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400/60" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={() => { setEditing(null); setIsAdding(false); }} title={editing ? "تعديل المقاس" : "إضافة مقاس جديد"}>
                {form}
            </Modal>
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

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const fd = new FormData(e.currentTarget);
        if (editing) fd.set("id", editing.id);
        fd.set("colors", JSON.stringify(packageColors));
        await upsertColorPackage(fd);
        setLoading(false);
        setEditing(null);
        setIsAdding(false);
        setPackageColors([]);
        onRefresh();
    }, [editing, onRefresh, packageColors]);

    const handleDelete = useCallback(async (id: string) => {
        if (!confirm("حذف هذه الباقة؟")) return;
        await deleteColorPackage(id);
        onRefresh();
    }, [onRefresh]);

    const openEdit = (item: CustomDesignColorPackage) => {
        setEditing(item);
        setPackageColors(Array.isArray(item.colors) ? item.colors : []);
    };

    const openAdd = () => {
        setIsAdding(true);
        setPackageColors([{ hex: "#ceae7f", name: "ذهبي" }, { hex: "#000000", name: "أسود" }]);
    };

    const form = (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="اسم الباقة">
                <input name="name" defaultValue={editing?.name ?? ""} required className={inputCls} placeholder="مثال: باقة ذهبية" />
            </FormField>
            <FormField label="رابط الصورة">
                <input name="image_url" defaultValue={editing?.image_url ?? ""} className={inputCls} placeholder="https://..." />
            </FormField>
            <FormField label="الألوان">
                <div className="space-y-2">
                    {packageColors.map((c, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input
                                type="color"
                                value={c.hex}
                                onChange={(e) => {
                                    const newColors = [...packageColors];
                                    newColors[i] = { ...newColors[i], hex: e.target.value };
                                    setPackageColors(newColors);
                                }}
                                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                                value={c.name}
                                onChange={(e) => {
                                    const newColors = [...packageColors];
                                    newColors[i] = { ...newColors[i], name: e.target.value };
                                    setPackageColors(newColors);
                                }}
                                className={inputCls + " flex-1"}
                                placeholder="اسم اللون"
                            />
                            <button type="button" onClick={() => setPackageColors(packageColors.filter((_, j) => j !== i))} className="p-2 hover:bg-red-500/10 rounded-lg">
                                <X className="w-4 h-4 text-red-400/60" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setPackageColors([...packageColors, { hex: "#888888", name: "" }])}
                        className="text-xs text-gold hover:text-gold-light transition-colors"
                    >
                        + أضف لون
                    </button>
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
                <button type="button" onClick={() => { setEditing(null); setIsAdding(false); setPackageColors([]); }} className={btnSecondary}>إلغاء</button>
            </div>
        </form>
    );

    return (
        <SectionCard title="باقات الألوان" onAdd={openAdd}>
            {items.length === 0 ? <EmptyState text="لا توجد باقات ألوان بعد." /> : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((pkg) => (
                        <div key={pkg.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] group">
                            <p className="font-medium text-fg mb-2">{pkg.name}</p>
                            <div className="flex gap-1 mb-3">
                                {(Array.isArray(pkg.colors) ? pkg.colors : []).map((c: any, i: number) => (
                                    <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: c.hex }} title={c.name} />
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-xs px-2 py-1 rounded-full ${pkg.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                    {pkg.is_active ? "نشط" : "معطل"}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(pkg)} className="p-1.5 hover:bg-white/5 rounded-lg"><Pencil className="w-3.5 h-3.5 text-fg/40" /></button>
                                    <button onClick={() => handleDelete(pkg.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={isAdding || !!editing} onClose={() => { setEditing(null); setIsAdding(false); setPackageColors([]); }} title={editing ? "تعديل الباقة" : "إضافة باقة جديدة"}>
                {form}
            </Modal>
        </SectionCard>
    );
}
