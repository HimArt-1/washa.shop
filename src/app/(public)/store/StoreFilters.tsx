"use client";

import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import type { SortOption } from "@/app/actions/products";

const productTypes = [
    { value: "all",      label: "الكل" },
    { value: "apparel",  label: "ملابس" },
    { value: "print",    label: "طباعة" },
    { value: "digital",  label: "رقمي" },
    { value: "original", label: "أعمال أصلية" },
    { value: "nft",      label: "NFT" },
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
        <div className="store-filter-inline mt-5">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                {productTypes.map((t) => (
                    <button
                        key={t.value}
                        onClick={() => router.push(`/store?${buildParams({ type: t.value })}`)}
                        className={`store-filter-chip min-h-[40px] shrink-0 rounded-2xl border px-4 py-2 text-xs font-medium transition-all ${
                            currentType === t.value ? "store-filter-chip--active" : ""
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-theme-subtle" />
                    <select
                        value={currentSort}
                        onChange={(e) => router.push(`/store?${buildParams({ sort: e.target.value })}`)}
                        className="store-select h-11 w-full rounded-2xl px-4 text-sm sm:min-w-[220px]"
                    >
                        {sortOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                <label className="store-stock-toggle flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 sm:min-w-[220px]">
                    <span className="text-sm font-medium transition-colors">المتوفر فقط</span>
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={inStockOnly}
                            onChange={() => router.push(`/store?${buildParams({ inStock: !inStockOnly })}`)}
                        />
                        <div className={`block h-6 w-10 rounded-full transition-colors ${inStockOnly ? "store-stock-toggle-track--active" : "store-stock-toggle-track"}`} />
                        <div className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${inStockOnly ? "translate-x-4" : ""}`} />
                    </div>
                </label>
            </div>
        </div>
    );
}
