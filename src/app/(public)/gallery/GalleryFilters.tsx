"use client";

import { useRouter } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

interface GalleryFiltersProps {
    categories: any[];
    currentCategory: string;
    currentSearch: string;
}

export function GalleryFilters({ categories, currentCategory, currentSearch }: GalleryFiltersProps) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);

    const navigate = (category: string, searchQuery?: string) => {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (searchQuery) params.set("search", searchQuery);
        router.push(`/gallery?${params.toString()}`);
    };

    const allCategories = [{ slug: "all", name_ar: "الكل" }, ...categories];

    return (
        <div className="mb-10 space-y-4">
            {/* Search bar */}
            <div className="relative overflow-hidden rounded-[1.75rem] premium-card p-4 sm:p-5">
                <div className="absolute top-0 right-0 w-40 h-20 rounded-full bg-[var(--wusha-gold)]/5 blur-2xl pointer-events-none" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 60%, transparent)' }} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && navigate(currentCategory, search)}
                            placeholder="ابحث عن لوحة، فنان، أسلوب..."
                            className="input-dark h-12 w-full rounded-2xl pr-11 pl-12 text-sm transition-all duration-300 focus:shadow-[0_0_0_2px_rgba(201,168,106,0.2)]"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(""); navigate(currentCategory, ""); }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-[var(--wusha-gold)]/10"
                                style={{ color: 'color-mix(in srgb, var(--wusha-text) 50%, transparent)' }}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => navigate(currentCategory, search)}
                        className="btn-gold h-12 rounded-2xl px-6 text-sm font-bold shrink-0 flex items-center gap-2"
                    >
                        <Search className="w-4 h-4" />
                        بحث
                    </button>
                </div>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2">
                <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-1" style={{ color: 'color-mix(in srgb, var(--wusha-text) 40%, transparent)' }}>
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تصفية</span>
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible" style={{ scrollbarWidth: 'none' }}>
                    {allCategories.map((cat) => {
                        const isActive = currentCategory === cat.slug;
                        return (
                            <button
                                key={cat.slug}
                                onClick={() => navigate(cat.slug, search)}
                                className="shrink-0 relative rounded-2xl px-4 py-2 text-xs font-medium transition-all duration-300 border"
                                style={isActive ? {
                                    background: 'linear-gradient(135deg, rgba(201,168,106,0.12) 0%, rgba(201,168,106,0.06) 100%)',
                                    borderColor: 'rgba(201,168,106,0.35)',
                                    color: 'var(--wusha-gold)',
                                    boxShadow: '0 0 12px rgba(201,168,106,0.08)',
                                } : {
                                    background: 'transparent',
                                    borderColor: 'transparent',
                                    color: 'color-mix(in srgb, var(--wusha-text) 50%, transparent)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,106,0.2)';
                                        (e.currentTarget as HTMLButtonElement).style.color = 'var(--wusha-text)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                                        (e.currentTarget as HTMLButtonElement).style.color = 'color-mix(in srgb, var(--wusha-text) 50%, transparent)';
                                    }
                                }}
                            >
                                {cat.name_ar}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
