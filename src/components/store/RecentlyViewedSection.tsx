"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { History } from "lucide-react";
import { getRecentlyViewed, type RecentlyViewedItem } from "./RecentlyViewedTracker";

export function RecentlyViewedSection({ excludeId }: { excludeId?: string }) {
    const [items, setItems] = useState<RecentlyViewedItem[]>([]);

    useEffect(() => {
        const all = getRecentlyViewed();
        setItems(excludeId ? all.filter(p => p.id !== excludeId) : all);
    }, [excludeId]);

    if (items.length === 0) return null;

    return (
        <div className="mt-16" dir="rtl">
            <h2 className="text-lg font-bold text-theme mb-5 flex items-center gap-2">
                <History className="w-4 h-4 text-gold" />
                شاهدت مؤخراً
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {items.slice(0, 6).map(item => (
                    <Link
                        key={item.id}
                        href={`/products/${item.id}`}
                        className="group shrink-0 w-36 rounded-2xl border border-theme-subtle overflow-hidden hover:border-gold/30 transition-all"
                    >
                        <div className="aspect-square relative bg-surface/30">
                            <Image
                                src={item.image_url}
                                alt={item.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="144px"
                            />
                        </div>
                        <div className="p-2">
                            <p className="text-xs font-medium text-theme truncate">{item.title}</p>
                            <p className="text-xs text-gold mt-0.5">{Number(item.price).toLocaleString()} ر.س</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
