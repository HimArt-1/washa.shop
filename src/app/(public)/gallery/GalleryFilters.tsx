"use client";

import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
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

    return (
        <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="theme-surface-panel rounded-[1.75rem] p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">GALLERY FILTERS</p>
                        <h2 className="mt-1 text-base font-bold text-theme sm:text-lg">استكشف الأعمال بسرعة أكبر</h2>
                    </div>
                    <div className="text-xs text-theme-faint">
                        ابحث أو انتقل مباشرة بين التصنيفات
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && navigate(currentCategory, search)}
                            placeholder="ابحث في المعرض..."
                            className="input-dark h-12 w-full rounded-2xl pr-11 pl-12 text-sm"
                        />
                        {search && (
                            <button
                                onClick={() => { setSearch(""); navigate(currentCategory, ""); }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-faint hover:text-theme-subtle"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => navigate(currentCategory, search)}
                        className="btn-gold h-12 rounded-2xl px-5 text-sm font-bold"
                    >
                        تطبيق البحث
                    </button>
                </div>
            </div>

            {/* Category Pills */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
                <button
                    onClick={() => navigate("all", search)}
                    className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-medium transition-all ${currentCategory === "all"
                            ? "border border-gold/30 bg-gold/10 text-gold"
                            : "border border-transparent text-theme-faint hover:bg-theme-subtle"
                        }`}
                >
                    الكل
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.slug}
                        onClick={() => navigate(cat.slug, search)}
                        className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-medium transition-all ${currentCategory === cat.slug
                                ? "border border-gold/30 bg-gold/10 text-gold"
                                : "border border-transparent text-theme-faint hover:bg-theme-subtle"
                            }`}
                    >
                        {cat.name_ar}
                    </button>
                ))}
            </div>
        </div>
    );
}
