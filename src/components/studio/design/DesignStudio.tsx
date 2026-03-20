"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Shirt, Frame, Palette, CheckCircle2, ShoppingBag, ChevronRight, Loader2 } from "lucide-react";
import { createProduct } from "@/app/actions/products";
import { useRouter } from "next/navigation";

interface Artwork {
    id: string;
    title: string;
    image_url: string;
}

const PRODUCT_TYPES = [
    { id: "apparel", label: "تيشيرت / هودي", icon: Shirt, basePrice: 120 },
    { id: "print", label: "لوحات جدارية", icon: Frame, basePrice: 250 },
    { id: "digital", label: "نسخة رقمية", icon: Palette, basePrice: 500 },
];

export function DesignStudio({ artworks }: { artworks: Artwork[] }) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
    const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
    const [markup, setMarkup] = useState(20); // percent profit
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState("");

    const finalPrice = Math.round(productType.basePrice * (1 + markup / 100));
    const profit = finalPrice - productType.basePrice;
    const stepCardBase = "p-6 rounded-[1.75rem] border transition-all duration-300 theme-surface-panel";

    const handlePublish = async () => {
        if (!selectedArtwork) return;

        setIsPublishing(true);
        setError("");

        try {
            const result = await createProduct({
                artwork_id: selectedArtwork.id,
                title: `${selectedArtwork.title} - ${productType.label}`,
                description: `تصميم حصري من عمل فني أصلي: ${selectedArtwork.title}`,
                type: productType.id,
                price: finalPrice,
                image_url: selectedArtwork.image_url, // Ideally, this would be the generated mockup
                sizes: productType.id === "apparel" ? ["S", "M", "L", "XL"] : ["Standard"],
            });

            if (result.success) {
                setStep(3);
            } else {
                setError(result.error || "فشل في نشر المنتج");
            }
        } catch (err) {
            console.error(err);
            setError("حدث خطأ غير متوقع");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
            {/* ─── Sidebar / Controls ─── */}
            <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">

                {/* Step 1: Select Artwork */}
                <div className={`${stepCardBase} ${step === 1 ? "border-gold shadow-lg ring-1 ring-gold/20" : "opacity-70 border-theme-strong"}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-theme-strong">
                            <span className="w-6 h-6 rounded-full bg-gold text-theme flex items-center justify-center text-xs">1</span>
                            اختر العمل الفني
                        </h3>
                        {step > 1 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    </div>

                    {step === 1 && (
                        <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                            {artworks.map((art) => (
                                <button
                                    key={art.id}
                                    onClick={() => setSelectedArtwork(art)}
                                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedArtwork?.id === art.id ? "border-gold scale-95" : "border-transparent hover:border-gold/30"}`}
                                >
                                    <Image src={art.image_url} alt={art.title} fill className="object-cover" />
                                    {selectedArtwork?.id === art.id && (
                                        <div className="absolute inset-0 bg-gold/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-8 h-8 text-theme drop-shadow-md" />
                                        </div>
                                    )}
                                </button>
                            ))}
                            {artworks.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-theme-faint text-sm">
                                    لا توجد أعمال فنية. <a href="/studio/artworks/upload" className="underline text-gold">ارفع عمل جديد</a>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 1 && selectedArtwork && (
                        <button
                            onClick={() => setStep(2)}
                            className="btn-gold w-full mt-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
                        >
                            التالي: تخصيص المنتج
                            <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                    )}

                    {step > 1 && selectedArtwork && (
                        <div className="flex items-center gap-3 bg-theme-faint p-2 rounded-lg mt-2 border border-theme-strong/10">
                            <div className="w-10 h-10 relative rounded-md overflow-hidden">
                                <Image src={selectedArtwork.image_url} alt="" fill className="object-cover" />
                            </div>
                            <span className="text-sm font-medium truncate flex-1 text-theme">{selectedArtwork.title}</span>
                            <button onClick={() => setStep(1)} className="text-xs text-gold underline">تغيير</button>
                        </div>
                    )}
                </div>

                {/* Step 2: Configure Product */}
                <div className={`${stepCardBase} ${step === 2 ? "border-gold shadow-lg ring-1 ring-gold/20" : "opacity-70 border-theme-strong"}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-theme-strong">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? "bg-gold text-theme" : "bg-theme-faint text-theme-faint"}`}>2</span>
                            تخصيص المنتج
                        </h3>
                        {step > 2 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    </div>

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-theme-subtle uppercase mb-2 block">نوع المنتج</label>
                                <div className="flex flex-col gap-2">
                                    {PRODUCT_TYPES.map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setProductType(type)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${productType.id === type.id ? "border-gold bg-gold/5" : "border-theme-strong/10 bg-theme-faint hover:border-gold/30"}`}
                                        >
                                            <div className={`p-2 rounded-lg ${productType.id === type.id ? "bg-gold text-theme" : "bg-theme-faint text-theme-subtle"}`}>
                                                <type.icon className="w-5 h-5" />
                                            </div>
                                            <div className="text-right flex-1">
                                                <div className="text-sm font-bold text-theme">{type.label}</div>
                                                <div className="text-xs text-theme-faint">تبدأ من {type.basePrice} ر.س</div>
                                            </div>
                                            {productType.id === type.id && <CheckCircle2 className="w-5 h-5 text-gold" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-theme-subtle uppercase mb-2 block">هامش الربح (%)</label>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    step="5"
                                    value={markup}
                                    onChange={(e) => setMarkup(Number(e.target.value))}
                                    className="w-full accent-gold h-2 bg-theme-faint rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between items-center mt-2 text-sm">
                                    <span className="text-theme-subtle">{markup}%</span>
                                    <span className="font-bold text-gold">ربحك: {profit} ر.س</span>
                                </div>
                            </div>

                            <div className="bg-theme-faint p-4 rounded-xl space-y-2 text-sm border border-theme-strong/10">
                                <div className="flex justify-between">
                                    <span className="text-theme-subtle">التكلفة الأساسية</span>
                                    <span className="text-theme">{productType.basePrice} ر.س</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-2 border-t border-theme-strong/10">
                                    <span className="text-theme">سعر البيع النهائي</span>
                                    <span className="text-gold">{finalPrice} ر.س</span>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                            <button
                                onClick={handlePublish}
                                disabled={isPublishing}
                                className="btn-gold w-full py-4 text-base font-bold shadow-lg shadow-gold/20 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isPublishing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        جاري النشر...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingBag className="w-5 h-5" />
                                        نشر المنتج في المتجر
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Preview Area ─── */}
            <div className="lg:col-span-8 theme-surface-panel rounded-[2rem] flex items-center justify-center relative overflow-hidden p-8">
                <div className="absolute inset-0 bg-grid-ink/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />

                {step === 3 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6 z-10"
                    >
                        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 mb-4">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-bold text-theme">تم نشر المنتج بنجاح! 🎉</h2>
                        <p className="text-theme-subtle max-w-md mx-auto">منتجك الآن متاح في المتجر ويمكن للمستخدمين شراؤه. ستصلك إشعارات عند حدوث مبيعات.</p>
                        <div className="flex gap-4 justify-center mt-8">
                            <button onClick={() => router.push("/store")} className="btn-gold px-8 py-3">عرض المنتج في المتجر</button>
                            <button onClick={() => { setStep(1); setSelectedArtwork(null); }} className="px-8 py-3 border border-theme-strong/10 rounded-xl hover:bg-theme-faint text-theme">تصميم منتج آخر</button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="relative z-10 w-full max-w-lg aspect-square rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center border border-theme-strong/10 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--wusha-gold)_12%,transparent),transparent_42%),linear-gradient(180deg,color-mix(in_srgb,var(--wusha-text)_4%,transparent),color-mix(in_srgb,var(--wusha-text)_2%,transparent))]">
                        {/* Mockup Container */}
                        {selectedArtwork ? (
                            <motion.div
                                layoutId="preview"
                                className="relative w-full h-full"
                            >
                                {/* Product Base Mockup (CSS Shapes for now) */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {productType.id === "apparel" && (
                                        <div className="w-[80%] h-[80%] bg-[color:color-mix(in_srgb,var(--wusha-bg)_90%,black)] mask-image-tshirt flex items-center justify-center opacity-90 shadow-2xl rounded-3xl">
                                            {/* T-Shirt Shape would be an image ideally */}
                                            <div className="text-theme-faint text-9xl">👕</div>
                                        </div>
                                    )}
                                    {/* Artwork Overlay */}
                                    <div className={`relative ${productType.id === "apparel" ? "w-1/2" : "w-full h-full"} aspect-square shadow-lg overflow-hidden ${productType.id === "print" ? "border-8 border-[color:color-mix(in_srgb,var(--wusha-bg)_85%,black)] shadow-2xl bg-[var(--wusha-surface)] p-4" : ""}`}>
                                        <Image
                                            src={selectedArtwork.image_url}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>

                                {/* Live Price Tag */}
                                <div className="absolute bottom-6 right-6 bg-[color:color-mix(in_srgb,var(--wusha-surface)_88%,transparent)] backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-theme-strong/10">
                                    <p className="text-xs text-theme-faint font-bold uppercase">{productType.label}</p>
                                    <p className="text-xl font-bold text-gold">{finalPrice} ر.س</p>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-center text-theme-faint space-y-4">
                                <div className="w-20 h-20 bg-theme-faint rounded-full flex items-center justify-center mx-auto">
                                    <Palette className="w-10 h-10" />
                                </div>
                                <p className="text-lg font-medium text-theme">اختر عملاً فنياً لبدء التصميم</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
