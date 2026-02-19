"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Pencil, Trash2, Save, X, Loader2, GripVertical,
} from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/app/actions/settings";
import { useRouter } from "next/navigation";

interface Category {
    id: string;
    name_ar: string;
    name_en: string;
    slug: string;
    description: string | null;
    icon: string | null;
    sort_order: number;
}

export function CategoriesClient({ categories: initial }: { categories: Category[] }) {
    const [categories, setCategories] = useState(initial);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const router = useRouter();

    const [form, setForm] = useState({
        name_ar: "", name_en: "", slug: "", description: "", icon: "", sort_order: 0,
    });

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const resetForm = () => {
        setForm({ name_ar: "", name_en: "", slug: "", description: "", icon: "", sort_order: 0 });
        setEditingId(null);
        setShowAdd(false);
    };

    const handleAdd = async () => {
        if (!form.name_ar || !form.name_en || !form.slug) {
            showToast("يرجى ملء الحقول المطلوبة");
            return;
        }
        setSaving(true);
        const result = await createCategory(form);
        setSaving(false);
        if (result.success) {
            showToast("تمت الإضافة ✓");
            resetForm();
            router.refresh();
        } else {
            showToast("خطأ: " + result.error);
        }
    };

    const handleUpdate = async (id: string) => {
        setSaving(true);
        const result = await updateCategory(id, form);
        setSaving(false);
        if (result.success) {
            showToast("تم التحديث ✓");
            resetForm();
            router.refresh();
        } else {
            showToast("خطأ: " + result.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الفئة؟")) return;
        const result = await deleteCategory(id);
        if (result.success) {
            setCategories((prev) => prev.filter((c) => c.id !== id));
            showToast("تم الحذف ✓");
        } else {
            showToast("خطأ: " + result.error);
        }
    };

    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setShowAdd(false);
        setForm({
            name_ar: cat.name_ar,
            name_en: cat.name_en,
            slug: cat.slug,
            description: cat.description || "",
            icon: cat.icon || "",
            sort_order: cat.sort_order,
        });
    };

    // ─── Form Row ──────────────────────
    const renderForm = (isEdit: boolean, id?: string) => (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-gold/20 rounded-xl p-4 bg-gold/[0.02] space-y-3"
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                    value={form.name_ar}
                    onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                    placeholder="الاسم بالعربي *"
                    className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-fg/80 text-sm focus:border-gold focus:outline-none"
                />
                <input
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="Name in English *"
                    dir="ltr"
                    className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-fg/80 text-sm focus:border-gold focus:outline-none"
                />
                <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    placeholder="slug *"
                    dir="ltr"
                    className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-fg/80 text-sm font-mono focus:border-gold focus:outline-none"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="وصف (اختياري)"
                    className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-fg/80 text-sm focus:border-gold focus:outline-none sm:col-span-2"
                />
                <input
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                    placeholder="الترتيب"
                    type="number"
                    dir="ltr"
                    className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-fg/80 text-sm focus:border-gold focus:outline-none"
                />
            </div>
            <div className="flex items-center gap-2 justify-end">
                <button
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-fg/40 hover:text-fg/60 transition-colors"
                >
                    إلغاء
                </button>
                <button
                    onClick={() => isEdit ? handleUpdate(id!) : handleAdd()}
                    disabled={saving}
                    className="btn-gold px-6 py-2 text-sm rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isEdit ? "تحديث" : "إضافة"}
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-4 max-w-3xl">
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-gold text-bg font-bold text-sm shadow-lg"
                >
                    {toast}
                </motion.div>
            )}

            {/* Add Button */}
            <div className="flex justify-end">
                <button
                    onClick={() => { setShowAdd(!showAdd); setEditingId(null); resetForm(); setShowAdd(true); }}
                    className="btn-gold px-5 py-2.5 text-sm rounded-xl flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    إضافة فئة
                </button>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {showAdd && renderForm(false)}
            </AnimatePresence>

            {/* Categories List */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden divide-y divide-white/[0.04]">
                {categories.length === 0 ? (
                    <div className="p-12 text-center text-fg/20 text-sm">لا توجد فئات بعد</div>
                ) : (
                    categories.map((cat) => (
                        <div key={cat.id}>
                            <div className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                <GripVertical className="w-4 h-4 text-fg/15 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-fg text-sm">{cat.name_ar}</span>
                                        <span className="text-fg/30 text-xs">({cat.name_en})</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] font-mono text-fg/20 bg-white/5 px-1.5 py-0.5 rounded">{cat.slug}</span>
                                        {cat.description && (
                                            <span className="text-[10px] text-fg/20 truncate">{cat.description}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-fg/20 px-2 py-1 bg-white/5 rounded-lg shrink-0">
                                    #{cat.sort_order}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => startEdit(cat)}
                                        className="p-2 text-fg/30 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="p-2 text-fg/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <AnimatePresence>
                                {editingId === cat.id && renderForm(true, cat.id)}
                            </AnimatePresence>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
