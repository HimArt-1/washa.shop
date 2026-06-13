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
    Filter,
    Headphones,
    Inbox,
    LifeBuoy,
    MessageSquareMore,
    Search,
    ShieldAlert,
    SlidersHorizontal,
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

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

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

function MetricPill({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-2 text-center">
            <p className="text-lg font-black tabular-nums text-theme">{value}</p>
            <p className="mt-0.5 text-[11px] font-bold text-theme-faint">{label}</p>
        </div>
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
    const missionLabel = missionTone === "critical" ? "ضغط حرج" : missionTone === "warning" ? "يتطلب تدخلًا" : "تشغيل مستقر";
    const filterItems: Array<{ value: FilterValue; label: string; count: number }> = [
        { value: "all", label: "الكل", count: tickets.length },
        { value: "open", label: "الجديدة", count: snapshot.stats.open },
        { value: "in_progress", label: "قيد المعالجة", count: snapshot.stats.inProgress },
        { value: "resolved", label: "المحلولة", count: snapshot.stats.resolved },
        { value: "closed", label: "المغلقة", count: snapshot.stats.closed },
    ];

    return (
        <div className="space-y-6">
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] font-semibold text-gold">
                                الدعم الفني
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionLabel}
                            </span>
                        </div>
                        <h2 className="mt-3 text-2xl font-black text-theme md:text-3xl">فهرس الدعم الكامل</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                            بحث وفرز ومتابعة التذاكر حسب الأولوية والحالة.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <MetricPill label="مفتوح" value={snapshot.stats.open} />
                        <MetricPill label="قيد المعالجة" value={snapshot.stats.inProgress} />
                        <MetricPill label="عاجل" value={snapshot.stats.urgentOpen} />
                        <MetricPill label="SLA" value={snapshot.stats.slaAtRisk + snapshot.stats.slaBreached} />
                    </div>
                </div>
            </motion.section>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-medium text-theme-faint">فهرس التذاكر</p>
                        <h3 className="mt-2 text-xl font-bold text-theme">التذاكر</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                            استخدم البحث والفلاتر للوصول السريع للحالة المطلوبة.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 lg:min-w-[500px]">
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
                            {filterItems.map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFilter(item.value)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                                        filter === item.value
                                            ? "border-gold/35 bg-gold/15 text-gold"
                                            : "border-theme-subtle bg-theme-faint text-theme-subtle hover:bg-theme-subtle hover:text-theme"
                                    }`}
                                >
                                    {item.label}
                                    <span className="mr-1 tabular-nums text-[10px] opacity-70">{item.count}</span>
                                </button>
                            ))}

                            <button
                                onClick={() => setSortBy(sortBy === "recent" ? "priority" : "recent")}
                                className="mr-auto inline-flex items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-bold text-theme-subtle transition-all hover:bg-theme-subtle hover:text-theme active:scale-[0.98]"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
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
                            <button
                                onClick={() => {
                                    setFilter("all");
                                    setQuery("");
                                }}
                                className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-xs font-bold text-gold transition-colors hover:bg-gold/15"
                            >
                                <Filter className="h-3.5 w-3.5" />
                                إعادة ضبط العرض
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-theme-faint">
                    <span>عرض {filteredTickets.length} من {tickets.length} تذكرة</span>
                    <span>إجمالي المغلق والمحلول: {snapshot.stats.resolved + snapshot.stats.closed}</span>
                </div>
            </motion.section>

            <section className="space-y-5">
                <div>
                    <p className="text-xs font-bold text-theme-faint">مراجعة الدعم</p>
                    <h3 className="mt-2 text-xl font-black text-theme">المؤشرات والطوابير</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <SummaryCard
                        title="الوارد المفتوح"
                        value={String(snapshot.stats.open)}
                        subtitle="التذاكر الجديدة التي لم تتحول بعد إلى معالجة نشطة."
                        icon={Inbox}
                        accent="#60a5fa"
                    />
                    <SummaryCard
                        title="عمل نشط"
                        value={String(snapshot.stats.inProgress)}
                        subtitle="التذاكر التي يتعامل معها الفريق حاليًا."
                        icon={LifeBuoy}
                        accent="#f59e0b"
                    />
                    <SummaryCard
                        title="الطابور العاجل"
                        value={String(snapshot.stats.urgentOpen)}
                        subtitle="عدد التذاكر المصنفة كعاجلة."
                        icon={AlertTriangle}
                        accent="#f87171"
                    />
                    <SummaryCard
                        title="مراقبة اتفاقية الخدمة"
                        value={String(snapshot.stats.slaAtRisk + snapshot.stats.slaBreached)}
                        subtitle="تذاكر قريبة من تجاوز اتفاقية الخدمة أو تجاوزتها."
                        icon={ShieldAlert}
                        accent="#e879f9"
                    />
                    <SummaryCard
                        title="أُغلق اليوم"
                        value={String(snapshot.stats.resolvedToday)}
                        subtitle="التذاكر التي خرجت من خط التشغيل خلال اليوم الحالي."
                        icon={Sparkles}
                        accent="#34d399"
                    />
                    <SummaryCard
                        title="مغلق"
                        value={String(snapshot.stats.resolved + snapshot.stats.closed)}
                        subtitle="إجمالي التذاكر المحلولة والمغلقة."
                        icon={CheckCircle2}
                        accent="#34d399"
                    />
                </div>

                <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-4">
                    <QueueLane
                        title="الطابور العاجل"
                        subtitle="أعلى الحالات خطورة في الطابور."
                        emptyState="لا توجد تذاكر عاجلة تحتاج تدخلًا الآن."
                        items={snapshot.urgentQueue}
                        tone="critical"
                    />
                    <QueueLane
                        title="مخاطر اتفاقية الخدمة"
                        subtitle="تذاكر اقتربت من تجاوز اتفاقية الخدمة أو تجاوزتها."
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
                        subtitle="آخر التذاكر التي خرجت من خط التشغيل."
                        emptyState="لا توجد تذاكر محلولة في السجل حتى الآن."
                        items={snapshot.recentlyResolved}
                        tone="calm"
                    />
                </div>
            </section>
        </div>
    );
}
