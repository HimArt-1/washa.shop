"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, Plus, Minus, Send, CheckCircle2, Ticket } from "lucide-react";
import { submitSupportTicket } from "@/app/actions/support";

const FAQ_DATA = [
    {
        q: "كم تستغرق مدة تنفيذ الطلبات الخاصة (صمم قطعتك)؟",
        a: "تختلف مدة التنفيذ باختلاف تعقيد التصميم والنمط المختار. عادةً تتراوح بين 3 إلى 7 أيام عمل لبدء التنفيذ، ويتم تحديثك بكل خطوة عبر المحادثة المباشرة."
    },
    {
        q: "هل يمكنني تعديل التصميم بعد الإرسال؟",
        a: "بمجرد إرسال طلب (صمم قطعتك)، يتواصل معك فريقنا لتأكيد المبدأ. يمكنك طلب التعديلات في تلك المرحلة قبل اعتماد القطعة للطباعة النهائية."
    },
    {
        q: "ما هي سياسة الاسترجاع أو الاستبدال؟",
        a: "نحرص في وشّى على جودة قطعنا. المنتجات الجاهزة يمكن استبدالها خلال 7 أيام إذا كانت بحالتها الأصلية. أما القطع المصممة خصيصاً (صمم قطعتك) فلا يمكن استرجاعها نظراً لكونها صُنعت خصيصاً لك."
    },
    {
        q: "هل توفرون خدمة الشحن لدول الخليج؟",
        a: "نعم، نوفر خدمة الشحن لمعظم دول الخليج. ستظهر لك تكلفة الشحن النهائية في صفحة الدفع بناءً على دولتك."
    }
];

export function SupportClient() {
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
    const [status, setStatus] = useState<{ loading: boolean; success: boolean; error: string }>({ loading: false, success: false, error: "" });

    const openGeneralChat = () => {
        document.body.classList.add("reamaze-active");
        const reamazeWidget = document.querySelector("[data-reamaze-widget], [data-reamaze-lightbox]") as HTMLElement;
        if (reamazeWidget) reamazeWidget.click();
    };

    const handleTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({ loading: true, success: false, error: "" });
        
        const res = await submitSupportTicket(form);
        if (res.success) {
            setStatus({ loading: false, success: true, error: "" });
            setForm({ name: "", email: "", subject: "", message: "" });
            setTimeout(() => setStatus(prev => ({ ...prev, success: false })), 5000);
        } else {
            setStatus({ loading: false, success: false, error: res.error || "حدث خطأ" });
        }
    };

    return (
        <div className="min-h-screen px-4 pt-24 pb-16 sm:pt-28 sm:pb-20">
            <div className="mx-auto max-w-6xl space-y-12 sm:space-y-16">

                {/* --- HEADER & DIRECT CHAT --- */}
                <section className="theme-surface-panel space-y-6 rounded-[2rem] px-6 py-10 text-center sm:px-10">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block p-4 rounded-full bg-gold/10 text-gold mb-2">
                        <MessageSquareText className="w-10 h-10" />
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-bold text-theme">
                        كيف نقدر <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-gold-light">نساعدك؟</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-theme-subtle max-w-xl mx-auto text-lg leading-relaxed">
                        سواءً كان عندك استفسار عن طلبك، أو تبغى تصمم قطعتك الخاصة، نحن هنا لخدمتك دائماً.
                    </motion.p>

                    <div className="grid gap-3 text-right sm:grid-cols-3">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-4">
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">LIVE HELP</p>
                            <p className="mt-2 text-sm font-bold text-theme">محادثة فورية</p>
                            <p className="mt-1 text-xs leading-6 text-theme-subtle">للاستفسارات السريعة ومتابعة الحالات الحالية.</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-4">
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">SUPPORT TICKET</p>
                            <p className="mt-2 text-sm font-bold text-theme">تذكرة رسمية</p>
                            <p className="mt-1 text-xs leading-6 text-theme-subtle">للمشكلات التي تحتاج متابعة ورسائل موثقة.</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-4">
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">RESPONSE TIME</p>
                            <p className="mt-2 text-sm font-bold text-theme">خلال وقت العمل</p>
                            <p className="mt-1 text-xs leading-6 text-theme-subtle">عادةً خلال دقائق للمحادثة، وقريبًا للتذاكر.</p>
                        </div>
                    </div>
                    
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="pt-2">
                        <button
                            onClick={openGeneralChat}
                            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-[var(--wusha-bg)] font-bold rounded-full overflow-hidden hover:shadow-xl hover:shadow-gold/20 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            <MessageSquareText className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">محادثة فورية مع الفريق</span>
                        </button>
                        <p className="text-xs text-theme-faint mt-4">الرد خلال دقائق في أوقات العمل الرسمية.</p>
                    </motion.div>
                </section>

                <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                    
                    {/* --- FAQ SECTION --- */}
                    <div className="space-y-8 lg:col-span-7">
                        <div>
                            <h2 className="text-2xl font-bold text-theme mb-2">الأسئلة الشائعة</h2>
                            <p className="text-theme-subtle text-sm">أبرز الاستفسارات التي تصلنا من عملائنا.</p>
                        </div>
                        <div className="space-y-3">
                            {FAQ_DATA.map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <motion.div
                                        key={index}
                                        initial={false}
                                        className={`theme-surface-panel rounded-2xl transition-colors duration-300 ${isOpen ? "border-gold/30 bg-gold/5" : "hover:border-theme-subtle"}`}
                                    >
                                        <button
                                            onClick={() => setOpenFaq(isOpen ? null : index)}
                                            className="w-full flex items-center justify-between p-5 text-right outline-none"
                                        >
                                            <span className={`font-bold text-sm ${isOpen ? "text-gold" : "text-theme"}`}>{faq.q}</span>
                                            {isOpen ? <Minus className="w-5 h-5 text-gold shrink-0" /> : <Plus className="w-5 h-5 text-theme-faint shrink-0" />}
                                        </button>
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-5 pb-5 pt-2 text-sm text-theme-subtle leading-loose border-t border-gold/10">
                                                        {faq.a}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* --- TICKET FORM SECTION --- */}
                    <div className="lg:col-span-5">
                        <div className="theme-surface-panel rounded-3xl p-6 sm:p-8 xl:sticky xl:top-32">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 rounded-xl bg-theme-subtle text-theme">
                                    <Ticket className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-theme">رفع تذكرة دعم</h3>
                                    <p className="text-xs text-theme-subtle">للاستفسارات العامة والمتابعة</p>
                                </div>
                            </div>

                            {status.success ? (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center rounded-2xl bg-green-500/10 border border-green-500/20">
                                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                                    <p className="font-bold text-green-400 mb-2">تم استلام تذكرتك بنجاح!</p>
                                    <p className="text-sm text-green-400/80 px-4">سيتواصل معك فريقنا قريباً عبر البريد الإلكتروني.</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleTicketSubmit} className="space-y-4">
                                    {status.error && (
                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs text-center font-medium">
                                            {status.error}
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-theme-subtle">الاسم الكريم</label>
                                        <input
                                            required
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                                            placeholder="اكتب اسمك"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-theme-subtle">البريد الإلكتروني</label>
                                        <input
                                            required
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                                            placeholder="user@example.com"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-theme-subtle">موضوع التذكرة</label>
                                        <input
                                            required
                                            type="text"
                                            value={form.subject}
                                            onChange={e => setForm({ ...form, subject: e.target.value })}
                                            className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                                            placeholder="مثال: استفسار عن شحنة، مساعدة تقنية..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-theme-subtle">تفاصيل الاستفسار</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={form.message}
                                            onChange={e => setForm({ ...form, message: e.target.value })}
                                            className="input-dark w-full px-4 py-3 rounded-xl text-sm resize-none"
                                            placeholder="اكتب تفاصيل مشكلتك أو استفسارك هنا بكل وضوح..."
                                        />
                                    </div>
                                    <button
                                        disabled={status.loading}
                                        className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-gold to-gold-light text-[var(--wusha-bg)] font-bold text-sm hover:shadow-xl hover:shadow-gold/20 transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
                                    >
                                        {status.loading ? (
                                            <div className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                إرسال التذكرة
                                                <Send className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
