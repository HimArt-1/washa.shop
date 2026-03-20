"use client";

import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Package } from 'lucide-react';
import Image from 'next/image';
import { LowStockItem } from '@/app/actions/analytics';
import Link from 'next/link';

interface LowStockWidgetProps {
    items: LowStockItem[];
}

export default function LowStockWidget({ items }: LowStockWidgetProps) {
    if (!items || items.length === 0) {
        return (
            <div className="theme-surface-panel flex min-h-[300px] w-full flex-col items-center justify-center rounded-3xl p-6 md:p-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-emerald-500/50" />
                </div>
                <h3 className="text-emerald-400 font-bold text-lg mb-1">المخزون ممتاز</h3>
                <p className="text-theme-subtle text-sm text-center">جميع المنتجات متوفرة بكميات آمنة حالياً ولا توجد نواقص.</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-surface-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl p-6 md:p-8"
        >
            {/* Subtle Warning Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-theme font-bold text-lg">تنبيهات المخزون</h3>
                        <p className="text-theme-subtle text-xs">منتجات قاربت على النفاذ تحتاج لتدخل سريع</p>
                    </div>
                </div>
                
                <span className="w-fit bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full border border-red-500/30">
                    {items.length} تنبيهات
                </span>
            </div>

            <div className="relative z-10 flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => {
                    const isCritical = item.quantity <= 2;
                    
                    return (
                        <div
                            key={item.id}
                            className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-start sm:gap-4 ${
                                isCritical 
                                ? "bg-red-500/5 border-red-500/20 hover:border-red-500/50" 
                                : "bg-theme-faint border-theme-subtle hover:border-gold/30 hover:bg-theme-subtle"
                            }`}
                        >
                            <div className="relative mt-1 h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_74%,transparent)]">
                                {item.product.image_url ? (
                                    <Image 
                                        src={item.product.image_url} 
                                        alt={item.product.title}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-5 h-5 text-theme-faint" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-theme font-medium text-sm line-clamp-1">{item.product.title}</h4>
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-theme-subtle">
                                    <span className="font-mono text-xs">{item.sku}</span>
                                    <span>•</span>
                                    <span>مقاس {item.size}</span>
                                </div>
                                <div className="text-xs text-theme-faint mt-1">
                                    {item.warehouse.name}
                                </div>
                            </div>

                            <div className="flex flex-row-reverse items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start shrink-0">
                                <span className={`font-bold text-lg ${isCritical ? 'text-red-400' : 'text-gold'}`}>
                                    {item.quantity}
                                </span>
                                {isCritical && (
                                    <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="relative z-10 mt-6 border-t border-theme-subtle pt-4">
                <Link 
                    href="/dashboard/products-inventory" 
                    className="block w-full text-center text-sm text-theme-subtle hover:text-theme transition-colors"
                >
                    إدارة المخزون بالكامل &rarr;
                </Link>
            </div>
        </motion.div>
    );
}
