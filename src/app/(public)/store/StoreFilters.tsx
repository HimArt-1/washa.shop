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
        <div className="mb-8 space-y-4">
            <div className="theme-surface-panel rounded-[1.75rem] p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">STORE FILTERS</p>
                        <h2 className="mt-1 text-base font-bold text-theme sm:text-lg">فلترة أكثر سرعة ووضوحًا</h2>
                    </div>
                    <div className="text-xs text-theme-faint">
                        اختر النوع، الترتيب، أو اعرض المتوفر فقط
                    </div>
                </div>

                {/* ── Category Pills ── */}
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
                    {productTypes.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => router.push(`/store?${buildParams({ type: t.value })}`)}
                            className={`min-h-[42px] shrink-0 rounded-2xl border px-4 py-2.5 text-xs font-medium transition-all ${
                                currentType === t.value
                                    ? "border-gold/30 bg-gold/10 text-gold"
                                    : "border-transparent text-theme-faint hover:bg-theme-subtle"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Sort + Stock Row ── */}
            <div className="theme-surface-panel flex flex-col gap-4 rounded-[1.75rem] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

                {/* Sort Select */}
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-theme-subtle" />
                    <select
                        value={currentSort}
                        onChange={(e) => router.push(`/store?${buildParams({ sort: e.target.value })}`)}
                        className="input-dark h-11 w-full rounded-2xl px-4 text-sm sm:min-w-[220px]"
                    >
                        {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* In-Stock Toggle */}
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-theme-soft bg-theme-faint px-4 py-3 sm:min-w-[220px]">
                    <span className="text-sm font-medium text-theme-subtle transition-colors">
                        المتوفر فقط
                    </span>
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
                </label>
            </div>
        </div>
    );
}
