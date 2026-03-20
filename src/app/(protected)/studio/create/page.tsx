"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Wand2, Image as ImageIcon, ArrowRight, Palette, Upload } from "lucide-react";

export default function CreatePage() {
    const [prompt, setPrompt] = useState("");

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
                        placeholder="دوّن فكرتك هنا كمذكرة إبداعية، ثم انتقل إلى أدوات وشّى الفعلية لتنفيذها."
                        className="w-full h-40 p-4 rounded-xl bg-sand/20 border border-ink/10 focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none transition-all placeholder:text-ink/30"
                    />
                    <div className="flex justify-end mt-2">
                        <span className="text-xs text-ink/40">{prompt.length} / 500</span>
                    </div>
                </div>

                <div className="theme-surface-panel p-6 rounded-2xl space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] font-bold tracking-[0.24em] text-gold">
                        <Sparkles className="w-3.5 h-3.5" />
                        CONCEPT LAB
                    </div>
                    <div>
                        <h3 className="font-bold text-theme mb-2">هذه المساحة قيد التطوير</h3>
                        <p className="text-sm leading-7 text-theme-subtle">
                            واجهة التوليد المباشر من النص لم تُربط بعد بمحرك إنتاجي. أبقينا الصفحة كمختبر أفكار فقط
                            حتى لا نظهر لك نتيجة وهمية أو سلوكًا غير جاهز.
                        </p>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                        <div className="flex items-start gap-3">
                            <Palette className="mt-0.5 h-4 w-4 text-gold" />
                            <div>
                                <p className="text-sm font-semibold text-theme">البديل الجاهز الآن</p>
                                <p className="text-xs leading-6 text-theme-subtle">
                                    استخدم أدوات التصميم الحالية أو ارفع أعمالك إلى الاستوديو، ثم نكمل ربط هذا المختبر
                                    بمحرك توليد فعلي لاحقًا.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3">
                    <Link
                        href="/design"
                        className="btn-gold w-full py-4 text-lg font-bold shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-5 h-5" />
                        الانتقال إلى تصميم قطعتك
                    </Link>
                    <Link
                        href="/studio/artworks/upload"
                        className="w-full rounded-2xl border border-theme-soft bg-theme-surface px-5 py-3.5 text-sm font-semibold text-theme transition-colors hover:border-gold/30 hover:bg-theme-subtle"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Upload className="h-4 w-4 text-gold" />
                            رفع عمل فني إلى الاستوديو
                        </span>
                    </Link>
                </div>
            </div>

            {/* Result Section */}
            <div className="flex-1 bg-theme-surface rounded-3xl border border-theme-soft shadow-inner flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-grid-ink/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex h-full w-full max-w-[92%] max-h-[92%] items-center justify-center"
                >
                    <div className="w-full max-w-2xl rounded-[2rem] border border-theme-subtle bg-[radial-gradient(circle_at_top,rgba(202,160,82,0.14),transparent_52%),var(--wusha-surface)] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.08)]">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-theme-subtle">
                            <ImageIcon className="h-3.5 w-3.5 text-gold" />
                            GENERATIVE STUDIO ROADMAP
                        </div>
                        <h3 className="text-2xl font-bold text-theme">مختبر التوليد سيعود عندما يكون جاهزًا فعلًا</h3>
                        <p className="mt-4 text-sm leading-8 text-theme-subtle">
                            بدل عرض صورة ثابتة توهم المستخدم بأن التوليد يعمل، أصبحت هذه الصفحة تعلن الحالة الحقيقية:
                            الفكرة محفوظة، لكن محرك الإنتاج لم يُفعّل بعد.
                        </p>
                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-sm font-semibold text-theme">تصميم حسب الطلب</p>
                                <p className="mt-2 text-xs leading-6 text-theme-subtle">
                                    انتقل إلى تدفق تصميم القطعة الفعلي لتخصيص المنتج ومتابعة الطلب والحوار.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-sm font-semibold text-theme">بناء مكتبة أعمالك</p>
                                <p className="mt-2 text-xs leading-6 text-theme-subtle">
                                    ارفع أعمالك إلى الاستوديو، ثم سنربط المختبر لاحقًا بمحرك يولد ويصنف ويعرض النتائج.
                                </p>
                            </div>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/design"
                                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 text-sm font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold-light"
                            >
                                ابدأ من التدفق الجاهز
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/studio"
                                className="inline-flex items-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-5 py-3 text-sm font-semibold text-theme transition-colors hover:border-gold/30 hover:bg-theme-subtle"
                            >
                                العودة إلى الاستوديو
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
