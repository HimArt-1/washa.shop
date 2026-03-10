"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import {
    createArtworkAdmin,
    updateArtworkAdmin,
    uploadArtworkImageAdmin,
} from "@/app/actions/admin";

const statusOptions = [
    { value: "draft", label: "مسودة" },
    { value: "pending", label: "مراجعة" },
    { value: "published", label: "منشور" },
    { value: "rejected", label: "مرفوض" },
    { value: "archived", label: "مؤرشف" },
];

interface Artist {
    id: string;
    display_name: string;
    username: string;
}

interface Category {
    id: string;
    name_ar: string;
}

interface ArtworkFormModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    artists: Artist[];
    categories: Category[];
    artwork?: {
        id: string;
        artist_id: string;
        title: string;
        description?: string | null;
        category_id?: string | null;
        image_url: string;
        medium?: string | null;
        dimensions?: string | null;
        year?: number | null;
        tags?: string[];
        price?: number | null;
        currency?: string;
        status?: string;
        is_featured?: boolean;
    } | null;
}

export function ArtworkFormModal({
    open,
    onClose,
    onSuccess,
    artists,
    categories,
    artwork,
}: ArtworkFormModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isEdit = !!artwork;

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(artwork?.image_url || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        artist_id: "",
        title: "",
        description: "",
        category_id: "",
        medium: "",
        dimensions: "",
        year: "",
        tags: "",
        price: "",
        currency: "SAR",
        status: "published",
        is_featured: false,
    });

    useEffect(() => {
        if (artwork) {
            setForm({
                artist_id: artwork.artist_id || "",
                title: artwork.title || "",
                description: artwork.description || "",
                category_id: artwork.category_id || "",
                medium: artwork.medium || "",
                dimensions: artwork.dimensions || "",
                year: artwork.year?.toString() || "",
                tags: (artwork.tags || []).join("، "),
                price: artwork.price?.toString() || "",
                currency: artwork.currency || "SAR",
                status: artwork.status || "published",
                is_featured: artwork.is_featured ?? false,
            });
            setPreviewUrl(artwork.image_url || null);
        } else {
            setForm({
                artist_id: "",
                title: "",
                description: "",
                category_id: "",
                medium: "",
                dimensions: "",
                year: "",
                tags: "",
                price: "",
                currency: "SAR",
                status: "published",
                is_featured: false,
            });
            setPreviewUrl(null);
        }
        setFile(null);
        setError("");
    }, [artwork, open]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.size <= 5 * 1024 * 1024) {
            setFile(f);
            setPreviewUrl(URL.createObjectURL(f));
            setError("");
        } else if (f) setError("حجم الملف يجب أن لا يتجاوز 5 ميجابايت");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!form.title.trim()) {
            setError("العنوان مطلوب");
            return;
        }
        if (!form.artist_id) {
            setError("اختر الفنان");
            return;
        }
        if (!isEdit && !file && !previewUrl) {
            setError("صورة العمل الفني مطلوبة");
            return;
        }

        setIsSubmitting(true);

        try {
            let imageUrl = artwork?.image_url;
            if (file) {
                const fd = new FormData();
                fd.append("file", file);
                const upload = await uploadArtworkImageAdmin(fd);
                if (!upload.success) throw new Error(upload.error);
                imageUrl = upload.url;
            }

            if (!imageUrl) throw new Error("صورة مطلوبة");

            const payload = {
                artist_id: form.artist_id,
                title: form.title.trim(),
                description: form.description.trim() || null,
                category_id: form.category_id || null,
                image_url: imageUrl,
                medium: form.medium.trim() || null,
                dimensions: form.dimensions.trim() || null,
                year: form.year ? parseInt(form.year, 10) : null,
                tags: form.tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean),
                price: form.price ? parseFloat(form.price) : null,
                currency: form.currency,
                status: form.status,
                is_featured: form.is_featured,
            };

            if (isEdit) {
                const res = await updateArtworkAdmin(artwork.id, payload);
                if (!res.success) throw new Error(res.error);
            } else {
                const res = await createArtworkAdmin(payload);
                if (!res.success) throw new Error(res.error);
            }

            onSuccess();
            onClose();
            resetForm();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "حدث خطأ");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({
            artist_id: "",
            title: "",
            description: "",
            category_id: "",
            medium: "",
            dimensions: "",
            year: "",
            tags: "",
            price: "",
            currency: "SAR",
            status: "published",
            is_featured: false,
        });
        setFile(null);
        setPreviewUrl(null);
        setError("");
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
            if (!isEdit) resetForm();
        }
    };

    if (!open) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-theme-soft bg-surface shadow-2xl"
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-theme-subtle bg-surface">
                        <h2 className="text-lg font-bold text-theme">
                            {isEdit ? "تعديل العمل الفني" : "إضافة عمل فني"}
                        </h2>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-2 rounded-lg text-theme-subtle hover:text-theme hover:bg-theme-subtle transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* صورة */}
                        <div>
                            <label className="block text-xs font-bold text-theme-soft mb-2">صورة العمل *</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="relative aspect-video rounded-xl border-2 border-dashed border-theme-soft hover:border-gold/30 cursor-pointer overflow-hidden bg-theme-faint flex items-center justify-center transition-colors"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                {previewUrl ? (
                                    <>
                                        <Image src={previewUrl} alt="" fill className="object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="flex items-center gap-2 text-gold text-sm font-bold">
                                                <Upload className="w-4 h-4" /> تغيير الصورة
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-theme-faint">
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">اضغط لرفع صورة (PNG, JPG حتى 5MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">الفنان *</label>
                                <select
                                    value={form.artist_id}
                                    onChange={(e) => setForm({ ...form, artist_id: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none text-sm"
                                    required
                                >
                                    <option value="">اختر الفنان...</option>
                                    {artists.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.display_name} {a.username ? `@${a.username}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">الفئة</label>
                                <select
                                    value={form.category_id}
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none text-sm"
                                >
                                    <option value="">بدون فئة</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-theme-soft mb-1.5">عنوان العمل *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none text-sm"
                                placeholder="مثال: غروب في الصحراء"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-theme-soft mb-1.5">الوصف</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold focus:ring-1 focus:ring-gold/20 outline-none text-sm resize-none"
                                placeholder="قصة العمل، التقنيات..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">الأسلوب/الوسط</label>
                                <input
                                    type="text"
                                    value={form.medium}
                                    onChange={(e) => setForm({ ...form, medium: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold outline-none text-sm"
                                    placeholder="رسم رقمي، خط عربي"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">الأبعاد</label>
                                <input
                                    type="text"
                                    value={form.dimensions}
                                    onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold outline-none text-sm"
                                    placeholder="80×60 سم"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">السنة</label>
                                <input
                                    type="number"
                                    value={form.year}
                                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold outline-none text-sm"
                                    placeholder="2024"
                                    min="1900"
                                    max="2100"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">السعر (ر.س)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold outline-none text-sm"
                                    placeholder="فارغ = غير معروض للبيع"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-theme-soft mb-1.5">الحالة</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold outline-none text-sm"
                                >
                                    {statusOptions.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-theme-soft mb-1.5">الكلمات المفتاحية</label>
                            <input
                                type="text"
                                value={form.tags}
                                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                                className="w-full px-3 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme focus:border-gold outline-none text-sm"
                                placeholder="طبيعة، تجريدي، ألوان زيتية (افصل بفاصلة أو ،)"
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.is_featured}
                                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                                className="rounded border-white/20 text-gold focus:ring-gold/30"
                            />
                            <span className="text-sm text-theme-strong">عمل مميز (يظهر في الصفحة الرئيسية)</span>
                        </label>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle transition-colors disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl bg-gold text-bg font-bold hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    isEdit ? "حفظ التعديلات" : "إضافة العمل"
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
