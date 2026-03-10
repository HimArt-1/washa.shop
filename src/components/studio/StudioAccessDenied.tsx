"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Palette, Sparkles, ArrowLeft, Star, ChevronLeft } from "lucide-react";

interface StudioAccessDeniedProps {
    showJoinArtist?: boolean;
}

export function StudioAccessDenied({ showJoinArtist = true }: StudioAccessDeniedProps) {
    return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-16" dir="rtl">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gold/[0.02] rounded-full blur-[100px]" />
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(206,174,127,0.4) 1px, transparent 0)`,
                        backgroundSize: "32px 32px",
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-xl w-full"
            >
                <div className="rounded-3xl border border-theme-subtle bg-surface/60 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl shadow-black/40">
                    {/* أيقونة */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center mx-auto mb-8"
                    >
                        <Palette className="w-10 h-10 text-gold" />
                    </motion.div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-theme text-center mb-3">
                        الاستوديو مخصّص للوشّاي
                    </h1>
                    <p className="text-theme-subtle text-base sm:text-lg leading-relaxed text-center mb-8 max-w-md mx-auto">
                        لوحة التحكم، رفع الأعمال، وإدارة المنتجات متاحة للفنانين المعتمدين فقط.
                        {showJoinArtist && " انضم كفنان وشّاي لفتح الاستوديو وبدء البيع."}
                    </p>

                    {/* بطاقة CTA — انضم كفنان (عند التفعيل) */}
                    {showJoinArtist && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Link href="/join" className="block group">
                                <div className="rounded-2xl border border-gold/20 bg-gradient-to-l from-gold/[0.08] via-gold/[0.04] to-transparent p-6 hover:border-gold/40 transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(206,174,127,0.08)]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                                                <Star className="w-7 h-7 text-gold" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-theme text-lg">انضم كفنان وشّاي</h3>
                                                <p className="text-theme-subtle text-sm mt-0.5">
                                                    قدّم طلبك وابدأ بعرض أعمالك وبيعها
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronLeft className="w-5 h-5 text-gold/40 group-hover:text-gold group-hover:-translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    )}

                    {/* أزرار إضافية */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8"
                    >
                        <Link
                            href="/design"
                            className="inline-flex items-center gap-2 px-6 py-3 text-theme-soft hover:text-gold border border-theme-soft hover:border-gold/20 rounded-xl transition-all text-sm font-medium"
                        >
                            <Sparkles className="w-4 h-4" />
                            صمّم قطعتك بالذكاء الاصطناعي
                        </Link>
                        <Link
                            href="/account"
                            className="inline-flex items-center gap-2 px-6 py-3 text-theme-subtle hover:text-theme-soft transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            العودة لحسابي
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
