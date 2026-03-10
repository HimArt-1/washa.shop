"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { reviewApplication, acceptApplicationAndCreateUser } from "@/app/actions/admin";
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
    X,
    UserPlus,
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
    const [showAcceptModal, setShowAcceptModal] = useState<string | null>(null);
    const [createClerkOnlyId, setCreateClerkOnlyId] = useState<string | null>(null);

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

    const handleAcceptAndCreate = (id: string) => {
        setShowAcceptModal(id);
    };

    return (
        <div className="space-y-6">
            {/* ─── Status Tabs ─── */}
            <div className="flex gap-1 p-1 bg-surface/50 rounded-xl border border-theme-subtle">
                {statuses.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => navigate(s.value)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentStatus === s.value
                            ? "bg-gold/10 text-gold"
                            : "text-theme-subtle hover:text-theme-soft hover:bg-theme-subtle"
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
                        className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm p-6 hover:border-white/[0.1] transition-all group"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-theme text-lg">{app.full_name}</h3>
                                <p className="text-theme-subtle text-sm mt-0.5">{app.email}</p>
                                {app.phone && (
                                    <p className="text-theme-subtle text-sm mt-0.5 flex items-center gap-1.5">
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
                                <span className="text-theme-soft">{app.art_style}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-theme-faint" />
                                <span className="text-theme-subtle">
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
                        <div className="p-4 rounded-xl bg-theme-faint border border-theme-faint mb-4">
                            <p className="text-theme-subtle text-sm leading-relaxed line-clamp-3">{app.motivation}</p>
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
                                    className="w-full p-3 bg-theme-faint border border-theme-subtle rounded-xl text-sm text-theme placeholder:text-theme-faint resize-none focus:outline-none focus:border-gold/20 transition-colors"
                                    rows={2}
                                />
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAcceptAndCreate(app.id)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-bold hover:bg-gold/20 transition-all"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            قبول وإنشاء مستخدم
                                        </button>
                                        <button
                                            onClick={() => handleReview(app.id, "accepted")}
                                            disabled={reviewingId === app.id}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-forest/10 text-forest border border-forest/20 rounded-xl text-sm font-bold hover:bg-forest/20 transition-all disabled:opacity-50"
                                        >
                                            {reviewingId === app.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            قبول فقط
                                        </button>
                                        <button
                                            onClick={() => handleReview(app.id, "rejected")}
                                            disabled={reviewingId === app.id}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            رفض
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-theme-faint text-xs text-center">
                                    {new Date(app.updated_at || app.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                                </p>
                                {app.status === "accepted" && (
                                    <div className="flex gap-2 justify-center">
                                        {!app.hasProfile && (
                                            <button
                                                onClick={() => handleAcceptAndCreate(app.id)}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-bold hover:bg-gold/20 transition-all"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                إنشاء حساب
                                            </button>
                                        )}
                                        {app.hasProfile && !app.hasClerkAccount && app.email && (
                                            <button
                                                onClick={() => setCreateClerkOnlyId(app.id)}
                                                className="flex items-center gap-2 px-4 py-2.5 bg-forest/10 text-forest border border-forest/20 rounded-xl text-sm font-bold hover:bg-forest/20 transition-all"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                إنشاء حساب في Clerk
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ─── Empty State ─── */}
            {applications.length === 0 && (
                <div className="text-center py-20">
                    <FileText className="w-16 h-16 text-fg/10 mx-auto mb-4" />
                    <p className="text-theme-faint text-lg font-medium">لا توجد طلبات</p>
                    <p className="text-theme-faint text-sm mt-1">ستظهر هنا عندما يتقدم أحد الفنانين للانضمام</p>
                </div>
            )}

            {/* ─── Count ─── */}
            {count > 0 && (
                <p className="text-xs text-theme-faint">{count} طلب</p>
            )}

            {/* ─── Accept & Create User Modal ─── */}
            {showAcceptModal && (
                <AcceptAndCreateModal
                    applicationId={showAcceptModal}
                    application={applications.find((a) => a.id === showAcceptModal)}
                    onClose={() => setShowAcceptModal(null)}
                    onSuccess={() => {
                        setShowAcceptModal(null);
                        router.refresh();
                    }}
                />
            )}

            {/* ─── Create Clerk Only Modal (للمقبولين بدون حساب Clerk) ─── */}
            {createClerkOnlyId && (
                <CreateClerkOnlyModal
                    applicationId={createClerkOnlyId}
                    application={applications.find((a) => a.id === createClerkOnlyId)}
                    onClose={() => setCreateClerkOnlyId(null)}
                    onSuccess={() => {
                        setCreateClerkOnlyId(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}

function CreateClerkOnlyModal({
    applicationId,
    application,
    onClose,
    onSuccess,
}: {
    applicationId: string;
    application: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!application?.email) return;
        setLoading(true);
        setError(null);
        setTempPassword(null);
        const res = await acceptApplicationAndCreateUser(applicationId, {
            createInClerk: true,
        });
        setLoading(false);
        if (res.success) {
            if (res.tempPassword) setTempPassword(res.tempPassword);
            else onSuccess();
        } else {
            setError(res.error || "فشل إنشاء الحساب");
        }
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-theme-soft bg-bg shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle">
                    <h2 className="text-lg font-bold text-theme flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-forest" />
                        إنشاء حساب في Clerk
                    </h2>
                    <button onClick={tempPassword ? onSuccess : onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {tempPassword ? (
                    <div className="p-6 space-y-4">
                        <div className="p-4 rounded-xl bg-forest/10 border border-forest/20 text-forest">
                            <p className="text-sm font-medium mb-2">تم إنشاء الحساب بنجاح ✓</p>
                            <p className="text-xs text-theme-soft mb-3">انسخ كلمة المرور وأرسلها للمستخدم:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-black/30 rounded-lg text-sm font-mono break-all select-all" dir="ltr">
                                    {tempPassword}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                                    className="px-3 py-2 rounded-lg bg-gold/20 text-gold text-xs font-bold hover:bg-gold/30"
                                >
                                    نسخ
                                </button>
                            </div>
                            <p className="text-[10px] text-theme-subtle mt-2">البريد: {application.email}</p>
                        </div>
                        <button type="button" onClick={onSuccess} className="w-full py-2.5 rounded-xl bg-gold/20 text-gold font-bold hover:bg-gold/30">
                            تم
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-theme-soft text-sm">
                            سيتم إنشاء حساب Clerk لـ <strong className="text-theme">{application.full_name}</strong> بالبريد {application.email}
                        </p>
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle">
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-2.5 rounded-xl bg-forest/20 text-forest font-bold hover:bg-forest/30 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                إنشاء
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

function AcceptAndCreateModal({
    applicationId,
    application,
    onClose,
    onSuccess,
}: {
    applicationId: string;
    application: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [role, setRole] = useState<"wushsha" | "subscriber">("wushsha");
    const [wushshaLevel, setWushshaLevel] = useState(1);
    const [clerkId, setClerkId] = useState("");
    const [createInClerk, setCreateInClerk] = useState(true);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setTempPassword(null);
        const res = await acceptApplicationAndCreateUser(applicationId, {
            role,
            wushsha_level: role === "wushsha" ? wushshaLevel : undefined,
            clerk_id: !createInClerk ? (clerkId.trim() || undefined) : undefined,
            createInClerk: createInClerk && !!application?.email,
        });
        setLoading(false);
        if (res.success) {
            if (res.tempPassword) {
                setTempPassword(res.tempPassword);
            } else {
                onSuccess();
            }
        } else {
            setError(res.error || "فشل إنشاء المستخدم");
        }
    };

    const handleCloseAfterPassword = () => {
        setTempPassword(null);
        onSuccess();
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-theme-soft bg-bg shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle">
                    <h2 className="text-lg font-bold text-theme flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-gold" />
                        قبول وإنشاء مستخدم
                    </h2>
                    <button onClick={tempPassword ? handleCloseAfterPassword : onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {tempPassword ? (
                    <div className="p-6 space-y-4">
                        <div className="p-4 rounded-xl bg-forest/10 border border-forest/20 text-forest">
                            <p className="text-sm font-medium mb-2">تم إنشاء الحساب بنجاح ✓</p>
                            <p className="text-xs text-theme-soft mb-3">المستخدم يمكنه تسجيل الدخول بالبريد وكلمة المرور التالية. انسخها وأرسلها له:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-3 py-2 bg-black/30 rounded-lg text-sm font-mono break-all select-all" dir="ltr">
                                    {tempPassword}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(tempPassword)}
                                    className="px-3 py-2 rounded-lg bg-gold/20 text-gold text-xs font-bold hover:bg-gold/30"
                                >
                                    نسخ
                                </button>
                            </div>
                            <p className="text-[10px] text-theme-subtle mt-2">البريد: {application.email}</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCloseAfterPassword}
                            className="w-full py-2.5 rounded-xl bg-gold/20 text-gold font-bold hover:bg-gold/30"
                        >
                            تم
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-theme-soft text-sm">
                            سيتم إنشاء مستخدم جديد من طلب <strong className="text-theme">{application.full_name}</strong>
                            {application.email && <span className="block text-theme-subtle mt-1">البريد: {application.email}</span>}
                        </p>
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={createInClerk}
                                onChange={(e) => setCreateInClerk(e.target.checked)}
                                className="rounded border-white/20"
                            />
                            <span className="text-sm text-theme-strong">إنشاء حساب في Clerk (ليتمكن من تسجيل الدخول)</span>
                        </label>
                        {createInClerk && application.email && (
                            <p className="text-[10px] text-theme-subtle">سيُنشأ حساب بالبريد أعلاه وكلمة مرور مؤقتة تُعرض بعد الإنشاء</p>
                        )}
                        {!createInClerk && (
                            <p className="text-[10px] text-amber-400/80">بدون Clerk لن يتمكن المستخدم من تسجيل الدخول — استخدم إن كان لديه حساب مسبقاً</p>
                        )}
                        <div>
                            <label className="block text-xs font-medium text-theme-subtle mb-1.5">الدور</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as "wushsha" | "subscriber")}
                                className="w-full px-4 py-2.5 bg-theme-subtle border border-theme-soft rounded-xl text-sm text-theme focus:outline-none focus:border-gold/30"
                            >
                                <option value="wushsha">وشّاي</option>
                                <option value="subscriber">مشترك</option>
                            </select>
                        </div>
                        {role === "wushsha" && (
                            <div>
                                <label className="block text-xs font-medium text-theme-subtle mb-1.5">مستوى الوشّاي</label>
                                <select
                                    value={wushshaLevel}
                                    onChange={(e) => setWushshaLevel(Number(e.target.value))}
                                    className="w-full px-4 py-2.5 bg-theme-subtle border border-theme-soft rounded-xl text-sm text-theme focus:outline-none focus:border-gold/30"
                                >
                                    {[1, 2, 3, 4, 5].map((l) => (
                                        <option key={l} value={l}>المستوى {l}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {!createInClerk && (
                            <div>
                                <label className="block text-xs font-medium text-theme-subtle mb-1.5">معرف Clerk (اختياري)</label>
                                <input
                                    type="text"
                                    value={clerkId}
                                    onChange={(e) => setClerkId(e.target.value)}
                                    placeholder="user_xxx — اتركه فارغاً للإنشاء التلقائي"
                                    className="w-full px-4 py-2.5 bg-theme-subtle border border-theme-soft rounded-xl text-sm text-theme placeholder:text-theme-faint focus:outline-none focus:border-gold/30"
                                    dir="ltr"
                                />
                                <p className="text-[10px] text-theme-faint mt-1">إن تركت فارغاً سيُستخدم معرف مؤقت حتى يسجّل المستخدم</p>
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={loading || (createInClerk && !application?.email)}
                                className="flex-1 py-2.5 rounded-xl bg-gold/20 text-gold font-bold hover:bg-gold/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                إنشاء وقبول
                            </button>
                        </div>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
