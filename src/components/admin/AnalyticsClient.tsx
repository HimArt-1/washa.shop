"use client";

import { useState } from "react";
import {
    ComposedChart,
    Area,
    Bar,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { getAdminAnalytics, type AnalyticsData, type AnalyticsPeriod } from "@/app/actions/admin";
import { TrendingUp, Package, Users, DollarSign, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
    { id: "7d", label: "7 أيام" },
    { id: "30d", label: "30 يوماً" },
    { id: "90d", label: "90 يوماً" },
];

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
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

    const handlePeriodChange = async (p: AnalyticsPeriod) => {
        setPeriod(p);
        setLoading(true);
        try {
            const result = await getAdminAnalytics(p);
            setData(result);
        } finally {
            setLoading(false);
        }
    };

    const revenueChartData = data.revenueByDay.map((d) => ({
        date: formatDate(d.date),
        revenue: Math.round(d.revenue),
        orders: d.orders,
    }));

    const usersChartData = data.usersByDay.map((d) => ({
        date: formatDate(d.date),
        users: d.count,
    }));

    const exportCSV = () => {
        const usersMap = new Map(data.usersByDay.map((u) => [u.date, u.count]));
        const rows: string[][] = [
            ["التاريخ", "الإيرادات (ر.س)", "الطلبات", "المستخدمون الجدد"],
            ...data.revenueByDay.map((d) => [
                d.date,
                String(Math.round(d.revenue)),
                String(d.orders),
                String(usersMap.get(d.date) ?? 0),
            ]),
            [],
            ["المنتج", "الكمية", "الإيرادات (ر.س)"],
            ...data.topProducts.map((p) => [p.title, String(p.quantity), String(p.revenue)]),
        ];
        const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wusha-analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-theme">لوحة التحليلات</h1>
                    <p className="text-theme-subtle text-sm mt-1">إيرادات ومبيعات ومستخدمين</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={exportCSV}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-theme-soft hover:border-gold/40 text-theme-soft hover:text-gold transition-colors inline-flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        تصدير CSV
                    </button>
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => handlePeriodChange(p.id)}
                            disabled={loading}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                period === p.id
                                    ? "bg-gold/20 text-gold border border-gold/40"
                                    : "bg-theme-subtle text-theme-soft border border-theme-soft hover:bg-white/10"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary cards + مقارنة الفترة السابقة */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl glass-premium border border-theme-soft hover:border-gold/20 transition-all duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-theme-subtle text-sm mb-1">
                            <DollarSign className="w-4 h-4" />
                            إجمالي الإيرادات
                        </div>
                        {data.previousPeriod && (
                            <span className={`text-xs flex items-center gap-0.5 ${data.previousPeriod.revenueGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {data.previousPeriod.revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {data.previousPeriod.revenueGrowth >= 0 ? "+" : ""}{data.previousPeriod.revenueGrowth.toFixed(1)}%
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold text-theme">
                        {data.summary.totalRevenue.toLocaleString()} ر.س
                    </p>
                    {data.previousPeriod && (
                        <p className="text-xs text-theme-faint mt-1">الفترة السابقة: {data.previousPeriod.totalRevenue.toLocaleString()} ر.س</p>
                    )}
                </div>
                <div className="p-4 rounded-2xl glass-premium border border-theme-soft hover:border-gold/20 transition-all duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-theme-subtle text-sm mb-1">
                            <Package className="w-4 h-4" />
                            عدد الطلبات
                        </div>
                        {data.previousPeriod && (
                            <span className={`text-xs flex items-center gap-0.5 ${data.previousPeriod.ordersGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {data.previousPeriod.ordersGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {data.previousPeriod.ordersGrowth >= 0 ? "+" : ""}{data.previousPeriod.ordersGrowth.toFixed(1)}%
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold text-theme">{data.summary.totalOrders}</p>
                    {data.previousPeriod && (
                        <p className="text-xs text-theme-faint mt-1">الفترة السابقة: {data.previousPeriod.totalOrders}</p>
                    )}
                </div>
                <div className="p-4 rounded-2xl glass-premium border border-theme-soft hover:border-gold/20 transition-all duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-theme-subtle text-sm mb-1">
                            <Users className="w-4 h-4" />
                            مستخدمون جدد
                        </div>
                        {data.previousPeriod && (
                            <span className={`text-xs flex items-center gap-0.5 ${data.previousPeriod.usersGrowth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {data.previousPeriod.usersGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {data.previousPeriod.usersGrowth >= 0 ? "+" : ""}{data.previousPeriod.usersGrowth.toFixed(1)}%
                            </span>
                        )}
                    </div>
                    <p className="text-xl font-bold text-theme">{data.summary.totalUsers}</p>
                    {data.previousPeriod && (
                        <p className="text-xs text-theme-faint mt-1">الفترة السابقة: {data.previousPeriod.totalUsers}</p>
                    )}
                </div>
                <div className="p-4 rounded-2xl glass-premium border border-theme-soft hover:border-gold/20 transition-all duration-500">
                    <div className="flex items-center gap-2 text-theme-subtle text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        متوسط قيمة الطلب
                    </div>
                    <p className="text-xl font-bold text-theme">
                        {Math.round(data.summary.avgOrderValue).toLocaleString()} ر.س
                    </p>
                </div>
            </div>

            {/* Revenue & Orders chart */}
            <div className="rounded-2xl glass-premium border border-theme-soft p-6">
                <h2 className="text-lg font-bold text-theme mb-4">الإيرادات والطلبات</h2>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueChartData}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ceae7f" stopOpacity={0.1} />
                                    <stop offset="100%" stopColor="#ceae7f" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => `${v}`} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "rgba(20,20,20,0.95)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "12px",
                                }}
                                labelStyle={{ color: "#ceae7f" }}
                                formatter={(value, name) =>
                                    [String(name ?? "").includes("إيرادات") ? `${(value ?? 0).toLocaleString()} ر.س` : (value ?? 0), name ?? ""]
                                }
                                labelFormatter={(label) => `التاريخ: ${label}`}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                name="إيرادات (ر.س)"
                                stroke="#ceae7f"
                                fill="url(#revenueGrad)"
                                strokeWidth={2}
                            />
                            <Bar dataKey="orders" name="طلبات" fill="rgba(206,174,127,0.4)" radius={[4, 4, 0, 0]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Users chart */}
            <div className="rounded-2xl glass-premium border border-theme-soft p-6">
                <h2 className="text-lg font-bold text-theme mb-4">المستخدمون الجدد</h2>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={usersChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "rgba(20,20,20,0.95)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "12px",
                                }}
                            />
                            <Bar dataKey="users" name="مستخدمون" fill="#ceae7f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top products */}
            <div className="rounded-2xl glass-premium border border-theme-soft p-6">
                <h2 className="text-lg font-bold text-theme mb-4">أكثر المنتجات مبيعاً</h2>
                {data.topProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-theme-subtle border-b border-theme-soft">
                                    <th className="text-right py-3 px-4">#</th>
                                    <th className="text-right py-3 px-4">المنتج</th>
                                    <th className="text-right py-3 px-4">الكمية</th>
                                    <th className="text-right py-3 px-4">الإيرادات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topProducts.map((p, i) => (
                                    <tr key={p.productId} className="border-b border-white/5">
                                        <td className="py-3 px-4 text-theme-soft">{i + 1}</td>
                                        <td className="py-3 px-4 font-medium text-theme">{p.title}</td>
                                        <td className="py-3 px-4 text-theme-strong">{p.quantity}</td>
                                        <td className="py-3 px-4 text-gold">{p.revenue.toLocaleString()} ر.س</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-theme-subtle text-sm py-8 text-center">لا توجد مبيعات في الفترة المحددة</p>
                )}
            </div>
        </div>
    );
}
