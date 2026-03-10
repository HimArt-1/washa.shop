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

export function StoreFilters({ currentType }: { currentType: string }) {
    const router = useRouter();

    return (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
            {productTypes.map((type) => (
                <button
                    key={type.value}
                    onClick={() => {
                        const params = new URLSearchParams();
                        if (type.value !== "all") params.set("type", type.value);
                        router.push(`/store?${params.toString()}`);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${currentType === type.value
                            ? "bg-gold/10 text-gold border border-gold/30"
                            : "text-theme-faint hover:bg-theme-subtle border border-transparent"
                        }`}
                >
                    {type.label}
                </button>
            ))}
        </div>
    );
}
