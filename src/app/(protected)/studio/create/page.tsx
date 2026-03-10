"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

export default function CreatePage() {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);

        // TODO: Call Server Action here
        setTimeout(() => {
            setGeneratedImage("https://images.unsplash.com/photo-1633511090164-b43840ea1607?w=800&q=80");
            setIsGenerating(false);
        }, 3000);
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8">
            {/* Input Section */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                <div className="bg-theme-surface p-6 rounded-2xl border border-theme-soft shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Wand2 className="w-5 h-5 text-gold" />
                        <h2 className="text-xl font-bold">وصف العمل الفني</h2>
                    </div>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="صف ما تتخيله بدقة... مثال: منظر طبيعي سريالي يجمع بين الصحراء والمحيط بأسلوب فان جوخ"
                        className="w-full h-40 p-4 rounded-xl bg-sand/20 border border-ink/10 focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none transition-all placeholder:text-ink/30"
                    />
                    <div className="flex justify-end mt-2">
                        <span className="text-xs text-ink/40">{prompt.length} / 500</span>
                    </div>
                </div>

                <div className="bg-theme-surface p-6 rounded-2xl border border-theme-soft shadow-sm">
                    <h3 className="font-bold mb-4">الإعدادات</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-ink/60 block mb-2">النمط الفني</label>
                            <select className="w-full p-3 rounded-xl bg-sand/20 border border-ink/10 outline-none">
                                <option>واقعي (Realistic)</option>
                                <option>زيتي (Oil Painting)</option>
                                <option>رقمي (Digital Art)</option>
                                <option>ثلاثي الأبعاد (3D Render)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-ink/60 block mb-2">الأبعاد</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button className="p-2 border border-ink/10 rounded-lg hover:bg-gold/10 hover:border-gold transition-colors text-sm">1:1</button>
                                <button className="p-2 border border-ink/10 rounded-lg hover:bg-gold/10 hover:border-gold transition-colors text-sm">16:9</button>
                                <button className="p-2 border border-ink/10 rounded-lg hover:bg-gold/10 hover:border-gold transition-colors text-sm">9:16</button>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!prompt || isGenerating}
                    className="btn-gold w-full py-4 text-lg font-bold shadow-lg shadow-gold/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            جاري التخيل...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-6 h-6" />
                            توليد الآن
                        </>
                    )}
                </button>
            </div>

            {/* Result Section */}
            <div className="flex-1 bg-theme-surface rounded-3xl border border-theme-soft shadow-inner flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-grid-ink/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />

                {generatedImage ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full h-full max-w-[90%] max-h-[90%] rounded-xl overflow-hidden shadow-2xl"
                    >
                        <Image
                            src={generatedImage}
                            alt="Generated Art"
                            fill
                            className="object-contain"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex gap-2 justify-center">
                                <button className="btn-gold py-2 px-4 text-sm scale-90">حفظ في المعرض</button>
                                <button className="bg-theme-soft backdrop-blur-md text-theme py-2 px-4 rounded-lg text-sm hover:bg-theme-subtle-hover transition-colors">تحميل</button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="text-center text-theme-subtle flex flex-col items-center gap-4">
                        <ImageIcon className="w-16 h-16" />
                        <p className="text-lg">مساحة الإبداع فارغة... ابدأ بكتابة وصفك</p>
                    </div>
                )}
            </div>
        </div>
    );
}
