"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { createSupportTicket } from "@/app/actions/support-tickets";
import { SupportTicketPriority } from "@/types/database";

export function SupportDashboardClient({ initialTickets }: { initialTickets: any[] }) {
    const router = useRouter();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [priority, setPriority] = useState<SupportTicketPriority>("normal");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const getStatusInfo = (status: string) => {
        switch (status) {
            case "open": return { label: "مفتوحة", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" };
            case "in_progress": return { label: "جاري المعالجة", icon: Clock, color: "text-gold", bg: "bg-gold/10 border-gold/20" };
            case "resolved": return { label: "تم الحل", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" };
            case "closed": return { label: "مغلقة", icon: X, color: "text-theme-subtle", bg: "bg-theme-subtle border-theme-soft" };
            default: return { label: status, icon: MessageSquare, color: "text-theme-soft", bg: "bg-theme-subtle border-theme-soft" };
        }
    };

    const getPriorityInfo = (prio: string) => {
        switch (prio) {
            case "high": return { label: "عالية", color: "text-red-400" };
            case "normal": return { label: "عادية", color: "text-theme-soft" };
            case "low": return { label: "منخفضة", color: "text-theme-subtle" };
            default: return { label: prio, color: "text-theme-soft" };
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setIsSubmitting(true);

        try {
            const res = await createSupportTicket({ subject, message, priority });

            if (!res.success) {
                setErrorMsg(res.error || "حدث خطأ ما.");
                return;
            }

            setSubject("");
            setMessage("");
            setPriority("normal");
            setIsCreateModalOpen(false);
            router.refresh();
        } catch (error) {
            setErrorMsg(error instanceof Error ? error.message : "تعذر إنشاء التذكرة الآن.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="theme-surface-panel rounded-[2rem] p-6 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">SUPPORT DESK</p>
                        <h3 className="mt-2 text-lg font-bold text-theme">تذاكر الدعم</h3>
                        <p className="mt-1 text-sm text-theme-subtle">تابع حالة تذاكرك الحالية أو افتح تذكرة جديدة</p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-center">
                            <p className="text-[11px] font-bold tracking-[0.18em] text-theme-faint">OPEN THREADS</p>
                            <p className="mt-1 text-lg font-bold text-theme">{initialTickets.length}</p>
                        </div>
                        <motion.button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-gold flex min-h-[46px] items-center justify-center gap-2 px-5 py-2.5 text-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Plus className="w-4 h-4" />
                            <span>تذكرة جديدة</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {initialTickets.length === 0 ? (
                <div className="theme-surface-panel flex flex-col items-center justify-center rounded-[2rem] px-4 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-theme-subtle flex items-center justify-center mb-6 border border-theme-subtle">
                        <MessageSquare className="w-8 h-8 text-theme-faint" />
                    </div>
                    <h3 className="text-xl font-bold text-theme mb-2">لا توجد رسائل دعم</h3>
                    <p className="text-theme-subtle max-w-sm mb-6">لم تقم بإنشاء أي تذاكر دعم حتى الآن. إذا احتجت لأي مساعدة، نحن هنا بخدمتك.</p>
                    <motion.button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-gold font-medium hover:text-theme transition-colors flex items-center gap-2"
                        whileHover={{ x: -4 }}
                    >
                        <span>إنشاء تذكرة دعم</span>
                        <Plus className="w-4 h-4" />
                    </motion.button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {initialTickets.map((ticket, i) => {
                        const status = getStatusInfo(ticket.status);
                        const prio = getPriorityInfo(ticket.priority);
                        return (
                            <Link key={ticket.id} href={`/account/support/${ticket.id}`}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group cursor-pointer rounded-[1.75rem] border border-theme-subtle bg-theme-faint p-5 transition-all duration-300 hover:border-gold/30 hover:bg-theme-subtle sm:p-6"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-2 flex flex-wrap items-center gap-3">
                                                <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${status.bg} ${status.color}`}>
                                                    <status.icon className="w-3 h-3" />
                                                    <span>{status.label}</span>
                                                </div>
                                                <span className="text-theme-subtle text-xs">#{ticket.id.slice(0, 8)}</span>
                                            </div>
                                            <h4 className="line-clamp-2 text-base font-bold text-theme transition-colors group-hover:text-gold sm:line-clamp-1 sm:text-lg">
                                                {ticket.subject}
                                            </h4>
                                        </div>

                                        <div className="shrink-0 rounded-2xl border border-theme-subtle bg-theme-surface px-4 py-3">
                                            <div className="grid grid-cols-2 gap-4 sm:min-w-[220px]">
                                                <div className="flex flex-col gap-1 items-start sm:items-end">
                                                    <span className="text-xs text-theme-subtle">الأهمية</span>
                                                    <span className={`text-sm font-medium ${prio.color}`}>{prio.label}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 items-start sm:items-end">
                                                    <span className="text-xs text-theme-subtle">آخر تحديث</span>
                                                    <span className="text-sm text-theme-strong font-medium">
                                                        {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Create Ticket Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="theme-surface-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl"
                        >
                            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-theme">إنشاء تذكرة دعم</h3>
                                    <button
                                        onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
                                        className="rounded-full bg-theme-subtle p-2 text-theme-subtle transition-colors hover:bg-theme-soft hover:text-theme"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {errorMsg && (
                                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-400">{errorMsg}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-soft">الموضوع</label>
                                        <input
                                            type="text"
                                            required
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            placeholder="بخصوص ماذا تريد التواصل معنا؟"
                                            className="input-dark w-full rounded-xl px-4 py-3 text-theme"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-soft">مستوى الأهمية</label>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            {[
                                                { id: "low", label: "منخفضة" },
                                                { id: "normal", label: "عادية" },
                                                { id: "high", label: "عالية" },
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setPriority(p.id as any)}
                                                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${priority === p.id
                                                            ? "bg-gold/10 border-gold text-gold"
                                                            : "bg-theme-faint border-theme-soft text-theme-soft hover:border-white/20"
                                                        }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-theme-soft">الرسالة</label>
                                        <textarea
                                            required
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            placeholder="اشرح مشكلتك أو استفسارك بالتفصيل..."
                                            rows={5}
                                            className="input-dark w-full resize-none rounded-xl px-4 py-3 text-theme"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !subject.trim() || !message.trim()}
                                            className="flex-1 btn-gold py-3.5 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال التذكرة"}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="rounded-xl border border-theme-soft px-6 py-3.5 text-theme-soft transition-all hover:bg-theme-subtle hover:text-theme disabled:opacity-50"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
