"use client";

import { useMemo, useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Filter,
    Flame,
    Headphones,
    Inbox,
    LifeBuoy,
    MessageSquareMore,
    Search,
    ShieldAlert,
    Sparkles,
    User,
} from "lucide-react";

interface SupportOperationsCenterProps {
    snapshot: {
        stats: {
            total: number;
            open: number;
            inProgress: number;
            resolved: number;
            closed: number;
            urgentOpen: number;
            createdToday: number;
            resolvedToday: number;
            staleActive: number;
            avgActiveHours: number;
            avgResolutionHours: number;
            slaAtRisk: number;
            slaBreached: number;
        };
        urgentQueue: any[];
        staleQueue: any[];
        recentlyResolved: any[];
        slaQueue: any[];
    };
    tickets: any[];
}

type FilterValue = "all" | "open" | "in_progress" | "resolved" | "closed";
type SortValue = "recent" | "priority";

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

function formatHours(value: number) {
    if (!value) return "—";
    if (value < 24) return `${value}س`;

    const days = Math.round((value / 24) * 10) / 10;
    return `${days}ي`;
}

function getStatusMeta(status: string) {
    switch (status) {
        case "open":
            return {
                label: "جديدة",
                className: "border-blue-500/20 bg-blue-500/10 text-blue-300",
            };
        case "in_progress":
            return {
                label: "قيد المعالجة",
                className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
            };
        case "resolved":
            return {
                label: "تم الحل",
                className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
            };
        case "closed":
            return {
                label: "مغلقة",
                className: "border-theme-subtle bg-theme-faint text-theme-subtle",
            };
        default:
            return {
                label: status,
                className: "border-theme-subtle bg-theme-faint text-theme-subtle",
            };
    }
}

function getPriorityMeta(priority: string) {
    switch (priority) {
        case "high":
            return {
                label: "عاجلة",
                className: "border-red-500/20 bg-red-500/10 text-red-300",
            };
        case "low":
            return {
                label: "منخفضة",
                className: "border-theme-subtle bg-theme-faint text-theme-faint",
            };
        default:
            return {
                label: "عادية",
                className: "border-theme-subtle bg-theme-faint text-theme-subtle",
            };
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
            className={`${subtlePanelClass} p-4 sm:p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-xl font-black text-theme sm:text-2xl">{value}</p>
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
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: any[];
    tone: "critical" | "warning" | "calm";
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
            className={`${subtlePanelClass} h-full p-4 sm:p-5`}
        >
            <div className="mb-5">
                <h3 className="text-lg font-bold text-theme">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((ticket) => {
                        const statusMeta = getStatusMeta(ticket.status);
                        const priorityMeta = getPriorityMeta(ticket.priority);
                        const userName = ticket.profile?.display_name || ticket.name || "عميل";
                        const avatar = ticket.profile?.avatar_url;

                        return (
                            <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
                                <div className={`rounded-2xl border p-4 transition-all hover:border-gold/30 ${toneClass}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_74%,transparent)]">
                                            {avatar ? (
                                                <Image src={avatar} alt={userName} width={44} height={44} className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-5 w-5 text-theme-subtle" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="truncate text-sm font-bold text-theme">{ticket.subject}</p>
                                                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${priorityMeta.className}`}>
                                                    {priorityMeta.label}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-theme-subtle">
                                                <span>{userName}</span>
                                                <span className="text-theme-faint">•</span>
                                                <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}</span>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusMeta.className}`}>
                                                    {statusMeta.label}
                                                </span>
                                                <span className="text-[11px] text-theme-faint">
                                                    فُتحت {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ar })}
                                                </span>
                                            </div>
                                            {ticket.flagLabel ? (
                                                <div className="mt-3 rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-[11px] text-theme-subtle">
                                                    {ticket.flagLabel}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

export function SupportOperationsCenter({ snapshot, tickets }: SupportOperationsCenterProps) {
    const [filter, setFilter] = useState<FilterValue>("all");
    const [sortBy, setSortBy] = useState<SortValue>("recent");
    const [query, setQuery] = useState("");

    const filteredTickets = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        const result = tickets.filter((ticket) => {
            const matchesFilter = filter === "all" ? true : ticket.status === filter;
            const matchesQuery = normalizedQuery
                ? [
                      ticket.subject,
                      ticket.id,
                      ticket.profile?.display_name,
                      ticket.name,
                      ticket.email,
                  ]
                      .filter(Boolean)
                      .some((value) => String(value).toLowerCase().includes(normalizedQuery))
                : true;

            return matchesFilter && matchesQuery;
        });

        if (sortBy === "priority") {
            const priorityOrder: Record<string, number> = { high: 0, normal: 1, low: 2 };
            return result.sort((a, b) => {
                const priorityDelta = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
                if (priorityDelta !== 0) return priorityDelta;

                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });
        }

        return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [filter, query, sortBy, tickets]);

    const serviceLoad =
        snapshot.stats.open + snapshot.stats.inProgress + snapshot.stats.urgentOpen + snapshot.stats.staleActive;
    const missionTone =
        snapshot.stats.slaBreached > 0 || snapshot.stats.urgentOpen > 0
            ? "critical"
            : snapshot.stats.slaAtRisk > 0 || snapshot.stats.staleActive > 0 || snapshot.stats.open > 0
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
                    className={`${panelClass} p-5 sm:p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-200 uppercase">
                                Support Operations Center
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical" ? "ضغط حرج" : missionTone === "warning" ? "يتطلب تدخلًا" : "تشغيل مستقر"}
                            </span>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h2 className="text-3xl font-black leading-tight text-theme md:text-4xl">
                                غرفة قيادة الدعم لمراقبة الطوابير، أعمار التذاكر، وسرعة الاستجابة من شاشة واحدة.
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذا المركز يفصل بين الضغط الفعلي، التذاكر العاجلة، التذاكر الراكدة، والإنجاز اليومي حتى تتحول
                                إدارة الدعم من متابعة يدوية إلى تشغيل منضبط ومقاس.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الضغط الحالي</p>
                                <p className="mt-3 text-3xl font-black text-theme">{serviceLoad}</p>
                                <p className="mt-2 text-sm text-theme-subtle">يشمل الجديدة، الجاري العمل عليها، العاجلة، والراكدة.</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">عمر التذاكر النشطة</p>
                                <p className="mt-3 text-3xl font-black text-theme">{formatHours(snapshot.stats.avgActiveHours)}</p>
                                <p className="mt-2 text-sm text-theme-subtle">كلما ارتفع هذا الرقم زاد احتمال تدهور تجربة الدعم.</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">معدل الإغلاق</p>
                                <p className="mt-3 text-3xl font-black text-theme">{formatHours(snapshot.stats.avgResolutionHours)}</p>
                                <p className="mt-2 text-sm text-theme-subtle">متوسط الزمن التقريبي من فتح التذكرة حتى إغلاقها.</p>
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
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-theme-subtle bg-theme-faint">
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
                                <Flame className="h-4 w-4" />
                                <span className="text-sm font-bold">الحرج</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.urgentOpen > 0
                                    ? `هناك ${snapshot.stats.urgentOpen} تذاكر عاجلة مفتوحة تتطلب ردًا أو تصعيدًا فوريًا.`
                                    : "لا توجد تذاكر عاجلة مفتوحة حاليًا."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-fuchsia-500/15 bg-fuchsia-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-fuchsia-200">
                                <ShieldAlert className="h-4 w-4" />
                                <span className="text-sm font-bold">SLA</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.slaBreached > 0
                                    ? `${snapshot.stats.slaBreached} تذاكر تجاوزت SLA و ${snapshot.stats.slaAtRisk} أخرى على حافة التجاوز.`
                                    : snapshot.stats.slaAtRisk > 0
                                      ? `${snapshot.stats.slaAtRisk} تذاكر تقترب من تجاوز SLA وتحتاج ضبط الإيقاع قبل أن تتدهور.`
                                      : "لا توجد تذاكر معرضة لتجاوز SLA حاليًا."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-amber-200">
                                <Clock3 className="h-4 w-4" />
                                <span className="text-sm font-bold">الاختناق</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.staleActive > 0
                                    ? `${snapshot.stats.staleActive} تذاكر نشطة تجاوزت 24 ساعة دون إغلاق، وهذا مؤشر اختناق مباشر.`
                                    : "لا توجد تذاكر راكدة تتجاوز 24 ساعة حاليًا."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-sm font-bold">الإيقاع</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                تم إنشاء {snapshot.stats.createdToday} تذاكر اليوم، وأُغلقت أو حُلَّت {snapshot.stats.resolvedToday} تذاكر اليوم.
                            </p>
                        </div>
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <SummaryCard
                    title="Open Intake"
                    value={String(snapshot.stats.open)}
                    subtitle="التذاكر الجديدة التي لم تتحول بعد إلى معالجة نشطة."
                    icon={Inbox}
                    accent="#60a5fa"
                />
                <SummaryCard
                    title="Active Work"
                    value={String(snapshot.stats.inProgress)}
                    subtitle="التذاكر التي يتعامل معها الفريق حاليًا."
                    icon={LifeBuoy}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="Urgent Queue"
                    value={String(snapshot.stats.urgentOpen)}
                    subtitle="القناة الحرجة التي يجب أن تبقى قصيرة ومراقبة دائمًا."
                    icon={AlertTriangle}
                    accent="#f87171"
                />
                <SummaryCard
                    title="SLA Watch"
                    value={String(snapshot.stats.slaAtRisk + snapshot.stats.slaBreached)}
                    subtitle="التذاكر التي تحتاج تدخلًا قبل أو بعد تجاوز اتفاقية الخدمة."
                    icon={ShieldAlert}
                    accent="#e879f9"
                />
                <SummaryCard
                    title="Resolved Today"
                    value={String(snapshot.stats.resolvedToday)}
                    subtitle="التذاكر التي خرجت من خط التشغيل خلال اليوم الحالي."
                    icon={Sparkles}
                    accent="#34d399"
                />
                <SummaryCard
                    title="Resolved"
                    value={String(snapshot.stats.resolved + snapshot.stats.closed)}
                    subtitle="ناتج الحل والإغلاق ضمن السجل التشغيلي الحالي."
                    icon={CheckCircle2}
                    accent="#34d399"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
                <QueueLane
                    title="الطابور العاجل"
                    subtitle="أعلى الحالات خطورة، ويجب أن تبقى قريبة من الصفر."
                    emptyState="لا توجد تذاكر عاجلة تحتاج تدخلًا الآن."
                    items={snapshot.urgentQueue}
                    tone="critical"
                />
                <QueueLane
                    title="مخاطر SLA"
                    subtitle="تذاكر تقترب من تجاوز SLA أو تجاوزته فعلًا، ويجب أن تكون تحت أعين الفريق."
                    emptyState="لا توجد تذاكر في منطقة الخطر الخاصة باتفاقية الخدمة."
                    items={snapshot.slaQueue}
                    tone="critical"
                />
                <QueueLane
                    title="التذاكر الراكدة"
                    subtitle="حالات مفتوحة أو قيد المعالجة عمرها التشغيلي تجاوز 24 ساعة."
                    emptyState="الطابور الراكِد نظيف حاليًا."
                    items={snapshot.staleQueue}
                    tone="warning"
                />
                <QueueLane
                    title="آخر ما أُغلق"
                    subtitle="آخر التذاكر التي خرجت من خط التشغيل لمراجعة جودة الإيقاع."
                    emptyState="لا توجد تذاكر محلولة في السجل حتى الآن."
                    items={snapshot.recentlyResolved}
                    tone="calm"
                />
            </div>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Ticket Index</p>
                        <h3 className="mt-2 text-xl font-bold text-theme">فهرس الدعم الكامل</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                            ابحث، صفّ، وراقب التذاكر من نفس مركز العمليات بدل القفز بين صفحات متعددة.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 lg:min-w-[460px]">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="ابحث بالعنوان، الاسم، البريد، أو رقم التذكرة"
                                className="input-dark w-full rounded-2xl py-3 pr-10 pl-4 text-sm transition-all"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { value: "all", label: "الكل" },
                                { value: "open", label: "الجديدة" },
                                { value: "in_progress", label: "قيد المعالجة" },
                                { value: "resolved", label: "المحلولة" },
                                { value: "closed", label: "المغلقة" },
                            ].map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFilter(item.value as FilterValue)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                        filter === item.value
                                            ? "border-gold/35 bg-gold/15 text-gold"
                                            : "border-theme-subtle bg-theme-faint text-theme-subtle hover:bg-theme-subtle hover:text-theme"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}

                            <button
                                onClick={() => setSortBy(sortBy === "recent" ? "priority" : "recent")}
                                className="mr-auto inline-flex items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-bold text-theme-subtle transition-all hover:bg-theme-subtle hover:text-theme"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                {sortBy === "recent" ? "ترتيب: الأحدث" : "ترتيب: الأولوية"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="theme-surface-panel mt-6 overflow-hidden rounded-[22px]">
                    {filteredTickets.length > 0 ? (
                        <div className="divide-y divide-white/6">
                            {filteredTickets.map((ticket, index) => {
                                const statusMeta = getStatusMeta(ticket.status);
                                const priorityMeta = getPriorityMeta(ticket.priority);
                                const userName = ticket.profile?.display_name || ticket.name || "عميل";
                                const avatar = ticket.profile?.avatar_url;

                                return (
                                    <Link key={ticket.id} href={`/dashboard/support/${ticket.id}`}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(index * 0.015, 0.18) }}
                                            className="grid gap-4 px-5 py-4 transition-all hover:bg-theme-faint md:grid-cols-[1.3fr_0.7fr_0.5fr]"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint">
                                                    {avatar ? (
                                                        <Image src={avatar} alt={userName} width={44} height={44} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <User className="h-5 w-5 text-theme-subtle" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="truncate text-sm font-bold text-theme">{ticket.subject}</p>
                                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${priorityMeta.className}`}>
                                                            {priorityMeta.label}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-theme-subtle">
                                                        <span>{userName}</span>
                                                        {ticket.email ? <span className="text-theme-faint">• {ticket.email}</span> : null}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-start gap-2 md:items-center md:justify-center">
                                                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusMeta.className}`}>
                                                    {statusMeta.label}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-xs text-theme-faint">
                                                    <MessageSquareMore className="h-3.5 w-3.5" />
                                                    {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar })}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-theme-faint md:flex-col md:items-end md:justify-center">
                                                <span>#{ticket.id.slice(0, 8)}</span>
                                                <span>فُتحت {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ar })}</span>
                                            </div>
                                        </motion.div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <Headphones className="mx-auto h-12 w-12 text-theme-faint opacity-40" />
                            <p className="mt-4 text-sm font-medium text-theme-subtle">لا توجد تذاكر تطابق هذا الفلتر حاليًا.</p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-theme-faint">
                    <span>عرض {filteredTickets.length} من {tickets.length} تذكرة</span>
                    <span>إجمالي المغلق والمحلول: {snapshot.stats.resolved + snapshot.stats.closed}</span>
                </div>
            </motion.section>
        </div>
    );
}
