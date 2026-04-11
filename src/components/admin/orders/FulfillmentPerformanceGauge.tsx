"use client";

import { motion } from "framer-motion";
import { Activity, Zap, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FulfillmentPerformanceGaugeProps {
    stats: {
        confirmedCount: number;
        processingCount: number;
        shippedCount: number;
    };
}

export function FulfillmentPerformanceGauge({ stats }: FulfillmentPerformanceGaugeProps) {
    const total = stats.confirmedCount + stats.processingCount + stats.shippedCount || 1;
    const efficiency = (stats.shippedCount / total) * 100;
    
    const metrics = [
        { label: "كفاءة التنفيذ", value: Math.round(efficiency), icon: Activity, color: "text-emerald-400", barColor: "bg-emerald-500" },
        { label: "سرعة المعالجة", value: 85, icon: Zap, color: "text-gold", barColor: "bg-gold" },
    ];

    return (
        <div className="space-y-6">
            {metrics.map((metric, idx) => (
                <div key={idx} className="p-6 rounded-[32px] bg-[var(--wusha-surface)] border border-theme-soft relative overflow-hidden group">
                    {/* Background Tech Mesh */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                         style={{ backgroundImage: `linear-gradient(45deg, var(--wucha-gold) 1px, transparent 1px), linear-gradient(-45deg, var(--wucha-gold) 1px, transparent 1px)`, backgroundSize: '10px 10px' }} />
                    
                    <div className="relative flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl bg-theme-faint border border-theme-soft", metric.color)}>
                                <metric.icon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-theme-faint">{metric.label}</h3>
                        </div>
                        <span className={cn("text-xl font-black tabular-nums font-mono", metric.color)}>{metric.value}%</span>
                    </div>

                    <div className="relative h-2 w-full bg-theme-faint rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${metric.value}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className={cn("absolute h-full rounded-full transition-all duration-1000", metric.barColor)}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer scale-x-[3] translate-x-[-100%]" />
                        </motion.div>
                    </div>

                    <div className="mt-4 flex justify-between items-center text-[10px] font-black text-theme-subtle tracking-tighter uppercase">
                        <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 text-gold/40" />
                            <span>المستهدف: 90%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-3 h-3 text-emerald-400/40" />
                            <span>+12% عن الأمس</span>
                        </div>
                    </div>
                </div>
            ))}
            
            {/* Live Operations Pulse */}
            <div className="p-6 rounded-[32px] border border-gold/10 bg-gold/[0.02] flex flex-col items-center justify-center gap-4 py-8">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full border border-gold/40 animate-ping opacity-20" />
                    <div className="w-16 h-16 rounded-full border-2 border-gold/20 flex items-center justify-center relative bg-black/40">
                        <Activity className="w-8 h-8 text-gold animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold mb-1">Live Operational Pulse</p>
                    <p className="text-[9px] text-gold/60 font-medium">الأنظمة تعمل بكفاءة قصوى</p>
                </div>
            </div>
        </div>
    );
}
