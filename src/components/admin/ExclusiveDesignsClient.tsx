"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Pencil,
    Trash2,
    Image as ImageIcon,
    Loader2,
    Eye,
    EyeOff,
} from "lucide-react";
import Image from "next/image";
import {
    createExclusiveDesign,
    updateExclusiveDesign,
    deleteExclusiveDesign,
    uploadExclusiveDesignImage,
} from "@/app/actions/settings";

interface Design {
    id: string;
    title: string;
    description: string | null;
    image_url: string;
    sort_order: number;
    is_active: boolean;
}

interface ExclusiveDesignsClientProps {
    initialDesigns: Design[];
}

export function ExclusiveDesignsClient({ initialDesigns }: ExclusiveDesignsClientProps) {
    const [designs, setDesigns] = useState(initialDesigns);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        image_url: "",
        sort_order: 0,
    });

    const resetForm = () => {
        setForm({ title: "", description: "", image_url: "", sort_order: designs.length });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadExclusiveDesignImage(fd);
        setUploading(false);
        if (result.success) {
            setForm((f) => ({ ...f, image_url: result.url }));
        } else {
            alert(result.error);
        }
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.image_url.trim()) {
            alert("العنوان والصورة مطلوبان");
            return;
        }
        setSaving(editingId || "new");
        if (editingId) {
            const result = await updateExclusiveDesign(editingId, form);
            if (result.success) {
                setDesigns((d) =>
                    d.map((x) => (x.id === editingId ? { ...x, ...form } : x))
                );
                resetForm();
            } else {
                alert(result.error);
            }
        } else {
            const result = await createExclusiveDesign(form);
            if (result.success) {
                setDesigns((d) => [...d, { ...form, id: "temp", is_active: true } as Design]);
                resetForm();
                window.location.reload(); // لتحميل الـ id الجديد
            } else {
                alert(result.error);
            }
        }
        setSaving(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("حذف هذا التصميم؟")) return;
        setDeleting(id);
        const result = await deleteExclusiveDesign(id);
        if (result.success) {
            setDesigns((d) => d.filter((x) => x.id !== id));
        } else {
            alert(result.error);
        }
        setDeleting(null);
    };

    const handleToggleActive = async (d: Design) => {
        const result = await updateExclusiveDesign(d.id, { is_active: !d.is_active });
        if (result.success) {
            setDesigns((list) =>
                list.map((x) => (x.id === d.id ? { ...x, is_active: !d.is_active } : x))
            );
        }
    };

    const startEdit = (d: Design) => {
        setForm({
            title: d.title,
            description: d.description || "",
            image_url: d.image_url,
            sort_order: d.sort_order,
        });
        setEditingId(d.id);
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 overflow-hidden">
                <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="font-bold text-fg">التصاميم الحصرية</h3>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsAdding(true);
                            setForm((f) => ({ ...f, sort_order: designs.length }));
                        }}
                        className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة تصميم
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <AnimatePresence>
                        {(isAdding || editingId) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-6 rounded-xl border-2 border-gold/30 bg-gold/5 space-y-4"
                            >
                                <h4 className="font-bold text-fg">
                                    {editingId ? "تعديل التصميم" : "تصميم جديد"}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-fg/50 mb-1">العنوان</label>
                                        <input
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-fg"
                                            placeholder="اسم التصميم"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-fg/50 mb-1">ترتيب العرض</label>
                                        <input
                                            type="number"
                                            value={form.sort_order}
                                            onChange={(e) =>
                                                setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                                            }
                                            className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-fg"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-fg/50 mb-1">الوصف (اختياري)</label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-fg h-20"
                                        placeholder="وصف قصير للتصميم"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-fg/50 mb-1">الصورة</label>
                                    <div className="flex gap-3 items-start">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="exclusive-img"
                                        />
                                        <label
                                            htmlFor="exclusive-img"
                                            className="flex-1 max-w-xs p-4 rounded-xl border-2 border-dashed border-white/20 hover:border-gold/40 cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            {uploading ? (
                                                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-fg/40" />
                                            )}
                                            <span className="text-xs text-fg/50">
                                                {form.image_url ? "تغيير الصورة" : "رفع صورة"}
                                            </span>
                                        </label>
                                        {form.image_url && (
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/5">
                                                <Image
                                                    src={form.image_url}
                                                    alt=""
                                                    width={80}
                                                    height={80}
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving !== null || !form.title || !form.image_url}
                                        className="btn-gold py-2 px-6 text-sm disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                                    </button>
                                    <button
                                        onClick={resetForm}
                                        className="px-6 py-2 rounded-xl border border-white/20 text-fg/70 hover:bg-white/5"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {designs.map((d) => (
                            <motion.div
                                key={d.id}
                                layout
                                className={`rounded-xl border overflow-hidden transition-all ${
                                    d.is_active ? "border-white/[0.08]" : "border-white/[0.04] opacity-60"
                                }`}
                            >
                                <div className="aspect-square relative bg-white/5">
                                    <Image
                                        src={d.image_url}
                                        alt={d.title}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute top-2 left-2 flex gap-1">
                                        <button
                                            onClick={() => handleToggleActive(d)}
                                            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70"
                                            title={d.is_active ? "إخفاء" : "إظهار"}
                                        >
                                            {d.is_active ? (
                                                <Eye className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-fg/40" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 justify-end">
                                        <button
                                            onClick={() => startEdit(d)}
                                            className="p-1.5 rounded-lg bg-black/50 hover:bg-gold/20"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(d.id)}
                                            disabled={deleting === d.id}
                                            className="p-1.5 rounded-lg bg-black/50 hover:bg-red-500/30 text-red-400"
                                        >
                                            {deleting === d.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3">
                                    <p className="font-bold text-sm text-fg truncate">{d.title}</p>
                                    {d.description && (
                                        <p className="text-xs text-fg/50 line-clamp-2">{d.description}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {designs.length === 0 && !isAdding && (
                        <div className="text-center py-16 text-fg/30">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>لا توجد تصاميم حصرية بعد</p>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="mt-4 text-gold hover:underline"
                            >
                                إضافة أول تصميم
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
