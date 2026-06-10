"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createArtwork, uploadArtworkImage } from "@/app/actions/artworks";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

interface Category {
    id: string;
    name_ar: string;
}

export function UploadArtworkForm({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category_id: "",
        tags: "",
        price: "",
        medium: "",
        dimensions: "",
        year: "",
    });

    // Revoke object URL on unmount or when previewUrl changes
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const setFileWithPreview = (selectedFile: File) => {
        // Revoke old preview
        if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

        if (selectedFile.size > MAX_SIZE) {
            setError("حجم الملف يجب أن لا يتجاوز 5 ميجابايت");
            return;
        }
        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            setError("نوع الملف غير مدعوم — PNG, JPG, WebP, GIF فقط");
            return;
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setError("");
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFileWithPreview(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) setFileWithPreview(e.dataTransfer.files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) { setError("الرجاء اختيار صورة للعمل الفني"); return; }
        if (!formData.title.trim()) { setError("العنوان مطلوب"); return; }
        if (!formData.category_id) { setError("الرجاء اختيار الفئة"); return; }

        setIsUploading(true);
        setError("");

        try {
            const fd = new FormData();
            fd.append("file", file);
            const uploadResult = await uploadArtworkImage(fd);

            if (!uploadResult.success) throw new Error(uploadResult.error);

            const result = await createArtwork({
                ...formData,
                image_url: uploadResult.url,
                tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
                price: formData.price ? parseFloat(formData.price) : null,
                year: formData.year ? parseInt(formData.year, 10) : null,
            });

            if (!result.success) throw new Error(result.error);

            router.push("/studio/artworks");
        } catch (err: any) {
            setError(err.message || "حدث خطأ أثناء الرفع");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ─── Image Upload Area ─── */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-theme">صورة العمل الفني</label>

                <div
                    className={`theme-surface-panel relative aspect-square rounded-[1.75rem] border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center cursor-pointer group ${
                        isDragging
                            ? "border-gold bg-gold/5"
                            : error && !file
                                ? "border-red-400 bg-red-500/5"
                                : "border-theme-subtle hover:border-gold/50 hover:bg-gold/5"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileSelect}
                    />

                    {previewUrl ? (
                        <div className="relative w-full h-full">
                            <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-medium flex items-center gap-2">
                                    <Upload className="w-5 h-5" />
                                    تغيير الصورة
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
                                    setFile(null);
                                    setPreviewUrl(null);
                                    setError("");
                                }}
                                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-theme-faint flex items-center justify-center mx-auto text-gold mb-2 group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-theme font-medium">اضغط للرفع أو اسحب الصورة هنا</p>
                                <p className="text-theme-faint text-sm mt-1">PNG, JPG, WebP حتى 5 ميجابايت</p>
                            </div>
                        </div>
                    )}
                </div>
                {error && !file && <p className="text-red-400 text-xs px-2">{error}</p>}
            </div>

            {/* ─── Details Form ─── */}
            <div className="space-y-5">
                <div className="theme-surface-panel p-6 rounded-[1.75rem] space-y-4">
                    <h2 className="text-xl font-bold text-theme">تفاصيل العمل</h2>

                    <div>
                        <label className="block text-sm text-theme-subtle mb-1.5">عنوان العمل *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input-dark w-full"
                            placeholder="مثال: غروب في الصحراء"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-theme-subtle mb-1.5">الفئة *</label>
                        <select
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="input-dark w-full appearance-none"
                            required
                        >
                            <option value="">اختر الفئة...</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-theme-subtle mb-1.5">الوصف</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-dark w-full h-24 resize-none"
                            placeholder="قصة العمل الفني، التقنيات المستخدمة..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-theme-subtle mb-1.5">الخامة</label>
                            <input
                                type="text"
                                value={formData.medium}
                                onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                                className="input-dark w-full"
                                placeholder="رسم رقمي، خط..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-theme-subtle mb-1.5">الأبعاد</label>
                            <input
                                type="text"
                                value={formData.dimensions}
                                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                                className="input-dark w-full"
                                placeholder="80×60 سم"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-theme-subtle mb-1.5">السنة</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                className="input-dark w-full"
                                placeholder={String(new Date().getFullYear())}
                                min="1900"
                                max="2100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-theme-subtle mb-1.5">السعر (ر.س)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="input-dark w-full"
                                placeholder="فارغ = غير معروض للبيع"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-theme-subtle mb-1.5">الكلمات المفتاحية</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="input-dark w-full"
                            placeholder="طبيعة, تجريدي, ألوان زيتية (افصل بفاصلة)"
                        />
                    </div>
                </div>

                {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

                <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-gold w-full py-4 text-base font-bold shadow-lg shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />جارٍ الرفع والإرسال...</>
                    ) : (
                        <><Upload className="w-5 h-5" />إرسال العمل للمراجعة</>
                    )}
                </button>
                <p className="px-2 text-center text-xs text-theme-faint">
                    سيظهر العمل في المتجر بعد اعتماد الإدارة.
                </p>
            </div>
        </form>
    );
}
