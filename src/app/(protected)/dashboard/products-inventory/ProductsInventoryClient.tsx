"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    BarChart3,
    Download,
    Package,
    RefreshCw,
    ShieldAlert,
    ShoppingCart,
    Truck,
    Warehouse,
    XCircle,
} from "lucide-react";
import { ProductsClient } from "../products/ProductsClient";
import InventoryClient from "@/components/admin/erp/InventoryClient";
import SmartImportWizard from "@/components/admin/erp/SmartImportWizard";
import { syncProductStockFromERP } from "@/app/actions/products";
import { bulkExecuteRestockPlan } from "@/app/actions/erp/inventory";

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

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

function getOrderStatusLabel(status: string) {
    switch (status) {
        case "pending":
            return "بانتظار التأكيد";
        case "confirmed":
            return "مؤكد";
        case "processing":
            return "قيد التنفيذ";
        case "shipped":
            return "تم الشحن";
        case "delivered":
            return "تم التسليم";
        case "cancelled":
            return "ملغي";
        case "refunded":
            return "مسترد";
        default:
            return status;
    }
}

function getOrderTone(status: string) {
    switch (status) {
        case "pending":
            return "border-blue-500/20 bg-blue-500/10 text-blue-300";
        case "confirmed":
            return "border-sky-500/20 bg-sky-500/10 text-sky-300";
        case "processing":
            return "border-amber-500/20 bg-amber-500/10 text-amber-300";
        case "shipped":
            return "border-indigo-500/20 bg-indigo-500/10 text-indigo-300";
        case "delivered":
            return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
        case "cancelled":
        case "refunded":
            return "border-red-500/20 bg-red-500/10 text-red-300";
        default:
            return "border-theme-subtle bg-theme-faint text-theme-subtle";
    }
}

function getHealthMeta(score: number) {
    if (score >= 85) {
        return {
            label: "مستقر",
            summary: "المخزون والتنفيذ تحت السيطرة، ولا توجد مؤشرات حرجة تعطل الشحن.",
            className: "text-emerald-300",
        };
    }

    if (score >= 65) {
        return {
            label: "تحت المراقبة",
            summary: "هناك ضغط محدود على المخزون أو التنفيذ ويستحق متابعة قريبة قبل أن يتراكم.",
            className: "text-amber-300",
        };
    }

    return {
        label: "ضغط مرتفع",
        summary: "هناك نفاد أو تعارضات أو طوابير تنفيذ تحتاج تدخلاً مباشرًا من الفريق.",
        className: "text-red-300",
    };
}

function SummaryCard({
    title,
    value,
    subtitle,
    icon: Icon,
    accent,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} p-4 sm:p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-xl font-black text-theme sm:text-2xl">{value}</p>
                </div>
                <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{
                        backgroundColor: `${accent}18`,
                        borderColor: `${accent}33`,
                        color: accent,
                    }}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <p className="text-sm leading-6 text-theme-subtle">{subtitle}</p>
        </motion.div>
    );
}

function getAutomationPriorityMeta(priority: AutomationPriority) {
    switch (priority) {
        case "critical":
            return {
                label: "حرج",
                className: "border-red-500/20 bg-red-500/10 text-red-300",
            };
        case "high":
            return {
                label: "عالٍ",
                className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
            };
        default:
            return {
                label: "مراقبة",
                className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
            };
    }
}

function InventoryQueueCard({
    title,
    subtitle,
    emptyState,
    items,
    tone,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: any[];
    tone: "warning" | "critical" | "calm";
}) {
    const toneClass =
        tone === "critical"
            ? "border-red-500/20 bg-red-500/[0.04]"
            : tone === "warning"
              ? "border-amber-500/20 bg-amber-500/[0.04]"
              : "border-emerald-500/20 bg-emerald-500/[0.04]";

    return (
        <section className={`${subtlePanelClass} p-4 sm:p-5`}>
            <div className="mb-5">
                <h3 className="text-lg font-bold text-theme">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((item) => (
                        <div key={item.id} className={`rounded-2xl border p-4 ${toneClass}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme">
                                        {item.sku?.product?.title || item.title}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">
                                        {item.sku?.sku || item.store_name || "بدون SKU"}
                                    </p>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-theme">{item.quantity ?? item.actualQuantity ?? 0}</p>
                                    <p className="mt-1 text-[11px] text-theme-faint">
                                        {item.warehouse?.name || item.stateLabel || "حالة"}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-theme-subtle">
                                {item.sku?.size ? <span>المقاس: {item.sku.size}</span> : null}
                                {item.sku?.size && typeof item.sold_count === "number" ? (
                                    <span className="text-theme-faint">•</span>
                                ) : null}
                                {typeof item.sold_count === "number" ? <span>مباع: {item.sold_count}</span> : null}
                                {(item.sku?.size || typeof item.sold_count === "number") && item.updated_at ? (
                                    <span className="text-theme-faint">•</span>
                                ) : null}
                                {item.updated_at ? <span>آخر تحديث: {formatDate(item.updated_at)}</span> : null}
                                {item.flagLabel ? (
                                    <>
                                        <span className="text-theme-faint">•</span>
                                        <span>{item.flagLabel}</span>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </section>
    );
}

function FulfillmentQueueCard({
    title,
    subtitle,
    emptyState,
    items,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: ProductsInventoryClientProps["fulfillmentSnapshot"]["shippingDesk"];
}) {
    return (
        <section className={`${subtlePanelClass} p-4 sm:p-5`}>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-theme">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
                </div>
                <Link
                    href="/dashboard/orders"
                    className="inline-flex min-h-[38px] items-center rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-medium text-theme-subtle transition-colors hover:border-gold/30 hover:bg-theme-subtle hover:text-gold"
                >
                    فتح مركز الطلبات
                </Link>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-theme">#{order.order_number}</p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">
                                        {order.buyer?.display_name || order.buyer?.username || "عميل غير محدد"}
                                    </p>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-theme">{formatCurrency(order.total)}</p>
                                    <p className="mt-1 text-[11px] text-theme-faint">{formatDate(order.created_at)}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                                <span className={`rounded-full border px-2.5 py-1 font-bold ${getOrderTone(order.status)}`}>
                                    {getOrderStatusLabel(order.status)}
                                </span>
                                <span className="rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 font-bold text-theme-soft">
                                    {order.payment_status === "paid" ? "مدفوع" : order.payment_status}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </section>
    );
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
    fulfillmentSnapshot,
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
        if (nextTab === "inventory") {
            params.delete("page");
            params.delete("type");
        }
        router.push(`/dashboard/products-inventory?${params.toString()}`);
    };

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

    const totalsByProduct = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of inventory) {
            const productId = item.sku?.product_id;
            if (!productId) continue;
            map.set(productId, (map.get(productId) ?? 0) + (Number(item.quantity) || 0));
        }
        return map;
    }, [inventory]);

    const lowStockQueue = useMemo(
        () =>
            [...inventory]
                .filter((item) => item.quantity > 0 && item.quantity <= 5)
                .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0) || a.quantity - b.quantity)
                .slice(0, 5),
        [inventory]
    );

    const outOfStockQueue = useMemo(
        () =>
            [...inventory]
                .filter((item) => item.quantity === 0)
                .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
                .slice(0, 5),
        [inventory]
    );

    const syncExceptions = useMemo(
        () =>
            products
                .map((product) => {
                    const actualQuantity = totalsByProduct.get(product.id) ?? 0;
                    const shouldBeInStock = actualQuantity > 0;
                    const isMismatch = Boolean(product.in_stock) !== shouldBeInStock;

                    if (!isMismatch) return null;

                    return {
                        id: product.id,
                        title: product.title,
                        actualQuantity,
                        flagLabel: product.in_stock ? "معلّم كمتوفر رغم أن الكمية صفر" : "معلّم كغير متوفر رغم وجود كمية",
                        stateLabel: product.in_stock ? "in_stock = true" : "in_stock = false",
                        updated_at: product.updated_at || null,
                    };
                })
                .filter((item): item is {
                    id: string;
                    title: string;
                    actualQuantity: number;
                    flagLabel: string;
                    stateLabel: string;
                    updated_at: string | null;
                } => Boolean(item))
                .slice(0, 5),
        [products, totalsByProduct]
    );

    const totalUnits = inventoryStats?.totalItems ?? inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const lowStockCount = inventoryStats?.lowStock ?? lowStockQueue.length;
    const outOfStockCount = inventoryStats?.outOfStock ?? outOfStockQueue.length;
    const estimatedValue = inventoryStats?.estimatedValue ?? 0;
    const totalSold = inventoryStats?.totalSold ?? Object.values(salesMap || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const totalWarehouses = warehouses.length;
    const penalty =
        lowStockCount * 4 +
        outOfStockCount * 8 +
        syncExceptions.length * 9 +
        fulfillmentSnapshot.stats.pendingReview * 3 +
        fulfillmentSnapshot.stats.fulfillmentQueue * 4;
    const healthScore = Math.max(32, Math.min(100, 100 - penalty));
    const healthMeta = getHealthMeta(healthScore);

    const automationQueue = useMemo<AutomationQueueItem[]>(() => {
        const restockActions = inventory
            .filter((item) => item.quantity <= 5)
            .map((item) => {
                const quantity = Number(item.quantity) || 0;
                const soldCount = Number(item.sold_count) || 0;
                const unitPrice = Number(item.sku?.product?.price) || 0;
                const recommendedQty = Math.max(
                    quantity === 0 ? 8 : 4,
                    soldCount > 0 ? Math.min(60, soldCount * 2) : quantity === 0 ? 8 : 5
                );
                const urgencyScore =
                    (quantity === 0 ? 58 : quantity <= 2 ? 42 : 28) +
                    Math.min(soldCount * 2, 22) +
                    (soldCount > quantity ? 8 : 0);
                const priority: AutomationPriority =
                    urgencyScore >= 72 ? "critical" : urgencyScore >= 48 ? "high" : "watch";

                return {
                    id: item.id,
                    kind: "restock" as const,
                    title: item.sku?.product?.title || "منتج غير معروف",
                    sku: item.sku?.sku || "بدون SKU",
                    warehouse: item.warehouse?.name || "مستودع غير محدد",
                    currentQty: quantity,
                    soldCount,
                    unitPrice,
                    estimatedRestockValue: unitPrice * recommendedQty,
                    recommendedQty,
                    score: urgencyScore,
                    priority,
                    actionLabel: quantity === 0 ? "إعادة تعبئة فورية" : quantity <= 2 ? "توريد خلال 24 ساعة" : "إعادة تعبئة قريبة",
                    reason:
                        quantity === 0
                            ? "نفاد فعلي من المخزون مع وجود حركة أو قابلية سحب."
                            : quantity <= 2
                              ? "الكمية على حافة النفاد وتحتاج قرارًا سريعًا."
                              : "المخزون منخفض ويستحق المتابعة قبل أن يتعطل التنفيذ.",
                    updated_at: item.updated_at,
                    skuId: item.sku_id ?? null,
                    warehouseId: item.warehouse_id ?? null,
                };
            });

        const syncActions = syncExceptions.map((item) => ({
            id: `sync-${item.id}`,
            kind: "sync" as const,
            title: item.title,
            sku: "حالة المنتج",
            warehouse: item.stateLabel,
            currentQty: item.actualQuantity,
            soldCount: 0,
            unitPrice: 0,
            estimatedRestockValue: 0,
            recommendedQty: item.actualQuantity > 0 ? item.actualQuantity : 0,
            score: item.actualQuantity > 0 ? 64 : 56,
            priority: item.actualQuantity > 0 ? "high" as const : "watch" as const,
            actionLabel: "مراجعة مزامنة الحالة",
            reason: item.flagLabel,
            updated_at: item.updated_at,
            skuId: null,
            warehouseId: null,
        }));

        return [...restockActions, ...syncActions].sort((a, b) => b.score - a.score).slice(0, 12);
    }, [inventory, syncExceptions]);

    const filteredAutomationQueue = useMemo(() => {
        if (automationFilter === "all") return automationQueue;
        if (automationFilter === "sync") return automationQueue.filter((item) => item.kind === "sync");
        return automationQueue.filter((item) => item.priority === automationFilter);
    }, [automationFilter, automationQueue]);

    const automationStats = useMemo(() => ({
        critical: automationQueue.filter((item) => item.priority === "critical").length,
        high: automationQueue.filter((item) => item.priority === "high").length,
        watch: automationQueue.filter((item) => item.priority === "watch").length,
        sync: automationQueue.filter((item) => item.kind === "sync").length,
        restockValue: automationQueue
            .filter((item) => item.kind === "restock")
            .reduce((sum, item) => sum + item.estimatedRestockValue, 0),
    }), [automationQueue]);

    const selectableVisibleActionIds = useMemo(
        () =>
            filteredAutomationQueue
                .filter((item) => item.kind === "restock" && item.skuId && item.warehouseId && item.recommendedQty > 0)
                .map((item) => item.id),
        [filteredAutomationQueue]
    );

    const selectedRestockActions = useMemo(
        () =>
            automationQueue.filter(
                (item) =>
                    selectedActionIds.includes(item.id) &&
                    item.kind === "restock" &&
                    item.skuId &&
                    item.warehouseId &&
                    item.recommendedQty > 0
            ),
        [automationQueue, selectedActionIds]
    );

    const allVisibleSelected =
        selectableVisibleActionIds.length > 0 && selectableVisibleActionIds.every((id) => selectedActionIds.includes(id));

    const selectedRestockQty = selectedRestockActions.reduce((sum, item) => sum + item.recommendedQty, 0);
    const selectedRestockValue = selectedRestockActions.reduce((sum, item) => sum + item.estimatedRestockValue, 0);

    useEffect(() => {
        const validIds = new Set(
            automationQueue
                .filter((item) => item.kind === "restock" && item.skuId && item.warehouseId && item.recommendedQty > 0)
                .map((item) => item.id)
        );
        setSelectedActionIds((current) => current.filter((id) => validIds.has(id)));
    }, [automationQueue]);

    const toggleSelectAction = (id: string) => {
        setSelectedActionIds((current) =>
            current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
        );
    };

    const toggleSelectVisible = () => {
        setSelectedActionIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !selectableVisibleActionIds.includes(id));
            }

            return Array.from(new Set([...current, ...selectableVisibleActionIds]));
        });
    };

    const handleBulkExecute = async () => {
        if (selectedRestockActions.length === 0) return;

        setIsBulkExecuting(true);
        setBulkExecuteReport(null);

        const result = await bulkExecuteRestockPlan({
            items: selectedRestockActions.map((item) => ({
                id: item.id,
                kind: item.kind,
                skuId: item.skuId,
                warehouseId: item.warehouseId,
                quantity: item.recommendedQty,
                title: item.title,
                sku: item.sku,
                warehouse: item.warehouse,
            })),
            notes: bulkExecuteNotes,
        });

        setIsBulkExecuting(false);
        setBulkExecuteReport(result);

        if ("error" in result && result.error) return;

        const failedIds = new Set((result.results || []).filter((item) => !item.success).map((item) => item.id));
        setSelectedActionIds((current) => current.filter((id) => failedIds.has(id)));
        setShowBulkExecuteModal(false);
        setBulkExecuteNotes("");
        router.refresh();
    };

    const exportAutomationQueue = () => {
        const rows: string[][] = [
            ["الأولوية", "النوع", "المنتج", "SKU", "المستودع/الحالة", "الكمية الحالية", "الكمية المقترحة", "قيمة إعادة التعبئة", "السبب"],
            ...filteredAutomationQueue.map((item) => [
                getAutomationPriorityMeta(item.priority).label,
                item.kind === "sync" ? "مزامنة" : "إعادة تعبئة",
                item.title,
                item.sku,
                item.warehouse,
                String(item.currentQty),
                String(item.recommendedQty),
                String(Math.round(item.estimatedRestockValue)),
                item.reason,
            ]),
        ];

        const csv = rows
            .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `wusha-restock-queue-${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const tabs = [
        { id: "products" as TabId, label: "المنتجات", icon: Package },
        { id: "inventory" as TabId, label: "المخزون والجرد", icon: Warehouse },
    ];

    return (
        <div className="space-y-6">
            <section className={`${panelClass} p-5 sm:p-6 md:p-7`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(206,174,127,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_30%)]" />
                <div className="relative space-y-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                                <Warehouse className="h-3.5 w-3.5" />
                                مركز التنفيذ والمخزون
                            </span>
                            <h2 className="mt-4 text-2xl font-black text-theme sm:text-3xl">
                                قراءة واحدة لحالة المخزون، ضغط التنفيذ، ومخاطر الشحن قبل أن تتحول إلى تعطّل.
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذه الشاشة تربط بين المنتجات، ERP inventory، وطابور الطلبات الجاري تنفيذه. الهدف ليس إدارة
                                الجداول فقط، بل كشف ما الذي يحتاج إعادة تعبئة، وما الذي يعطل التنفيذ، وما الذي يستحق مزامنة أو
                                تدخلًا فوريًا.
                            </p>
                        </div>

                        <div className="flex flex-col items-stretch gap-3 xl:min-w-[320px]">
                            <button
                                onClick={handleSyncStock}
                                disabled={syncing}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                                {syncing ? "جارٍ مزامنة المخزون..." : "مزامنة in_stock مع ERP"}
                            </button>
                            <button
                                onClick={() => setShowSmartImport(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/15 px-4 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/20"
                            >
                                <Package className="h-4 w-4" />
                                الاستيراد الذكي للمخزون
                            </button>
                            {syncResult ? (
                                <p className={`text-xs font-medium ${syncResult.startsWith("خطأ") ? "text-red-300" : "text-emerald-300"}`}>
                                    {syncResult}
                                </p>
                            ) : null}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1.15fr,0.85fr]">
                        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
                            <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">صحة التنفيذ</p>
                            <div className="mt-4 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-4xl font-black text-theme">{healthScore}</p>
                                    <p className={`mt-2 text-sm font-semibold ${healthMeta.className}`}>{healthMeta.label}</p>
                                </div>
                                <div className="w-full max-w-[260px]">
                                    <div className="h-2 overflow-hidden rounded-full bg-theme-faint">
                                        <div
                                            className={`h-full rounded-full ${
                                                healthScore >= 85 ? "bg-emerald-400" : healthScore >= 65 ? "bg-amber-400" : "bg-red-400"
                                            }`}
                                            style={{ width: `${healthScore}%` }}
                                        />
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-theme-subtle">{healthMeta.summary}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`${subtlePanelClass} p-4 sm:p-5`}>
                            <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">نبض التنفيذ</p>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-theme-faint">بانتظار التأكيد</p>
                                    <p className="mt-2 text-2xl font-black text-theme">{fulfillmentSnapshot.stats.pendingReview}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-theme-faint">قيد التنفيذ والشحن</p>
                                    <p className="mt-2 text-2xl font-black text-theme">{fulfillmentSnapshot.stats.fulfillmentQueue}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-theme-faint">مدفوعات معلقة</p>
                                    <p className="mt-2 text-2xl font-black text-theme">{fulfillmentSnapshot.stats.paymentPending}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-theme-faint">طلبات اليوم</p>
                                    <p className="mt-2 text-2xl font-black text-theme">{fulfillmentSnapshot.stats.todayOrders}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                <SummaryCard
                    title="المنتجات"
                    value={String(count)}
                    subtitle="إجمالي المنتجات التي يديرها هذا المسار من لوحة التشغيل الحالية."
                    icon={Package}
                    accent="#ceae7f"
                />
                <SummaryCard
                    title="الوحدات المتاحة"
                    value={String(totalUnits)}
                    subtitle={`${totalWarehouses} مستودعات و ${skus.length} رمز SKU داخل طبقة التنفيذ.`}
                    icon={Warehouse}
                    accent="#38bdf8"
                />
                <SummaryCard
                    title="قيمة المخزون"
                    value={formatCurrency(estimatedValue)}
                    subtitle="تقدير مالي مباشر لما هو موجود فعليًا في خط المخزون الحالي."
                    icon={BarChart3}
                    accent="#22c55e"
                />
                <SummaryCard
                    title="مخزون منخفض"
                    value={String(lowStockCount)}
                    subtitle="عناصر ما زالت متاحة لكنها تقترب من منطقة الخطر."
                    icon={AlertTriangle}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="نفاد كامل"
                    value={String(outOfStockCount)}
                    subtitle="عناصر لا يمكن الاعتماد عليها للتنفيذ الفوري حتى يتم تزويدها."
                    icon={XCircle}
                    accent="#ef4444"
                />
                <SummaryCard
                    title="إجمالي المباع"
                    value={String(totalSold)}
                    subtitle="مؤشر عام على حركة السحب من المخزون عبر الطلبات المسجلة."
                    icon={ShoppingCart}
                    accent="#a855f7"
                />
            </section>

            <section className={`${panelClass} p-5 sm:p-6`}>
                <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs font-semibold text-theme-soft">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            طبقة قرار المخزون
                        </span>
                        <h3 className="mt-4 text-xl font-black text-theme md:text-2xl">
                            أولوية إعادة التعبئة والمزامنة جاهزة للتنفيذ، لا للمراقبة فقط.
                        </h3>
                        <p className="mt-3 text-sm leading-7 text-theme-subtle">
                            هذه القائمة ترتب لك أين تبدأ: ما الذي يجب تزويده فورًا، وما الذي يحتاج إصلاح مزامنة، وما قيمة
                            العمل المقترحة حتى يتحرك الفريق من الشاشة إلى الإجراء مباشرة.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={exportAutomationQueue}
                            className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold transition-colors hover:bg-gold/15"
                        >
                            <Download className="h-4 w-4" />
                            تصدير قائمة العمل
                        </button>
                        {(["all", "critical", "high", "watch", "sync"] as AutomationFilter[]).map((filter) => {
                            const label =
                                filter === "all"
                                    ? "الكل"
                                    : filter === "critical"
                                      ? "حرج"
                                      : filter === "high"
                                        ? "عالٍ"
                                        : filter === "watch"
                                          ? "مراقبة"
                                          : "مزامنة";

                            return (
                                <button
                                    key={filter}
                                    onClick={() => setAutomationFilter(filter)}
                                    className={`min-h-[40px] rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                                        automationFilter === filter
                                            ? "border-gold/40 bg-gold/15 text-gold"
                                            : "border-theme-subtle bg-theme-faint text-theme-soft hover:border-gold/20 hover:bg-theme-subtle hover:text-gold"
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    <SummaryCard
                        title="إجراءات حرجة"
                        value={String(automationStats.critical)}
                        subtitle="أعلى العناصر حاجة إلى تدخل فوري قبل أن تضرب التنفيذ أو الشحن."
                        icon={AlertTriangle}
                        accent="#ef4444"
                    />
                    <SummaryCard
                        title="إجراءات عالية"
                        value={String(automationStats.high)}
                        subtitle="ملفات تحتاج تحركًا قريبًا، لكنها ليست في مرحلة الانقطاع الكامل بعد."
                        icon={Truck}
                        accent="#f59e0b"
                    />
                    <SummaryCard
                        title="تعارضات مزامنة"
                        value={String(automationStats.sync)}
                        subtitle="منتجات يحتاج الفريق فيها إصلاح حالة `in_stock` أو مطابقة ERP."
                        icon={ShieldAlert}
                        accent="#38bdf8"
                    />
                    <SummaryCard
                        title="قيمة تعبئة مقترحة"
                        value={formatCurrency(automationStats.restockValue)}
                        subtitle="تقدير سريع لقيمة إعادة التعبئة المقترحة على القائمة الحالية."
                        icon={BarChart3}
                        accent="#22c55e"
                    />
                </div>

                {bulkExecuteReport ? (
                    <div className="theme-surface-panel mt-6 rounded-[24px] p-4 sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <p className="text-sm font-bold text-theme">تقرير التنفيذ الجماعي</p>
                                <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                    {bulkExecuteReport.error
                                        ? bulkExecuteReport.error
                                        : `تمت معالجة ${bulkExecuteReport.actionable || 0} عنصر قابل للتنفيذ، نجح منها ${bulkExecuteReport.succeeded || 0} وفشل ${bulkExecuteReport.failed || 0}.`}
                                </p>
                            </div>
                            <button
                                onClick={() => setBulkExecuteReport(null)}
                                className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-semibold text-theme-soft transition-colors hover:border-gold/20 hover:bg-theme-subtle hover:text-gold"
                            >
                                إخفاء التقرير
                            </button>
                        </div>

                        {!bulkExecuteReport.error && (bulkExecuteReport.results || []).length > 0 ? (
                            <div className="mt-4 space-y-3">
                                {(bulkExecuteReport.results || []).slice(0, 8).map((item) => (
                                    <div
                                        key={item.id}
                                        className={`rounded-2xl border px-4 py-3 ${
                                            item.success
                                                ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                                                : "border-red-500/20 bg-red-500/[0.05]"
                                        }`}
                                    >
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-theme">{item.title}</p>
                                                <p className="mt-1 text-xs text-theme-subtle">
                                                    {item.sku} • {item.warehouse}
                                                </p>
                                            </div>
                                            <div className="text-sm">
                                                <span className={item.success ? "text-emerald-300" : "text-red-300"}>
                                                    {item.success
                                                        ? `تمت إضافة ${item.quantity} وأصبح الرصيد ${item.newQuantity ?? "-"}`
                                                        : item.error || "فشل التنفيذ"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {selectedRestockActions.length > 0 ? (
                    <div className="mt-6 rounded-[24px] border border-gold/20 bg-gold/[0.07] p-4 sm:p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <p className="text-sm font-bold text-gold">شريط التنفيذ الجماعي</p>
                                <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                    تم تحديد {selectedRestockActions.length} عنصر قابل للتعبئة بكمية إجمالية {selectedRestockQty} ووَقيمة
                                    تقديرية {formatCurrency(selectedRestockValue)}.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {selectableVisibleActionIds.length > 0 ? (
                                    <button
                                        onClick={toggleSelectVisible}
                                        className="rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-semibold text-theme-soft transition-colors hover:border-gold/20 hover:bg-theme-subtle hover:text-gold"
                                    >
                                        {allVisibleSelected ? "إلغاء تحديد الظاهر" : "تحديد الظاهر"}
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => setShowBulkExecuteModal(true)}
                                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15"
                                >
                                    تنفيذ التعبئة المحددة
                                </button>
                            </div>
                        </div>
                    </div>
                ) : selectableVisibleActionIds.length > 0 ? (
                    <div className="theme-surface-panel mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-4 sm:px-5">
                        <p className="text-sm text-theme-subtle">
                            يمكنك تحديد عناصر التعبئة الظاهرة وبدء التنفيذ الجماعي مباشرة من هذه الطبقة.
                        </p>
                        <button
                            onClick={toggleSelectVisible}
                            className="rounded-full border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-semibold text-theme-soft transition-colors hover:border-gold/20 hover:bg-theme-subtle hover:text-gold"
                        >
                            تحديد الظاهر
                        </button>
                    </div>
                ) : null}

                <div className="mt-6 grid gap-4">
                    {filteredAutomationQueue.length > 0 ? (
                        filteredAutomationQueue.map((item) => {
                            const priorityMeta = getAutomationPriorityMeta(item.priority);
                            const isSelectable =
                                item.kind === "restock" && Boolean(item.skuId) && Boolean(item.warehouseId) && item.recommendedQty > 0;
                            const isSelected = selectedActionIds.includes(item.id);

                            return (
                                <div
                                    key={item.id}
                                    className={`rounded-[24px] border bg-theme-faint p-4 sm:p-5 ${
                                        isSelected ? "border-gold/30 ring-1 ring-gold/20" : "border-theme-subtle"
                                    }`}
                                >
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {isSelectable ? (
                                                    <label className="inline-flex items-center gap-2 rounded-full border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_70%,transparent)] px-2.5 py-1 text-[11px] font-bold text-theme-soft">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectAction(item.id)}
                                                            className="h-4 w-4 rounded border-theme-subtle bg-transparent text-gold focus:ring-gold/30"
                                                        />
                                                        تحديد
                                                    </label>
                                                ) : (
                                                    <span className="rounded-full border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_70%,transparent)] px-2.5 py-1 text-[11px] font-bold text-theme-faint">
                                                        {item.kind === "sync" ? "تنبيه مزامنة" : "غير قابل للتنفيذ"}
                                                    </span>
                                                )}
                                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${priorityMeta.className}`}>
                                                    {priorityMeta.label}
                                                </span>
                                                <span className="rounded-full border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[11px] font-bold text-theme-soft">
                                                    {item.kind === "sync" ? "مزامنة" : item.actionLabel}
                                                </span>
                                            </div>
                                            <h4 className="mt-3 text-lg font-bold text-theme">{item.title}</h4>
                                            <p className="mt-1 text-sm text-theme-subtle">{item.reason}</p>
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-theme-faint">
                                                <span>{item.sku}</span>
                                                <span>•</span>
                                                <span>{item.warehouse}</span>
                                                {item.updated_at ? (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatDate(item.updated_at)}</span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 xl:min-w-[250px] xl:max-w-[320px]">
                                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                                <p className="text-[11px] text-theme-faint">الكمية الحالية</p>
                                                <p className="mt-2 text-xl font-black text-theme">{item.currentQty}</p>
                                            </div>
                                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                                <p className="text-[11px] text-theme-faint">الكمية المقترحة</p>
                                                <p className="mt-2 text-xl font-black text-theme">{item.recommendedQty}</p>
                                            </div>
                                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                                <p className="text-[11px] text-theme-faint">درجة الأولوية</p>
                                                <p className="mt-2 text-xl font-black text-theme">{item.score}</p>
                                            </div>
                                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                                <p className="text-[11px] text-theme-faint">القيمة التقديرية</p>
                                                <p className="mt-2 text-lg font-black text-theme">{formatCurrency(item.estimatedRestockValue)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-theme-subtle bg-theme-faint px-4 py-10 text-center text-sm text-theme-subtle">
                            لا توجد عناصر في هذا الفلتر حاليًا.
                        </div>
                    )}
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <InventoryQueueCard
                    title="رادار إعادة التعبئة"
                    subtitle="العناصر التي اقتربت من النفاد مع إشارة إلى الحركة البيعية، لتعرف أين تبدأ قبل أن يتأثر التنفيذ."
                    emptyState="لا توجد عناصر منخفضة المخزون حاليًا."
                    items={lowStockQueue}
                    tone="warning"
                />
                <InventoryQueueCard
                    title="نفاد يهدد التنفيذ"
                    subtitle="عناصر نفدت فعليًا. هذه القائمة تعطيك أولويات الإغلاق وإعادة الإمداد."
                    emptyState="لا توجد عناصر نافدة حاليًا."
                    items={outOfStockQueue}
                    tone="critical"
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <InventoryQueueCard
                    title="تعارضات مزامنة"
                    subtitle="حالات يظهر فيها اختلاف بين `in_stock` والكمية الفعلية في ERP، وهي أخطاء تشغيلية يجب عدم تركها تتكرر."
                    emptyState="لا توجد تعارضات بين حالة المنتج وكمية المخزون."
                    items={syncExceptions}
                    tone="calm"
                />
                <FulfillmentQueueCard
                    title="مكتب التنفيذ"
                    subtitle="الطلبات الجارية في التنفيذ أو الشحن حتى يبقى المخزون مرتبطًا بخط العمل الحقيقي."
                    emptyState="لا توجد طلبات قيد التنفيذ أو الشحن حاليًا."
                    items={fulfillmentSnapshot.shippingDesk.slice(0, 5)}
                />
            </section>

            <section className="sticky top-0 z-30 -mb-1 border-b border-theme-faint bg-bg/95 py-4 backdrop-blur-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2 rounded-2xl border border-theme-subtle bg-theme-faint p-1 w-fit">
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => switchTab(item.id)}
                                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                                    tab === item.id
                                        ? "border border-gold/30 bg-gold/20 text-gold shadow-[0_2px_12px_rgba(206,174,127,0.15)]"
                                        : "text-theme-subtle hover:bg-theme-subtle hover:text-theme-strong"
                                }`}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                            onClick={() => switchTab("inventory")}
                            className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-300 transition-colors hover:bg-amber-500/15"
                        >
                            {lowStockCount} منخفض يحتاج متابعة
                        </button>
                        <button
                            onClick={() => switchTab("inventory")}
                            className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-semibold text-red-300 transition-colors hover:bg-red-500/15"
                        >
                            {outOfStockCount} نافد
                        </button>
                        <Link
                            href="/dashboard/orders"
                            className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 font-semibold text-theme-soft transition-colors hover:border-gold/30 hover:bg-theme-subtle hover:text-gold"
                        >
                            {fulfillmentSnapshot.stats.fulfillmentQueue} في خط التنفيذ
                        </Link>
                    </div>
                </div>
            </section>

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
                            hideStatsSummary
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showBulkExecuteModal ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[90] flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="theme-surface-panel w-full max-w-2xl rounded-[28px] p-6 shadow-2xl"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-lg font-black text-theme">تأكيد تنفيذ التعبئة</p>
                                    <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                        سيتم إنشاء حركات إضافة مخزون للعناصر المحددة من قائمة القرار الحالية، مع تحديث المركز بعد انتهاء الدفعة.
                                    </p>
                                </div>
                                <button
                                    onClick={() => !isBulkExecuting && setShowBulkExecuteModal(false)}
                                    className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-semibold text-theme-soft transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-[11px] text-theme-faint">العناصر المحددة</p>
                                    <p className="mt-2 text-2xl font-black text-theme">{selectedRestockActions.length}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-[11px] text-theme-faint">إجمالي الكمية</p>
                                    <p className="mt-2 text-2xl font-black text-theme">{selectedRestockQty}</p>
                                </div>
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <p className="text-[11px] text-theme-faint">القيمة التقديرية</p>
                                    <p className="mt-2 text-lg font-black text-theme">{formatCurrency(selectedRestockValue)}</p>
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="mb-2 block text-sm font-semibold text-theme">ملاحظات الدفعة</label>
                                <textarea
                                    value={bulkExecuteNotes}
                                    onChange={(event) => setBulkExecuteNotes(event.target.value)}
                                    rows={4}
                                    placeholder="مثال: تنفيذ دفعة إعادة التعبئة اليومية من مركز المخزون"
                                    className="input-dark w-full rounded-2xl px-4 py-3 text-sm outline-none transition-colors"
                                />
                            </div>

                            <div className="mt-5 max-h-56 space-y-3 overflow-y-auto pr-1">
                                {selectedRestockActions.map((item) => (
                                    <div key={item.id} className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-theme">{item.title}</p>
                                                <p className="mt-1 text-xs text-theme-subtle">
                                                    {item.sku} • {item.warehouse}
                                                </p>
                                            </div>
                                            <div className="text-sm font-semibold text-gold">
                                                +{item.recommendedQty} • {formatCurrency(item.estimatedRestockValue)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    onClick={() => setShowBulkExecuteModal(false)}
                                    disabled={isBulkExecuting}
                                    className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-semibold text-theme-soft transition-colors hover:border-theme-soft hover:bg-theme-subtle hover:text-theme disabled:opacity-50"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleBulkExecute}
                                    disabled={isBulkExecuting || selectedRestockActions.length === 0}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${isBulkExecuting ? "animate-spin" : ""}`} />
                                    {isBulkExecuting ? "جارٍ تنفيذ الدفعة..." : "تنفيذ التعبئة الآن"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <SmartImportWizard
                open={showSmartImport}
                onClose={() => setShowSmartImport(false)}
                onSuccess={() => {
                    setShowSmartImport(false);
                    router.refresh();
                }}
                warehouses={warehouses}
            />
        </div>
    );
}
