"use client";

import { motion } from 'framer-motion';
import { Package, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { TopProduct } from '@/app/actions/analytics';

interface TopProductsListProps {
    products: TopProduct[];
}

export default function TopProductsList({ products }: TopProductsListProps) {
    if (!products || products.length === 0) {
        return (
            <div className="theme-surface-panel flex min-h-[300px] w-full flex-col items-center justify-center rounded-3xl p-6 md:p-8">
                <Package className="w-12 h-12 text-theme-faint mb-4" />
                <p className="text-theme-subtle">لا توجد مبيعات كافية لعرض المنتجات الأكثر مبيعاً</p>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-surface-panel flex h-full w-full flex-col rounded-3xl p-6 md:p-8"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-gold" />
                </div>
                <div>
                    <h3 className="text-theme font-bold text-lg">الأكثر مبيعاً</h3>
                    <p className="text-theme-subtle text-xs">أفضل 5 منتجات من حيث المبيعات المكتملة</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {products.map((product, index) => (
                    <div 
                        key={product.id}
                        className="group flex items-center justify-between rounded-2xl border border-theme-subtle bg-theme-faint p-4 transition-colors hover:border-gold/30 hover:bg-theme-subtle"
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-2xl font-black text-theme-faint group-hover:text-gold/50 transition-colors w-6">
                                {index + 1}
                            </span>
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_74%,transparent)]">
                                {product.image_url ? (
                                    <Image 
                                        src={product.image_url} 
                                        alt={product.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-5 h-5 text-theme-faint" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-theme font-medium text-sm line-clamp-1">{product.title}</h4>
                                <p className="text-theme-subtle text-xs mt-1">{product.total_sold} وحدة مباعة</p>
                            </div>
                        </div>
                        <div className="text-left">
                            <span className="block text-gold font-bold text-sm">
                                {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(product.revenue)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
