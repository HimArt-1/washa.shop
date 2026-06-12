"use client";

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface RevenueDataPoint {
    date: string;
    revenue: number;
    orders: number;
}

interface RevenueChartProps {
    data: RevenueDataPoint[];
    title?: string;
}

export default function RevenueChart({ data, title = "الإيرادات والأداء" }: RevenueChartProps) {
    
    // Calculate totals summary to display along the top if needed
    const totalRevenueDisplay = useMemo(() => {
        const total = data.reduce((acc, curr) => acc + curr.revenue, 0);
        return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(total);
    }, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-xl shadow-2xl space-y-2 dir-rtl">
                    <p className="text-white/80 font-medium pb-2 border-b border-white/10">{label}</p>
                    <div className="flex items-center justify-between gap-6">
                        <span className="text-gold font-bold">المبيعات:</span>
                        <span className="text-white">
                            {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(payload[0].value)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                        <span className="text-emerald-400 font-bold">الطلبات:</span>
                        <span className="text-white">{payload[0].payload.orders || 0} طلبات</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#0F0F0F]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-white font-bold text-xl">{title}</h3>
                    <p className="text-theme-subtle text-sm mt-1">تتبع أداء المتجر خلال الأيام السبعة الماضية</p>
                </div>
                <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/5 text-center">
                    <span className="block text-theme-subtle text-xs mb-1 font-medium tracking-wider uppercase">إجمالي العوائد للرسم البياني</span>
                    <span className="block text-gold text-2xl font-bold">{totalRevenueDisplay}</span>
                </div>
            </div>

            <div className="h-[300px] w-full mt-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="date" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#A3A3A3', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#A3A3A3', fontSize: 12 }}
                            tickFormatter={(value) => `${value}`}
                            width={50}
                        />
                        <CartesianGrid 
                            vertical={false} 
                            strokeDasharray="3 3" 
                            stroke="rgba(255,255,255,0.05)" 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#D4AF37" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                            activeDot={{ r: 6, fill: '#D4AF37', stroke: '#000', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
