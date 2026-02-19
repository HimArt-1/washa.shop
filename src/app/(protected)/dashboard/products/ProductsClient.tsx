"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    Package, Star, StarOff, CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { updateProduct } from "@/app/actions/settings";
import Image from "next/image";
import Link from "next/link";

const typeLabels: Record<string, string> = {
    all: "الكل",
    print: "مطبوعات",
    apparel: "ملابس",
    digital: "رقمي",
    nft: "NFT",
    original: "أصلي",
};

interface ProductsClientProps {
    products: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentType: string;
}

export function ProductsClient({ products, count, totalPages, currentPage, currentType }: ProductsClientProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleToggle = async (id: string, field: "in_stock" | "is_featured", currentValue: boolean) => {
        setLoadingId(id);
        const result = await updateProduct(id, { [field]: !currentValue });
        setLoadingId(null);
        if (result.success) {
            showToast("تم التحديث ✓");
            router.refresh();
        } else {
            showToast("خطأ: " + result.error);
        }
    };

    const setFilter = (type: string) => {
        const params = new URLSearchParams();
        if (type !== "all") params.set("type", type);
        router.push(`/dashboard/products?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-gold text-bg font-bold text-sm shadow-lg"
                >
                    {toast}
                </motion.div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(typeLabels).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${currentType === key
                            ? "bg-gold text-bg"
                            : "bg-white/5 text-fg/40 hover:text-fg/60 hover:bg-white/10"
                            }`}
                    >
                        {label}
                    </button>
                ))}
                <span className="text-xs text-fg/20 mr-auto">{count} منتج</span>
            </div>

            {/* Products Table */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-right px-5 py-3 text-fg/30 font-medium text-xs">المنتج</th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">الفنان</th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">النوع</th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">السعر</th>
                                <th className="text-center px-4 py-3 text-fg/30 font-medium text-xs">متوفر</th>
                                <th className="text-center px-4 py-3 text-fg/30 font-medium text-xs">مميز</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? products.map((product: any) => (
                                <tr key={product.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 relative">
                                                {product.image_url && (
                                                    <Image src={product.image_url} alt="" fill className="object-cover" sizes="40px" />
                                                )}
                                            </div>
                                            <span className="font-medium text-fg/80 truncate max-w-[200px]">{product.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-fg/40 text-xs">{product.artist?.display_name || "—"}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-fg/40">{product.type}</span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gold text-xs">{Number(product.price).toLocaleString()} ر.س</td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggle(product.id, "in_stock", product.in_stock)}
                                            disabled={loadingId === product.id}
                                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                                        >
                                            {product.in_stock ? (
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-400/50" />
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggle(product.id, "is_featured", product.is_featured)}
                                            disabled={loadingId === product.id}
                                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                                        >
                                            {product.is_featured ? (
                                                <Star className="w-4 h-4 text-gold fill-gold" />
                                            ) : (
                                                <StarOff className="w-4 h-4 text-fg/15" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-fg/20 text-sm">لا توجد منتجات</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                        <Link
                            key={i}
                            href={`/dashboard/products?page=${i + 1}${currentType !== "all" ? `&type=${currentType}` : ""}`}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${currentPage === i + 1
                                ? "bg-gold text-bg"
                                : "text-fg/30 hover:bg-white/5"
                                }`}
                        >
                            {i + 1}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
