"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ActivityIcon, AlertTriangleIcon, CheckCircleIcon, ShieldCheckIcon, SlashIcon } from "lucide-react";
import type { DtfTelemetryStats } from "@/app/actions/dtf-telemetry";

interface DtfStatsOverviewProps {
    stats: DtfTelemetryStats;
}

const CHART_COLORS = {
    success: "#34d399",
    failed: "#f87171",
    timeout: "#f59e0b",
    quota: "#d4af37",
};

function MetricCard({
    label,
    value,
    helper,
    icon,
    tone = "neutral",
}: {
    label: string;
    value: string | number;
    helper: string;
    icon: JSX.Element;
    tone?: "neutral" | "success" | "warning" | "error";
}) {
    const toneClass = {
        neutral: "border-theme-subtle bg-theme-faint text-theme-subtle",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        warning: "border-gold/25 bg-gold/10 text-gold",
        error: "border-red-500/20 bg-red-500/10 text-red-300",
    }[tone];

    return (
        <div className="theme-surface-panel rounded-[24px] p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold text-theme-faint">{label}</p>
                    <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-theme">{value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClass}`}>
                    {icon}
                </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-theme-subtle">{helper}</p>
        </div>
    );
}

function MeasuredChart({
    height,
    children,
}: {
    height: number;
    children: (size: { width: number; height: number }) => ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const updateWidth = () => {
            const nextWidth = Math.floor(element.getBoundingClientRect().width || element.clientWidth || 0);
            if (nextWidth > 0) {
                setWidth(nextWidth);
            }
        };

        updateWidth();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateWidth);
            return () => window.removeEventListener("resize", updateWidth);
        }

        const observer = new ResizeObserver(updateWidth);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="h-full w-full">
            {width > 0 ? children({ width, height }) : null}
        </div>
    );
}

export function DtfStatsOverview({ stats }: DtfStatsOverviewProps) {
    const pieData = useMemo(() => {
        return [
            { name: "ناجحة", value: stats.statusDistribution.success, color: CHART_COLORS.success },
            { name: "أخطاء", value: stats.statusDistribution.error, color: CHART_COLORS.failed },
            { name: "انقضاء وقت", value: stats.statusDistribution.timeout, color: CHART_COLORS.timeout },
            { name: "تجاوز الحد", value: stats.statusDistribution.quotaExceeded, color: CHART_COLORS.quota },
        ].filter((item) => item.value > 0);
    }, [stats.statusDistribution]);

    const successRate = stats.totalRequests === 0
        ? 0
        : Math.round((stats.statusDistribution.success / stats.totalRequests) * 100);
    const failedCount = stats.statusDistribution.error + stats.statusDistribution.timeout;
    const needsAttention = failedCount + stats.statusDistribution.quotaExceeded;

    return (
        <div className="mb-8 mt-4 space-y-6" dir="rtl">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="إجمالي العمليات"
                    value={stats.totalRequests}
                    helper="كل عمليات التوليد والعزل التي قرأها الرادار ضمن نافذة القياس."
                    icon={<ActivityIcon className="h-5 w-5" />}
                />
                <MetricCard
                    label="معدل النجاح"
                    value={`${successRate}%`}
                    helper={`${stats.statusDistribution.success} عملية ناجحة داخل العينة الحالية.`}
                    icon={<CheckCircleIcon className="h-5 w-5" />}
                    tone="success"
                />
                <MetricCard
                    label="تدخلات الحماية"
                    value={stats.statusDistribution.quotaExceeded}
                    helper="طلبات أوقفتها حدود الاستخدام قبل استهلاك موارد إضافية."
                    icon={<SlashIcon className="h-5 w-5" />}
                    tone="warning"
                />
                <MetricCard
                    label="تحتاج متابعة"
                    value={needsAttention}
                    helper="تشمل الأخطاء، انقضاء الوقت، والطلبات التي تجاوزت الحد."
                    icon={<AlertTriangleIcon className="h-5 w-5" />}
                    tone={needsAttention > 0 ? "error" : "success"}
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <section className="theme-surface-panel rounded-[28px] p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold text-theme-faint">السبعة أيام الأخيرة</p>
                            <h3 className="mt-2 text-xl font-black text-theme">اتجاه نجاح التوليد</h3>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                                يوضح الرسم أين يرتفع الفشل مقارنة بالعمليات الناجحة، حتى يسهل ربطه بالشكاوى أو ضغط الاستخدام.
                            </p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                            قياس مباشر
                        </span>
                    </div>

                    <div className="mt-6 h-[300px] w-full" dir="ltr">
                        <MeasuredChart height={300}>
                            {({ width, height }) => (
                            <AreaChart width={width} height={height} data={stats.chartData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="dtfSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.36} />
                                        <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="dtfFailed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.failed} stopOpacity={0.28} />
                                        <stop offset="95%" stopColor={CHART_COLORS.failed} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--wusha-text) 8%, transparent)" vertical={false} />
                                <XAxis dataKey="date" stroke="color-mix(in srgb, var(--wusha-text) 46%, transparent)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="color-mix(in srgb, var(--wusha-text) 46%, transparent)" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: "var(--wusha-surface)",
                                        borderColor: "color-mix(in srgb, var(--wusha-text) 14%, transparent)",
                                        borderRadius: "14px",
                                        color: "var(--wusha-text)",
                                        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
                                    }}
                                    itemStyle={{ color: "var(--wusha-text)", fontSize: "13px", padding: "3px 0" }}
                                    cursor={{ stroke: "color-mix(in srgb, var(--wusha-gold) 28%, transparent)", strokeWidth: 1 }}
                                />
                                <Area type="monotone" dataKey="success" name="ناجحة" stroke={CHART_COLORS.success} strokeWidth={2.5} fillOpacity={1} fill="url(#dtfSuccess)" activeDot={{ r: 5, fill: CHART_COLORS.success }} />
                                <Area type="monotone" dataKey="failed" name="تحتاج متابعة" stroke={CHART_COLORS.failed} strokeWidth={2.5} fillOpacity={1} fill="url(#dtfFailed)" activeDot={{ r: 5, fill: CHART_COLORS.failed }} />
                            </AreaChart>
                            )}
                        </MeasuredChart>
                    </div>
                </section>

                <section className="theme-surface-panel rounded-[28px] p-5 sm:p-6">
                    <div>
                        <p className="text-xs font-semibold text-theme-faint">توزيع الحالات</p>
                        <h3 className="mt-2 text-xl font-black text-theme">حالة العمليات</h3>
                    </div>

                    <div className="mt-5 flex h-[240px] items-center justify-center">
                        {pieData.length > 0 ? (
                            <MeasuredChart height={240}>
                                {({ width, height }) => (
                                <PieChart width={width} height={height}>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={64}
                                        outerRadius={92}
                                        paddingAngle={5}
                                        cornerRadius={6}
                                        dataKey="value"
                                        stroke="transparent"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: "var(--wusha-surface)",
                                            borderColor: "color-mix(in srgb, var(--wusha-text) 14%, transparent)",
                                            borderRadius: "14px",
                                            color: "var(--wusha-text)",
                                        }}
                                    />
                                </PieChart>
                                )}
                            </MeasuredChart>
                        ) : (
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm text-theme-subtle">
                                لا توجد بيانات كافية للرسم.
                            </div>
                        )}
                    </div>

                    <div className="mt-5 grid gap-2">
                        {pieData.map((entry) => (
                            <div key={entry.name} className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-sm text-theme-subtle">{entry.name}</span>
                                </div>
                                <span className="text-sm font-black tabular-nums text-theme">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
