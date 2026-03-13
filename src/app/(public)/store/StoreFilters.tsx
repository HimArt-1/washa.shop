"use client";

import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import type { SortOption } from "@/app/actions/products";

const productTypes = [
    { value: "all",      label: "الكل" },
    { value: "t-shirt",  label: "تيشيرت" },
    { value: "hoodie",   label: "هودي" },
    { value: "mug",      label: "كوب" },
    { value: "poster",   label: "بوستر" },
    { value: "tote-bag", label: "حقيبة" },
];

const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest",     label: "الأحدث" },
    { value: "oldest",     label: "الأقدم" },
    { value: "price_asc",  label: "السعر: تصاعدي" },
    { value: "price_desc", label: "السعر: تنازلي" },
    { value: "rating",     label: "الأعلى تقييماً" },
];

export function StoreFilters({
    currentType,
    inStockOnly = false,
    currentSort = "newest",
}: {
    currentType: string;
    inStockOnly?: boolean;
    currentSort?: SortOption;
}) {
    const router = useRouter();

    const buildParams = (overrides: Record<string, string | boolean>) => {
        const p = new URLSearchParams();
        const type    = "type"    in overrides ? overrides.type    : currentType;
        const stock   = "inStock" in overrides ? overrides.inStock : inStockOnly;
        const sort    = "sort"    in overrides ? overrides.sort    : currentSort;

        if (type && type !== "all")    p.set("type",    String(type));
        if (stock)                      p.set("inStock", "1");
        if (sort && sort !== "newest") p.set("sort",    String(sort));
        return p.toString();
    };

    return (
        <div className="flex flex-col items-center gap-4 mb-8">

            {/* ── Category Pills ── */}
            <div className="flex flex-wrap justify-center gap-2">
                {productTypes.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => router.push(`/store?${buildParams({ type: t.value })}`)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                            currentType === t.value
                                ? "bg-gold/10 text-gold border-gold/30"
                                : "text-theme-faint hover:bg-theme-subtle border-transparent"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Sort + Stock Row ── */}
            <div className="flex flex-wrap items-center justify-center gap-4">

                {/* Sort Select */}
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-theme-subtle" />
                    <select
                        value={currentSort}
                        onChange={(e) => router.push(`/store?${buildParams({ sort: e.target.value })}`)}
                        className="text-xs bg-transparent border border-theme-soft rounded-xl px-3 py-2 text-theme-soft focus:outline-none focus:border-gold/50 cursor-pointer transition-colors hover:border-gold/30"
                    >
                        {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* In-Stock Toggle */}
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={inStockOnly}
                            onChange={() => router.push(`/store?${buildParams({ inStock: !inStockOnly })}`)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${inStockOnly ? "bg-emerald-500" : "bg-theme-soft"}`} />
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${inStockOnly ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-xs font-medium text-theme-subtle group-hover:text-theme transition-colors">
                        المتوفر فقط
                    </span>
                </label>
            </div>
        </div>
    );
}
