"use client";

import { useRouter } from "next/navigation";

const productTypes = [
    { value: "all", label: "الكل" },
    { value: "t-shirt", label: "تيشيرت" },
    { value: "hoodie", label: "هودي" },
    { value: "mug", label: "كوب" },
    { value: "poster", label: "بوستر" },
    { value: "tote-bag", label: "حقيبة" },
];

export function StoreFilters({ currentType, inStockOnly = false }: { currentType: string, inStockOnly?: boolean }) {
    const router = useRouter();

    const handleTypeChange = (typeStr: string) => {
        const params = new URLSearchParams();
        if (typeStr !== "all") params.set("type", typeStr);
        if (inStockOnly) params.set("inStock", "1");
        router.push(`/store?${params.toString()}`);
    };

    const handleStockToggle = () => {
        const params = new URLSearchParams();
        if (currentType !== "all") params.set("type", currentType);
        if (!inStockOnly) params.set("inStock", "1"); // toggling to true
        router.push(`/store?${params.toString()}`);
    };

    return (
        <div className="flex flex-col items-center gap-4 mb-8">
            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-2">
                {productTypes.map((type) => (
                    <button
                        key={type.value}
                        onClick={() => handleTypeChange(type.value)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${currentType === type.value
                            ? "bg-gold/10 text-gold border border-gold/30"
                            : "text-theme-faint hover:bg-theme-subtle border border-transparent"
                            }`}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {/* In-Stock Toggle */}
            <div className="flex items-center justify-center">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={inStockOnly}
                            onChange={handleStockToggle}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${inStockOnly ? 'bg-emerald-500' : 'bg-theme-soft'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${inStockOnly ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-xs font-medium text-theme-subtle group-hover:text-theme transition-colors">عرض المتوفر فقط</span>
                </label>
            </div>
        </div>
    );
}
