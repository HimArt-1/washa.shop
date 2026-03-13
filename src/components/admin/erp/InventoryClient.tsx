"use client";

import { useState, useMemo } from "react";
import {
    Search, Loader2, PackagePlus, Upload, ArrowUpDown, ArrowUp, ArrowDown,
    Package, AlertTriangle, XCircle, TrendingUp, DollarSign, Warehouse,
    Plus, Minus, Check, X, SlidersHorizontal,
} from "lucide-react";
import Image from "next/image";
import { quickAdjustInventory, adjustInventory } from "@/app/actions/erp/inventory";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────

type SortKey = "product" | "warehouse" | "size" | "quantity" | "sold" | "updated";
type SortDir = "asc" | "desc";
type StockFilter = "all" | "low" | "out" | "available";

interface InventoryStats {
    totalItems: number;
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    estimatedValue: number;
    totalSold: number;
}

interface Props {
    initialInventory: any[];
    warehouses: any[];
    skus: any[];
    stats: InventoryStats | null;
    onSmartImportClick?: () => void;
}

// ─── Main Component ─────────────────────────────────────

export default function InventoryClient({
    initialInventory, warehouses, skus, stats, onSmartImportClick
}: Props) {
    const router = useRouter();
    const [inventory] = useState(initialInventory);
    const [searchQuery, setSearchQuery] = useState("");
    const [stockFilter, setStockFilter] = useState<StockFilter>("all");
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Inline editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDelta, setEditDelta] = useState(0);
    const [editSaving, setEditSaving] = useState(false);

    // Full adjust modal state
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [selectedSkuId, setSelectedSkuId] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || "");
    const [quantityToAdd, setQuantityToAdd] = useState(0);
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // ─── Sorting ─────────────────────────────────────────

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === "asc"
            ? <ArrowUp className="w-3 h-3 text-gold" />
            : <ArrowDown className="w-3 h-3 text-gold" />;
    };

    // ─── Filtering + Sorting ─────────────────────────────

    const filteredInventory = useMemo(() => {
        let result = [...inventory];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.sku?.sku?.toLowerCase().includes(q) ||
                item.sku?.product?.title?.toLowerCase().includes(q) ||
                item.warehouse?.name?.toLowerCase().includes(q) ||
                item.sku?.size?.toLowerCase().includes(q)
            );
        }

        // Stock filter
        if (stockFilter === "low") result = result.filter(i => i.quantity > 0 && i.quantity <= 5);
        else if (stockFilter === "out") result = result.filter(i => i.quantity === 0);
        else if (stockFilter === "available") result = result.filter(i => i.quantity > 5);

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                let aVal: any, bVal: any;
                switch (sortKey) {
                    case "product": aVal = a.sku?.product?.title || ""; bVal = b.sku?.product?.title || ""; break;
                    case "warehouse": aVal = a.warehouse?.name || ""; bVal = b.warehouse?.name || ""; break;
                    case "size": aVal = a.sku?.size || ""; bVal = b.sku?.size || ""; break;
                    case "quantity": aVal = a.quantity || 0; bVal = b.quantity || 0; break;
                    case "sold": aVal = a.sold_count || 0; bVal = b.sold_count || 0; break;
                    case "updated": aVal = a.updated_at || ""; bVal = b.updated_at || ""; break;
                }
                if (typeof aVal === "number") {
                    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
                }
                return sortDir === "asc"
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            });
        }

        return result;
    }, [inventory, searchQuery, stockFilter, sortKey, sortDir]);

    // ─── Inline Quick Adjust ─────────────────────────────

    const handleQuickSave = async (item: any) => {
        if (editDelta === 0) { setEditingId(null); return; }
        setEditSaving(true);
        const res = await quickAdjustInventory(item.sku_id, item.warehouse_id, editDelta);
        setEditSaving(false);
        if (res.error) alert(res.error);
        setEditingId(null);
        setEditDelta(0);
        router.refresh();
    };

    // ─── Full Adjust Modal ───────────────────────────────

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantityToAdd === 0) return alert("الكمية يجب ألا تكون صفراً");
        setIsSaving(true);
        const { error } = await adjustInventory(
            selectedSkuId, selectedWarehouseId, quantityToAdd,
            quantityToAdd > 0 ? 'addition' : 'adjustment', notes
        );
        if (error) alert(error);
        else { setIsAdjusting(false); router.refresh(); }
        setIsSaving(false);
    };

    // ─── Stock Status Helpers ────────────────────────────

    const getStockClass = (qty: number) => {
        if (qty === 0) return "bg-red-500/20 text-red-400 border-red-500/30";
        if (qty <= 5) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    };

    const getStockBar = (qty: number) => {
        const max = 50;
        const pct = Math.min((qty / max) * 100, 100);
        const color = qty === 0 ? "bg-red-500" : qty <= 5 ? "bg-amber-400" : "bg-emerald-400";
        return { pct, color };
    };

    const filters: { id: StockFilter; label: string; count?: number }[] = [
        { id: "all", label: "الكل", count: inventory.length },
        { id: "available", label: "متوفر", count: inventory.filter(i => i.quantity > 5).length },
        { id: "low", label: "منخفض", count: stats?.lowStock },
        { id: "out", label: "نفد", count: stats?.outOfStock },
    ];

    return (
        <div className="space-y-6">

            {/* ══ Stats Cards ══ */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <StatCard icon={Package} label="إجمالي القطع" value={stats.totalItems.toLocaleString()} color="text-gold" bg="bg-gold/10" />
                    <StatCard icon={Warehouse} label="منتجات مخزّنة" value={stats.totalProducts} color="text-blue-400" bg="bg-blue-400/10" />
                    <StatCard icon={AlertTriangle} label="مخزون منخفض" value={stats.lowStock} color="text-amber-400" bg="bg-amber-400/10"
                        onClick={() => setStockFilter("low")} active={stockFilter === "low"} />
                    <StatCard icon={XCircle} label="نفد" value={stats.outOfStock} color="text-red-400" bg="bg-red-400/10"
                        onClick={() => setStockFilter("out")} active={stockFilter === "out"} />
                    <StatCard icon={TrendingUp} label="المباع" value={stats.totalSold.toLocaleString()} color="text-purple-400" bg="bg-purple-400/10" />
                    <StatCard icon={DollarSign} label="قيمة المخزون" value={`${stats.estimatedValue.toLocaleString()} ر.س`} color="text-emerald-400" bg="bg-emerald-400/10" />
                </div>
            )}

            {/* ══ Toolbar ══ */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-subtle" />
                        <input
                            type="text"
                            placeholder="بحث بالاسم، SKU، المقاس أو المستودع..."
                            className="w-full pl-4 pr-10 py-2.5 bg-surface/50 border border-theme-soft rounded-xl text-sm focus:outline-none focus:border-gold/50 transition-colors"
                            value={searchQuery}
                            onChange={d => setSearchQuery(d.target.value)}
                        />
                    </div>

                    {/* Stock Filters */}
                    <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-theme-faint shrink-0" />
                        {filters.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStockFilter(f.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${stockFilter === f.id
                                    ? "bg-gold/15 text-gold border-gold/30"
                                    : "bg-theme-subtle text-theme-subtle border-theme-subtle hover:bg-white/[0.05]"
                                }`}
                            >
                                {f.label}
                                {f.count !== undefined && <span className="mr-1 font-mono opacity-70">({f.count})</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {onSmartImportClick && (
                        <button onClick={onSmartImportClick}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold/20 text-gold border-2 border-gold/40 rounded-xl font-bold hover:bg-gold/30 transition-colors text-sm">
                            <Upload className="w-4 h-4" /> الاستيراد الذكي
                        </button>
                    )}
                    <button onClick={() => setIsAdjusting(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-black font-semibold rounded-xl hover:bg-gold/90 transition-colors text-sm">
                        <PackagePlus className="w-4 h-4" /> تعديل المخزون
                    </button>
                </div>
            </div>

            {/* ══ Table ══ */}
            <div className="bg-surface/30 border border-theme-faint rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-theme-subtle text-theme-soft">
                            <tr>
                                <th className="px-4 py-3.5 font-medium">
                                    <button onClick={() => handleSort("product")} className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                        المنتج (SKU) <SortIcon col="product" />
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 font-medium">
                                    <button onClick={() => handleSort("warehouse")} className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                        المستودع <SortIcon col="warehouse" />
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 font-medium">
                                    <button onClick={() => handleSort("size")} className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                        المقاس <SortIcon col="size" />
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 font-medium text-center w-[180px]">
                                    <button onClick={() => handleSort("quantity")} className="flex items-center gap-1.5 justify-center hover:text-gold transition-colors">
                                        الكمية <SortIcon col="quantity" />
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 font-medium text-center">
                                    <button onClick={() => handleSort("sold")} className="flex items-center gap-1.5 justify-center hover:text-gold transition-colors">
                                        المباع <SortIcon col="sold" />
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 font-medium text-center">معدل الدوران</th>
                                <th className="px-4 py-3.5 font-medium">
                                    <button onClick={() => handleSort("updated")} className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                        آخر تحديث <SortIcon col="updated" />
                                    </button>
                                </th>
                                <th className="px-4 py-3.5 font-medium text-center">إجراء سريع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-faint">
                            {filteredInventory.map((item) => {
                                const bar = getStockBar(item.quantity);
                                const isEditing = editingId === item.id;
                                const soldCount = item.sold_count || 0;
                                const totalFlow = item.quantity + soldCount;
                                const turnover = totalFlow > 0 ? ((soldCount / totalFlow) * 100).toFixed(0) : "0";

                                return (
                                    <tr key={item.id} className={`hover:bg-theme-faint transition-colors ${item.quantity === 0 ? "bg-red-500/[0.02]" : item.quantity <= 5 ? "bg-amber-500/[0.02]" : ""}`}>
                                        {/* Product */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {item.sku?.product?.image_url && (
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                                        <Image src={item.sku.product.image_url} alt="" fill className="object-cover" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <span className="font-medium block truncate max-w-[180px]">{item.sku?.product?.title}</span>
                                                    <span className="text-[10px] text-theme-soft font-mono mt-0.5 block">{item.sku?.sku}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Warehouse */}
                                        <td className="px-4 py-3.5">
                                            <span className="inline-block px-2.5 py-1 bg-theme-subtle border border-theme-soft rounded-lg text-xs">
                                                {item.warehouse?.name}
                                            </span>
                                        </td>
                                        {/* Size */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-xs text-theme-soft">{item.sku?.size || "—"}</span>
                                        </td>
                                        {/* Quantity with bar */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md font-bold text-sm border ${getStockClass(item.quantity)}`}>
                                                    {item.quantity}
                                                </span>
                                                <div className="flex-1 h-1.5 rounded-full bg-theme-subtle overflow-hidden">
                                                    <div className={`h-full rounded-full ${bar.color} transition-all`} style={{ width: `${bar.pct}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        {/* Sold */}
                                        <td className="px-4 py-3.5 text-center">
                                            <span className="text-xs font-mono text-purple-400">{soldCount}</span>
                                        </td>
                                        {/* Turnover */}
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`text-xs font-bold ${Number(turnover) >= 50 ? "text-emerald-400" : Number(turnover) >= 20 ? "text-amber-400" : "text-theme-faint"}`}>
                                                {turnover}%
                                            </span>
                                        </td>
                                        {/* Updated */}
                                        <td className="px-4 py-3.5 text-theme-soft text-xs text-left" dir="ltr">
                                            {new Date(item.updated_at).toLocaleDateString("ar-SA")}
                                        </td>
                                        {/* Quick Actions */}
                                        <td className="px-4 py-3.5 text-center">
                                            {isEditing ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => setEditDelta(d => d - 1)}
                                                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <input type="number" value={editDelta} onChange={(e) => setEditDelta(Number(e.target.value))}
                                                        className="w-14 text-center text-sm font-bold bg-theme-subtle border border-theme-soft rounded-lg py-1 text-theme focus:outline-none focus:border-gold/30" />
                                                    <button onClick={() => setEditDelta(d => d + 1)}
                                                        className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center">
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleQuickSave(item)} disabled={editSaving}
                                                        className="w-7 h-7 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 flex items-center justify-center disabled:opacity-50">
                                                        {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button onClick={() => { setEditingId(null); setEditDelta(0); }}
                                                        className="w-7 h-7 rounded-lg text-theme-faint hover:bg-theme-subtle flex items-center justify-center">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => { setEditingId(item.id); setEditDelta(0); }}
                                                        className="p-1.5 rounded-lg text-theme-faint hover:text-gold hover:bg-gold/10 transition-all" title="تعديل سريع">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredInventory.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-theme-subtle">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">{searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : "لم يتم رصد أي كميات في المستودعات بعد."}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ Adjust Modal ══ */}
            {isAdjusting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_80%,transparent)] backdrop-blur-sm">
                    <div className="bg-surface border border-theme-soft rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-theme-faint flex justify-between items-center bg-theme-faint">
                            <h2 className="text-xl font-bold">تعديل المخزون</h2>
                            <button onClick={() => setIsAdjusting(false)} className="text-theme-subtle hover:text-theme transition-colors">إغلاق</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="inv-form" onSubmit={handleSave} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">المنتج (الباركود)</label>
                                    <select required
                                        className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors font-mono text-sm"
                                        value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)}>
                                        <option value="">-- يرجى الاختيار --</option>
                                        {skus.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.sku} | {s.product?.title?.substring(0, 20)}...</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">المستودع</label>
                                    <select required
                                        className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors"
                                        value={selectedWarehouseId} onChange={e => setSelectedWarehouseId(e.target.value)}>
                                        {warehouses.map((w: any) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-theme-strong">كمية الإضافة/السحب (استخدم سالب - للسحب)</label>
                                    <input type="number" required
                                        className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors text-center font-bold text-lg"
                                        value={quantityToAdd} onChange={e => setQuantityToAdd(Number(e.target.value))} />
                                </div>
                                <div className="space-y-2 text-sm">
                                    <label className="text-theme-strong font-medium">ملاحظات الجرد</label>
                                    <textarea rows={3}
                                        className="w-full p-3 bg-theme-subtle border border-theme-soft rounded-xl focus:border-gold/50 outline-none transition-colors resize-none"
                                        placeholder="مثال: توريد جديد من المصنع، إتلاف، عينة..."
                                        value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>
                            </form>
                        </div>
                        <div className="p-6 border-t border-theme-faint bg-theme-faint flex justify-end gap-3">
                            <button type="button" onClick={() => setIsAdjusting(false)}
                                className="px-5 py-2.5 rounded-xl font-medium border border-theme-soft hover:bg-theme-subtle transition-colors">
                                إلغاء
                            </button>
                            <button type="submit" form="inv-form" disabled={isSaving || !selectedSkuId || !selectedWarehouseId || quantityToAdd === 0}
                                className="px-5 py-2.5 rounded-xl font-medium bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                تنفيذ الجرد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Stat Card Sub-component ────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg, onClick, active }: {
    icon: React.ElementType; label: string; value: string | number; color: string; bg: string; onClick?: () => void; active?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`p-4 rounded-xl border transition-all text-right ${active ? "border-gold/30 bg-gold/[0.07]" : "border-theme-subtle bg-theme-faint hover:bg-theme-subtle"} ${onClick ? "cursor-pointer" : "cursor-default"}`}
        >
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-lg font-bold text-theme">{value}</p>
            <p className="text-[10px] text-theme-subtle mt-0.5">{label}</p>
        </button>
    );
}
