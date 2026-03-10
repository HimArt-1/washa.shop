"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    CheckCircle,
    Award,
    Users,
    TrendingUp,
    Loader2,
    AlertCircle,
    X,
    Palette
} from "lucide-react";
import { submitApplication, type ActionResponse } from "@/app/actions/forms";

export function JoinCommunityModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [response, setResponse] = useState<ActionResponse | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setResponse(null);

        const formData = new FormData(e.currentTarget);
        const result = await submitApplication(formData);

        setResponse(result);
        setIsSubmitting(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="glass-card rounded-2xl p-5 sm:p-8 border-gold/10 mx-4 relative overflow-hidden">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-theme-subtle hover:text-theme-strong hover:bg-theme-subtle rounded-full transition-colors z-10"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="absolute top-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px] pointer-events-none" />

                            <h2 className="text-3xl font-bold mb-2">
                                كن جزءاً من <span className="text-gradient">وشّى</span>
                            </h2>
                            <p className="text-theme-subtle text-sm mb-6 max-w-lg">
                                نبحث عن فنانين موهوبين يشاركوننا رؤيتنا في تشكيل مستقبل الفن العربي الرقمي
                            </p>

                            <AnimatePresence mode="wait">
                                {response?.success ? (
                                    <motion.div
                                        key="success"
                                        className="text-center py-12"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <motion.div
                                            className="w-20 h-20 rounded-full bg-forest/20 flex items-center justify-center mx-auto mb-6"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                        >
                                            <CheckCircle className="w-10 h-10 text-forest" />
                                        </motion.div>
                                        <h3 className="text-2xl font-bold mb-3 text-theme-strong">تم إرسال طلبك بنجاح!</h3>
                                        <p className="text-theme-subtle mb-6">
                                            {response.message}
                                        </p>
                                        <button
                                            onClick={onClose}
                                            className="btn-gold py-2 px-6 rounded-full text-sm"
                                        >
                                            إغلاق
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        onSubmit={handleSubmit}
                                        className="space-y-5 relative z-10"
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        {response && !response.success && (
                                            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg flex items-start gap-2 text-sm border border-red-500/20">
                                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold">{response.message}</p>
                                                    {response.errors && (
                                                        <ul className="list-disc list-inside mt-1">
                                                            {Object.values(response.errors).flat().map((err, i) => (
                                                                <li key={i}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                الاسم الكامل
                                            </label>
                                            <input
                                                name="full_name"
                                                type="text"
                                                required
                                                className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong placeholder:text-theme-faint"
                                                placeholder="اسمك الكامل"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                البريد الإلكتروني
                                            </label>
                                            <input
                                                name="email"
                                                type="email"
                                                required
                                                className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong placeholder:text-theme-faint"
                                                placeholder="email@example.com"
                                                dir="ltr"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                رقم الهاتف
                                            </label>
                                            <input
                                                name="phone"
                                                type="tel"
                                                className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong placeholder:text-theme-faint"
                                                placeholder="+966..."
                                                dir="ltr"
                                            />
                                        </div>

                                        {/* Specialty */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                التخصص الفني
                                            </label>
                                            <select
                                                name="art_style"
                                                required
                                                className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong"
                                            >
                                                <option value="" className="bg-[#111]">اختر تخصصك</option>
                                                <option value="digital" className="bg-[#111]">فن رقمي</option>
                                                <option value="photography" className="bg-[#111]">تصوير فوتوغرافي</option>
                                                <option value="calligraphy" className="bg-[#111]">خط عربي</option>
                                                <option value="traditional" className="bg-[#111]">فن تقليدي</option>
                                                <option value="conceptual" className="bg-[#111]">فن مفاهيمي</option>
                                                <option value="mixed" className="bg-[#111]">وسائط متعددة</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Portfolio URL */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                    رابط البورتفوليو
                                                </label>
                                                <input
                                                    name="portfolio_url"
                                                    type="url"
                                                    className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong placeholder:text-theme-faint"
                                                    placeholder="https://..."
                                                    dir="ltr"
                                                />
                                            </div>
                                            {/* Instagram */}
                                            <div>
                                                <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                    انستقرام
                                                </label>
                                                <input
                                                    name="instagram_url"
                                                    type="text"
                                                    className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong placeholder:text-theme-faint"
                                                    placeholder="@username"
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>

                                        {/* Experience */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                سنوات الخبرة
                                            </label>
                                            <input
                                                name="experience_years"
                                                type="number"
                                                min="0"
                                                className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all text-theme-strong placeholder:text-theme-faint"
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-theme-soft">
                                                لماذا تريد الانضمام؟
                                            </label>
                                            <textarea
                                                name="motivation"
                                                required
                                                rows={4}
                                                className="w-full px-4 py-3 rounded-lg bg-theme-subtle border border-theme-soft focus:border-gold focus:ring-1 focus:ring-gold/30 outline-none transition-all resize-none text-theme-strong placeholder:text-theme-faint"
                                                placeholder="أخبرنا عن نفسك وفنك..."
                                            />
                                        </div>

                                        {/* Submit */}
                                        <motion.button
                                            type="submit"
                                            className="w-full btn-gold py-4 rounded-xl font-bold mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    جاري الإرسال...
                                                </span>
                                            ) : (
                                                "إرسال الطلب"
                                            )}
                                        </motion.button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
