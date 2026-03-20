"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentType } from "react";
import {
    Area,
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { getAdminAnalytics, type AnalyticsData, type AnalyticsPeriod } from "@/app/actions/admin";
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Clock3,
    CreditCard,
    DollarSign,
    Download,
    Package,
    TrendingUp,
    Users,
    Wallet,
} from "lucide-react";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
    { id: "7d", label: "7 أيام" },
    { id: "30d", label: "30 يوماً" },
    { id: "90d", label: "90 يوماً" },
];

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatCompact(value: number) {
    return new Intl.NumberFormat("ar-SA", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value || 0);
}

function formatPercent(value: number) {
    if (!Number.isFinite(value)) return "0%";
    return `${value.toFixed(1)}%`;
}

function getGrowthTone(value: number) {
    if (value >= 0) {
        return {
            className: "text-emerald-300",
            icon: ArrowUpRight,
            prefix: "+",
        };
    }

    return {
        className: "text-red-300",
        icon: ArrowDownRight,
        prefix: "",
    };
}

function getOrderStatusTone(status: string) {
    switch (status) {
        case "pending":
            return "border-blue-500/20 bg-blue-500/10 text-blue-300";
        case "confirmed":
            return "border-sky-500/20 bg-sky-500/10 text-sky-300";
        case "processing":
            return "border-amber-500/20 bg-amber-500/10 text-amber-300";
        case "shipped":
            return "border-indigo-500/20 bg-indigo-500/10 text-indigo-300";
        case "delivered":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
        case "cancelled":
        case "refunded":
            return "border-red-500/20 bg-red-500/10 text-red-300";
        default:
            return "border-theme-subtle bg-theme-faint text-theme-subtle";
    }
}

function getPaymentStatusTone(status: string) {
    switch (status) {
        case "paid":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
        case "pending":
            return "border-amber-500/20 bg-amber-500/10 text-amber-300";
        case "failed":
            return "border-red-500/20 bg-red-500/10 text-red-300";
        case "refunded":
            return "border-slate-500/20 bg-slate-500/10 text-slate-300";
        default:
            return "border-theme-subtle bg-theme-faint text-theme-subtle";
    }
}

function getStatusLabel(status: string) {
    switch (status) {
        case "pending":
            return "بانتظار التأكيد";
        case "confirmed":
            return "مؤكد";
        case "processing":
            return "قيد التنفيذ";
        case "shipped":
            return "تم الشحن";
        case "delivered":
            return "تم التسليم";
        case "cancelled":
            return "ملغي";
        case "refunded":
            return "مسترد";
        default:
            return status;
    }
}

function getPaymentLabel(status: string) {
    switch (status) {
        case "pending":
            return "بانتظار الدفع";
        case "paid":
            return "مدفوع";
        case "failed":
            return "متعثر";
        case "refunded":
            return "مسترد";
        default:
            return status;
    }
}

function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    accent,
    growth,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
    growth?: number;
}) {
    const growthTone = growth !== undefined ? getGrowthTone(growth) : null;
    const GrowthIcon = growthTone?.icon;

    return (
        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
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

            <div className="flex items-center justify-between gap-3">
                <p className="text-sm leading-6 text-theme-subtle">{subtitle}</p>
                {growthTone && GrowthIcon ? (
                    <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${growthTone.className}`}>
                        <GrowthIcon className="h-3.5 w-3.5" />
                        {growthTone.prefix}
                        {(growth ?? 0).toFixed(1)}%
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function FinanceQueueCard({
    title,
    subtitle,
    emptyState,
    items,
    tone,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: AnalyticsData["watchlists"]["pendingPayments"];
    tone: "warning" | "critical" | "calm";
}) {
    const toneClass =
        tone === "critical"
            ? "border-red-500/20 bg-red-500/[0.04]"
            : tone === "warning"
              ? "border-amber-500/20 bg-amber-500/[0.04]"
              : "border-emerald-500/20 bg-emerald-500/[0.04]";

    return (
        <section className={`${subtlePanelClass} p-4 sm:p-5`}>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-theme">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
                </div>
                <Link
                    href="/dashboard/orders"
                    className="inline-flex min-h-[38px] items-center rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-medium text-theme-subtle transition-colors hover:border-gold/30 hover:bg-theme-subtle hover:text-gold"
                >
                    فتح الطلبات
                </Link>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((order) => (
                        <div key={order.id} className={`rounded-2xl border p-4 ${toneClass}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-theme">#{order.order_number}</p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">
                                        {order.buyer?.display_name || order.buyer?.username || "عميل غير محدد"}
                                    </p>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-theme">{formatCurrency(order.total)}</p>
                                    <p className="mt-1 text-[11px] text-theme-faint">{formatDate(order.created_at)}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className={`rounded-full border px-2.5 py-1 font-bold ${getOrderStatusTone(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                </span>
                                <span className={`rounded-full border px-2.5 py-1 font-bold ${getPaymentStatusTone(order.payment_status)}`}>
                                    {getPaymentLabel(order.payment_status)}
                                </span>
                                {Number(order.discount_amount) > 0 ? (
                                    <span className="rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 font-bold text-gold">
                                        خصم {formatCurrency(order.discount_amount)}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </section>
    );
}

function MixBars({
    title,
    subtitle,
    items,
    color,
}: {
    title: string;
    subtitle: string;
    items: Array<{ key: string; label: string; count: number }>;
    color: string;
}) {
    const max = Math.max(...items.map((item) => item.count), 1);

    return (
        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
            <div className="mb-5">
                <h3 className="text-lg font-bold text-theme">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
            </div>

            <div className="space-y-4">
                {items.length > 0 ? (
                    items.map((item) => (
                        <div key={item.key} className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-theme">{item.label}</span>
                                <span className="font-bold text-theme-soft">{item.count}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-theme-faint">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${(item.count / max) * 100}%`,
                                        background: color,
                                    }}
                                />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        لا توجد بيانات كافية في الفترة المحددة.
                    </div>
                )}
            </div>
        </div>
    );
}

export function AnalyticsClient({
    initialData,
    initialPeriod,
}: {
    initialData: AnalyticsData;
    initialPeriod: AnalyticsPeriod;
}) {
    const [data, setData] = useState(initialData);
    const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
    const [loading, setLoading] = useState(false);

    const handlePeriodChange = async (nextPeriod: AnalyticsPeriod) => {
        setPeriod(nextPeriod);
        setLoading(true);
        try {
            const result = await getAdminAnalytics(nextPeriod);
            setData(result);
        } finally {
            setLoading(false);
        }
    };

    const revenueChartData = data.revenueByDay.map((day) => ({
        date: formatDate(day.date),
        revenue: Math.round(day.revenue),
        orders: day.orders,
    }));

    const usersChartData = data.usersByDay.map((day) => ({
        date: formatDate(day.date),
        users: day.count,
    }));

    const exportCSV = () => {
        const rows: string[][] = [
            ["الفترة", period],
            [],
            ["المؤشر", "القيمة"],
            ["إيراد الفترة", String(Math.round(data.summary.totalRevenue))],
            ["إيراد اليوم", String(Math.round(data.finance.todayRevenue))],
            ["إجمالي الطلبات", String(data.summary.totalOrders)],
            ["الطلبات المدفوعة", String(data.finance.paidOrders)],
            ["المدفوعات المعلقة", String(data.finance.pendingPayments)],
            ["المدفوعات المتعثرة", String(data.finance.failedPayments)],
            ["القيمة المعلقة", String(Math.round(data.finance.outstandingRevenue))],
            ["القيمة المعرضة للتعثر", String(Math.round(data.finance.atRiskRevenue))],
            ["الخصومات الممنوحة", String(Math.round(data.finance.discountGranted))],
            ["معدل التحصيل", formatPercent(data.finance.collectionRate)],
            [],
            ["التاريخ", "إيرادات اليوم", "الطلبات"],
            ...data.revenueByDay.map((day) => [
                day.date,
                String(Math.round(day.revenue)),
                String(day.orders),
            ]),
            [],
            ["المنتج", "الكمية", "الإيرادات"],
            ...data.topProducts.map((product) => [
                product.title,
                String(product.quantity),
                String(Math.round(product.revenue)),
            ]),
            [],
            ["رقم الطلب", "العميل", "الإجمالي", "حالة الطلب", "حالة الدفع", "تاريخ الإنشاء"],
            ...data.watchlists.pendingPayments.map((order) => [
                order.order_number,
                order.buyer?.display_name || order.buyer?.username || "عميل غير محدد",
                String(Math.round(order.total)),
                getStatusLabel(order.status),
                getPaymentLabel(order.payment_status),
                order.created_at,
            ]),
        ];

        const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wusha-finance-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <section className={`${panelClass} p-5 sm:p-6 md:p-7`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(206,174,127,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_30%)]" />
                <div className="relative space-y-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                                <Wallet className="h-3.5 w-3.5" />
                                غرفة التحصيل والإيراد
                            </span>
                            <h2 className="mt-4 text-2xl font-black text-theme sm:text-3xl">
                                صورة مالية يومية تُظهر أين يدخل الإيراد وأين يتعثر.
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذه الصفحة لم تعد مجرد رسوم. هي مركز تشغيل مالي يوضح الفجوة بين المدفوع والمعلّق، قيمة
                                المخاطر، وأثر الخصومات والطلب اليومي من زاوية تنفيذية واحدة.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                            <button
                                onClick={exportCSV}
                                className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-medium text-theme-soft transition-colors hover:border-gold/30 hover:bg-theme-subtle hover:text-gold"
                            >
                                <Download className="h-4 w-4" />
                                تصدير التقرير
                            </button>
                            {PERIODS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => handlePeriodChange(option.id)}
                                    disabled={loading}
                                    className={`min-h-[42px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                        period === option.id
                                            ? "border-gold/40 bg-gold/15 text-gold"
                                            : "border-theme-subtle bg-theme-faint text-theme-soft hover:border-gold/20 hover:bg-theme-subtle hover:text-gold"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
                            <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">إيراد اليوم</p>
                            <p className="mt-3 text-2xl font-black text-theme sm:text-3xl">{formatCurrency(data.finance.todayRevenue)}</p>
                            <p className="mt-2 text-sm text-theme-subtle">
                                {data.finance.todayOrders} طلبًا دخل إلى خط الإيراد منذ بداية اليوم.
                            </p>
                        </div>

                        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
                            <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">معدل التحصيل</p>
                            <p className="mt-3 text-2xl font-black text-theme sm:text-3xl">{formatPercent(data.finance.collectionRate)}</p>
                            <p className="mt-2 text-sm text-theme-subtle">
                                نسبة الطلبات المدفوعة فعليًا من إجمالي الطلبات خلال الفترة.
                            </p>
                        </div>

                        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
                            <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">حجم المتابعة</p>
                            <p className="mt-3 text-2xl font-black text-theme sm:text-3xl">{data.finance.activeRevenueQueue}</p>
                            <p className="mt-2 text-sm text-theme-subtle">
                                طلبات تحتاج متابعة دفع مباشرة بين معلّق ومتعثّر.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                <MetricCard
                    title="إيراد الفترة"
                    value={formatCurrency(data.summary.totalRevenue)}
                    subtitle={`من ${data.finance.paidOrders} طلبًا مدفوعًا خلال ${PERIODS.find((option) => option.id === period)?.label || period}.`}
                    icon={DollarSign}
                    accent="#ceae7f"
                    growth={data.previousPeriod?.revenueGrowth}
                />
                <MetricCard
                    title="قيمة التحصيل المعلّق"
                    value={formatCurrency(data.finance.outstandingRevenue)}
                    subtitle="إجمالي قيمة الطلبات التي ما زالت بانتظار الدفع وتحتاج متابعة."
                    icon={Clock3}
                    accent="#f59e0b"
                />
                <MetricCard
                    title="قيمة معرضة للتعثر"
                    value={formatCurrency(data.finance.atRiskRevenue)}
                    subtitle="طلبـات فشل دفعها وتحتاج قرارًا تشغيليًا أو إعادة محاولة."
                    icon={AlertTriangle}
                    accent="#ef4444"
                />
                <MetricCard
                    title="الطلبات المدفوعة"
                    value={formatCompact(data.finance.paidOrders)}
                    subtitle="عدد الطلبات التي تحولت إلى إيراد فعلي."
                    icon={CreditCard}
                    accent="#22c55e"
                    growth={data.previousPeriod?.ordersGrowth}
                />
                <MetricCard
                    title="الخصومات الممنوحة"
                    value={formatCurrency(data.finance.discountGranted)}
                    subtitle="قيمة الخصومات التي أثرت مباشرة على صافي الفاتورة في الفترة."
                    icon={TrendingUp}
                    accent="#8b5cf6"
                />
                <MetricCard
                    title="متوسط الفاتورة المدفوعة"
                    value={formatCurrency(data.summary.avgOrderValue)}
                    subtitle={`تم تسليم ${formatCompact(data.finance.deliveredOrders)} طلبًا وانتهى ${formatCompact(data.finance.cancelledOrRefunded)} إلى إلغاء أو استرداد.`}
                    icon={Package}
                    accent="#38bdf8"
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
                <div className={`${panelClass} p-5 sm:p-6`}>
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-theme">مسار الإيراد اليومي</h3>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                قراءة مباشرة لحجم الإيراد وعدد الطلبات المدفوعة عبر الأيام داخل الفترة المختارة.
                            </p>
                        </div>
                        <div className="text-left text-sm">
                            <p className="font-black text-theme">{formatCurrency(data.summary.totalRevenue)}</p>
                            <p className="mt-1 text-theme-faint">إجمالي الإيراد</p>
                        </div>
                    </div>
                    <div className="-mx-2 overflow-x-auto px-2">
                        <div className="h-80 min-w-[640px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={revenueChartData}>
                                <defs>
                                    <linearGradient id="financeRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ceae7f" stopOpacity={0.18} />
                                        <stop offset="100%" stopColor="#ceae7f" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.42)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.42)" fontSize={11} tickFormatter={(value) => `${value}`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(20,20,20,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                    }}
                                    labelStyle={{ color: "#ceae7f" }}
                                    formatter={(value, name) =>
                                        [String(name).includes("إيراد") ? `${Number(value).toLocaleString()} ر.س` : value, name]
                                    }
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    name="إيراد"
                                    stroke="#ceae7f"
                                    fill="url(#financeRevenueGradient)"
                                    strokeWidth={2.4}
                                />
                                <Bar dataKey="orders" name="طلبات مدفوعة" fill="rgba(206,174,127,0.32)" radius={[5, 5, 0, 0]} />
                            </ComposedChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6">
                    <MixBars
                        title="توزيع حالات الطلب"
                        subtitle="يظهر أين تقف الطلبات على الخط التشغيلي الكامل، لا المالي فقط."
                        items={data.mixes.orderStatus}
                        color="linear-gradient(90deg,#ceae7f,#f59e0b)"
                    />
                    <MixBars
                        title="توزيع حالات الدفع"
                        subtitle="قراءة مركزة لخط التحصيل الحالي بين المدفوع والمعلّق والمتعثر."
                        items={data.mixes.paymentStatus}
                        color="linear-gradient(90deg,#22c55e,#38bdf8)"
                    />
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <FinanceQueueCard
                    title="مكتب التحصيل"
                    subtitle="الطلبات التي لم تتحول إلى دفع بعد وتحتاج متابعة قريبة."
                    emptyState="لا توجد مدفوعات معلّقة حاليًا."
                    items={data.watchlists.pendingPayments}
                    tone="warning"
                />
                <FinanceQueueCard
                    title="المدفوعات المتعثرة"
                    subtitle="طلبات واجهت فشلًا في الدفع وتحتاج تدخلًا أو إعادة محاولة."
                    emptyState="لا توجد مدفوعات متعثرة ضمن الفترة الحالية."
                    items={data.watchlists.failedPayments}
                    tone="critical"
                />
                <FinanceQueueCard
                    title="الإيراد المغلق"
                    subtitle="أحدث الطلبات التي أغلقت ماليًا وتحولت إلى إيراد مؤكد."
                    emptyState="لا توجد طلبات مدفوعة بعد في الفترة الحالية."
                    items={data.watchlists.recentPaid}
                    tone="calm"
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
                <div className={`${panelClass} p-5 sm:p-6`}>
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-theme">نبض النمو</h3>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                حركة المستخدمين الجدد مهمة لفهم ما إذا كان خط الإيراد مدعومًا بطلب مستقبلي أم لا.
                            </p>
                        </div>
                        <div className="text-left text-sm">
                            <p className="font-black text-theme">{formatCompact(data.summary.totalUsers)}</p>
                            <p className="mt-1 text-theme-faint">مستخدمون جدد</p>
                        </div>
                    </div>
                    <div className="-mx-2 overflow-x-auto px-2">
                        <div className="h-72 min-w-[560px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={usersChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.42)" fontSize={11} />
                                <YAxis stroke="rgba(255,255,255,0.42)" fontSize={11} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(20,20,20,0.95)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "12px",
                                    }}
                                />
                                <Bar dataKey="users" name="مستخدمون جدد" fill="#ceae7f" radius={[5, 5, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className={`${panelClass} p-5 sm:p-6`}>
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-theme">محركات الإيراد</h3>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                المنتجات الأعلى في الدفع الفعلي، حتى تعرف ما الذي يسحب الإيراد إلى الأعلى داخل المتجر.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold">
                            <Users className="h-3.5 w-3.5" />
                            أعلى 10 منتجات
                        </div>
                    </div>

                    {data.topProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-theme-subtle text-theme-subtle">
                                        <th className="px-4 py-3 text-right">#</th>
                                        <th className="px-4 py-3 text-right">المنتج</th>
                                        <th className="px-4 py-3 text-right">الكمية</th>
                                        <th className="px-4 py-3 text-right">الإيراد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topProducts.map((product, index) => (
                                        <tr key={product.productId} className="border-b border-theme-faint last:border-b-0">
                                            <td className="px-4 py-3 text-theme-soft">{index + 1}</td>
                                            <td className="px-4 py-3 font-semibold text-theme">{product.title}</td>
                                            <td className="px-4 py-3 text-theme-soft">{product.quantity}</td>
                                            <td className="px-4 py-3 font-bold text-gold">{formatCurrency(product.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-10 text-center text-sm text-theme-subtle">
                            لا توجد مبيعات مدفوعة كافية لإظهار محركات الإيراد في هذه الفترة.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
