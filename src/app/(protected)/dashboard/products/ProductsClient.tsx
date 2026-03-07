"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package, Star, StarOff, CheckCircle, XCircle, Loader2, Plus, Pencil, Trash2,
    X, Upload, Search, ArrowUpDown, ArrowUp, ArrowDown, Download, QrCode,
    Printer, CheckSquare, Square, MoreHorizontal, Filter, Tags,
} from "lucide-react";
import {
    updateProduct, deleteProduct, createProductAdmin, uploadProductImage,
} from "@/app/actions/settings";
import { createSKU } from "@/app/actions/erp/inventory";
import Image from "next/image";
import Link from "next/link";

// ─── Types & Labels ─────────────────────────────────────────

const typeLabels: Record<string, string> = {
    all: "الكل", print: "مطبوعات", apparel: "ملابس", digital: "رقمي", nft: "NFT", original: "أصلي",
};
const typeOptions = [
    { value: "print", label: "مطبوعات" }, { value: "apparel", label: "ملابس" },
    { value: "digital", label: "رقمي" }, { value: "nft", label: "NFT" }, { value: "original", label: "أصلي" },
];

type SortKey = "title" | "price" | "stock_quantity" | "created_at" | "type";
type SortDir = "asc" | "desc";

interface ProductsClientProps {
    products: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentType: string;
    artists?: { id: string; display_name: string; username: string }[];
    categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
    skus?: any[];
}

// ─── Main Component ─────────────────────────────────────────

export function ProductsClient({
    products,
    count,
    totalPages,
    currentPage,
    currentType,
    artists = [],
    categories = [],
    skus = [],
}: ProductsClientProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // ─── Advanced Features State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [barcodeProductId, setBarcodeProductId] = useState<string | null>(null);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

    // ─── Filtered + Sorted Products
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.title?.toLowerCase().includes(q) ||
                p.store_name?.toLowerCase().includes(q) ||
                p.artist?.display_name?.toLowerCase().includes(q) ||
                String(p.price).includes(q)
            );
        }

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                let aVal = a[sortKey];
                let bVal = b[sortKey];
                if (sortKey === "price" || sortKey === "stock_quantity") {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else {
                    aVal = String(aVal || "").toLowerCase();
                    bVal = String(bVal || "").toLowerCase();
                }
                if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
                if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [products, searchQuery, sortKey, sortDir]);

    // ─── Sort Handler
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
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

    // ─── Selection
    const allSelected = filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
        }
    };

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ─── Bulk Actions
    const bulkToggleStock = async (inStock: boolean) => {
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await updateProduct(id, { in_stock: inStock });
        }
        setBulkLoading(false);
        setSelectedIds(new Set());
        showToast(`تم تحديث ${selectedIds.size} منتج ✓`);
        router.refresh();
    };

    const bulkDelete = async () => {
        if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} منتج؟`)) return;
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await deleteProduct(id);
        }
        setBulkLoading(false);
        setSelectedIds(new Set());
        showToast(`تم حذف ${selectedIds.size} منتج ✓`);
        router.refresh();
    };

    // ─── CSV Export
    const exportCSV = () => {
        const headers = ["المنتج", "النوع", "السعر", "المخزون", "متوفر", "مميز", "المتجر"];
        const rows = filteredProducts.map((p) => [
            p.title, typeLabels[p.type] || p.type, p.price, p.stock_quantity ?? "∞",
            p.in_stock ? "نعم" : "لا", p.is_featured ? "نعم" : "لا", p.store_name || "",
        ]);
        const bom = "\uFEFF"; // UTF-8 BOM for Arabic
        const csv = bom + [headers, ...rows].map((r) => r.map((c: any) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wusha-products-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("تم تصدير CSV ✓");
    };

    // ─── Toggle Handlers
    const handleToggle = async (id: string, field: "in_stock" | "is_featured", currentValue: boolean) => {
        setLoadingId(id);
        const result = await updateProduct(id, { [field]: !currentValue });
        setLoadingId(null);
        if (result.success) { showToast("تم التحديث ✓"); router.refresh(); }
        else setError(result.error || "فشل التحديث");
    };

    const confirmDelete = async (productId: string) => {
        setConfirmDeleteId(null);
        setLoadingId(productId);
        const result = await deleteProduct(productId);
        setLoadingId(null);
        if (result.success) { showToast("تم حذف المنتج ✓"); router.refresh(); }
        else setError(result.error || "فشل الحذف");
    };

    const setFilter = (type: string) => {
        const params = new URLSearchParams();
        if (type !== "all") params.set("type", type);
        router.push(`/dashboard/products?${params.toString()}`);
    };

    // ─── Get SKU for product
    const getProductSku = (productId: string) => skus.find((s: any) => s.product_id === productId);

    return (
        <div className="space-y-4">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-sm shadow-lg backdrop-blur">
                        {toast}
                    </motion.div>
                )}
                {error && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                        <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded"><X className="w-4 h-4" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Top Toolbar ─── */}
            <div className="space-y-3">
                {/* Row 1: Filters + Search + Actions */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    {/* Type Filters */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(typeLabels).map(([key, label]) => (
                            <button key={key} onClick={() => setFilter(key)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${currentType === key ? "bg-gold text-bg shadow-[0_2px_10px_rgba(206,174,127,0.3)]" : "bg-white/[0.03] text-fg/40 hover:text-fg/60 hover:bg-white/[0.06] border border-white/[0.04]"}`}>
                                {label}
                            </button>
                        ))}
                        <span className="text-[10px] text-fg/20 mr-2">{count} منتج</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-fg/50 hover:text-fg/80 hover:bg-white/[0.06] transition-all" title="تصدير CSV">
                            <Download className="w-3.5 h-3.5" /> CSV
                        </button>
                        <button onClick={() => { setShowAddModal(true); setError(null); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold border border-gold/20 rounded-lg text-sm font-bold hover:bg-gold/20 transition-all">
                            <Plus className="w-4 h-4" /> إضافة منتج
                        </button>
                    </div>
                </div>

                {/* Row 2: Search + Bulk Actions */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث بالاسم، المتجر، الوشّاي..."
                            className="w-full pr-10 pl-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30 transition-all" />
                    </div>

                    {/* Bulk Actions (shown when items selected) */}
                    <AnimatePresence>
                        {someSelected && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gold/5 border border-gold/15 rounded-lg">
                                <span className="text-xs text-gold font-bold">{selectedIds.size} محدد</span>
                                <div className="w-px h-4 bg-gold/20" />
                                <button onClick={() => bulkToggleStock(true)} disabled={bulkLoading}
                                    className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                                    متوفر
                                </button>
                                <button onClick={() => bulkToggleStock(false)} disabled={bulkLoading}
                                    className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                                    غير متوفر
                                </button>
                                <button onClick={bulkDelete} disabled={bulkLoading}
                                    className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                                    حذف
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} className="p-0.5 text-fg/30 hover:text-fg/60">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                                {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ─── Products Table ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                                {/* Checkbox Header */}
                                <th className="w-10 px-3 py-3">
                                    <button onClick={toggleAll} className="p-1 rounded hover:bg-white/5 transition-colors">
                                        {allSelected ? <CheckSquare className="w-4 h-4 text-gold" /> : <Square className="w-4 h-4 text-fg/20" />}
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">
                                    <button onClick={() => handleSort("title")} className="flex items-center gap-1.5 hover:text-fg/60 transition-colors">
                                        المنتج <SortIcon col="title" />
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">الوشّاي</th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">
                                    <button onClick={() => handleSort("type")} className="flex items-center gap-1.5 hover:text-fg/60 transition-colors">
                                        النوع <SortIcon col="type" />
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">
                                    <button onClick={() => handleSort("price")} className="flex items-center gap-1.5 hover:text-fg/60 transition-colors">
                                        السعر <SortIcon col="price" />
                                    </button>
                                </th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">
                                    <button onClick={() => handleSort("stock_quantity")} className="flex items-center gap-1.5 hover:text-fg/60 transition-colors">
                                        المخزون <SortIcon col="stock_quantity" />
                                    </button>
                                </th>
                                <th className="text-center px-3 py-3 text-fg/30 font-medium text-xs">SKU</th>
                                <th className="text-center px-3 py-3 text-fg/30 font-medium text-xs">متوفر</th>
                                <th className="text-center px-3 py-3 text-fg/30 font-medium text-xs">مميز</th>
                                <th className="text-right px-4 py-3 text-fg/30 font-medium text-xs">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? filteredProducts.map((product: any) => {
                                const sku = getProductSku(product.id);
                                return (
                                    <tr key={product.id} className={`border-b border-white/[0.03] transition-colors ${selectedIds.has(product.id) ? "bg-gold/[0.03]" : "hover:bg-white/[0.02]"}`}>
                                        {/* Checkbox */}
                                        <td className="w-10 px-3 py-3">
                                            <button onClick={() => toggleOne(product.id)} className="p-1 rounded hover:bg-white/5 transition-colors">
                                                {selectedIds.has(product.id)
                                                    ? <CheckSquare className="w-4 h-4 text-gold" />
                                                    : <Square className="w-4 h-4 text-fg/15" />}
                                            </button>
                                        </td>
                                        {/* Product */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0 relative">
                                                    {product.image_url && (
                                                        <Image src={product.image_url} alt="" fill className="object-cover" sizes="40px" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-fg/80 truncate block max-w-[180px]">{product.title}</span>
                                                    {product.sizes?.length > 0 && (
                                                        <span className="text-[10px] text-fg/25">{product.sizes.join(" · ")}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Artist */}
                                        <td className="px-4 py-3 text-fg/40 text-xs">{product.store_name || product.artist?.display_name || "—"}</td>
                                        {/* Type */}
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-fg/40">{typeLabels[product.type] || product.type}</span>
                                        </td>
                                        {/* Price */}
                                        <td className="px-4 py-3 font-bold text-gold text-xs">{Number(product.price).toLocaleString()} ر.س</td>
                                        {/* Stock */}
                                        <td className="px-4 py-3">
                                            <span className={`font-mono text-xs ${product.stock_quantity != null && product.stock_quantity <= 5 ? "text-amber-400" : "text-fg/60"}`}>
                                                {product.stock_quantity == null ? "∞" : product.stock_quantity}
                                            </span>
                                        </td>
                                        {/* SKU / Barcode */}
                                        <td className="px-3 py-3 text-center">
                                            {sku ? (
                                                <button onClick={() => setBarcodeProductId(product.id)} className="group flex flex-col items-center gap-0.5" title="عرض الباركود">
                                                    <QrCode className="w-4 h-4 text-fg/30 group-hover:text-gold transition-colors" />
                                                    <span className="text-[9px] font-mono text-fg/20 group-hover:text-gold/60 transition-colors">{sku.sku?.slice(0, 8)}</span>
                                                </button>
                                            ) : (
                                                <button onClick={() => setBarcodeProductId(product.id)}
                                                    className="p-1.5 rounded-lg text-fg/15 hover:text-gold hover:bg-gold/10 transition-all" title="إنشاء SKU">
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                        {/* In Stock */}
                                        <td className="px-3 py-3 text-center">
                                            <button onClick={() => handleToggle(product.id, "in_stock", product.in_stock)}
                                                disabled={loadingId === product.id}
                                                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
                                                {product.in_stock
                                                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                                                    : <XCircle className="w-4 h-4 text-red-400/50" />}
                                            </button>
                                        </td>
                                        {/* Featured */}
                                        <td className="px-3 py-3 text-center">
                                            <button onClick={() => handleToggle(product.id, "is_featured", product.is_featured)}
                                                disabled={loadingId === product.id}
                                                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50">
                                                {product.is_featured
                                                    ? <Star className="w-4 h-4 text-gold fill-gold" />
                                                    : <StarOff className="w-4 h-4 text-fg/15" />}
                                            </button>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 justify-end">
                                                <button onClick={() => { setEditingProduct(product); setError(null); }}
                                                    className="p-2 rounded-lg text-fg/40 hover:text-gold hover:bg-gold/10 transition-all" title="تعديل">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {confirmDeleteId === product.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => confirmDelete(product.id)}
                                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all">
                                                            تأكيد
                                                        </button>
                                                        <button onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2 py-1 rounded-lg text-[10px] text-fg/40 hover:bg-white/5 transition-all">
                                                            إلغاء
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmDeleteId(product.id)}
                                                        disabled={loadingId === product.id}
                                                        className="p-2 rounded-lg text-fg/40 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50" title="حذف">
                                                        {loadingId === product.id
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={10} className="text-center py-16 text-fg/20">
                                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">{searchQuery ? "لا توجد نتائج للبحث" : "لا توجد منتجات"}</p>
                                        {!searchQuery && (
                                            <button onClick={() => setShowAddModal(true)} className="mt-3 text-gold hover:text-gold-light text-sm font-medium">
                                                إضافة أول منتج
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                        <Link key={i}
                            href={`/dashboard/products?page=${i + 1}${currentType !== "all" ? `&type=${currentType}` : ""}`}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${currentPage === i + 1 ? "bg-gold text-bg" : "text-fg/30 hover:bg-white/5"}`}>
                            {i + 1}
                        </Link>
                    ))}
                </div>
            )}

            {/* ─── Barcode Modal ─── */}
            <AnimatePresence>
                {barcodeProductId && (
                    <BarcodeModal
                        product={products.find((p) => p.id === barcodeProductId)}
                        sku={getProductSku(barcodeProductId)}
                        onClose={() => setBarcodeProductId(null)}
                        onCreated={() => { showToast("تم إنشاء SKU ✓"); router.refresh(); }}
                    />
                )}
            </AnimatePresence>

            {/* ─── Add Modal ─── */}
            <ProductFormModal
                open={showAddModal} mode="add" artists={artists} categories={categories}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => { setShowAddModal(false); showToast("تم إضافة المنتج ✓"); router.refresh(); }}
                onError={(msg) => setError(msg)}
            />

            {/* ─── Edit Modal ─── */}
            <ProductFormModal
                open={!!editingProduct} mode="edit" product={editingProduct} artists={artists} categories={categories}
                onClose={() => setEditingProduct(null)}
                onSuccess={() => { setEditingProduct(null); showToast("تم تحديث المنتج ✓"); router.refresh(); }}
                onError={(msg) => setError(msg)}
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Barcode Modal — عرض وإنشاء وطباعة الباركود
// ═══════════════════════════════════════════════════════════

function BarcodeModal({ product, sku, onClose, onCreated }: {
    product: any; sku: any; onClose: () => void; onCreated: () => void;
}) {
    const [loading, setLoading] = useState(false);

    // For manual creation
    const [size, setSize] = useState("");
    const [colorCode, setColorCode] = useState("");
    const [customSku, setCustomSku] = useState("");

    const generateSkuString = () => {
        if (!product) return "";
        const typeStr = product.type === 'apparel' ? 't' : product.type === 'print' ? 'p' : 'o';
        const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const sizeStr = size ? size.toUpperCase() : 'NA';
        const colorStr = colorCode ? colorCode.toLowerCase() : 'na';
        return `wsh-${typeStr}-${seq}-${sizeStr}-${colorStr}`;
    };

    const handleCreate = async () => {
        setLoading(true);
        const finalSku = customSku || generateSkuString();
        await createSKU({
            product_id: product.id,
            sku: finalSku,
            size: size || null,
            color_code: colorCode || null
        });
        setLoading(false);
        onCreated();
        onClose();
    };

    const handlePrint = () => {
        const code = sku?.sku || "";
        const win = window.open("", "_blank", "width=400,height=300");
        if (!win) return;
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl"><head><title>ملصق — ${code}</title>
            <style>
                body { font-family: system-ui; text-align: center; padding: 20px; margin: 0; }
                .sticker { border: 2px dashed #ccc; padding: 20px; display: inline-block; border-radius: 12px; }
                .title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
                .price { font-size: 18px; font-weight: 800; color: #5A3E2B; margin: 10px 0; }
                .code { font-family: monospace; font-size: 12px; color: #666; letter-spacing: 2px; }
                .brand { font-size: 10px; color: #999; margin-top: 8px; }
                @media print { .sticker { border: none; } body { padding: 0; } }
            </style></head><body>
            <div class="sticker">
                <div class="title">${product?.title || ""}</div>
                <div class="price">${Number(product?.price || 0).toLocaleString()} ر.س</div>
                <div class="code">${code}</div>
                <div class="brand">WUSHA</div>
            </div>
            <script>setTimeout(() => window.print(), 500)</script>
            </body></html>
        `);
        win.document.close();
    };

    if (!product) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-bg shadow-2xl p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-fg flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-gold" />
                        {sku ? "باركود المنتج" : "إنشاء SKU"}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-fg/40"><X className="w-5 h-5" /></button>
                </div>

                {/* Product Info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    {product.image_url && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 relative">
                            <Image src={product.image_url} alt="" fill className="object-cover" sizes="48px" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-fg/80 text-sm">{product.title}</p>
                        <p className="text-xs text-gold font-bold">{Number(product.price).toLocaleString()} ر.س</p>
                    </div>
                </div>

                {/* SKU Generator Inputs (Only if no SKU yet) */}
                {!sku ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-fg/50 mb-1.5">المقاس (اختياري)</label>
                                <input type="text" value={size} onChange={e => setSize(e.target.value)}
                                    placeholder="مثال: XL"
                                    className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-fg/50 mb-1.5">اللون (اختياري)</label>
                                <input type="text" value={colorCode} onChange={e => setColorCode(e.target.value)}
                                    placeholder="مثال: blu"
                                    className="w-full px-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gold mb-1.5">الرقم التسلسلي (SKU)</label>
                            <input type="text" value={customSku || generateSkuString()}
                                onChange={(e) => setCustomSku(e.target.value)} dir="ltr"
                                placeholder="سجل الكود المخصص هنا أو اترك المولد الآلي"
                                className="w-full px-4 py-2.5 bg-gold/5 border border-gold/20 text-gold rounded-xl text-sm font-mono tracking-wider focus:outline-none placeholder:text-gold/30" />
                            <p className="text-[10px] text-fg/40 mt-1.5 leading-relaxed">
                                هذه الأداة تولّد سيريال المنتج وستربطه تلقائياً بالباركود لطباعته وإدارة المستودع.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 pt-2">
                        <div>
                            <label className="block text-xs font-medium text-fg/50 mb-1.5">رمز SKU الحالي</label>
                            <input type="text" value={sku.sku} readOnly dir="ltr"
                                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg font-mono tracking-wider focus:outline-none opacity-60" />
                        </div>
                        <div className="flex gap-2">
                            {sku.size && <span className="px-2 py-1 text-xs bg-white/5 rounded-md border border-white/10 text-fg/60">المقاس: {sku.size}</span>}
                            {sku.color_code && <span className="px-2 py-1 text-xs bg-white/5 rounded-md border border-white/10 text-fg/60">اللون: {sku.color_code}</span>}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    {sku ? (
                        <>
                            <button onClick={handlePrint}
                                className="flex-1 py-2.5 rounded-xl bg-gold/10 text-gold font-bold flex items-center justify-center gap-2 hover:bg-gold/20 transition-all text-sm">
                                <Printer className="w-4 h-4" /> طباعة ملصق
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(sku.sku); }}
                                className="py-2.5 px-4 rounded-xl bg-white/5 text-fg/60 hover:bg-white/10 transition-all text-sm border border-white/[0.06]">
                                نسخ
                            </button>
                        </>
                    ) : (
                        <button onClick={handleCreate} disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-gold/20 text-gold font-bold flex items-center justify-center gap-2 hover:bg-gold/30 transition-all disabled:opacity-50 text-sm">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            إنشاء SKU
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════
//  Product Form Modal — إضافة / تعديل
// ═══════════════════════════════════════════════════════════

function ProductFormModal({
    open, mode, product, artists, categories = [], onClose, onSuccess, onError,
}: {
    open: boolean; mode: "add" | "edit"; product?: any;
    artists: { id: string; display_name: string; username: string }[];
    categories?: { id: string; name_ar: string; name_en: string; slug: string }[];
    onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [form, setForm] = useState({
        artist_id: "", title: "", description: "", type: "print", price: "",
        image_url: "", in_stock: true, stock_quantity: "", store_name: "", sizes: "",
    });

    useEffect(() => {
        if (!open) return;
        setUploadFile(null);
        setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        if (mode === "edit" && product) {
            setForm({
                artist_id: product.artist_id || "", title: product.title || "",
                description: product.description || "", type: product.type || "print",
                price: String(product.price ?? ""), image_url: product.image_url || "",
                in_stock: product.in_stock ?? true,
                stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : "",
                store_name: product.store_name || "",
                sizes: product.sizes ? product.sizes.join(", ") : "",
            });
        } else if (mode === "add") {
            setForm({
                artist_id: artists[0]?.id || "", title: "", description: "", type: "print",
                price: "", image_url: "", in_stock: true, stock_quantity: "",
                store_name: "WASHA.STOR", sizes: "",
            });
        }
    }, [open, mode, product?.id, artists]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
            setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return URL.createObjectURL(f); });
            setUploadFile(f);
        } else if (f) {
            queueMicrotask(() => onError("الملف غير مدعوم أو أكبر من 5 ميجابايت"));
        }
        e.target.value = "";
    };

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = form.title.trim();
        const price = parseFloat(form.price);
        let imageUrl = form.image_url.trim();

        if (!title) { onError("الاسم مطلوب"); return; }
        if (mode === "add" && !form.artist_id) { onError("اختر الوشّاي"); return; }
        if (isNaN(price) || price < 0) { onError("السعر غير صالح"); return; }

        const parsedSizes = form.sizes ? form.sizes.split(",").map((s) => s.trim()).filter((s) => s.length > 0) : undefined;
        setLoading(true);
        onError("");

        if (uploadFile) {
            const fd = new FormData();
            fd.append("file", uploadFile);
            const uploadResult = await uploadProductImage(fd);
            if (!uploadResult.success) { setLoading(false); onError(uploadResult.error || "فشل رفع الصورة"); return; }
            imageUrl = uploadResult.url;
        }

        if (mode === "add" && !imageUrl) { setLoading(false); onError("ارفع صورة أو أدخل رابط الصورة"); return; }

        if (mode === "add") {
            const result = await createProductAdmin({
                artist_id: form.artist_id, title, description: form.description || undefined,
                type: form.type, price, image_url: imageUrl, in_stock: form.in_stock,
                stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity, 10) : undefined,
                store_name: form.store_name.trim() || undefined, sizes: parsedSizes,
            });
            setLoading(false);
            result.success ? onSuccess() : onError(result.error || "فشل الإضافة");
        } else {
            const result = await updateProduct(product.id, {
                title, description: form.description || null, type: form.type, price,
                image_url: imageUrl || product.image_url, artist_id: form.artist_id,
                in_stock: form.in_stock,
                stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity, 10) : null,
                store_name: form.store_name.trim() || null,
            });
            setLoading(false);
            result.success ? onSuccess() : onError(result.error || "فشل التحديث");
        }
    };

    const isEdit = mode === "edit";
    const artistOptions = isEdit && product?.artist_id && !artists.find((a) => a.id === product.artist_id) && product.artist
        ? [...artists, { id: product.artist_id, display_name: product.artist.display_name || "—", username: product.artist.username || "" }]
        : artists;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-bg shadow-2xl styled-scrollbar">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-bg z-10">
                    <h2 className="text-lg font-bold text-fg">{isEdit ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-fg/40"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Artist Select */}
                    <div>
                        <label className="block text-xs font-medium text-fg/50 mb-1.5">الوشّاي {!isEdit && "*"}</label>
                        <select value={form.artist_id}
                            onChange={(e) => setForm((f) => ({ ...f, artist_id: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30"
                            required={!isEdit}>
                            {artistOptions.length === 0
                                ? <option value="">— لا يوجد وشّايون —</option>
                                : artistOptions.map((a) => <option key={a.id} value={a.id}>{a.display_name} (@{a.username})</option>)}
                        </select>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-medium text-fg/50 mb-1.5">الاسم *</label>
                        <input type="text" value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="عنوان المنتج"
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30"
                            required />
                    </div>

                    {/* Type + Price */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-fg/50 mb-1.5">النوع</label>
                            <select value={form.type}
                                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg focus:outline-none focus:border-gold/30">
                                {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-fg/50 mb-1.5">السعر (ر.س) *</label>
                            <input type="number" min="0" step="0.01" value={form.price}
                                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                placeholder="0"
                                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30"
                                required />
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-xs font-medium text-fg/50 mb-1.5">صورة المنتج {!isEdit && "*"}</label>
                        <div className="space-y-2">
                            <div onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-gold/40"); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove("border-gold/40"); }}
                                onDrop={(e) => {
                                    e.preventDefault(); e.currentTarget.classList.remove("border-gold/40");
                                    const f = e.dataTransfer.files?.[0];
                                    if (f && f.size <= 5 * 1024 * 1024 && /^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
                                        setUploadFile(f); setPreviewUrl(URL.createObjectURL(f));
                                    } else if (f) queueMicrotask(() => onError("الملف غير مدعوم أو أكبر من 5 ميجابايت"));
                                }}
                                className="border border-dashed border-white/[0.15] rounded-xl p-5 text-center cursor-pointer hover:border-gold/30 hover:bg-white/[0.02] transition-all">
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileSelect} className="hidden" />
                                {previewUrl ? (
                                    <div className="relative inline-block">
                                        <img src={previewUrl} alt="معاينة" className="max-h-28 rounded-lg object-contain" />
                                        <button type="button"
                                            onClick={(e) => { e.stopPropagation(); setUploadFile(null); setPreviewUrl((p) => { if (p) URL.revokeObjectURL(p); return null; }); }}
                                            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center text-xs hover:bg-red-500">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-7 h-7 mx-auto mb-1.5 text-fg/30" />
                                        <p className="text-sm text-fg/60">اسحب الصورة هنا أو انقر للاختيار</p>
                                        <p className="text-[10px] text-fg/30 mt-1">JPG, PNG, WebP, GIF — حتى 5 ميجابايت</p>
                                    </>
                                )}
                            </div>
                            <p className="text-[10px] text-fg/40">أو أدخل رابط الصورة:</p>
                            <input type="url" value={form.image_url}
                                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                                placeholder="https://..."
                                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30" dir="ltr" />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-fg/50 mb-1.5">الوصف</label>
                        <textarea value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="وصف المنتج..." rows={2}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30 resize-none" />
                    </div>

                    {/* Sizes + Store Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-fg/50 mb-1.5">المقاسات</label>
                            <input type="text" value={form.sizes}
                                onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
                                placeholder="S, M, L, XL"
                                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30" dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-fg/50 mb-1.5">اسم المتجر</label>
                            <input type="text" value={form.store_name}
                                onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
                                placeholder="WASHA.STOR"
                                className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30" dir="ltr" />
                        </div>
                    </div>

                    {/* Stock Controls */}
                    <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={form.in_stock}
                                onChange={(e) => setForm((f) => ({ ...f, in_stock: e.target.checked }))}
                                className="rounded border-white/20" />
                            <span className="text-sm text-fg/70">متوفر</span>
                        </label>
                        <div>
                            <label className="block text-xs font-medium text-fg/50 mb-1">الكمية</label>
                            <input type="number" min="0" value={form.stock_quantity}
                                onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                                placeholder="—"
                                className="w-24 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-fg" />
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-fg/60 hover:bg-white/[0.03] transition-colors">
                            إلغاء
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-gold/20 text-gold font-bold hover:bg-gold/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isEdit ? "حفظ" : "إضافة"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
