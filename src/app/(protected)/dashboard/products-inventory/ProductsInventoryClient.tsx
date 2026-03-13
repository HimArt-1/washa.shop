"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Warehouse, BarChart3, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { ProductsClient } from "../products/ProductsClient";
import InventoryClient from "@/components/admin/erp/InventoryClient";
import { SmartImportModal } from "@/components/admin/inventory/SmartImportModal";
import { syncProductStockFromERP } from "@/app/actions/products";

type TabId = "products" | "inventory";

interface ProductsInventoryClientProps {
    activeTab: string;
    products: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentType: string;
    artists: { id: string; display_name: string; username: string }[];
    categories: { id: string; name_ar: string; name_en: string; slug: string }[];
    skus: any[];
    inventory: any[];
    warehouses: any[];
    inventoryStats: any;
    salesMap: Record<string, number>;
}

export function ProductsInventoryClient({
    activeTab,
    products,
    count,
    totalPages,
    currentPage,
    currentType,
    artists,
    categories,
    skus,
    inventory,
    warehouses,
    inventoryStats,
    salesMap,
}: ProductsInventoryClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<TabId>((activeTab as TabId) || "products");
    const [showSmartImport, setShowSmartImport] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    const handleSyncStock = async () => {
        setSyncing(true);
        setSyncResult(null);
        const result = await syncProductStockFromERP();
        setSyncing(false);
        if (result.success) {
            setSyncResult(`تم تحديث ${result.updated} منتج بنجاح`);
            router.refresh();
        } else {
            setSyncResult(`خطأ: ${result.error}`);
        }
        setTimeout(() => setSyncResult(null), 4000);
    };

    useEffect(() => {
        const t = searchParams.get("tab") as TabId | null;
        if (t === "products" || t === "inventory") setTab(t);
    }, [searchParams]);

    const switchTab = (t: TabId) => {
        setTab(t);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", t);
        if (t === "inventory") {
            params.delete("page");
            params.delete("type");
        }
        router.push(`/dashboard/products-inventory?${params.toString()}`);
    };

    // Quick stats
    const lowStockCount = inventory.filter((i: any) => i.quantity <= 5 && i.quantity > 0).length;
    const outOfStockCount = inventory.filter((i: any) => i.quantity === 0).length;
    const totalSkus = skus.length;
    const totalWarehouses = warehouses.length;

    const tabs = [
        { id: "products" as TabId, label: "المنتجات", icon: Package },
        { id: "inventory" as TabId, label: "المخزون والجرد", icon: Warehouse },
    ];

    return (
        <div className="space-y-6">
            {/* ─── Quick Stats Bar ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-theme-subtle bg-surface/30 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-theme">{count}</p>
                        <p className="text-xs text-theme-subtle">منتج</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-theme-subtle bg-surface/30 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-theme">{totalSkus}</p>
                        <p className="text-xs text-theme-subtle">رمز SKU</p>
                    </div>
                </div>
                <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-theme">{lowStockCount}</p>
                        <p className="text-xs text-theme-subtle">مخزون منخفض</p>
                    </div>
                    {lowStockCount > 0 && (
                        <button
                            onClick={() => switchTab("inventory")}
                            className="mr-auto px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30"
                        >
                            عرض
                        </button>
                    )}
                </div>
                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-theme">{outOfStockCount}</p>
                        <p className="text-xs text-theme-subtle">نفد</p>
                    </div>
                    {outOfStockCount > 0 && (
                        <button
                            onClick={() => switchTab("inventory")}
                            className="mr-auto px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30"
                        >
                            عرض
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Tabs & Actions Row (sticky when scrolling) ─── */}
            <div className="sticky top-0 z-30 py-4 bg-bg/95 backdrop-blur-md border-b border-theme-faint -mb-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 rounded-2xl bg-theme-faint border border-theme-subtle w-fit">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => switchTab(t.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                                    tab === t.id
                                        ? "bg-gold/20 text-gold border border-gold/30 shadow-[0_2px_12px_rgba(206,174,127,0.15)]"
                                        : "text-theme-subtle hover:text-theme-strong hover:bg-theme-subtle"
                                }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Sync Stock Button */}
                        <div className="flex flex-col items-end gap-1">
                            <button
                                onClick={handleSyncStock}
                                disabled={syncing}
                                title="مزامنة in_stock مع مخزون ERP الفعلي"
                                className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                                {syncing ? "جارٍ المزامنة..." : "مزامنة المخزون"}
                            </button>
                            {syncResult && (
                                <span className={`text-[11px] font-medium ${syncResult.startsWith("خطأ") ? "text-red-400" : "text-emerald-400"}`}>
                                    {syncResult}
                                </span>
                            )}
                        </div>

                        {/* Smart Import Button */}
                        <button
                            onClick={() => setShowSmartImport(true)}
                            className="px-6 py-2.5 bg-gold/20 text-gold border-2 border-gold/40 rounded-xl text-sm font-bold hover:bg-gold/30 hover:border-gold/60 transition-all flex items-center justify-center gap-2 shadow-md whitespace-nowrap shrink-0"
                        >
                            <Package className="w-5 h-5" />
                            الاستيراد الذكي (Excel/CSV)
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Tab Content ─── */}
            <AnimatePresence mode="wait">
                {tab === "products" ? (
                    <motion.div
                        key="products"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ProductsClient
                            products={products}
                            count={count}
                            totalPages={totalPages}
                            currentPage={currentPage}
                            currentType={currentType}
                            artists={artists}
                            categories={categories}
                            skus={skus}
                            basePath="/dashboard/products-inventory"
                            onSmartImportClick={() => setShowSmartImport(true)}
                            salesMap={salesMap}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="inventory"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <InventoryClient
                            initialInventory={inventory}
                            warehouses={warehouses}
                            skus={skus}
                            stats={inventoryStats}
                            onSmartImportClick={() => setShowSmartImport(true)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Smart Import Wizard Modal */}
            <SmartImportModal 
                isOpen={showSmartImport} 
                onClose={() => setShowSmartImport(false)} 
                onSuccess={() => { setShowSmartImport(false); router.refresh(); }} 
            />
        </div>
    );
}
