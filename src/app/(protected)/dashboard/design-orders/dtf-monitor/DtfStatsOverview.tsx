"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ActivityIcon, CheckCircleIcon, SlashIcon, AlertTriangleIcon } from "lucide-react";
import type { DtfTelemetryStats } from "@/app/actions/dtf-telemetry";

interface DtfStatsOverviewProps {
    stats: DtfTelemetryStats;
}

const PIE_COLORS = {
    success: "#4ade80", // green-400
    error: "#f87171",   // red-400
    timeout: "#fb923c", // orange-400
    quota: "#d4af37",   // gold
};

export function DtfStatsOverview({ stats }: DtfStatsOverviewProps) {
    const pieData = useMemo(() => {
        return [
            { name: "نجاح (Success)", value: stats.statusDistribution.success, color: PIE_COLORS.success },
            { name: "فشل تقني (Error)", value: stats.statusDistribution.error, color: PIE_COLORS.error },
            { name: "انقضاء الوقت (Timeout)", value: stats.statusDistribution.timeout, color: PIE_COLORS.timeout },
            { name: "تجاوز الحد (Spam)", value: stats.statusDistribution.quotaExceeded, color: PIE_COLORS.quota },
        ].filter(item => item.value > 0);
    }, [stats.statusDistribution]);

    const successRate = stats.totalRequests === 0 
        ? 0 
        : Math.round((stats.statusDistribution.success / stats.totalRequests) * 100);

    return (
        <div className="space-y-6 mb-8 mt-2" dir="rtl">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface/50 border border-gold/20 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-neutral-400 text-sm font-medium">إجمالي التوليد</p>
                        <div className="p-2 bg-gold/10 rounded-lg">
                            <ActivityIcon className="w-5 h-5 text-gold" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <h4 className="text-3xl font-bold text-white">{stats.totalRequests}</h4>
                        <span className="text-xs text-neutral-500 mb-1">آخر 7 أيام</span>
                    </div>
                </div>

                <div className="bg-surface/50 border border-green-500/20 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-neutral-400 text-sm font-medium">نسبة النجاح والاستقرار</p>
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <h4 className="text-3xl font-bold text-white">{successRate}%</h4>
                        <span className="text-xs text-green-400/80 mb-1">{stats.statusDistribution.success} دقة</span>
                    </div>
                </div>

                <div className="bg-surface/50 border border-gold/20 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-neutral-400 text-sm font-medium">تدخلات الحماية (Spam)</p>
                        <div className="p-2 bg-gold/10 rounded-lg">
                            <SlashIcon className="w-5 h-5 text-gold" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <h4 className="text-3xl font-bold text-white">{stats.statusDistribution.quotaExceeded}</h4>
                        <span className="text-xs text-gold/80 mb-1">محاولة محظورة</span>
                    </div>
                </div>

                <div className="bg-surface/50 border border-red-500/20 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-neutral-400 text-sm font-medium">أخطاء السيرفر</p>
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangleIcon className="w-5 h-5 text-red-400" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <h4 className="text-3xl font-bold text-white">{stats.statusDistribution.error + stats.statusDistribution.timeout}</h4>
                        <span className="text-xs text-red-400/80 mb-1">خطأ وتأخير</span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Area Chart: Traffic Trend */}
                <div className="lg:col-span-2 bg-surface/50 border border-gold/10 rounded-2xl p-6 backdrop-blur-xl">
                    <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-gold rounded-full"></span>
                        نشاط الذكاء الاصطناعي (أسبوعي)
                    </h4>
                    <div className="h-[300px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={PIE_COLORS.success} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={PIE_COLORS.success} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={PIE_COLORS.error} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={PIE_COLORS.error} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: 'rgba(15, 15, 15, 0.9)', borderColor: 'rgba(212, 175, 55, 0.2)', borderRadius: '12px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="success" name="نجاح" stroke={PIE_COLORS.success} strokeWidth={3} fillOpacity={1} fill="url(#colorSuccess)" />
                                <Area type="monotone" dataKey="failed" name="فشل/رفض" stroke={PIE_COLORS.error} strokeWidth={3} fillOpacity={1} fill="url(#colorFailed)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart: Distribution */}
                <div className="bg-surface/50 border border-gold/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col items-center">
                    <h4 className="text-lg font-bold text-white w-full mb-2 flex items-center gap-2">
                        <span className="w-2 h-6 bg-gold rounded-full"></span>
                        توزيع السيرفر
                    </h4>
                    <div className="h-[250px] w-full mt-4 flex justify-center items-center">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="transparent"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'rgba(15, 15, 15, 0.9)', borderColor: 'rgba(212, 175, 55, 0.2)', borderRadius: '8px', border: '1px solid' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-neutral-500 text-sm">لا توجد بيانات كافية</p>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 flex-wrap justify-center mt-2">
                        {pieData.map((entry, idx) => (
                           <div key={idx} className="flex items-center gap-2">
                               <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                               <span className="text-xs text-neutral-300">{entry.name}</span>
                           </div> 
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
