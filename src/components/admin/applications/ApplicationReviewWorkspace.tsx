"use client";

import { useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    CheckCheck,
    Clock3,
    ExternalLink,
    FileText,
    FolderOpenDot,
    Instagram,
    Loader2,
    Mail,
    Palette,
    Phone,
    ShieldCheck,
    Sparkles,
    UserPlus,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { reviewApplication } from "@/app/actions/admin";
import {
    AcceptAndCreateModal,
    CreateClerkOnlyModal,
} from "@/components/admin/ApplicationsClient";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface ApplicationReviewWorkspaceProps {
    application: any;
    workspaceContext: {
        navigation: {
            previous: { id: string; full_name: string; status: string } | null;
            next: { id: string; full_name: string; status: string } | null;
        };
        queue: {
            reviewPosition: number | null;
            reviewTotal: number;
            identityPosition: number | null;
            identityTotal: number;
            nextDecisionCandidate: { id: string; full_name: string; status: string } | null;
            nextProvisionCandidate: { id: string; full_name: string; status: string } | null;
        };
        checklist: {
            hasContact: boolean;
            hasAssets: boolean;
            hasAudienceProfile: boolean;
            hasIdentityReady: boolean;
            hasReviewNotes: boolean;
        };
    };
}

const panelClass = "theme-surface-panel rounded-[24px]";

const genderLabelMap = {
    male: "ذكر",
    female: "أنثى",
} as const;

const joinTypeLabelMap = {
    artist: "فنان",
    designer: "مصمم",
    model: "مودل",
    customer: "عميل مهتم",
    partner: "شريك أو متعاون",
} as const;

function DetailCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string;
    icon: ElementType;
}) {
    return (
        <div className={`${panelClass} p-4`}>
            <div className="mb-3 flex items-center gap-2 text-theme-faint">
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]">{label}</span>
            </div>
            <p className="text-sm font-semibold leading-7 text-theme">{value}</p>
        </div>
    );
}

function getPriorityMeta(priorityTier: string) {
    switch (priorityTier) {
        case "critical":
            return { label: "حرج", className: "border-red-500/20 bg-red-500/10 text-red-200" };
        case "high":
            return { label: "عالٍ", className: "border-amber-500/20 bg-amber-500/10 text-amber-200" };
        case "medium":
            return { label: "متوسط", className: "border-sky-500/20 bg-sky-500/10 text-sky-200" };
        default:
            return { label: "منخفض", className: "border-theme-subtle bg-theme-faint text-theme-subtle" };
    }
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
            <span className="text-sm text-theme">{label}</span>
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    done
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : "border-red-500/20 bg-red-500/10 text-red-200"
                }`}
            >
                {done ? <CheckCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {done ? "جاهز" : "ناقص"}
            </span>
        </div>
    );
}

export function ApplicationReviewWorkspace({
    application,
    workspaceContext,
}: ApplicationReviewWorkspaceProps) {
    const router = useRouter();
    const [loadingDecision, setLoadingDecision] = useState<"accepted" | "rejected" | null>(null);
    const [reviewNotes, setReviewNotes] = useState(application.reviewer_notes ?? "");
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showCreateClerkOnly, setShowCreateClerkOnly] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | null>(null);

    const handleReview = async (decision: "accepted" | "rejected") => {
        setLoadingDecision(decision);
        setError(null);
        try {
            const result = await reviewApplication(application.id, decision, reviewNotes || undefined);
            if (!result.success) {
                setError(result.error || "فشل تحديث حالة الطلب");
                return;
            }

            setPendingDecision(null);
            router.refresh();
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل تحديث حالة الطلب");
        } finally {
            setLoadingDecision(null);
        }
    };

    const handlePrepareReview = (decision: "accepted" | "rejected") => {
        setError(null);
        setPendingDecision(decision);
    };

    const identityState = !application.hasProfile
        ? "لا يوجد profile مرتبط بعد"
        : !application.hasClerkAccount
          ? "يوجد profile لكن حساب Clerk غير مكتمل"
          : "الهوية التشغيلية مكتملة";
    const genderLabel =
        application.gender && application.gender in genderLabelMap
            ? genderLabelMap[application.gender as keyof typeof genderLabelMap]
            : "غير محدد";
    const joinTypeLabel =
        application.join_type && application.join_type in joinTypeLabelMap
            ? joinTypeLabelMap[application.join_type as keyof typeof joinTypeLabelMap]
            : "غير محدد";
    const birthDateLabel = application.birth_date
        ? new Date(application.birth_date).toLocaleDateString("ar-SA", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "غير محدد";
    const priorityMeta = getPriorityMeta(application.priorityTier);

    return (
        <div className="space-y-6">
            {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <Link
                    href="/dashboard/applications"
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-bold text-theme-subtle transition-colors hover:text-theme sm:justify-start"
                >
                    <FolderOpenDot className="h-4 w-4" />
                    العودة إلى مركز طلبات الانضمام
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    {workspaceContext.navigation.previous ? (
                        <Link
                            href={`/dashboard/applications/${workspaceContext.navigation.previous.id}`}
                            className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-bold text-theme-subtle transition-colors hover:text-theme"
                        >
                            <ArrowRight className="h-4 w-4" />
                            السابق
                        </Link>
                    ) : null}
                    {workspaceContext.navigation.next ? (
                        <Link
                            href={`/dashboard/applications/${workspaceContext.navigation.next.id}`}
                            className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-bold text-theme-subtle transition-colors hover:text-theme"
                        >
                            التالي
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6 md:p-7"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(92,184,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-200 uppercase">
                                Application Review Workspace
                            </span>
                            <StatusBadge status={application.status} type="application" />
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${priorityMeta.className}`}>
                                {priorityMeta.label} · {application.priorityScore}
                            </span>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h1 className="text-2xl font-black leading-tight text-theme sm:text-3xl md:text-4xl">
                                {application.full_name}
                            </h1>
                            <p className="max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذا الملف يجمع قرار الطلب، حالة الهوية، الروابط المرجعية، والمحتوى الفني في مساحة
                                واحدة بدل التعامل معه كبطاقة قصيرة داخل الشبكة.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الوضع الحالي</p>
                                <p className="mt-3 text-2xl font-black text-theme">
                                    {application.status === "pending"
                                        ? "بانتظار القرار"
                                        : application.status === "reviewing"
                                          ? "قيد المراجعة"
                                          : application.status === "accepted"
                                            ? "تم القبول"
                                            : "تم الرفض"}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">
                                    آخر تحديث {formatDistanceToNow(new Date(application.updated_at || application.created_at), { addSuffix: true, locale: ar })}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الهوية</p>
                                <p className="mt-3 text-2xl font-black text-theme">
                                    {!application.hasProfile ? "غير مكتملة" : !application.hasClerkAccount ? "جزئية" : "مكتملة"}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">{identityState}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الأولوية والخبرة</p>
                                <p className="mt-3 text-2xl font-black text-theme">
                                    {application.experience_years ? `${application.experience_years} سنوات` : "غير محددة"}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">{application.art_style || "بدون تصنيف فني"}</p>
                            </div>
                        </div>

                        {application.priorityReasons?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {application.priorityReasons.map((reason: string) => (
                                    <span
                                        key={reason}
                                        className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[11px] font-bold text-theme-subtle"
                                    >
                                        {reason}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </motion.section>

                <motion.aside
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-5 sm:p-6`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-theme-subtle bg-theme-faint">
                            <ShieldCheck className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Decision Rail</p>
                            <h2 className="mt-1 text-lg font-bold text-theme">شريط القرار</h2>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {(application.status === "pending" || application.status === "reviewing") && (
                            <>
                                <textarea
                                    value={reviewNotes}
                                    onChange={(event) => setReviewNotes(event.target.value)}
                                    placeholder="ملاحظات المراجع قبل اتخاذ القرار..."
                                    className="input-dark min-h-[120px] w-full rounded-2xl px-4 py-3 text-sm"
                                />

                                <div className="grid gap-2">
                                    <button
                                        onClick={() => setShowAcceptModal(true)}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/20"
                                    >
                                        <BadgeCheck className="h-4 w-4" />
                                        قبول وإنشاء مستخدم
                                    </button>
                                    <button
                                        onClick={() => handlePrepareReview("accepted")}
                                        disabled={loadingDecision !== null}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
                                    >
                                        {loadingDecision === "accepted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                                        قبول فقط
                                    </button>
                                    <button
                                        onClick={() => handlePrepareReview("rejected")}
                                        disabled={loadingDecision !== null}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                                    >
                                        {loadingDecision === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                        رفض الطلب
                                    </button>
                                </div>
                                {pendingDecision ? (
                                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                        <p className="text-sm font-semibold text-theme">
                                            {pendingDecision === "accepted"
                                                ? "سيتم قبول الطلب بالملاحظات الحالية."
                                                : "سيتم رفض الطلب بالملاحظات الحالية."}
                                        </p>
                                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                onClick={() => handleReview(pendingDecision)}
                                                disabled={loadingDecision !== null}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-theme disabled:opacity-60"
                                            >
                                                {loadingDecision === pendingDecision ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCheck className="h-4 w-4" />
                                                )}
                                                تأكيد القرار
                                            </button>
                                            <button
                                                onClick={() => setPendingDecision(null)}
                                                disabled={loadingDecision !== null}
                                                className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-medium text-theme-subtle"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        )}

                        {application.status === "accepted" && (
                            <div className="space-y-3">
                                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                                    <p className="text-sm font-bold text-emerald-300">الطلب مقبول</p>
                                    <p className="mt-2 text-sm leading-6 text-theme-subtle">{identityState}</p>
                                </div>

                                {!application.hasProfile && (
                                    <button
                                        onClick={() => setShowAcceptModal(true)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/20"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        إنشاء profile وحساب
                                    </button>
                                )}

                                {application.hasProfile && !application.hasClerkAccount && application.email && (
                                    <button
                                        onClick={() => setShowCreateClerkOnly(true)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        إنشاء حساب Clerk فقط
                                    </button>
                                )}
                            </div>
                        )}

                        {application.status === "rejected" && (
                            <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4">
                                <p className="text-sm font-bold text-red-300">الطلب مرفوض</p>
                                <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                    {application.reviewer_notes || "لا توجد ملاحظات مرفقة مع الرفض."}
                                </p>
                            </div>
                        )}

                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-theme-faint">Queue Context</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">موقعه في المراجعة</p>
                                    <p className="mt-2 text-lg font-bold text-theme">
                                        {workspaceContext.queue.reviewPosition
                                            ? `${workspaceContext.queue.reviewPosition} / ${workspaceContext.queue.reviewTotal}`
                                            : "خارج طابور القرار"}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">موقعه في التشغيل</p>
                                    <p className="mt-2 text-lg font-bold text-theme">
                                        {workspaceContext.queue.identityPosition
                                            ? `${workspaceContext.queue.identityPosition} / ${workspaceContext.queue.identityTotal}`
                                            : "ليس ضمن طابور التشغيل"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {workspaceContext.queue.nextDecisionCandidate ? (
                                    <Link
                                        href={`/dashboard/applications/${workspaceContext.queue.nextDecisionCandidate.id}`}
                                        className="flex items-center justify-between rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 text-sm text-theme transition-colors hover:border-amber-500/30"
                                    >
                                        <span>المرشح التالي للقرار: {workspaceContext.queue.nextDecisionCandidate.full_name}</span>
                                        <ArrowLeft className="h-4 w-4 text-amber-200" />
                                    </Link>
                                ) : null}

                                {workspaceContext.queue.nextProvisionCandidate ? (
                                    <Link
                                        href={`/dashboard/applications/${workspaceContext.queue.nextProvisionCandidate.id}`}
                                        className="flex items-center justify-between rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3 text-sm text-theme transition-colors hover:border-emerald-500/30"
                                    >
                                        <span>المرشح التالي للتشغيل: {workspaceContext.queue.nextProvisionCandidate.full_name}</span>
                                        <ArrowLeft className="h-4 w-4 text-emerald-200" />
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
                <section className="space-y-5">
                    <div className={`${panelClass} p-5`}>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Applicant Overview</p>
                        <div className="mt-4 grid gap-3">
                            <DetailCard label="البريد" value={application.email || "غير متوفر"} icon={Mail} />
                            <DetailCard label="الهاتف" value={application.phone || "غير متوفر"} icon={Phone} />
                            <DetailCard label="نوع الانضمام" value={joinTypeLabel} icon={BadgeCheck} />
                            <DetailCard label="الجنس" value={genderLabel} icon={Sparkles} />
                            <DetailCard label="تاريخ الميلاد" value={birthDateLabel} icon={Clock3} />
                            <DetailCard label="الأسلوب الفني" value={application.art_style || "غير محدد"} icon={Palette} />
                            <DetailCard
                                label="تاريخ الوصول"
                                value={new Date(application.created_at).toLocaleDateString("ar-SA", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                                icon={Clock3}
                            />
                        </div>
                    </div>

                    <div className={`${panelClass} p-5`}>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Readiness Checklist</p>
                        <div className="mt-4 grid gap-3">
                            <ChecklistItem label="بيانات تواصل متوفرة" done={workspaceContext.checklist.hasContact} />
                            <ChecklistItem label="أصول أو روابط مرجعية متوفرة" done={workspaceContext.checklist.hasAssets} />
                            <ChecklistItem label="الملف الديموغرافي مكتمل" done={workspaceContext.checklist.hasAudienceProfile} />
                            <ChecklistItem label="تم تسجيل ملاحظات مراجعة" done={workspaceContext.checklist.hasReviewNotes} />
                            <ChecklistItem label="الهوية التشغيلية مكتملة" done={workspaceContext.checklist.hasIdentityReady} />
                        </div>
                    </div>

                    <div className={`${panelClass} p-5`}>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Links & Identity</p>
                        <div className="mt-4 space-y-3">
                            {application.portfolio_url ? (
                                <a
                                    href={application.portfolio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-theme transition-colors hover:border-gold/30"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4 text-gold" />
                                        معرض الأعمال
                                    </span>
                                    <span className="text-theme-faint">فتح</span>
                                </a>
                            ) : null}
                            {application.instagram_url ? (
                                <a
                                    href={application.instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-3 text-sm text-theme transition-colors hover:border-gold/30"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <Instagram className="h-4 w-4 text-accent" />
                                        حساب انستقرام
                                    </span>
                                    <span className="text-theme-faint">فتح</span>
                                </a>
                            ) : null}

                            <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] px-4 py-4">
                                <p className="text-sm font-bold text-theme">حالة الربط الداخلي</p>
                                <div className="mt-3 space-y-2 text-sm text-theme-subtle">
                                    <p>Profile: {application.hasProfile ? "موجود" : "غير موجود"}</p>
                                    <p>Clerk: {application.hasClerkAccount ? "موجود" : "غير مكتمل"}</p>
                                    <p>ID: {application.profile?.id || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-5">
                    <div className={`${panelClass} p-5`}>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Motivation & Notes</p>
                        <div className="mt-4 rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-5">
                            <p className="text-sm leading-8 text-theme-subtle">{application.motivation || "لا توجد رسالة دافع مرفقة."}</p>
                        </div>

                        {application.reviewer_notes ? (
                            <div className="mt-4 rounded-2xl border border-gold/15 bg-gold/[0.04] p-5">
                                <p className="mb-2 text-sm font-bold text-gold">ملاحظات المراجع</p>
                                <p className="text-sm leading-7 text-theme-subtle">{application.reviewer_notes}</p>
                            </div>
                        ) : null}
                    </div>

                    <div className={`${panelClass} p-5`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Portfolio Assets</p>
                                <h2 className="mt-2 text-xl font-bold text-theme">الأصول المرفقة</h2>
                            </div>
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs font-bold text-theme-subtle">
                                {(application.portfolio_images || []).length} ملفات
                            </span>
                        </div>

                        {(application.portfolio_images || []).length > 0 ? (
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {application.portfolio_images.map((imageUrl: string, index: number) => (
                                    <a
                                        key={`${imageUrl}-${index}`}
                                        href={imageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="overflow-hidden rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] transition-all hover:border-gold/30"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={imageUrl} alt={`Portfolio ${index + 1}`} className="h-48 w-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-12 text-center text-sm text-theme-subtle">
                                <FileText className="mx-auto mb-3 h-6 w-6 text-theme-faint" />
                                لا توجد صور أعمال مرفقة مع هذا الطلب.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {showAcceptModal ? (
                <AcceptAndCreateModal
                    applicationId={application.id}
                    application={application}
                    onClose={() => setShowAcceptModal(false)}
                    onSuccess={() => {
                        setShowAcceptModal(false);
                        router.refresh();
                    }}
                />
            ) : null}

            {showCreateClerkOnly ? (
                <CreateClerkOnlyModal
                    applicationId={application.id}
                    application={application}
                    onClose={() => setShowCreateClerkOnly(false)}
                    onSuccess={() => {
                        setShowCreateClerkOnly(false);
                        router.refresh();
                    }}
                />
            ) : null}
        </div>
    );
}
