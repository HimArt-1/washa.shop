"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, AlertTriangle, XCircle, Loader2, Pencil, Check } from "lucide-react";
import Image from "next/image";
import { updateProductStock } from "@/app/actions/admin";

interface InventoryClientProps {
    initialProducts: any[];
    lowStockCount: number;
    outOfStockCount: number;
}

export function InventoryClient({ initialProducts, lowStockCount, outOfStockCount }: InventoryClientProps) {
    const router = useRouter();
    const [products, setProducts] = useState(initialProducts);
    const [filter, setFilter] = useState<"all" | "low" | "out">("all");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const filtered = filter === "all"
        ? products
        : filter === "low"
            ? products.filter((p) => p.stock_quantity != null && p.stock_quantity <= 5 && p.stock_quantity > 0)
            : products.filter((p) => !p.in_stock || p.stock_quantity === 0);

    const handleSaveStock = async (productId: string) => {
        const val = editValue.trim();
        const num = val === "" || val === "∞" ? null : parseInt(val, 10);
        if (num !== null && (isNaN(num) || num < 0)) return;
        setLoading(true);
        const result = await updateProductStock(productId, num);
        setLoading(false);
        if (result.success) {
            setProducts((prev) =>
                prev.map((p) =>
                    p.id === productId
                        ? {
                            ...p,
                            stock_quantity: num,
                            in_stock: num === null ? true : num > 0,
                        }
                        : p
                )
            );
            setEditingId(null);
            router.refresh();
        }
    };

    const startEdit = (p: any) => {
        setEditingId(p.id);
        setEditValue(p.stock_quantity == null ? "∞" : String(p.stock_quantity));
    };

    return (
        <div className="space-y-6">
            {/* تنبيهات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lowStockCount > 0 && (
                    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <p className="font-bold text-theme">{lowStockCount} منتج</p>
                            <p className="text-sm text-theme-soft">مخزون منخفض (≤5)</p>
                        </div>
                        <button
                            onClick={() => setFilter("low")}
                            className="mr-auto px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30"
                        >
                            عرض
                        </button>
                    </div>
                )}
                {outOfStockCount > 0 && (
                    <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                            <p className="font-bold text-theme">{outOfStockCount} منتج</p>
                            <p className="text-sm text-theme-soft">نفد من المخزون</p>
                        </div>
                        <button
                            onClick={() => setFilter("out")}
                            className="mr-auto px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30"
                        >
                            عرض
                        </button>
                    </div>
                )}
            </div>

            {/* فلاتر */}
            <div className="flex gap-2">
                {(["all", "low", "out"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${
                            filter === f ? "bg-gold/20 text-gold border border-gold/40" : "bg-theme-subtle text-theme-soft border border-theme-soft"
                        }`}
                    >
                        {f === "all" && "الكل"}
                        {f === "low" && "مخزون منخفض"}
                        {f === "out" && "نفد"}
                    </button>
                ))}
            </div>

            {/* جدول المنتجات */}
            <div className="rounded-2xl border border-theme-subtle bg-surface/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle">
                                <th className="text-right px-5 py-3 text-theme-faint font-medium text-xs">المنتج</th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">الوشّاي</th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">المخزون</th>
                                <th className="text-right px-4 py-3 text-theme-faint font-medium text-xs">الحالة</th>
                                <th className="text-right px-5 py-3 text-theme-faint font-medium text-xs">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? (
                                filtered.map((p) => {
                                    const isLow = p.stock_quantity != null && p.stock_quantity <= 5 && p.stock_quantity > 0;
                                    const isOut = !p.in_stock || p.stock_quantity === 0;
                                    const isEditing = editingId === p.id;
                                    return (
                                        <tr key={p.id} className="border-b border-theme-faint hover:bg-theme-faint">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-theme-subtle overflow-hidden shrink-0 relative">
                                                        {p.image_url && (
                                                            <Image src={p.image_url} alt="" fill className="object-cover" sizes="40px" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-theme-strong">{p.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-theme-subtle text-xs">{p.artist?.display_name || "—"}</td>
                                            <td className="px-4 py-3">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="w-20 px-2 py-1 rounded-lg bg-theme-subtle border border-theme-soft text-theme text-sm"
                                                            placeholder="∞"
                                                            dir="ltr"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveStock(p.id)}
                                                            disabled={loading}
                                                            className="p-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30"
                                                        >
                                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="font-mono">
                                                        {p.stock_quantity == null ? "∞ غير محدود" : p.stock_quantity}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {isOut ? (
                                                    <span className="text-red-400 text-xs font-medium">نفد</span>
                                                ) : isLow ? (
                                                    <span className="text-amber-400 text-xs font-medium">منخفض</span>
                                                ) : (
                                                    <span className="text-emerald-400 text-xs font-medium">متوفر</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {!isEditing && (
                                                    <button
                                                        onClick={() => startEdit(p)}
                                                        className="p-2 rounded-lg text-theme-subtle hover:text-gold hover:bg-gold/10"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="text-center py-16 text-theme-faint">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">لا توجد منتجات في هذا التصنيف</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
