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
        <div className="space-y-8 mb-8 mt-4" dir="rtl">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Total Stats Card */}
                <div className="relative group rounded-3xl overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-gold/30 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(212,175,55,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-gold/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
                    <div className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-neutral-400 text-sm font-medium tracking-wide">إجمالي التوليد</p>
                            <div className="p-2.5 bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                <ActivityIcon className="w-5 h-5 text-gold" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <h4 className="text-4xl font-black bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent drop-shadow-sm">{stats.totalRequests}</h4>
                            <span className="text-xs text-gold/80 mb-1.5 px-2 py-1 rounded-md bg-gold/10 border border-gold/20 flex items-center gap-1">آخر 7 أيام</span>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-gradient-to-r from-gold/50 to-transparent absolute bottom-0 right-0 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300" />
                </div>

                {/* Success Stats Card */}
                <div className="relative group rounded-3xl overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-green-500/30 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(74,222,128,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-green-500/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
                    <div className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-neutral-400 text-sm font-medium tracking-wide">النجاح والاستقرار</p>
                            <div className="p-2.5 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/20 rounded-xl shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex items-baseline gap-1">
                                <h4 className="text-4xl font-black bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent drop-shadow-sm">{successRate}</h4>
                                <span className="text-xl text-neutral-500 font-bold">%</span>
                            </div>
                            <span className="text-xs text-green-400 mb-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">{stats.statusDistribution.success} دقة</span>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-gradient-to-r from-green-500/50 to-transparent absolute bottom-0 right-0 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300" />
                </div>

                {/* Spam Protection Card */}
                <div className="relative group rounded-3xl overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-gold/30 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(212,175,55,0.15)]">
                     <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-gold/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
                    <div className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-neutral-400 text-sm font-medium tracking-wide">تدخلات الحماية</p>
                            <div className="p-2.5 bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                <SlashIcon className="w-5 h-5 text-gold" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <h4 className="text-4xl font-black bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent drop-shadow-sm">{stats.statusDistribution.quotaExceeded}</h4>
                            <span className="text-xs text-gold/90 mb-1.5 px-2 py-1 rounded-md bg-gold/10 border border-gold/20">محظر وممنوع</span>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-gradient-to-r from-gold/50 to-transparent absolute bottom-0 right-0 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300" />
                </div>

                {/* Errors Card */}
                <div className="relative group rounded-3xl overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-red-500/30 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(248,113,113,0.15)]">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-red-500/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
                    <div className="p-6 relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-neutral-400 text-sm font-medium tracking-wide">أخطاء السيرفر</p>
                            <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 rounded-xl shadow-[0_0_15px_rgba(248,113,113,0.2)]">
                                <AlertTriangleIcon className="w-5 h-5 text-red-400" />
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-4xl font-black bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent drop-shadow-sm">{stats.statusDistribution.error + stats.statusDistribution.timeout}</h4>
                            </div>
                            <span className="text-xs text-red-300 mb-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">أخطاء برمجية</span>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-gradient-to-r from-red-500/50 to-transparent absolute bottom-0 right-0 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300" />
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Area Chart: Traffic Trend */}
                <div className="lg:col-span-2 relative group rounded-3xl overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-gold/20 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-6 z-10 flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                    
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold text-white flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.6)]"></span>
                            نبض السيرفر الجرافيكي
                        </h4>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-neutral-400 tracking-wider">LIVE TELEMETRY</span>
                    </div>

                    <div className="h-[300px] w-full mt-auto" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={PIE_COLORS.success} stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor={PIE_COLORS.success} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={PIE_COLORS.error} stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor={PIE_COLORS.error} stopOpacity={0}/>
                                    </linearGradient>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `${value}`} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.95)', borderColor: 'rgba(212, 175, 55, 0.3)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(212,175,55,0.1)' }}
                                    itemStyle={{ color: '#fff', fontSize: '14px', padding: '4px 0' }}
                                    cursor={{ stroke: 'rgba(212, 175, 55, 0.2)', strokeWidth: 2, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="success" name="عملية ناجحة" stroke={PIE_COLORS.success} strokeWidth={3} fillOpacity={1} fill="url(#colorSuccess)" filter="url(#glow)" activeDot={{ r: 6, fill: PIE_COLORS.success, stroke: '#000', strokeWidth: 2 }} />
                                <Area type="monotone" dataKey="failed" name="فشل/رفض" stroke={PIE_COLORS.error} strokeWidth={3} fillOpacity={1} fill="url(#colorFailed)" filter="url(#glow)" activeDot={{ r: 6, fill: PIE_COLORS.error, stroke: '#000', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart: Distribution */}
                <div className="relative group rounded-3xl overflow-hidden bg-black/40 backdrop-blur-3xl border border-white/5 hover:border-gold/20 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] p-6 z-10 flex flex-col items-center">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
                    
                    <h4 className="text-lg font-bold text-white w-full mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.6)]"></span>
                            توزيع الحالات
                        </div>
                    </h4>

                    <div className="h-[250px] w-full mt-2 relative flex justify-center items-center">
                        {pieData.length > 0 ? (
                            <>
                                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                    <div className="w-32 h-32 rounded-full border border-gold border-dashed animate-[spin_30s_linear_infinite]" />
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={95}
                                            paddingAngle={8}
                                            cornerRadius={8}
                                            dataKey="value"
                                            stroke="transparent"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}40)` }} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            contentStyle={{ backgroundColor: 'rgba(10, 10, 10, 0.95)', borderColor: 'rgba(212, 175, 55, 0.3)', borderRadius: '12px', border: '1px solid', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </>
                        ) : (
                            <p className="text-neutral-500 text-sm font-medium bg-black/40 px-4 py-2 rounded-lg border border-white/5">يتم تجميع البيانات...</p>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-x-4 gap-y-3 flex-wrap justify-center mt-6 w-full">
                        {pieData.map((entry, idx) => (
                           <div key={idx} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                               <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }}></span>
                               <span className="text-xs text-neutral-300 font-medium">{entry.name}</span>
                               <span className="text-xs text-white ml-2 opacity-80" dir="ltr">{entry.value}</span>
                           </div> 
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
