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
    const [actionError, setActionError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Design | null>(null);

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
        setActionError(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setActionError(null);
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadExclusiveDesignImage(fd);
        setUploading(false);
        if (result.success) {
            setForm((f) => ({ ...f, image_url: result.url }));
        } else {
            setActionError(result.error || "تعذر رفع الصورة الآن.");
        }
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.image_url.trim()) {
            setActionError("العنوان والصورة مطلوبان");
            return;
        }
        setActionError(null);
        setSaving(editingId || "new");
        try {
            if (editingId) {
                const result = await updateExclusiveDesign(editingId, form);
                if (result.success) {
                    const nextDesign = result.design as Design;
                    setDesigns((d) =>
                        d.map((x) => (x.id === editingId ? nextDesign : x))
                    );
                    resetForm();
                } else {
                    setActionError(result.error || "تعذر تحديث التصميم الآن.");
                }
            } else {
                const result = await createExclusiveDesign(form);
                if (result.success) {
                    const nextDesign = result.design as Design;
                    setDesigns((d) => [...d, nextDesign]);
                    resetForm();
                } else {
                    setActionError(result.error || "تعذر إنشاء التصميم الآن.");
                }
            }
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "تعذر حفظ التصميم الآن.");
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget.id;
        setActionError(null);
        setDeleting(id);
        try {
            const result = await deleteExclusiveDesign(id);
            if (result.success) {
                setDesigns((d) => d.filter((x) => x.id !== id));
                setDeleteTarget(null);
            } else {
                setActionError(result.error || "تعذر حذف التصميم الآن.");
            }
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "تعذر حذف التصميم الآن.");
        } finally {
            setDeleting(null);
        }
    };

    const handleToggleActive = async (d: Design) => {
        setActionError(null);
        const result = await updateExclusiveDesign(d.id, { is_active: !d.is_active });
        if (result.success) {
            const nextDesign = result.design as Design;
            setDesigns((list) =>
                list.map((x) => (x.id === d.id ? nextDesign : x))
            );
        } else {
            setActionError(result.error || "تعذر تحديث حالة التصميم الآن.");
        }
    };

    const startEdit = (d: Design) => {
        setActionError(null);
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
            {actionError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:px-5">
                    {actionError}
                </div>
            )}

            <div className="theme-surface-panel overflow-hidden rounded-2xl">
                <div className="p-6 border-b border-theme-subtle flex items-center justify-between">
                    <h3 className="font-bold text-theme">التصاميم الحصرية</h3>
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
                                className="rounded-xl border-2 border-gold/30 bg-gold/5 p-6 space-y-4"
                            >
                                <h4 className="font-bold text-theme">
                                    {editingId ? "تعديل التصميم" : "تصميم جديد"}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-theme-subtle mb-1">العنوان</label>
                                        <input
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            className="input-dark w-full rounded-xl px-4 py-2"
                                            placeholder="اسم التصميم"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-theme-subtle mb-1">ترتيب العرض</label>
                                        <input
                                            type="number"
                                            value={form.sort_order}
                                            onChange={(e) =>
                                                setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                                            }
                                            className="input-dark w-full rounded-xl px-4 py-2"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-theme-subtle mb-1">الوصف (اختياري)</label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="input-dark h-20 w-full rounded-xl px-4 py-2"
                                        placeholder="وصف قصير للتصميم"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-theme-subtle mb-1">الصورة</label>
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
                                            className="flex-1 max-w-xs p-4 rounded-xl border-2 border-dashed border-theme-soft hover:border-gold/40 cursor-pointer flex flex-col items-center gap-2"
                                        >
                                            {uploading ? (
                                                <Loader2 className="w-8 h-8 animate-spin text-gold" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-theme-subtle" />
                                            )}
                                            <span className="text-xs text-theme-subtle">
                                                {form.image_url ? "تغيير الصورة" : "رفع صورة"}
                                            </span>
                                        </label>
                                        {form.image_url && (
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-theme-subtle">
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
                                        className="px-6 py-2 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle"
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
                                    d.is_active ? "border-theme-soft" : "border-theme-faint opacity-60"
                                }`}
                            >
                                <div className="aspect-square relative bg-theme-subtle">
                                    <Image
                                        src={d.image_url}
                                        alt={d.title}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute top-2 left-2 flex gap-1">
                                        <button
                                            onClick={() => handleToggleActive(d)}
                                            className="p-1.5 rounded-lg bg-theme-subtle hover:bg-theme-soft"
                                            title={d.is_active ? "إخفاء" : "إظهار"}
                                        >
                                            {d.is_active ? (
                                                <Eye className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-theme-subtle" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 justify-end">
                                        <button
                                            onClick={() => startEdit(d)}
                                            className="p-1.5 rounded-lg bg-theme-subtle hover:bg-gold/20"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteTarget(d)}
                                            disabled={deleting === d.id}
                                            className="p-1.5 rounded-lg bg-theme-subtle hover:bg-red-500/30 text-red-400"
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
                                    <p className="font-bold text-sm text-theme truncate">{d.title}</p>
                                    {d.description && (
                                        <p className="text-xs text-theme-subtle line-clamp-2">{d.description}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {designs.length === 0 && !isAdding && (
                        <div className="text-center py-16 text-theme-faint">
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

            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => !deleting && setDeleteTarget(null)} />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.96 }}
                            className="theme-surface-panel relative z-10 w-full max-w-md rounded-[2rem] p-6 sm:p-7"
                        >
                            <div className="mb-4 flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-theme">حذف التصميم الحصري</h3>
                                    <p className="mt-1 text-sm text-theme-faint">
                                        سيتم حذف "{deleteTarget.title}" من المكتبة الحصرية. تأكد أنك لا تحتاجه قبل المتابعة.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting === deleteTarget.id}
                                    className="min-h-[46px] rounded-2xl border border-theme-soft px-5 text-sm font-bold text-theme-soft transition-colors hover:border-gold/20 hover:text-gold disabled:opacity-50"
                                >
                                    تراجع
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting === deleteTarget.id}
                                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                                >
                                    {deleting === deleteTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    تأكيد الحذف
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
