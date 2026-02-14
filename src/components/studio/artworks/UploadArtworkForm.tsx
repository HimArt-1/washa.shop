"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { createArtwork } from "@/app/actions/artworks";

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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category_id: "",
        tags: "",
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
                setError("حجم الملف يجب أن لا يتجاوز 5 ميجابايت");
                return;
            }
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setError("");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError("حجم الملف يجب أن لا يتجاوز 5 ميجابايت");
                return;
            }
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("الرجاء اختيار صورة للعمل الفني");
            return;
        }
        if (!formData.title || !formData.category_id) {
            setError("الرجاء تعبئة الحقول المطلوبة");
            return;
        }

        setIsUploading(true);
        setError("");

        try {
            const supabase = getSupabaseBrowserClient();

            // 1. Upload file
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('artworks')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('artworks')
                .getPublicUrl(filePath);

            // 3. Create DB Record
            const result = await createArtwork({
                ...formData,
                image_url: publicUrl,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            router.push("/studio/artworks");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "حدث خطأ أثناء الرفع");
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ─── Image Upload Area ─── */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-ink">صورة العمل الفني</label>

                <div
                    className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center cursor-pointer group ${isDragging
                            ? "border-gold bg-gold/5"
                            : error && !file
                                ? "border-red-400 bg-red-50"
                                : "border-ink/10 hover:border-gold/50 hover:bg-gold/5"
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
                        accept="image/*"
                        onChange={handleFileSelect}
                    />

                    {previewUrl ? (
                        <div className="relative w-full h-full">
                            <Image
                                src={previewUrl}
                                alt="Preview"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white font-medium flex items-center gap-2">
                                    <Upload className="w-5 h-5" />
                                    تغيير الصورة
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    setPreviewUrl(null);
                                }}
                                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-sand flex items-center justify-center mx-auto text-gold mb-2 group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-ink font-medium">اضغط للرفع أو اسحب الصورة هنا</p>
                                <p className="text-ink/40 text-sm mt-1">PNG, JPG حتى 5 ميجابايت</p>
                            </div>
                        </div>
                    )}
                </div>
                {error && !file && <p className="text-red-500 text-xs px-2">{error}</p>}
            </div>

            {/* ─── Details Form ─── */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-ink/5 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 text-ink mb-2">
                        <h2 className="text-xl font-bold">تفاصيل العمل</h2>
                    </div>

                    <div>
                        <label className="block text-sm text-ink/60 mb-1.5">عنوان العمل *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-sand/20 border border-ink/10 rounded-xl px-4 py-3 text-ink focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                            placeholder="مثال: غروب في الصحراء"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-ink/60 mb-1.5">الفئة *</label>
                        <select
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="w-full bg-sand/20 border border-ink/10 rounded-xl px-4 py-3 text-ink focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors appearance-none"
                        >
                            <option value="">اختر الفئة...</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name_ar}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-ink/60 mb-1.5">الوصف</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-32 bg-sand/20 border border-ink/10 rounded-xl px-4 py-3 text-ink focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors resize-none"
                            placeholder="قصة العمل الفني، التقنيات المستخدمة..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-ink/60 mb-1.5">الكلمات المفتاحية</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            className="w-full bg-sand/20 border border-ink/10 rounded-xl px-4 py-3 text-ink focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                            placeholder="طبيعة, تجريدي, ألوان زيتية (افصل بفاصلة)"
                        />
                    </div>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-500 text-sm rounded-xl">{error}</div>}

                <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-gold w-full py-4 text-base font-bold shadow-lg shadow-gold/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            جاري الرفع والنشر...
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            نشر العمل الفني
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
