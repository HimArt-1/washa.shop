"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, Download, Mail, Loader2 } from "lucide-react";
import { deleteSubscriber } from "@/app/actions/settings";
import { useRouter } from "next/navigation";

interface Subscriber {
    id: string;
    email: string;
    subscribed_at: string;
    is_active: boolean;
}

export function NewsletterClient({ subscribers: initial }: { subscribers: Subscriber[] }) {
    const [subscribers, setSubscribers] = useState(initial);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const router = useRouter();

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("حذف هذا المشترك؟")) return;
        setDeleting(id);
        const result = await deleteSubscriber(id);
        setDeleting(null);
        if (result.success) {
            setSubscribers((prev) => prev.filter((s) => s.id !== id));
            showToast("تم الحذف ✓");
        } else {
            showToast("خطأ: " + result.error);
        }
    };

    const handleExportCSV = () => {
        const csv = "Email,Subscribed At\n" + subscribers.map((s) =>
            `${s.email},${new Date(s.subscribed_at).toISOString()}`
        ).join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wusha-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("تم تصدير الملف ✓");
    };

    return (
        <div className="space-y-4 max-w-3xl">
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-gold text-bg font-bold text-sm shadow-lg"
                >
                    {toast}
                </motion.div>
            )}

            {/* Header Stats */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gold/10">
                        <Mail className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-fg">{subscribers.length}</div>
                        <div className="text-xs text-fg/30">مشترك في النشرة البريدية</div>
                    </div>
                </div>
                <button
                    onClick={handleExportCSV}
                    disabled={subscribers.length === 0}
                    className="btn-gold px-5 py-2.5 text-sm rounded-xl flex items-center gap-2 disabled:opacity-30"
                >
                    <Download className="w-4 h-4" />
                    تصدير CSV
                </button>
            </div>

            {/* Subscribers List */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden divide-y divide-white/[0.04]">
                {subscribers.length === 0 ? (
                    <div className="p-12 text-center text-fg/20 text-sm">لا يوجد مشتركون بعد</div>
                ) : (
                    subscribers.map((sub, i) => (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                                    <Mail className="w-3.5 h-3.5 text-gold/60" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm text-fg/70 truncate" dir="ltr">{sub.email}</div>
                                    <div className="text-[10px] text-fg/20" dir="ltr">
                                        {new Date(sub.subscribed_at).toLocaleDateString("ar-SA", {
                                            year: "numeric", month: "short", day: "numeric",
                                        })}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(sub.id)}
                                disabled={deleting === sub.id}
                                className="p-2 text-fg/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 shrink-0"
                            >
                                {deleting === sub.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
