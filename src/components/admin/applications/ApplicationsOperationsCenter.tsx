"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import {
    BadgeCheck,
    ClipboardCheck,
    Clock3,
    ShieldAlert,
    Sparkles,
    UserPlus,
    UsersRound,
    XCircle,
} from "lucide-react";
import { ApplicationsClient } from "@/components/admin/ApplicationsClient";

interface ApplicationsOperationsCenterProps {
    snapshot: {
        stats: {
            total: number;
            pending: number;
            reviewing: number;
            accepted: number;
            rejected: number;
            createdToday: number;
            waitingDecision: number;
            acceptedWithoutProfile: number;
            acceptedWithoutClerk: number;
            highPriority: number;
        };
        intakeQueue: any[];
        identityBacklog: any[];
        recentlyReviewed: any[];
        priorityQueue: any[];
        segments: {
            joinTypeMix: Array<{ key: string; label: string; count: number; share: number }>;
            genderMix: Array<{ key: string; label: string; count: number; share: number }>;
            ageBands: Array<{ key: string; label: string; count: number; share: number }>;
            styleSignals: Array<{ label: string; count: number }>;
        };
    };
    clientProps: {
        applications: any[];
        count: number;
        currentStatus: string;
        currentJoinType: string;
        currentGender: string;
        currentAgeBand: string;
        currentIdentityState: string;
    };
}

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

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

function getStatusMeta(status: string) {
    switch (status) {
        case "pending":
            return { label: "بانتظار الفرز", className: "border-blue-500/20 bg-blue-500/10 text-blue-300" };
        case "reviewing":
            return { label: "قيد المراجعة", className: "border-amber-500/20 bg-amber-500/10 text-amber-300" };
        case "accepted":
            return { label: "مقبول", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" };
        case "rejected":
            return { label: "مرفوض", className: "border-red-500/20 bg-red-500/10 text-red-300" };
        default:
            return { label: status, className: "border-white/10 bg-white/5 text-theme-subtle" };
    }
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
            return { label: "منخفض", className: "border-white/10 bg-white/5 text-theme-subtle" };
    }
}

function SummaryCard({
    title,
    value,
    subtitle,
    icon: Icon,
    accent,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-2xl font-black text-theme">{value}</p>
                </div>
                <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{
                        backgroundColor: `${accent}18`,
                        borderColor: `${accent}33`,
                        color: accent,
                    }}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <p className="text-sm leading-6 text-theme-subtle">{subtitle}</p>
        </motion.div>
    );
}

function QueueLane({
    title,
    subtitle,
    emptyState,
    items,
    tone,
    variant,
    isHydrated,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: any[];
    tone: "critical" | "warning" | "calm";
    variant: "intake" | "identity" | "reviewed";
    isHydrated: boolean;
}) {
    const toneClass =
        tone === "critical"
            ? "border-red-500/20 bg-red-500/[0.04]"
            : tone === "warning"
              ? "border-amber-500/20 bg-amber-500/[0.04]"
              : "border-emerald-500/20 bg-emerald-500/[0.04]";

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} h-full p-5`}
        >
            <div className="mb-5">
                <h3 className="text-lg font-bold text-theme">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((application) => {
                        const statusMeta = getStatusMeta(application.status);
                        const priorityMeta = getPriorityMeta(application.priorityTier);
                        const genderLabel =
                            application.gender && application.gender in genderLabelMap
                                ? genderLabelMap[application.gender as keyof typeof genderLabelMap]
                                : null;
                        const joinTypeLabel =
                            application.join_type && application.join_type in joinTypeLabelMap
                                ? joinTypeLabelMap[application.join_type as keyof typeof joinTypeLabelMap]
                                : null;

                        return (
                            <Link
                                key={application.id}
                                href={`/dashboard/applications/${application.id}`}
                                className={`block rounded-2xl border p-4 transition-all hover:border-gold/30 ${toneClass}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-theme">{application.full_name}</p>
                                        <p className="mt-1 truncate text-xs text-theme-subtle">{application.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusMeta.className}`}>
                                            {statusMeta.label}
                                        </span>
                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${priorityMeta.className}`}>
                                            {priorityMeta.label} · {application.priorityScore}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-theme-subtle">
                                    {joinTypeLabel ? <span>{joinTypeLabel}</span> : null}
                                    {joinTypeLabel && (genderLabel || application.art_style || application.experience_years) ? (
                                        <span className="text-theme-faint">•</span>
                                    ) : null}
                                    {genderLabel ? <span>{genderLabel}</span> : null}
                                    {(genderLabel && (application.art_style || application.experience_years)) ? (
                                        <span className="text-theme-faint">•</span>
                                    ) : null}
                                    {application.art_style ? <span>{application.art_style}</span> : null}
                                    {application.art_style && application.experience_years ? (
                                        <span className="text-theme-faint">•</span>
                                    ) : null}
                                    {application.experience_years ? (
                                        <>
                                            <span>{application.experience_years} سنوات</span>
                                        </>
                                    ) : null}
                                    {(genderLabel || application.art_style || application.experience_years) ? (
                                        <span className="text-theme-faint">•</span>
                                    ) : null}
                                    <span suppressHydrationWarning>
                                        {isHydrated
                                            ? formatDistanceToNow(new Date(application.updated_at || application.created_at), {
                                                addSuffix: true,
                                                locale: ar,
                                            })
                                            : String(application.updated_at || application.created_at || "").split("T")[0] || "—"}
                                    </span>
                                </div>

                                <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-3 py-2 text-[11px] text-theme-faint">
                                    {variant === "identity"
                                        ? !application.hasProfile
                                            ? "لم يُنشأ profile بعد لهذا الطلب المقبول."
                                            : !application.hasClerkAccount
                                              ? "يوجد profile لكن لا يوجد حساب Clerk مكتمل بعد."
                                              : "الهوية مكتملة."
                                        : variant === "reviewed"
                                          ? application.reviewer_notes || "لا توجد ملاحظات مراجعة مسجلة."
                                          : application.motivation || "لا توجد نبذة مرفقة."}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

function SegmentPanel({
    title,
    subtitle,
    items,
    emptyState,
    accentClass,
}: {
    title: string;
    subtitle: string;
    items: Array<{ label: string; count: number; share?: number }>;
    emptyState: string;
    accentClass: string;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} p-5`}
        >
            <div className="mb-5">
                <h3 className="text-lg font-bold text-theme">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((item) => (
                        <div
                            key={item.label}
                            className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-bold text-theme">{item.label}</p>
                                <div className="flex items-center gap-2 text-xs text-theme-subtle">
                                    <span>{item.count}</span>
                                    {typeof item.share === "number" ? <span>{item.share}%</span> : null}
                                </div>
                            </div>
                            {typeof item.share === "number" ? (
                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                                    <div
                                        className={`h-full rounded-full ${accentClass}`}
                                        style={{ width: `${Math.max(item.share, 8)}%` }}
                                    />
                                </div>
                            ) : null}
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

export function ApplicationsOperationsCenter({
    snapshot,
    clientProps,
}: ApplicationsOperationsCenterProps) {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const missionTone =
        snapshot.stats.acceptedWithoutProfile > 0 || snapshot.stats.acceptedWithoutClerk > 0
            ? "critical"
            : snapshot.stats.waitingDecision > 0
              ? "warning"
              : "calm";

    const missionToneClass =
        missionTone === "critical"
            ? "border-red-500/20 bg-red-500/10 text-red-200"
            : missionTone === "warning"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";

    return (
        <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(92,184,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-200 uppercase">
                                Applications Operations Center
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical" ? "تعطّل في الهوية" : missionTone === "warning" ? "قرارات معلقة" : "الطابور منضبط"}
                            </span>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h2 className="text-3xl font-black leading-tight text-theme md:text-4xl">
                                مركز تشغيل طلبات الانضمام لمراقبة الوارد، قرارات القبول، وربط الحسابات من شاشة واحدة.
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذه الطبقة تفصل بين ضغط الطلبات الجديدة، الطلبات المقبولة التي لم تكتمل هويتها بعد،
                                وآخر القرارات المتخذة حتى تصبح إدارة الانضمام مسار تشغيل واضحًا لا مجرد بطاقات مبعثرة.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">القرار المعلّق</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.waitingDecision}</p>
                                <p className="mt-2 text-sm text-theme-subtle">طلبات ما زالت بين الفرز والمراجعة الفعلية.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">تعطّل الهوية</p>
                                <p className="mt-3 text-3xl font-black text-theme">
                                    {snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">طلبات مقبولة لم تكتمل على مستوى profile أو Clerk بعد.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الوارد اليوم</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.createdToday}</p>
                                <p className="mt-2 text-sm text-theme-subtle">عدد الطلبات الجديدة المسجلة خلال اليوم الحالي.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-3">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الضغط عالي الأولوية</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.highPriority}</p>
                                <p className="mt-2 text-sm text-theme-subtle">طلبات تحتاج تدخلاً قريبًا وفق درجة الأثر والزمن والاكتمال.</p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.aside
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${subtlePanelClass} p-6`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                            <ShieldAlert className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Mission Pulse</p>
                            <h3 className="mt-1 text-lg font-bold text-theme">ما الذي يحتاج قرارًا الآن؟</h3>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-red-200">
                                <UserPlus className="h-4 w-4" />
                                <span className="text-sm font-bold">ربط الحسابات</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk > 0
                                    ? `هناك ${snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk} طلبات مقبولة تحتاج استكمال هوية أو حساب دخول.`
                                    : "جميع الطلبات المقبولة مرتبطة بهوية قابلة للتشغيل حاليًا."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-amber-200">
                                <Clock3 className="h-4 w-4" />
                                <span className="text-sm font-bold">طابور القرار</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.waitingDecision > 0
                                    ? `${snapshot.stats.waitingDecision} طلبات ما زالت بانتظار فرز أو مراجعة فعلية.`
                                    : "لا توجد طلبات عالقة في مسار القرار حاليًا."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-sm font-bold">إيقاع الانضمام</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                إجمالي الطلبات {snapshot.stats.total}، منها {snapshot.stats.accepted} مقبولة و{snapshot.stats.rejected} مرفوضة حتى الآن.
                            </p>
                        </div>
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="Pending Intake"
                    value={String(snapshot.stats.pending)}
                    subtitle="طلبات دخلت المسار ولم تبدأ مراجعتها بعد."
                    icon={ClipboardCheck}
                    accent="#60a5fa"
                />
                <SummaryCard
                    title="Active Review"
                    value={String(snapshot.stats.reviewing)}
                    subtitle="طلبات تحت مراجعة بشرية فعلية الآن."
                    icon={UsersRound}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="Accepted"
                    value={String(snapshot.stats.accepted)}
                    subtitle="طلبات وصلت إلى قرار قبول ويمكن تشغيل أصحابها."
                    icon={BadgeCheck}
                    accent="#34d399"
                />
                <SummaryCard
                    title="Identity Backlog"
                    value={String(snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk)}
                    subtitle="طلبات مقبولة تحتاج profile أو حساب Clerk."
                    icon={UserPlus}
                    accent="#f87171"
                />
                <SummaryCard
                    title="Priority Load"
                    value={String(snapshot.stats.highPriority)}
                    subtitle="طلبات حرجة أو عالية تحتاج قرارًا أو متابعة الآن."
                    icon={ShieldAlert}
                    accent="#c084fc"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-4">
                <QueueLane
                    title="طابور الأولوية"
                    subtitle="الطلبات الأهم حاليًا بحسب الدرجة والسبب والزمن."
                    emptyState="لا توجد حالات عالية الأولوية الآن."
                    items={snapshot.priorityQueue}
                    tone="critical"
                    variant="intake"
                    isHydrated={isHydrated}
                />
                <QueueLane
                    title="الوارد النشط"
                    subtitle="أحدث الطلبات التي ما زالت في مرحلة الانتظار أو المراجعة."
                    emptyState="لا توجد طلبات تحتاج قرارًا الآن."
                    items={snapshot.intakeQueue}
                    tone="warning"
                    variant="intake"
                    isHydrated={isHydrated}
                />
                <QueueLane
                    title="Backlog الهوية"
                    subtitle="طلبات مقبولة لكن تشغيل صاحبها لم يكتمل على مستوى profile أو Clerk."
                    emptyState="كل الطلبات المقبولة مرتبطة بهوية جاهزة."
                    items={snapshot.identityBacklog}
                    tone="critical"
                    variant="identity"
                    isHydrated={isHydrated}
                />
                <QueueLane
                    title="آخر القرارات"
                    subtitle="آخر الطلبات التي خرجت من مسار المراجعة إلى قبول أو رفض."
                    emptyState="لا توجد قرارات مراجعة مسجلة بعد."
                    items={snapshot.recentlyReviewed}
                    tone="calm"
                    variant="reviewed"
                    isHydrated={isHydrated}
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
                <SegmentPanel
                    title="توزيع نوع الانضمام"
                    subtitle="الفئات الأوضح داخل مجتمع وشّى اليوم."
                    items={snapshot.segments.joinTypeMix}
                    emptyState="لا توجد بيانات كافية لنوع الانضمام بعد."
                    accentClass="bg-gradient-to-r from-sky-400/80 to-cyan-300/80"
                />
                <SegmentPanel
                    title="التوازن بين الجنسين"
                    subtitle="كيف يتوزع الاهتمام الحالي بين الذكور والإناث."
                    items={snapshot.segments.genderMix}
                    emptyState="لا توجد بيانات كافية للجنس بعد."
                    accentClass="bg-gradient-to-r from-gold/80 to-amber-300/80"
                />
                <SegmentPanel
                    title="الشرائح العمرية"
                    subtitle="صورة مبدئية لعمر المجتمع الداخل إلى المسار."
                    items={snapshot.segments.ageBands}
                    emptyState="لم يتم جمع تواريخ ميلاد كافية بعد."
                    accentClass="bg-gradient-to-r from-violet-400/80 to-fuchsia-300/80"
                />
                <SegmentPanel
                    title="أقوى تفضيلات اللبس"
                    subtitle="الإشارات الأوضح في الذوق والقطع المطلوبة."
                    items={snapshot.segments.styleSignals}
                    emptyState="لا توجد إشارات كافية للّبس حتى الآن."
                    accentClass="bg-gradient-to-r from-emerald-400/80 to-teal-300/80"
                />
            </div>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="mb-5">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Execution Desk</p>
                    <h3 className="mt-2 text-xl font-bold text-theme">مكتب تنفيذ القرارات</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                        هنا تبقى إجراءات القبول والرفض وإنشاء المستخدم كما هي، لكن ضمن سياق تشغيلي أوضح.
                    </p>
                </div>

                <ApplicationsClient
                    applications={clientProps.applications}
                    count={clientProps.count}
                    currentStatus={clientProps.currentStatus}
                    currentJoinType={clientProps.currentJoinType}
                    currentGender={clientProps.currentGender}
                    currentAgeBand={clientProps.currentAgeBand}
                    currentIdentityState={clientProps.currentIdentityState}
                />
            </motion.section>
        </div>
    );
}
