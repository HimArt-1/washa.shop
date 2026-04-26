"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    FileDown,
    Loader2,
    Package,
    ShoppingCart,
    Truck,
    Search,
    CheckSquare
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateOrderStatus } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { InvoiceBuilder } from "./InvoiceBuilder";

interface OrdersClientProps {
    snapshot: {
        stats: {
            totalOrders: number;
            pendingReview: number;
            fulfillmentQueue: number;
            paymentPending: number;
            delivered: number;
            cancelledOrRefunded: number;
            paidOrders: number;
            totalRevenue: number;
            todayOrders: number;
            todayRevenue: number;
        };
        awaitingConfirmation: any[];
        shippingDesk: any[];
        paymentWatchlist: any[];
    };
    orders: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentStatus: string;
    currentSearch?: string;
    /** من ?focus= — يُوسَّع الصف ويُمرَّر للتمرير */
    initialFocusOrderId?: string;
}

const statuses = [
    { value: "all", label: "الكل" },
    { value: "pending", label: "قيد الانتظار" },
    { value: "confirmed", label: "مؤكد" },
    { value: "processing", label: "جاري المعالجة" },
    { value: "shipped", label: "تم الشحن" },
    { value: "delivered", label: "تم التوصيل" },
    { value: "cancelled", label: "ملغي" },
];

const nextStatuses: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
    refunded: [],
};

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

function formatShortDate(value: string) {
    return new Date(value).toLocaleDateString("ar-SA", {
        month: "short",
        day: "numeric",
    });
}

function paymentLabel(status: string) {
    switch (status) {
        case "paid":
            return "مدفوع";
        case "failed":
            return "فشل";
        case "refunded":
            return "مسترجع";
        default:
            return "معلق";
    }
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
            initial={{ opacity: 0, y: 12 }}
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



export function OrdersClient({
    snapshot,
    orders = [],
    count = 0,
    totalPages = 0,
    currentPage = 1,
    currentStatus = "all",
    currentSearch = "",
    initialFocusOrderId,
}: OrdersClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
    const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // Bulk Actions & Search
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState(currentSearch || "");
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const navigate = (params: Record<string, string>, opts?: { clearFocus?: boolean }) => {
        const sp = new URLSearchParams();
        if (params.status && params.status !== "all") sp.set("status", params.status);
        if (params.page && params.page !== "1") sp.set("page", params.page);
        if (params.search || (searchQuery && params.search !== "")) sp.set("search", params.search ?? searchQuery);
        
        if (!opts?.clearFocus) {
            const f = searchParams.get("focus") || initialFocusOrderId;
            if (f) sp.set("focus", f);
        }
        startTransition(() => {
            const q = sp.toString();
            router.push(q ? `/dashboard/orders?${q}` : "/dashboard/orders");
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({ page: "1", search: searchQuery });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedOrders(orders.map(o => o.id));
        else setSelectedOrders([]);
    };

    const toggleSelection = (id: string) => {
        setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const focusFromUrl = searchParams.get("focus");
    useEffect(() => {
        const focusId = focusFromUrl || initialFocusOrderId || null;
        if (!focusId) return;
        const exists = orders.some((o) => o.id === focusId);
        if (!exists) return;
        setExpandedOrder(focusId);
        const t = window.setTimeout(() => {
            document.getElementById(`admin-order-row-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
        return () => window.clearTimeout(t);
    }, [focusFromUrl, initialFocusOrderId, orders]);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setUpdatingOrder(orderId);
        setErrorMessage(null);
        try {
            const result = await updateOrderStatus(orderId, newStatus);
            if (!result?.success) {
                setErrorMessage(result?.error || "تعذر تحديث حالة الطلب.");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Order status update failed", error);
            setErrorMessage("تعذر تحديث حالة الطلب الآن. حاول مرة أخرى.");
        } finally {
            setUpdatingOrder(null);
        }
    };

    const handleBulkStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        if (!newStatus || selectedOrders.length === 0) return;
        
        setIsBulkUpdating(true);
        setErrorMessage(null);
        try {
            // Processing sequentially for safety, but could be Promise.all in production
            for (const orderId of selectedOrders) {
                await updateOrderStatus(orderId, newStatus);
            }
            setSelectedOrders([]);
            router.refresh();
        } catch (error) {
            console.error("Bulk status update failed", error);
            setErrorMessage("تعذر إكمال التحديث الجماعي. تحقق من الطلبات.");
        } finally {
            setIsBulkUpdating(false);
            e.target.value = ""; // Reset select
        }
    };

    const highlightedOrderId = searchParams.get("focus") || initialFocusOrderId || null;

    const collectionRate =
        snapshot.stats.totalOrders > 0
            ? (snapshot.stats.paidOrders / snapshot.stats.totalOrders) * 100
            : 0;
    const attentionLoad =
        snapshot.stats.pendingReview +
        snapshot.stats.paymentPending +
        snapshot.stats.fulfillmentQueue;

    return (
        <div className="space-y-6">
            <InvoiceBuilder order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
            {errorMessage ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                </div>
            ) : null}

            {/* Mini Insights Row */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <button 
                    onClick={() => navigate({ status: "pending", page: "1" }, { clearFocus: true })}
                    className="text-right group relative overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint p-5 transition-all hover:border-gold/30 hover:bg-theme-subtle focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-theme-subtle bg-theme-surface border border-theme-subtle px-2 py-1 rounded-lg">تدخل مطلوب</span>
                    </div>
                    <p className="text-3xl font-black text-theme">{snapshot.stats.pendingReview}</p>
                    <p className="mt-1 text-sm font-medium text-theme-subtle">بانتظار التأكيد</p>
                </button>

                <button 
                    onClick={() => navigate({ status: "processing", page: "1" }, { clearFocus: true })}
                    className="text-right group relative overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint p-5 transition-all hover:border-gold/30 hover:bg-theme-subtle focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
                            <Package className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-theme-subtle bg-theme-surface border border-theme-subtle px-2 py-1 rounded-lg">طابور العمل</span>
                    </div>
                    <p className="text-3xl font-black text-theme">{snapshot.stats.fulfillmentQueue}</p>
                    <p className="mt-1 text-sm font-medium text-theme-subtle">جاري التنفيذ</p>
                </button>

                <button 
                    onClick={() => navigate({ status: "all", page: "1" }, { clearFocus: true })}
                    className="text-right group relative overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint p-5 transition-all hover:border-gold/30 hover:bg-theme-subtle focus:outline-none focus:ring-2 focus:ring-gold/50"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-theme">{snapshot.stats.paymentPending}</p>
                    <p className="mt-1 text-sm font-medium text-theme-subtle">تحصيل معلق</p>
                </button>

                <div className="relative overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <Truck className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">أداء اليوم</span>
                    </div>
                    <p className="text-3xl font-black text-theme">{snapshot.stats.todayOrders}</p>
                    <p className="mt-1 text-sm font-medium text-theme-subtle">{formatCurrency(snapshot.stats.todayRevenue)} إيراد اليوم</p>
                </div>
            </div>

            <div className={`${panelClass} overflow-hidden`}>
                <div className="border-b border-theme-subtle px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-medium tracking-[0.2em] text-theme-faint uppercase">Orders Table</p>
                            <h3 className="mt-2 text-2xl font-black text-theme">سجل التشغيل التفصيلي</h3>
                            <p className="mt-2 text-sm leading-7 text-theme-subtle">
                                استخدم التصفية التالية للتنقل بسرعة بين المراحل ثم حدّث الحالة أو اطبع الفاتورة من نفس المكان.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                <p className="text-xs text-theme-faint">نتائج الفلتر</p>
                                <p className="mt-2 text-xl font-black text-theme">{count}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                <p className="text-xs text-theme-faint">الصفحة الحالية</p>
                                <p className="mt-2 text-xl font-black text-theme">{currentPage}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                <p className="text-xs text-theme-faint">إجمالي الصفحات</p>
                                <p className="mt-2 text-xl font-black text-theme">{Math.max(totalPages, 1)}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                                <p className="text-xs text-theme-faint">الفلتر</p>
                                <p className="mt-2 text-base font-bold text-theme">
                                    {statuses.find((item) => item.value === currentStatus)?.label || "الكل"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                        {statuses.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => {
                                    setSearchQuery("");
                                    navigate({ status: s.value, page: "1", search: "" }, { clearFocus: true });
                                }}
                                className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                                    currentStatus === s.value
                                        ? "bg-gold/10 text-gold ring-1 ring-gold/20"
                                        : "bg-theme-faint text-theme-subtle hover:bg-theme-subtle hover:text-theme"
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-subtle" />
                        <input 
                            type="text" 
                            placeholder="بحث برقم الطلب TRD..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-theme-subtle bg-theme-faint py-2 pr-9 pl-4 text-sm text-theme placeholder:text-theme-subtle focus:border-gold/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
                        />
                    </form>
                </div>

                {/* Bulk Actions Toolbar */}
                <AnimatePresence>
                    {selectedOrders.length > 0 && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gold/5 border-y border-gold/20 px-5 py-3 flex items-center justify-between"
                        >
                            <span className="text-sm font-bold text-theme">تم تحديد {selectedOrders.length} طلب</span>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <select 
                                        onChange={handleBulkStatusChange}
                                        disabled={isBulkUpdating}
                                        className="appearance-none rounded-lg bg-theme-surface border border-theme-subtle px-3 pr-8 py-1.5 text-xs font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-50 cursor-pointer"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>تحديث الحالة ({selectedOrders.length})...</option>
                                        <option value="confirmed">تأكيد</option>
                                        <option value="processing">جاري المعالجة</option>
                                        <option value="shipped">تم الشحن</option>
                                        <option value="delivered">تم التوصيل</option>
                                        <option value="cancelled">إلغاء</option>
                                    </select>
                                    <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-subtle pointer-events-none" />
                                </div>
                                <button className="rounded-lg bg-theme-surface border border-theme-subtle px-3 py-1.5 text-xs font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold flex items-center gap-1.5 opacity-50 cursor-not-allowed" title="قريباً">
                                    <FileDown className="h-3.5 w-3.5" /> طباعة البوليصات
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative">
                    {isPending && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_40%,transparent)] backdrop-blur-sm">
                            <Loader2 className="h-6 w-6 animate-spin text-gold" />
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-y border-theme-subtle text-right text-xs text-theme-faint">
                                    <th className="w-10 px-3 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-theme-subtle bg-theme-faint text-gold focus:ring-gold/30"
                                            checked={orders.length > 0 && selectedOrders.length === orders.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className="w-10 px-3 py-4"></th>
                                    <th className="px-4 py-4 font-medium">رقم الطلب</th>
                                    <th className="px-4 py-4 font-medium">المشتري</th>
                                    <th className="px-4 py-4 font-medium">المبلغ</th>
                                    <th className="px-4 py-4 font-medium">الحالة</th>
                                    <th className="px-4 py-4 font-medium">الدفع</th>
                                    <th className="px-4 py-4 font-medium">التاريخ</th>
                                    <th className="px-6 py-4 font-medium">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length > 0 ? (
                                    orders.map((order, index) => {
                                        const isExpanded = expandedOrder === order.id;
                                        const available = nextStatuses[order.status] || [];
                                        const items = order.order_items || [];

                                        return (
                                            <AnimatePresence key={order.id} initial={false}>
                                                <motion.tr
                                                    id={`admin-order-row-${order.id}`}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className={cn(
                                                        "border-b border-theme-faint transition-colors hover:bg-theme-faint",
                                                        (highlightedOrderId === order.id || selectedOrders.includes(order.id)) &&
                                                            "bg-gold/[0.07] ring-1 ring-inset ring-gold/35"
                                                    )}
                                                >
                                                    <td className="px-3 py-4">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-theme-subtle bg-theme-faint text-gold focus:ring-gold/30"
                                                            checked={selectedOrders.includes(order.id)}
                                                            onChange={() => toggleSelection(order.id)}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        {items.length > 0 ? (
                                                            <button
                                                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                                className="rounded-lg p-1 text-theme-faint transition-colors hover:bg-theme-subtle"
                                                            >
                                                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-4 font-mono text-xs font-bold text-gold">{order.order_number}</td>
                                                    <td className="px-4 py-4">
                                                        <div>
                                                            <span className="text-sm font-medium text-theme">{order.buyer?.display_name || "—"}</span>
                                                            {order.buyer?.username ? (
                                                                <span className="block text-xs text-theme-faint">@{order.buyer.username}</span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-bold text-theme">
                                                        {order.discount_amount > 0 ? (
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="text-[10px] text-theme-faint line-through decoration-red-500/30">
                                                                    {formatCurrency(Number(order.subtotal + (order.shipping_cost || 0)))}
                                                                </span>
                                                                <span className="text-gold font-black">{formatCurrency(Number(order.total))}</span>
                                                            </div>
                                                        ) : (
                                                            formatCurrency(Number(order.total) || 0)
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <StatusBadge status={order.status} type="order" />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                                order.payment_status === "paid"
                                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                                    : order.payment_status === "failed"
                                                                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                                                                        : order.payment_status === "refunded"
                                                                            ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                                                                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                                            }`}
                                                        >
                                                            {paymentLabel(order.payment_status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-xs text-theme-faint">{formatShortDate(order.created_at)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                             <button
                                                                onClick={() => setInvoiceOrder({
                                                                    ...order,
                                                                    coupon_code: order.coupon?.code || null
                                                                })}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-theme-subtle bg-theme-faint px-3 py-1.5 text-[11px] font-bold text-theme-soft transition-all hover:border-gold/20 hover:bg-gold/5 hover:text-gold"
                                                            >
                                                                <FileDown className="h-3.5 w-3.5" />
                                                                فاتورة
                                                            </button>
                                                            {available.length > 0 ? (
                                                                available.map((status) => (
                                                                    <button
                                                                        key={status}
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        disabled={updatingOrder === order.id}
                                                                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50 ${
                                                                            status === "cancelled"
                                                                                ? "border-red-500/20 text-red-300 hover:bg-red-500/10"
                                                                                : "border-gold/20 text-gold hover:bg-gold/10"
                                                                        }`}
                                                                    >
                                                                        {status === "confirmed"
                                                                            ? "تأكيد"
                                                                            : status === "processing"
                                                                                ? "معالجة"
                                                                                : status === "shipped"
                                                                                    ? "شحن"
                                                                                    : status === "delivered"
                                                                                        ? "تسليم"
                                                                                        : status === "cancelled"
                                                                                            ? "إلغاء"
                                                                                            : status}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-theme-faint">—</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>

                                                {isExpanded && items.length > 0 ? (
                                                    <motion.tr
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="border-b border-theme-faint bg-[color:color-mix(in_srgb,var(--wusha-surface)_70%,transparent)]"
                                                    >
                                                        <td colSpan={8} className="px-6 py-5">
                                                            <div className="space-y-3">
                                                                <p className="text-xs font-bold text-theme-faint">عناصر الطلب</p>
                                                                <div className="flex flex-wrap gap-4">
                                                                    {items.map((item: any) => {
                                                                        const isCustom = !!item.custom_design_url;
                                                                        const imageUrl = isCustom ? item.custom_design_url : item.product?.image_url;
                                                                        const title = isCustom ? (item.custom_title || "تصميم مخصص") : (item.product?.title || "منتج");
                                                                        const subtitle = isCustom
                                                                            ? `${item.custom_garment || "قطعة مخصصة"} · مقاس ${item.size || "—"}`
                                                                            : item.size
                                                                                ? `مقاس ${item.size}`
                                                                                : "منتج بدون مقاس";

                                                                        return (
                                                                            <div key={item.id} className="flex min-w-[290px] items-center gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-3">
                                                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[color:color-mix(in_srgb,var(--wusha-surface)_74%,transparent)]">
                                                                                    {imageUrl ? (
                                                                                        <Image
                                                                                            src={imageUrl}
                                                                                            alt={title}
                                                                                            width={56}
                                                                                            height={56}
                                                                                            className="h-full w-full object-cover"
                                                                                        />
                                                                                    ) : (
                                                                                        <div className="flex h-full w-full items-center justify-center">
                                                                                            <Package className="h-5 w-5 text-theme-faint" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="truncate text-sm font-medium text-theme">{title}</p>
                                                                                    <p className="mt-1 text-xs text-theme-subtle">{subtitle}</p>
                                                                                    <p className="mt-1 text-xs text-theme-faint">
                                                                                        {item.quantity} × {formatCurrency(Number(item.unit_price) || 0)}
                                                                                    </p>
                                                                                </div>
                                                                                <span className="text-sm font-bold text-gold">
                                                                                    {formatCurrency(Number(item.total_price) || 0)}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ) : null}
                                            </AnimatePresence>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-16 text-center">
                                            <Package className="mx-auto mb-3 h-12 w-12 text-fg/10" />
                                            <p className="text-sm text-theme-faint">لا توجد طلبات مطابقة لهذا الفلتر.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {totalPages > 1 ? (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-theme-faint">{count} طلب</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage - 1) })}
                            disabled={currentPage <= 1}
                            className="rounded-lg border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <span className="px-3 text-xs text-theme-subtle">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                            className="rounded-lg border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
