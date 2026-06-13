"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    Download,
    Package,
    RefreshCw,
    ShieldAlert,
    Warehouse,
} from "lucide-react";
import { ProductsClient } from "../products/ProductsClient";
import InventoryClient from "@/components/admin/erp/InventoryClient";
import SmartImportWizard from "@/components/admin/erp/SmartImportWizard";
import { syncProductStockFromERP } from "@/app/actions/products";
import { bulkExecuteRestockPlan } from "@/app/actions/erp/inventory";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "products" | "inventory";
type AutomationFilter = "all" | "critical" | "high" | "watch" | "sync";
type AutomationPriority = "critical" | "high" | "watch";
type AutomationQueueItem = {
    id: string;
    kind: "restock" | "sync";
    title: string;
    sku: string;
    warehouse: string;
    currentQty: number;
    soldCount: number;
    unitPrice: number;
    estimatedRestockValue: number;
    recommendedQty: number;
    score: number;
    priority: AutomationPriority;
    actionLabel: string;
    reason: string;
    updated_at?: string | null;
    skuId: string | null;
    warehouseId: string | null;
};
type BulkExecuteReport = {
    success?: boolean;
    processed?: number;
    actionable?: number;
    skipped?: number;
    succeeded?: number;
    failed?: number;
    results?: Array<{
        id: string;
        title: string;
        sku: string;
        warehouse: string;
        quantity: number;
        success: boolean;
        newQuantity?: number;
        error?: string;
    }>;
    error?: string;
};

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
    inventoryStats: {
        totalItems: number;
        totalProducts: number;
        lowStock: number;
        outOfStock: number;
        estimatedValue: number;
        totalSold: number;
    } | null;
    salesMap: Record<string, number>;
    fulfillmentSnapshot: {
        stats: {
            pendingReview: number;
            fulfillmentQueue: number;
            paymentPending: number;
            delivered: number;
            todayOrders: number;
        };
        awaitingConfirmation: Array<{
            id: string;
            order_number: string;
            total: number;
            status: string;
            payment_status: string;
            created_at: string;
            buyer?: { display_name?: string | null; username?: string | null } | null;
        }>;
        shippingDesk: Array<{
            id: string;
            order_number: string;
            total: number;
            status: string;
            payment_status: string;
            created_at: string;
            buyer?: { display_name?: string | null; username?: string | null } | null;
        }>;
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function getOrderStatusLabel(status: string) {
    const map: Record<string, string> = {
        pending: "انتظار", confirmed: "مؤكد", processing: "تنفيذ",
        shipped: "شُحن", delivered: "استُلم", cancelled: "ملغي", refunded: "مسترد",
    };
    return map[status] ?? status;
}

function getOrderTone(status: string) {
    if (status === "processing") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    if (status === "shipped") return "border-indigo-500/20 bg-indigo-500/10 text-indigo-300";
    if (status === "delivered") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    if (status === "pending" || status === "confirmed") return "border-sky-500/20 bg-sky-500/10 text-sky-300";
    return "border-red-500/20 bg-red-500/10 text-red-300";
}

function getAutomationPriorityMeta(priority: AutomationPriority) {
    if (priority === "critical") return { label: "حرج", className: "border-red-500/20 bg-red-500/10 text-red-300", dot: "bg-red-400" };
    if (priority === "high")     return { label: "عالٍ", className: "border-amber-500/20 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" };
    return { label: "مراقبة", className: "border-sky-500/20 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" };
}

function getOperatingMode({
    outOfStock,
    lowStock,
    syncCount,
    critical,
    high,
    fulfillmentQueue,
}: {
    outOfStock: number;
    lowStock: number;
    syncCount: number;
    critical: number;
    high: number;
    fulfillmentQueue: number;
}) {
    if (outOfStock > 0) {
        return {
            label: "توريد عاجل",
            detail: `${outOfStock} عنصر نافد ويحتاج تعبئة قبل استقبال طلبات إضافية.`,
            className: "border-red-500/25 bg-red-500/10 text-red-300",
        };
    }
    if (critical > 0 || fulfillmentQueue > 6) {
        return {
            label: "ضغط تنفيذ",
            detail: `${critical} إجراء حرج و${fulfillmentQueue} طلب في مسار التنفيذ.`,
            className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
        };
    }
    if (lowStock > 0 || high > 0) {
        return {
            label: "متابعة مخزون",
            detail: `${lowStock} عنصر منخفض و${high} إجراء عالي الأولوية تحت المتابعة.`,
            className: "border-gold/30 bg-gold/10 text-gold",
        };
    }
    if (syncCount > 0) {
        return {
            label: "مراجعة مزامنة",
            detail: `${syncCount} منتج يحتاج مطابقة بين حالة المتجر والكمية الفعلية.`,
            className: "border-rose-500/20 bg-rose-500/10 text-rose-300",
        };
    }
    return {
        label: "تشغيل مستقر",
        detail: "المخزون والتنفيذ في وضع مستقر، ويمكن متابعة العمليات اليومية من نفس الشاشة.",
        className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** بطاقة KPI مضغوطة بدون نص شرح */
function KpiTile({
    title, value, icon: Icon, accent, detail,
}: {
    title: string; value: string; icon: React.ComponentType<{ className?: string }>;
    accent: string; detail?: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-surface-panel rounded-[24px] p-4 sm:p-5"
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold tracking-[0.2em] text-theme-faint uppercase">{title}</p>
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl border"
                    style={{ backgroundColor: `${accent}18`, borderColor: `${accent}33`, color: accent }}
                >
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-3xl font-black text-theme">{value}</p>
            {detail && <div className="mt-2">{detail}</div>}
        </motion.div>
    );
}

/** بطاقة مخاطر مدمجة (منخفض + نافد + تعارض في لوحة واحدة) */
function RiskTile({ lowStock, outOfStock, syncCount }: { lowStock: number; outOfStock: number; syncCount: number }) {
    const hasRisk = lowStock > 0 || outOfStock > 0 || syncCount > 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-surface-panel rounded-[24px] p-4 sm:p-5"
        >
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold tracking-[0.2em] text-theme-faint uppercase">مخاطر التنفيذ</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${hasRisk ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
                    {hasRisk ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </div>
            </div>
            {hasRisk ? (
                <div className="flex items-end gap-3">
                    <div>
                        <p className="text-[10px] font-bold text-amber-400/70 mb-0.5">منخفض</p>
                        <p className="text-2xl font-black text-amber-400">{lowStock}</p>
                    </div>
                    <div className="mb-1 h-7 w-px bg-theme-subtle" />
                    <div>
                        <p className="text-[10px] font-bold text-red-400/70 mb-0.5">نافد</p>
                        <p className="text-2xl font-black text-red-400">{outOfStock}</p>
                    </div>
                    {syncCount > 0 && (
                        <>
                            <div className="mb-1 h-7 w-px bg-theme-subtle" />
                            <div>
                                <p className="text-[10px] font-bold text-sky-400/70 mb-0.5">تعارض</p>
                                <p className="text-2xl font-black text-sky-400">{syncCount}</p>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <p className="text-lg font-black text-emerald-400">صفر مخاطر</p>
            )}
            {!hasRisk && <p className="mt-1 text-xs text-emerald-400/70">المخزون في وضع سليم تماماً</p>}
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductsInventoryClient({
    activeTab, products, count, totalPages, currentPage, currentType,
    artists, categories, skus, inventory, warehouses, inventoryStats,
    salesMap, fulfillmentSnapshot,
}: ProductsInventoryClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<TabId>((activeTab as TabId) || "products");
    const [showSmartImport, setShowSmartImport] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);
    const [automationFilter, setAutomationFilter] = useState<AutomationFilter>("all");
    const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
    const [showBulkExecuteModal, setShowBulkExecuteModal] = useState(false);
    const [bulkExecuteNotes, setBulkExecuteNotes] = useState("");
    const [isBulkExecuting, setIsBulkExecuting] = useState(false);
    const [bulkExecuteReport, setBulkExecuteReport] = useState<BulkExecuteReport | null>(null);

    useEffect(() => {
        const currentTab = searchParams.get("tab") as TabId | null;
        if (currentTab === "products" || currentTab === "inventory") setTab(currentTab);
    }, [searchParams]);

    const switchTab = (nextTab: TabId) => {
        setTab(nextTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", nextTab);
        if (nextTab === "inventory") { params.delete("page"); params.delete("type"); }
        router.push(`/dashboard/products-inventory?${params.toString()}`);
    };

    const handleSyncStock = async () => {
        setSyncing(true); setSyncResult(null);
        const result = await syncProductStockFromERP();
        setSyncing(false);
        setSyncResult(result.success ? `تم تحديث ${result.updated} منتج` : `خطأ: ${result.error}`);
        if (result.success) router.refresh();
        setTimeout(() => setSyncResult(null), 4000);
    };

    // ── Computed ─────────────────────────────────────────────────────────────

    const totalsByProduct = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of inventory) {
            const pid = item.sku?.product_id;
            if (pid) map.set(pid, (map.get(pid) ?? 0) + (Number(item.quantity) || 0));
        }
        return map;
    }, [inventory]);

    const syncExceptions = useMemo(
        () => products
            .map((p) => {
                const actual = totalsByProduct.get(p.id) ?? 0;
                const should = actual > 0;
                if (Boolean(p.in_stock) === should) return null;
                return { id: p.id, title: p.title, actualQuantity: actual, flagLabel: p.in_stock ? "معلّم متوفر رغم أن الكمية صفر" : "معلّم غير متوفر رغم وجود كمية", stateLabel: p.in_stock ? "in_stock = true" : "in_stock = false", updated_at: p.updated_at || null };
            })
            .filter(Boolean)
            .slice(0, 5) as Array<{ id: string; title: string; actualQuantity: number; flagLabel: string; stateLabel: string; updated_at: string | null }>,
        [products, totalsByProduct]
    );

    const totalUnits    = inventoryStats?.totalItems ?? inventory.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const lowStockCount = inventoryStats?.lowStock ?? inventory.filter(i => Number(i.quantity) > 0 && Number(i.quantity) <= 5).length;
    const outOfStockCount = inventoryStats?.outOfStock ?? inventory.filter(i => Number(i.quantity) === 0).length;
    const estimatedValue = inventoryStats?.estimatedValue ?? 0;

    const penalty = lowStockCount * 4 + outOfStockCount * 8 + syncExceptions.length * 9 + fulfillmentSnapshot.stats.pendingReview * 3 + fulfillmentSnapshot.stats.fulfillmentQueue * 4;
    const healthScore = Math.max(32, Math.min(100, 100 - penalty));
    const healthColor = healthScore >= 85 ? "#22c55e" : healthScore >= 65 ? "#f59e0b" : "#ef4444";
    const healthLabel = healthScore >= 85 ? "مستقر" : healthScore >= 65 ? "تحت المراقبة" : "ضغط مرتفع";

    const automationQueue = useMemo<AutomationQueueItem[]>(() => {
        const restock = inventory.filter(i => i.quantity <= 5).map((item) => {
            const qty = Number(item.quantity) || 0;
            const sold = Number(item.sold_count) || 0;
            const price = Number(item.sku?.product?.price) || 0;
            const rec = Math.max(qty === 0 ? 8 : 4, sold > 0 ? Math.min(60, sold * 2) : qty === 0 ? 8 : 5);
            const score = (qty === 0 ? 58 : qty <= 2 ? 42 : 28) + Math.min(sold * 2, 22) + (sold > qty ? 8 : 0);
            const priority: AutomationPriority = score >= 72 ? "critical" : score >= 48 ? "high" : "watch";
            return { id: item.id, kind: "restock" as const, title: item.sku?.product?.title || "منتج غير معروف", sku: item.sku?.sku || "بدون SKU", warehouse: item.warehouse?.name || "مستودع غير محدد", currentQty: qty, soldCount: sold, unitPrice: price, estimatedRestockValue: price * rec, recommendedQty: rec, score, priority, actionLabel: qty === 0 ? "إعادة تعبئة فورية" : qty <= 2 ? "توريد خلال 24 ساعة" : "إعادة تعبئة قريبة", reason: qty === 0 ? "نفاد فعلي من المخزون." : qty <= 2 ? "الكمية على حافة النفاد." : "المخزون منخفض ويستحق المتابعة.", updated_at: item.updated_at, skuId: item.sku_id ?? null, warehouseId: item.warehouse_id ?? null };
        });
        const sync = syncExceptions.map(item => ({ id: `sync-${item.id}`, kind: "sync" as const, title: item.title, sku: "حالة المنتج", warehouse: item.stateLabel, currentQty: item.actualQuantity, soldCount: 0, unitPrice: 0, estimatedRestockValue: 0, recommendedQty: item.actualQuantity > 0 ? item.actualQuantity : 0, score: item.actualQuantity > 0 ? 64 : 56, priority: item.actualQuantity > 0 ? "high" as const : "watch" as const, actionLabel: "مراجعة مزامنة الحالة", reason: item.flagLabel, updated_at: item.updated_at, skuId: null, warehouseId: null }));
        return [...restock, ...sync].sort((a, b) => b.score - a.score).slice(0, 12);
    }, [inventory, syncExceptions]);

    const filteredQueue = useMemo(() => {
        if (automationFilter === "all") return automationQueue;
        if (automationFilter === "sync") return automationQueue.filter(i => i.kind === "sync");
        return automationQueue.filter(i => i.priority === automationFilter);
    }, [automationFilter, automationQueue]);

    const automationStats = useMemo(() => ({
        critical: automationQueue.filter(i => i.priority === "critical").length,
        high:     automationQueue.filter(i => i.priority === "high").length,
        watch:    automationQueue.filter(i => i.priority === "watch").length,
        sync:     automationQueue.filter(i => i.kind === "sync").length,
        restockValue: automationQueue.filter(i => i.kind === "restock").reduce((s, i) => s + i.estimatedRestockValue, 0),
    }), [automationQueue]);
    const operatingMode = useMemo(() => getOperatingMode({
        outOfStock: outOfStockCount,
        lowStock: lowStockCount,
        syncCount: automationStats.sync,
        critical: automationStats.critical,
        high: automationStats.high,
        fulfillmentQueue: fulfillmentSnapshot.stats.fulfillmentQueue,
    }), [automationStats.critical, automationStats.high, automationStats.sync, fulfillmentSnapshot.stats.fulfillmentQueue, lowStockCount, outOfStockCount]);

    const selectableVisibleIds = useMemo(() => filteredQueue.filter(i => i.kind === "restock" && i.skuId && i.warehouseId && i.recommendedQty > 0).map(i => i.id), [filteredQueue]);
    const selectedRestockActions = useMemo(() => automationQueue.filter(i => selectedActionIds.includes(i.id) && i.kind === "restock" && i.skuId && i.warehouseId && i.recommendedQty > 0), [automationQueue, selectedActionIds]);
    const allVisibleSelected = selectableVisibleIds.length > 0 && selectableVisibleIds.every(id => selectedActionIds.includes(id));
    const selectedRestockQty = selectedRestockActions.reduce((s, i) => s + i.recommendedQty, 0);
    const selectedRestockValue = selectedRestockActions.reduce((s, i) => s + i.estimatedRestockValue, 0);

    useEffect(() => {
        const valid = new Set(automationQueue.filter(i => i.kind === "restock" && i.skuId && i.warehouseId && i.recommendedQty > 0).map(i => i.id));
        setSelectedActionIds(cur => cur.filter(id => valid.has(id)));
    }, [automationQueue]);

    const toggleSelect = (id: string) => setSelectedActionIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
    const toggleSelectVisible = () => setSelectedActionIds(cur => allVisibleSelected ? cur.filter(id => !selectableVisibleIds.includes(id)) : Array.from(new Set([...cur, ...selectableVisibleIds])));

    const handleBulkExecute = async () => {
        if (!selectedRestockActions.length) return;
        setIsBulkExecuting(true); setBulkExecuteReport(null);
        const result = await bulkExecuteRestockPlan({ items: selectedRestockActions.map(i => ({ id: i.id, kind: i.kind, skuId: i.skuId, warehouseId: i.warehouseId, quantity: i.recommendedQty, title: i.title, sku: i.sku, warehouse: i.warehouse })), notes: bulkExecuteNotes });
        setIsBulkExecuting(false); setBulkExecuteReport(result);
        if (!("error" in result && result.error)) {
            const failedIds = new Set((result.results || []).filter(i => !i.success).map(i => i.id));
            setSelectedActionIds(cur => cur.filter(id => failedIds.has(id)));
            setShowBulkExecuteModal(false); setBulkExecuteNotes(""); router.refresh();
        }
    };

    const exportQueue = () => {
        const rows = [
            ["الأولوية", "النوع", "المنتج", "SKU", "الكمية الحالية", "الكمية المقترحة", "القيمة التقديرية", "السبب"],
            ...filteredQueue.map(i => [getAutomationPriorityMeta(i.priority).label, i.kind === "sync" ? "مزامنة" : "تعبئة", i.title, i.sku, String(i.currentQty), String(i.recommendedQty), String(Math.round(i.estimatedRestockValue)), i.reason]),
        ];
        const csv = rows.map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        a.download = `wusha-restock-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const tabs = [
        { id: "products" as TabId, label: "المنتجات", icon: Package },
        { id: "inventory" as TabId, label: "المخزون والجرد", icon: Warehouse },
    ];

    const fulfillmentItems = [...fulfillmentSnapshot.awaitingConfirmation.slice(0, 3), ...fulfillmentSnapshot.shippingDesk.slice(0, 4)];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">

            {/* ═══ Layer 1: Command Header ═══════════════════════════════════════ */}
            <section className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(206,174,127,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.07),transparent_48%)]" />
                <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                    {/* Left — title + health */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-theme-faint">تشغيل المخزون</p>
                            <h2 className="mt-1 text-xl font-black text-theme sm:text-2xl">مركز التنفيذ والمخزون</h2>
                            <p className="mt-1 max-w-2xl text-xs leading-6 text-theme-subtle">{operatingMode.detail}</p>
                        </div>

                        {/* Health score bar */}
                        <div className="flex items-center gap-3 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                            <div className="relative flex h-10 w-10 items-center justify-center">
                                <svg className="absolute h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-theme-faint opacity-30" />
                                    <circle cx="18" cy="18" r="15" fill="none" stroke={healthColor} strokeWidth="3" strokeDasharray={`${(healthScore / 100) * 94.2} 94.2`} strokeLinecap="round" />
                                </svg>
                                <span className="text-[11px] font-black" style={{ color: healthColor }}>{healthScore}</span>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-theme">{healthLabel}</p>
                                <p className="text-[11px] text-theme-faint">صحة التنفيذ</p>
                            </div>
                        </div>
                        <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${operatingMode.className}`}>
                            {operatingMode.label}
                        </span>
                    </div>

                    {/* Right — pulse stats + actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        {/* Pulse numbers — compact row */}
                        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-2.5 sm:flex sm:gap-4">
                            {[
                                { label: "انتظار", value: fulfillmentSnapshot.stats.pendingReview, color: "text-sky-400" },
                                { label: "تنفيذ", value: fulfillmentSnapshot.stats.fulfillmentQueue, color: "text-amber-400" },
                                { label: "مدفوع", value: fulfillmentSnapshot.stats.paymentPending, color: "text-theme-subtle" },
                                { label: "اليوم", value: fulfillmentSnapshot.stats.todayOrders, color: "text-emerald-400" },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex flex-col items-center">
                                    <span className={`text-lg font-black ${color}`}>{value}</span>
                                    <span className="text-[10px] text-theme-faint">{label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleSyncStock}
                                disabled={syncing}
                                className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/15 active:scale-[0.98] disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                                <span className="hidden sm:inline">{syncing ? "جارٍ التحديث" : "مزامنة المخزون"}</span>
                            </button>
                            <button
                                onClick={() => setShowSmartImport(true)}
                                className="inline-flex min-h-[42px] items-center gap-2 rounded-2xl border border-gold/40 bg-gold/15 px-4 text-sm font-bold text-gold transition-all hover:bg-gold/20 active:scale-[0.98]"
                            >
                                <Package className="h-4 w-4" />
                                <span className="hidden sm:inline">استيراد ذكي</span>
                            </button>
                        </div>
                    </div>
                </div>

                {syncResult && (
                    <p className={`mt-3 text-xs font-medium ${syncResult.startsWith("خطأ") ? "text-red-300" : "text-emerald-300"}`}>
                        {syncResult}
                    </p>
                )}
            </section>

            {/* ═══ Layer 2: KPI Tiles (4 cards) ══════════════════════════════════ */}
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <KpiTile
                    title="المنتجات"
                    value={String(count)}
                    icon={Package}
                    accent="#ceae7f"
                    detail={<span className="text-xs text-theme-faint">{skus.length} رمز SKU</span>}
                />
                <KpiTile
                    title="الوحدات المتاحة"
                    value={String(totalUnits)}
                    icon={Warehouse}
                    accent="#10b981"
                    detail={<span className="text-xs text-theme-faint">{warehouses.length} مستودع</span>}
                />
                <KpiTile
                    title="قيمة المخزون"
                    value={formatCurrency(estimatedValue)}
                    icon={BarChart3}
                    accent="#22c55e"
                />
                <RiskTile
                    lowStock={lowStockCount}
                    outOfStock={outOfStockCount}
                    syncCount={syncExceptions.length}
                />
            </section>

            {/* ═══ Layer 3: Decision + Fulfillment ════════════════════════════════ */}
            <section className="grid gap-4 xl:grid-cols-[1fr_320px]">

                {/* ── Automation Decision Queue ─────────────────────────────────── */}
                <div className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(206,174,127,0.08),transparent_40%)]" />
                    <div className="relative">

                        {/* Queue header */}
                        <div className="mb-5 flex flex-col gap-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-theme-subtle" />
                                        <h3 className="text-lg font-black text-theme">طبقة قرار المخزون</h3>
                                    </div>
                                    {/* Inline stats — replaces 4 redundant sub-cards */}
                                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                        {automationStats.critical > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                                {automationStats.critical} حرج
                                            </span>
                                        )}
                                        {automationStats.high > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                {automationStats.high} عالٍ
                                            </span>
                                        )}
                                        {automationStats.watch > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                                {automationStats.watch} مراقبة
                                            </span>
                                        )}
                                        {automationStats.sync > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-300">
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                                {automationStats.sync} تعارض
                                            </span>
                                        )}
                                        {automationStats.restockValue > 0 && (
                                            <>
                                                <span className="text-theme-faint">·</span>
                                                <span className="text-[11px] font-semibold text-theme-soft">
                                                    قيمة مقترحة: {formatCurrency(automationStats.restockValue)}
                                                </span>
                                            </>
                                        )}
                                        {automationStats.critical === 0 && automationStats.high === 0 && automationStats.sync === 0 && (
                                            <span className="text-[11px] text-emerald-400">لا توجد إجراءات عاجلة</span>
                                        )}
                                    </div>
                                </div>

                                {/* Filter + export */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={exportQueue}
                                        disabled={filteredQueue.length === 0}
                                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 text-[11px] font-semibold text-gold transition-all hover:bg-gold/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        تصدير
                                    </button>
                                    {(["all", "critical", "high", "watch", "sync"] as AutomationFilter[]).map((f) => {
                                        const fLabel = f === "all" ? "الكل" : f === "critical" ? "حرج" : f === "high" ? "عالٍ" : f === "watch" ? "مراقبة" : "مزامنة";
                                        return (
                                            <button
                                                key={f}
                                                onClick={() => setAutomationFilter(f)}
                                                className={`min-h-[36px] rounded-full border px-3 text-[11px] font-semibold transition-all active:scale-[0.98] ${automationFilter === f ? "border-gold/40 bg-gold/15 text-gold" : "border-theme-subtle bg-theme-faint text-theme-soft hover:border-gold/20 hover:text-gold"}`}
                                            >
                                                {fLabel}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Bulk execute report */}
                        {bulkExecuteReport && (
                            <div className="mb-4 rounded-[20px] border border-theme-subtle bg-theme-faint p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-bold text-theme">
                                        {bulkExecuteReport.error ? bulkExecuteReport.error : `نجح ${bulkExecuteReport.succeeded ?? 0} من ${bulkExecuteReport.actionable ?? 0} عنصر`}
                                    </p>
                                    <button onClick={() => setBulkExecuteReport(null)} className="text-xs text-theme-faint hover:text-theme">إخفاء</button>
                                </div>
                                {!bulkExecuteReport.error && (bulkExecuteReport.results || []).slice(0, 4).map(item => (
                                    <div key={item.id} className={`mt-2 rounded-xl border px-3 py-2 text-xs ${item.success ? "border-emerald-500/20 text-emerald-300" : "border-red-500/20 text-red-300"}`}>
                                        {item.title} — {item.success ? `+${item.quantity} → ${item.newQuantity}` : item.error}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bulk select bar */}
                        {selectedRestockActions.length > 0 && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-gold/20 bg-gold/[0.07] px-4 py-3">
                                <p className="text-sm text-theme-subtle">
                                    <span className="font-bold text-gold">{selectedRestockActions.length}</span> عنصر ·{" "}
                                    <span className="font-bold text-gold">{selectedRestockQty}</span> وحدة ·{" "}
                                    <span className="font-bold text-gold">{formatCurrency(selectedRestockValue)}</span>
                                </p>
                                <div className="flex gap-2">
                                    {selectableVisibleIds.length > 0 && (
                                        <button onClick={toggleSelectVisible} className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-semibold text-theme-soft transition-all hover:border-gold/20 hover:text-gold active:scale-[0.98]">
                                            {allVisibleSelected ? "إلغاء الكل" : "تحديد الكل"}
                                        </button>
                                    )}
                                    <button onClick={() => setShowBulkExecuteModal(true)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/15 active:scale-[0.98]">
                                        تنفيذ التعبئة
                                    </button>
                                </div>
                            </div>
                        )}
                        {selectedRestockActions.length === 0 && selectableVisibleIds.length > 0 && (
                            <div className="mb-4 flex items-center justify-between gap-3 rounded-[20px] border border-theme-subtle bg-theme-faint px-4 py-3">
                                <p className="text-xs text-theme-subtle">حدد عناصر التعبئة لتنفيذها مباشرةً</p>
                                <button onClick={toggleSelectVisible} className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-semibold text-theme-soft transition-all hover:border-gold/20 hover:text-gold active:scale-[0.98]">تحديد الكل</button>
                            </div>
                        )}

                        {/* Queue items */}
                        <div className="space-y-3">
                            {filteredQueue.length > 0 ? filteredQueue.map((item) => {
                                const pm = getAutomationPriorityMeta(item.priority);
                                const isSelectable = item.kind === "restock" && Boolean(item.skuId) && Boolean(item.warehouseId) && item.recommendedQty > 0;
                                const isSelected = selectedActionIds.includes(item.id);
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`rounded-[20px] border p-4 transition-colors ${isSelected ? "border-gold/30 bg-gold/[0.04] ring-1 ring-gold/20" : "border-theme-subtle bg-theme-faint"}`}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 flex-1">
                                                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                                    {isSelectable ? (
                                                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[11px] font-bold text-theme-soft">
                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} className="h-3.5 w-3.5 rounded border-theme-subtle bg-transparent accent-[#ceae7f]" />
                                                            تحديد
                                                        </label>
                                                    ) : (
                                                        <span className="rounded-full border border-theme-subtle px-2 py-0.5 text-[11px] text-theme-faint">
                                                            {item.kind === "sync" ? "تنبيه مزامنة" : "—"}
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${pm.className}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${pm.dot}`} />
                                                        {pm.label}
                                                    </span>
                                                    <span className="rounded-full border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[11px] text-theme-soft">
                                                        {item.kind === "sync" ? "مزامنة" : item.actionLabel}
                                                    </span>
                                                </div>
                                                <h4 className="truncate text-sm font-bold text-theme">{item.title}</h4>
                                                <p className="mt-0.5 text-xs text-theme-subtle">{item.reason}</p>
                                                <p className="mt-1.5 text-[11px] text-theme-faint">
                                                    {item.sku} · {item.warehouse}
                                                    {item.updated_at ? ` · ${formatDate(item.updated_at)}` : ""}
                                                </p>
                                            </div>

                                            {/* Compact metrics */}
                                            <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end sm:gap-1">
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-[11px] text-theme-faint">حالياً</span>
                                                    <span className="text-base font-black text-theme">{item.currentQty}</span>
                                                    <span className="text-theme-faint">→</span>
                                                    <span className="text-base font-black text-gold">+{item.recommendedQty}</span>
                                                </div>
                                                {item.estimatedRestockValue > 0 && (
                                                    <span className="text-[11px] font-semibold text-theme-soft sm:text-right">{formatCurrency(item.estimatedRestockValue)}</span>
                                                )}
                                                <span className="rounded-full border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-faint">
                                                    أولوية {item.score}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="rounded-[20px] border border-dashed border-theme-subtle bg-theme-faint px-5 py-10 text-center">
                                    <p className="text-sm font-bold text-theme">لا توجد إجراءات في هذا العرض</p>
                                    <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-theme-subtle">
                                        غيّر الفلتر أو حدّث المزامنة للتأكد من أن حالة المتجر مطابقة للمخزون الفعلي.
                                    </p>
                                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                                        {automationFilter !== "all" && (
                                            <button
                                                onClick={() => setAutomationFilter("all")}
                                                className="rounded-full border border-theme-subtle bg-theme-subtle px-3 py-2 text-xs font-semibold text-theme-soft transition-all hover:border-gold/20 hover:text-gold active:scale-[0.98]"
                                            >
                                                عرض كل الإجراءات
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSyncStock}
                                            disabled={syncing}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/15 active:scale-[0.98] disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                                            تحديث الحالة
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Fulfillment Desk sidebar ──────────────────────────────────── */}
                <div className="theme-surface-panel rounded-[28px] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black text-theme">مكتب التنفيذ</h3>
                        <Link href="/dashboard/orders" className="flex items-center gap-1 rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[11px] font-medium text-theme-subtle transition-all hover:border-gold/30 hover:text-gold active:scale-[0.98]">
                            الكل <ChevronRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {fulfillmentItems.length > 0 ? (
                        <div className="space-y-2">
                            {fulfillmentItems.map((order) => (
                                <div key={order.id} className="rounded-2xl border border-theme-subtle bg-theme-faint p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-theme">#{order.order_number}</p>
                                            <p className="truncate text-[11px] text-theme-faint">
                                                {order.buyer?.display_name || order.buyer?.username || "عميل"}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-xs font-bold text-theme">{formatCurrency(order.total)}</p>
                                            <p className="text-[10px] text-theme-faint">{formatDate(order.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex gap-1.5">
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getOrderTone(order.status)}`}>
                                            {getOrderStatusLabel(order.status)}
                                        </span>
                                        <span className="rounded-full border border-theme-subtle bg-theme-faint px-2 py-0.5 text-[10px] text-theme-soft">
                                            {order.payment_status === "paid" ? "مدفوع" : order.payment_status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint py-8 text-center text-xs text-theme-subtle">
                            لا توجد طلبات قيد التنفيذ
                        </div>
                    )}

                    {/* Awaiting confirmation count chip */}
                    {fulfillmentSnapshot.stats.pendingReview > 0 && (
                        <Link
                            href="/dashboard/orders?status=pending"
                            className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-gold/20 bg-gold/[0.07] px-3 py-2.5 text-xs text-gold transition-all hover:bg-gold/10 active:scale-[0.98]"
                        >
                            <span className="font-semibold">{fulfillmentSnapshot.stats.pendingReview} طلب بانتظار التأكيد</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </div>
            </section>

            {/* ═══ Layer 4: Sticky Tab Bar ════════════════════════════════════════ */}
            <section className="sticky top-0 z-30 -mb-1 border-b border-theme-faint bg-bg/95 py-3.5 backdrop-blur-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex w-full gap-1.5 rounded-2xl border border-theme-subtle bg-theme-faint p-1 sm:w-fit">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => switchTab(t.id)}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98] sm:flex-none ${tab === t.id ? "border border-gold/30 bg-gold/20 text-gold shadow-[0_2px_12px_rgba(206,174,127,0.15)]" : "text-theme-subtle hover:bg-theme-subtle hover:text-theme"}`}
                            >
                                <t.icon className="h-4 w-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {lowStockCount > 0 && (
                            <button onClick={() => switchTab("inventory")} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-300 transition-all hover:bg-amber-500/15 active:scale-[0.98]">
                                {lowStockCount} منخفض
                            </button>
                        )}
                        {outOfStockCount > 0 && (
                            <button onClick={() => switchTab("inventory")} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-semibold text-red-300 transition-all hover:bg-red-500/15 active:scale-[0.98]">
                                {outOfStockCount} نافد
                            </button>
                        )}
                        <Link href="/dashboard/orders" className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 font-semibold text-theme-soft transition-all hover:border-gold/30 hover:text-gold active:scale-[0.98]">
                            {fulfillmentSnapshot.stats.fulfillmentQueue} في التنفيذ
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══ Tab Content ════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                {tab === "products" ? (
                    <motion.div key="products" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                        <ProductsClient
                            products={products} count={count} totalPages={totalPages}
                            currentPage={currentPage} currentType={currentType}
                            artists={artists} categories={categories} skus={skus}
                            basePath="/dashboard/products-inventory"
                            onSmartImportClick={() => setShowSmartImport(true)}
                            salesMap={salesMap}
                        />
                    </motion.div>
                ) : (
                    <motion.div key="inventory" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                        <InventoryClient
                            initialInventory={inventory} warehouses={warehouses} skus={skus}
                            stats={inventoryStats} onSmartImportClick={() => setShowSmartImport(true)}
                            hideStatsSummary
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Bulk Execute Modal ══════════════════════════════════════════════ */}
            <AnimatePresence>
                {showBulkExecuteModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="theme-surface-panel w-full max-w-2xl rounded-[28px] p-6 shadow-2xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-lg font-black text-theme">تأكيد تنفيذ التعبئة</p>
                                    <p className="mt-1 text-sm text-theme-subtle">سيتم إنشاء حركات إضافة مخزون للعناصر المحددة.</p>
                                </div>
                                <button onClick={() => !isBulkExecuting && setShowBulkExecuteModal(false)} className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-semibold text-theme-soft hover:border-red-500/20 hover:text-red-300">إغلاق</button>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-3">
                                {[
                                    { label: "العناصر", value: String(selectedRestockActions.length) },
                                    { label: "الكمية", value: String(selectedRestockQty) },
                                    { label: "القيمة", value: formatCurrency(selectedRestockValue) },
                                ].map(({ label, value }) => (
                                    <div key={label} className="rounded-2xl border border-theme-subtle bg-theme-faint p-3 text-center">
                                        <p className="text-[11px] text-theme-faint">{label}</p>
                                        <p className="mt-1 text-xl font-black text-theme">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4">
                                <label className="mb-1.5 block text-xs font-semibold text-theme">ملاحظات الدفعة</label>
                                <textarea value={bulkExecuteNotes} onChange={e => setBulkExecuteNotes(e.target.value)} rows={3} placeholder="مثال: تنفيذ دفعة إعادة التعبئة اليومية" className="input-dark w-full rounded-2xl px-4 py-3 text-sm outline-none" />
                            </div>

                            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                                {selectedRestockActions.map(item => (
                                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-2.5">
                                        <div>
                                            <p className="text-sm font-bold text-theme">{item.title}</p>
                                            <p className="text-xs text-theme-subtle">{item.sku} · {item.warehouse}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gold">+{item.recommendedQty}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <button onClick={() => setShowBulkExecuteModal(false)} disabled={isBulkExecuting} className="rounded-2xl border border-theme-subtle bg-theme-faint px-5 py-3 text-sm font-semibold text-theme-soft hover:bg-theme-subtle disabled:opacity-50">إلغاء</button>
                                <button onClick={handleBulkExecute} disabled={isBulkExecuting || !selectedRestockActions.length} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
                                    <RefreshCw className={`h-4 w-4 ${isBulkExecuting ? "animate-spin" : ""}`} />
                                    {isBulkExecuting ? "جارٍ التنفيذ..." : "تنفيذ الآن"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SmartImportWizard open={showSmartImport} onClose={() => setShowSmartImport(false)} onSuccess={() => { setShowSmartImport(false); router.refresh(); }} warehouses={warehouses} />
        </div>
    );
}
