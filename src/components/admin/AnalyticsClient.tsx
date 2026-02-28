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
import { TrendingUp, Package, Users, DollarSign } from "lucide-react";

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

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-fg">لوحة التحليلات</h1>
                    <p className="text-fg/50 text-sm mt-1">إيرادات ومبيعات ومستخدمين</p>
                </div>
                <div className="flex gap-2">
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => handlePeriodChange(p.id)}
                            disabled={loading}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                period === p.id
                                    ? "bg-gold/20 text-gold border border-gold/40"
                                    : "bg-white/5 text-fg/60 border border-white/10 hover:bg-white/10"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 text-fg/50 text-sm mb-1">
                        <DollarSign className="w-4 h-4" />
                        إجمالي الإيرادات
                    </div>
                    <p className="text-xl font-bold text-fg">
                        {data.summary.totalRevenue.toLocaleString()} ر.س
                    </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 text-fg/50 text-sm mb-1">
                        <Package className="w-4 h-4" />
                        عدد الطلبات
                    </div>
                    <p className="text-xl font-bold text-fg">{data.summary.totalOrders}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 text-fg/50 text-sm mb-1">
                        <Users className="w-4 h-4" />
                        مستخدمون جدد
                    </div>
                    <p className="text-xl font-bold text-fg">{data.summary.totalUsers}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 text-fg/50 text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        متوسط قيمة الطلب
                    </div>
                    <p className="text-xl font-bold text-fg">
                        {Math.round(data.summary.avgOrderValue).toLocaleString()} ر.س
                    </p>
                </div>
            </div>

            {/* Revenue & Orders chart */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <h2 className="text-lg font-bold text-fg mb-4">الإيرادات والطلبات</h2>
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
                                formatter={(value: number, name: string) =>
                                    [name.includes("إيرادات") ? `${value.toLocaleString()} ر.س` : value, name]
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
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <h2 className="text-lg font-bold text-fg mb-4">المستخدمون الجدد</h2>
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
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
                <h2 className="text-lg font-bold text-fg mb-4">أكثر المنتجات مبيعاً</h2>
                {data.topProducts.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-fg/50 border-b border-white/10">
                                    <th className="text-right py-3 px-4">#</th>
                                    <th className="text-right py-3 px-4">المنتج</th>
                                    <th className="text-right py-3 px-4">الكمية</th>
                                    <th className="text-right py-3 px-4">الإيرادات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topProducts.map((p, i) => (
                                    <tr key={p.productId} className="border-b border-white/5">
                                        <td className="py-3 px-4 text-fg/60">{i + 1}</td>
                                        <td className="py-3 px-4 font-medium text-fg">{p.title}</td>
                                        <td className="py-3 px-4 text-fg/80">{p.quantity}</td>
                                        <td className="py-3 px-4 text-gold">{p.revenue.toLocaleString()} ر.س</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-fg/50 text-sm py-8 text-center">لا توجد مبيعات في الفترة المحددة</p>
                )}
            </div>
        </div>
    );
}
