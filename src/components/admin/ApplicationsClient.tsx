"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { reviewApplication } from "@/app/actions/admin";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    XCircle,
    ExternalLink,
    Loader2,
    FileText,
    Instagram,
    Clock,
    Palette,
    Phone,
} from "lucide-react";

interface ApplicationsClientProps {
    applications: any[];
    count: number;
    currentStatus: string;
}

const statuses = [
    { value: "all", label: "الكل" },
    { value: "pending", label: "قيد المراجعة" },
    { value: "reviewing", label: "جاري المراجعة" },
    { value: "accepted", label: "مقبول" },
    { value: "rejected", label: "مرفوض" },
];

export function ApplicationsClient({ applications, count, currentStatus }: ApplicationsClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");

    const navigate = (status: string) => {
        const sp = new URLSearchParams();
        if (status !== "all") sp.set("status", status);
        startTransition(() => {
            router.push(`/dashboard/applications?${sp.toString()}`);
        });
    };

    const handleReview = async (id: string, decision: "accepted" | "rejected") => {
        const label = decision === "accepted" ? "قبول" : "رفض";
        if (!confirm(`هل أنت متأكد من ${label} هذا الطلب؟`)) return;

        setReviewingId(id);
        await reviewApplication(id, decision, reviewNotes || undefined);
        setReviewingId(null);
        setReviewNotes("");
        router.refresh();
    };

    return (
        <div className="space-y-6">
            {/* ─── Status Tabs ─── */}
            <div className="flex gap-1 p-1 bg-surface/50 rounded-xl border border-white/[0.06]">
                {statuses.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => navigate(s.value)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentStatus === s.value
                            ? "bg-gold/10 text-gold"
                            : "text-fg/40 hover:text-fg/60 hover:bg-white/[0.03]"
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ─── Applications Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {applications.map((app, i) => (
                    <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm p-6 hover:border-white/[0.1] transition-all group"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-fg text-lg">{app.full_name}</h3>
                                <p className="text-fg/40 text-sm mt-0.5">{app.email}</p>
                                {app.phone && (
                                    <p className="text-fg/40 text-sm mt-0.5 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span dir="ltr">{app.phone}</span>
                                    </p>
                                )}
                            </div>
                            <StatusBadge status={app.status} type="application" />
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Palette className="w-4 h-4 text-accent/60" />
                                <span className="text-fg/60">{app.art_style}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-fg/30" />
                                <span className="text-fg/40">
                                    {app.experience_years ? `${app.experience_years} سنوات خبرة` : "لم يحدد"}
                                </span>
                            </div>
                            {app.portfolio_url && (
                                <a
                                    href={app.portfolio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>معرض الأعمال</span>
                                </a>
                            )}
                            {app.instagram_url && (
                                <a
                                    href={app.instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
                                >
                                    <Instagram className="w-4 h-4" />
                                    <span>انستقرام</span>
                                </a>
                            )}
                        </div>

                        {/* Motivation */}
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4">
                            <p className="text-fg/50 text-sm leading-relaxed line-clamp-3">{app.motivation}</p>
                        </div>

                        {/* Review Notes */}
                        {app.reviewer_notes && (
                            <div className="p-3 rounded-lg bg-gold/5 border border-gold/10 mb-4">
                                <p className="text-gold/70 text-xs font-medium">ملاحظات المراجع: {app.reviewer_notes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        {app.status === "pending" || app.status === "reviewing" ? (
                            <div className="space-y-3">
                                <textarea
                                    placeholder="ملاحظات المراجع (اختياري)..."
                                    value={reviewingId === app.id ? reviewNotes : ""}
                                    onChange={(e) => {
                                        setReviewingId(app.id);
                                        setReviewNotes(e.target.value);
                                    }}
                                    className="w-full p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-sm text-fg placeholder:text-fg/20 resize-none focus:outline-none focus:border-gold/20 transition-colors"
                                    rows={2}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReview(app.id, "accepted")}
                                        disabled={reviewingId === app.id && !!reviewingId}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-forest/10 text-forest border border-forest/20 rounded-xl text-sm font-bold hover:bg-forest/20 transition-all disabled:opacity-50"
                                    >
                                        {reviewingId === app.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
                                        قبول
                                    </button>
                                    <button
                                        onClick={() => handleReview(app.id, "rejected")}
                                        disabled={reviewingId === app.id && !!reviewingId}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        رفض
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-fg/20 text-xs text-center mt-2">
                                {new Date(app.updated_at || app.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ─── Empty State ─── */}
            {applications.length === 0 && (
                <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-fg/10 mx-auto mb-4" />
                    <p className="text-fg/20 text-lg font-medium">لا توجد طلبات</p>
                    <p className="text-fg/15 text-sm mt-1">ستظهر هنا عندما يتقدم أحد الفنانين للانضمام</p>
                </div>
            )}

            {/* ─── Count ─── */}
            {count > 0 && (
                <p className="text-xs text-fg/30">{count} طلب</p>
            )}
        </div>
    );
}
