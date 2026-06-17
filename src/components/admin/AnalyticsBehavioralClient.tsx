"use client";

// وشّى | WASHA — لوحة التحليلات السلوكية: قمع التحويل، الأحداث، الصفحات، النشاط اليومي
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp, TrendingDown, MousePointer, ShoppingCart,
    CreditCard, CheckCircle, RefreshCw, Eye, Search, BarChart2,
    Activity, MapPin, ArrowLeft,
} from "lucide-react";
import type { BehavioralSnapshot, FunnelStep, EventCount, TopPage } from "@/app/actions/behavioral-analytics";
import { getBehavioralSnapshot } from "@/app/actions/behavioral-analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EVENT_LABELS: Record<string, string> = {
    product_view: "مشاهدة منتج",
    add_to_cart: "إضافة للسلة",
    cart_view: "عرض السلة",
    cart_abandon: "ترك السلة",
    checkout_start: "بدء الدفع",
    checkout_complete: "إتمام الشراء",
    search_query: "بحث",
    gallery_view: "معرض الفن",
    artwork_view: "مشاهدة عمل فني",
    design_order_start: "بدء طلب تصميم",
    design_order_submit: "تأكيد طلب تصميم",
    design_ai_generate: "توليد AI",
    coupon_apply: "تطبيق كوبون",
    newsletter_subscribe: "اشتراك النشرة",
};

const EVENT_ICON_MAP: Record<string, React.ElementType> = {
    product_view: Eye,
    add_to_cart: ShoppingCart,
    cart_view: ShoppingCart,
    cart_abandon: ShoppingCart,
    checkout_start: CreditCard,
    checkout_complete: CheckCircle,
    search_query: Search,
    gallery_view: Eye,
    artwork_view: Eye,
    design_order_start: MousePointer,
    design_order_submit: CheckCircle,
    design_ai_generate: Activity,
    coupon_apply: TrendingUp,
    newsletter_subscribe: BarChart2,
};

// ─── Funnel Bar ───────────────────────────────────────────────────────────────
function FunnelBar({
    step,
    maxCount,
    color,
}: {
    step: FunnelStep;
    maxCount: number;
    color: string;
}) {
    const pct = maxCount === 0 ? 0 : Math.round((step.count / maxCount) * 100);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-theme-soft font-medium">{step.labelAr}</span>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-theme-strong">{step.count.toLocaleString("ar-SA")}</span>
                    {step.dropOffPct > 0 && (
                        <span className="text-xs text-red-400 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {step.dropOffPct}%
                        </span>
                    )}
                </div>
            </div>
            <div className="h-3 rounded-full bg-theme-subtle overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
        </div>
    );
}

// ─── Event Row ────────────────────────────────────────────────────────────────
function EventRow({ event, maxCount }: { event: EventCount; maxCount: number }) {
    const pct = maxCount === 0 ? 0 : Math.round((event.count / maxCount) * 100);
    const Icon = EVENT_ICON_MAP[event.eventType] ?? Activity;

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-theme-subtle flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-theme-soft truncate">
                        {EVENT_LABELS[event.eventType] ?? event.eventType}
                    </span>
                    <span className="text-sm font-bold text-theme-strong shrink-0 ml-3">
                        {event.count.toLocaleString("ar-SA")}
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-theme-subtle overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full bg-gold/60"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Top Page Row ─────────────────────────────────────────────────────────────
function TopPageRow({ page, maxVisits }: { page: TopPage; maxVisits: number }) {
    const pct = maxVisits === 0 ? 0 : Math.round((page.visits / maxVisits) * 100);
    return (
        <div className="flex items-center gap-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-theme-faint shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-theme-soft truncate" dir="ltr">
                        {page.path}
                    </span>
                    <span className="text-sm font-bold text-theme-strong shrink-0 ml-3">
                        {page.visits.toLocaleString("ar-SA")}
                    </span>
                </div>
                <div className="h-1.5 rounded-full bg-theme-subtle overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full bg-blue-400/60"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Activity Sparkline ───────────────────────────────────────────────────────
function ActivitySparkline({ data }: { data: { date: string; count: number }[] }) {
    if (data.length === 0) {
        return (
            <div className="h-24 flex items-center justify-center text-theme-faint text-sm">
                لا توجد بيانات بعد
            </div>
        );
    }

    const max = Math.max(...data.map((d) => d.count), 1);
    const width = 560;
    const height = 80;
    const padding = 4;
    const step = (width - padding * 2) / Math.max(data.length - 1, 1);

    const points = data
        .map((d, i) => {
            const x = padding + i * step;
            const y = height - padding - ((d.count / max) * (height - padding * 2));
            return `${x},${y}`;
        })
        .join(" ");

    const fillPoints = `${padding},${height} ${points} ${padding + (data.length - 1) * step},${height}`;

    return (
        <div className="w-full overflow-x-hidden">
            <svg viewBox={`0 0 ${width} ${height + 4}`} className="w-full h-24" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon points={fillPoints} fill="url(#sparkGrad)" />
                <polyline
                    points={points}
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
            <div className="flex justify-between text-[10px] text-theme-faint mt-1">
                {data.length > 0 && <span>{data[0].date.slice(5)}</span>}
                {data.length > 1 && <span>{data[data.length - 1].date.slice(5)}</span>}
            </div>
        </div>
    );
}

// ─── Period Selector ──────────────────────────────────────────────────────────
const PERIODS = [
    { label: "7 أيام", value: 7 },
    { label: "30 يوماً", value: 30 },
    { label: "90 يوماً", value: 90 },
] as const;

// ─── Main Component ────────────────────────────────────────────────────────────
export function AnalyticsBehavioralClient({
    initial,
}: {
    initial: BehavioralSnapshot | null;
}) {
    const [data, setData] = useState<BehavioralSnapshot | null>(initial);
    const [period, setPeriod] = useState(30);
    const [isPending, startTransition] = useTransition();

    const handlePeriodChange = (days: number) => {
        setPeriod(days);
        startTransition(async () => {
            const fresh = await getBehavioralSnapshot(days);
            setData(fresh);
        });
    };

    const handleRefresh = () => {
        startTransition(async () => {
            const fresh = await getBehavioralSnapshot(period);
            setData(fresh);
        });
    };

    if (!data) {
        return (
            <div className="flex items-center justify-center py-24 text-theme-faint">
                <Activity className="w-8 h-8 animate-pulse" />
                <span className="mr-3">لا توجد بيانات سلوكية بعد</span>
            </div>
        );
    }

    const purchaseMax = data.purchaseFunnel[0]?.count ?? 1;
    const designMax = data.designFunnel[0]?.count ?? 1;
    const eventMax = data.topEvents[0]?.count ?? 1;
    const pageMax = data.topPages[0]?.visits ?? 1;

    const purchaseConversionRate =
        purchaseMax > 0 && data.purchaseFunnel.length >= 4
            ? Math.round(((data.purchaseFunnel[3]?.count ?? 0) / purchaseMax) * 100)
            : 0;

    const designConversionRate =
        designMax > 0 && data.designFunnel.length >= 3
            ? Math.round(((data.designFunnel[2]?.count ?? 0) / designMax) * 100)
            : 0;

    return (
        <div className="space-y-6" dir="rtl">
            {/* ── Controls ── */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-theme-subtle rounded-xl p-1">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => handlePeriodChange(p.value)}
                            disabled={isPending}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                period === p.value
                                    ? "bg-gold text-[#1a1612]"
                                    : "text-theme-faint hover:text-theme-soft"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-soft bg-theme-surface text-sm text-theme-soft hover:border-gold/40 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                    تحديث
                </button>
            </div>

            {/* ── Conversion rates summary ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="theme-surface-panel p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-gold">{purchaseConversionRate}%</p>
                    <p className="text-xs text-theme-faint mt-1">معدل تحويل الشراء</p>
                </div>
                <div className="theme-surface-panel p-4 rounded-2xl text-center">
                    <p className="text-2xl font-black text-cyan-400">{designConversionRate}%</p>
                    <p className="text-xs text-theme-faint mt-1">معدل تحويل التصميم</p>
                </div>
                <div className="theme-surface-panel p-4 rounded-2xl text-center col-span-2 sm:col-span-1">
                    <p className="text-2xl font-black text-purple-400">
                        {data.topEvents.reduce((s, e) => s + e.count, 0).toLocaleString("ar-SA")}
                    </p>
                    <p className="text-xs text-theme-faint mt-1">إجمالي الأحداث ({period}y)</p>
                </div>
            </div>

            {/* ── Funnels ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purchase funnel */}
                <div className="theme-surface-panel p-5 rounded-2xl space-y-4">
                    <h3 className="font-bold text-theme-strong flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 text-gold" />
                        قمع الشراء
                    </h3>
                    <div className="space-y-3">
                        {data.purchaseFunnel.map((step) => (
                            <FunnelBar
                                key={step.eventType}
                                step={step}
                                maxCount={purchaseMax}
                                color="#D4AF37"
                            />
                        ))}
                    </div>
                </div>

                {/* Design funnel */}
                <div className="theme-surface-panel p-5 rounded-2xl space-y-4">
                    <h3 className="font-bold text-theme-strong flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 text-cyan-400" />
                        قمع التصميم
                    </h3>
                    <div className="space-y-3">
                        {data.designFunnel.map((step) => (
                            <FunnelBar
                                key={step.eventType}
                                step={step}
                                maxCount={designMax}
                                color="#22d3ee"
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Activity sparkline ── */}
            <div className="theme-surface-panel p-5 rounded-2xl">
                <h3 className="font-bold text-theme-strong mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gold" />
                    نشاط الأحداث اليومي
                </h3>
                <ActivitySparkline data={data.eventsByDay} />
            </div>

            {/* ── Top events + Top pages ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top events */}
                <div className="theme-surface-panel p-5 rounded-2xl">
                    <h3 className="font-bold text-theme-strong mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gold" />
                        أكثر الأحداث تكراراً
                    </h3>
                    <div className="divide-y divide-theme-soft/30">
                        {data.topEvents.length === 0 ? (
                            <p className="text-sm text-theme-faint py-4 text-center">
                                لا توجد أحداث مسجلة بعد
                            </p>
                        ) : (
                            data.topEvents.map((e) => (
                                <EventRow key={e.eventType} event={e} maxCount={eventMax} />
                            ))
                        )}
                    </div>
                </div>

                {/* Top pages */}
                <div className="theme-surface-panel p-5 rounded-2xl">
                    <h3 className="font-bold text-theme-strong mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        أكثر الصفحات زيارةً
                    </h3>
                    <div className="divide-y divide-theme-soft/30">
                        {data.topPages.length === 0 ? (
                            <p className="text-sm text-theme-faint py-4 text-center">
                                لا توجد زيارات مسجلة بعد
                            </p>
                        ) : (
                            data.topPages.slice(0, 12).map((p) => (
                                <TopPageRow key={p.path} page={p} maxVisits={pageMax} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
