"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { 
    Clock, 
    Package, 
    Truck, 
    Search,
    CreditCard,
    Printer,
    Boxes,
    ShoppingCart,
    Warehouse,
    FileText,
    Activity
} from "lucide-react";
import { OrderInspectionModal } from "./OrderInspectionModal";
import { InvoiceBuilder } from "@/components/admin/InvoiceBuilder";
import { ShippingLabelBuilder } from "@/components/admin/ShippingLabelBuilder";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Lock, CheckSquare, Square, CreditCard as CardIcon, Info, XCircle } from "lucide-react";
import { FulfillmentLedger } from "./FulfillmentLedger";
import { toast } from "sonner";
import {
    getBulkFulfillmentCalculation,
    updateOrderStatus,
    initiateWarehousePayment,
    initiateBulkWarehousePayment,
    markBatchAsPaidToWarehouse,
    bookTorodShipment,
    cancelTorodShipment,
} from "@/app/actions/admin";

interface OrderItem {
    id: string;
    product_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    size: string | null;
    custom_title: string | null;
    custom_design_url?: string;
    custom_design_order_id?: string | null;
    custom_garment?: string;
    product?: {
        title: string;
        image_url: string;
    } | null;
}

interface Order {
    id: string;
    order_number: string;
    subtotal: number;
    discount_amount: number;
    shipping_cost?: number;
    total: number;
    status: string;
    payment_status: string;
    metadata?: any;
    created_at: string;
    buyer: {
        display_name: string;
        avatar_url: string | null;
        username: string;
    };
    order_items: OrderItem[];
    coupon?: { code: string } | null;
    tracking_number?: string | null;
    courier_name?: string | null;
    waybill_url?: string | null;
    torod_order_id?: string | null;
}

interface FulfillmentCommandCenterProps {
    data: {
        queues: {
            confirmed: Order[];
            processing: Order[];
            shipped: Order[];
        };
        recentPaid: any[];
        stats: {
            totalPendingFulfillment: number;
            confirmedCount: number;
            processingCount: number;
            shippedCount: number;
            warehouseDebt: number;
        };
        warehouseLedger: any[];
    };
}

import { FulfillmentPerformanceGauge } from "./FulfillmentPerformanceGauge";

export function FulfillmentCommandCenter({ data }: FulfillmentCommandCenterProps) {
    const [activeQueue, setActiveQueue] = useState<keyof typeof data.queues>("confirmed");
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
    const [labelOrder, setLabelOrder] = useState<any | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [realBatchCalculation, setRealBatchCalculation] = useState<{ grandTotal: number; breakdowns: Record<string, any> } | null>(null);
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        
        setSelectedIds(next);
        
        // Trigger real calculation on change
        if (next.size > 0) {
            startTransition(async () => {
                const res = await getBulkFulfillmentCalculation(Array.from(next));
                if (res.success) {
                    setRealBatchCalculation({
                        grandTotal: res.grandTotal,
                        breakdowns: res.breakdowns,
                    });
                }
            });
        } else {
            setRealBatchCalculation(null);
        }
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setRealBatchCalculation(null);
    };

    const calculateBatchDebt = () => {
        const selectedOrders = data.queues.confirmed.filter(o => selectedIds.has(o.id));
        // Real calculation involves garments + printing + handling
        // For the tactical estimate, we use an average of 45 SAR per base item + 15 SAR handling per order
        const itemQuantity = selectedOrders.reduce((acc, o) => acc + o.order_items.reduce((total, i) => total + (i.quantity || 1), 0), 0);
        const handlingFees = selectedOrders.length * 15;
        return (itemQuantity * 45) + handlingFees;
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("ar-SA", {
            style: "currency",
            currency: "SAR",
            maximumFractionDigits: 0,
        }).format(val);
    };

    const isWarehousePaymentPaid = (metadata: any) => (
        metadata?.fulfillment_paid === true ||
        metadata?.warehouse_payment?.status === "paid"
    );

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        startTransition(async () => {
            const result = await updateOrderStatus(orderId, newStatus as any);
            if (result.success) {
                toast.success("تم تحديث حالة الطلب بنجاح");
            } else {
                toast.error("فشل في تحديث الحالة: " + result.error);
            }
        });
    };

    const queueLabels = {
        confirmed: { label: "بانتظار التجهيز", icon: Boxes, color: "text-amber-400" },
        processing: { label: "جاري التحضير", icon: Clock, color: "text-sky-400" },
        shipped: { label: "تم الشحن", icon: Truck, color: "text-emerald-400" },
    };
    const currentOrders = data.queues[activeQueue].filter(o =>
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.buyer.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const totalQueued =
        data.stats.confirmedCount +
        data.stats.processingCount +
        data.stats.shippedCount;
    const operatingMode =
        data.stats.confirmedCount > 0
            ? {
                label: "تجهيز مطلوب",
                detail: `${data.stats.confirmedCount} طلب بانتظار بدء التنفيذ.`,
                className: "border-amber-500/25 bg-amber-500/10 text-amber-300",
            }
            : data.stats.processingCount > 0
                ? {
                    label: "قيد التنفيذ",
                    detail: `${data.stats.processingCount} طلب داخل التجهيز الآن.`,
                    className: "border-gold/30 bg-gold/10 text-gold",
                }
                : data.stats.shippedCount > 0
                    ? {
                        label: "متابعة الشحن",
                        detail: `${data.stats.shippedCount} طلب خرج للشحن ويحتاج متابعة تسليم.`,
                        className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
                    }
                    : {
                        label: "لا يوجد ضغط",
                        detail: "لا توجد طلبات نشطة في مسارات التنفيذ الحالية.",
                        className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
                    };
    const activeQueueLabel = queueLabels[activeQueue].label;

    const handleWarehousePayment = async (orderId: string) => {
        startTransition(async () => {
            const result = await initiateWarehousePayment(orderId);
            if (result.success) {
                window.open(result.url, "_blank");
                toast.success("تم إنشاء فاتورة المستودع بنجاح");
            } else {
                toast.error(result.error || "فشل إنشاء الفاتورة");
            }
        });
    };

    const handleBulkPayment = async () => {
        if (selectedIds.size === 0) return;
        startTransition(async () => {
            const result = await initiateBulkWarehousePayment(Array.from(selectedIds));
            if (result.success) {
                window.open(result.url, "_blank");
                toast.success(`تم إنشاء فاتورة مجمعة لـ ${selectedIds.size} طلبات`);
            } else {
                toast.error(result.error || "فشل إنشاء الفاتورة المجمعة");
            }
        });
    };

    const handleBulkMarkAsPaid = async () => {
        if (selectedIds.size === 0) return;
        startTransition(async () => {
            const result = await markBatchAsPaidToWarehouse(Array.from(selectedIds));
            if (result.success) {
                toast.success(`تم تحديث ${selectedIds.size} طلبات كمدفوعة للمستودع`);
                setSelectedIds(new Set());
            } else {
                toast.error(result.error || "فشل التحديث الجماعي");
            }
        });
    };

    const handleBookTorod = async (orderId: string) => {
        startTransition(async () => {
            const result = await bookTorodShipment(orderId);
            if (result.success) {
                toast.success(result.is_simulation
                    ? `تم تسجيل الشحنة برقم تتبع: ${result.tracking_number}`
                    : `تم حجز الشحنة بنجاح: ${result.tracking_number}`
                );
            } else {
                toast.error(result.error || "فشل الحجز مع طرود");
            }
        });
    };

    const handleCancelTorod = async (orderId: string) => {
        if (!confirm("هل أنت متأكد من إلغاء الشحنة في طرود؟ سيؤدي ذلك إلى إلغاء بوليصة الشحن تماماً.")) return;

        startTransition(async () => {
            const result = await cancelTorodShipment(orderId);
            if (result.success) {
                toast.success("تم إلغاء الشحنة بنجاح");
            } else {
                toast.error(result.error || "فشل إلغاء الشحنة");
            }
        });
    };

    return (
        <div className="relative space-y-6 pb-20">
            <div className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(206,174,127,0.13),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.07),transparent_50%)]" />
                <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 h-12 w-1.5 rounded-full bg-gold" />
                        <div>
                            <p className="text-[11px] font-bold text-theme-faint">تنفيذ الطلبات</p>
                            <h2 className="mt-1 text-xl font-black text-theme sm:text-2xl">مركز قيادة الطلبات</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-7 text-theme-subtle">{operatingMode.detail}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
                        <div className={`col-span-3 rounded-2xl border px-4 py-3 sm:col-span-1 ${operatingMode.className}`}>
                            <p className="text-[11px] font-bold opacity-75">وضع التشغيل</p>
                            <p className="mt-1 text-sm font-black">{operatingMode.label}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-center">
                            <p className="text-[11px] text-theme-faint">النشط</p>
                            <p className="mt-1 text-lg font-black text-theme tabular-nums">{data.stats.totalPendingFulfillment}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-center">
                            <p className="text-[11px] text-theme-faint">الطوابير</p>
                            <p className="mt-1 text-lg font-black text-theme tabular-nums">{totalQueued}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-center">
                            <p className="text-[11px] text-theme-faint">المستودع</p>
                            <p className="mt-1 text-lg font-black text-gold tabular-nums">{formatCurrency(data.stats.warehouseDebt)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="theme-surface-panel relative overflow-hidden rounded-[24px] p-5 md:col-span-2">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(206,174,127,0.08),transparent_48%)]" />
                    <div className="relative flex h-full flex-col justify-between gap-5">
                        <div>
                            <p className="text-[11px] font-bold text-theme-faint">إجمالي العمليات النشطة</p>
                            <p className="mt-3 text-5xl font-black text-gold tabular-nums">{data.stats.totalPendingFulfillment}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-2">
                                <p className="text-theme-faint">بانتظار تجهيز</p>
                                <p className="mt-1 text-base font-black text-theme tabular-nums">{data.stats.confirmedCount}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-2">
                                <p className="text-theme-faint">قيد المعالجة</p>
                                <p className="mt-1 text-base font-black text-theme tabular-nums">{data.stats.processingCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-3 gap-3">
                    {Object.entries(queueLabels).map(([key, info]) => {
                        const count = data.stats[`${key}Count` as keyof typeof data.stats];
                        const isActive = activeQueue === key;
                        const Icon = info.icon;

                        return (
                            <button
                                key={key}
                                onClick={() => setActiveQueue(key as any)}
                                className={cn(
                                    "rounded-[24px] border p-5 transition-all duration-300 active:scale-[0.98] flex flex-col items-start gap-4 group relative overflow-hidden",
                                    isActive 
                                        ? "bg-gold/10 border-gold/40"
                                        : "bg-[var(--wusha-surface)]/70 border-theme-soft hover:border-gold/20 hover:bg-[var(--wusha-surface)]"
                                )}
                            >
                                <div className={cn("p-2.5 rounded-xl bg-theme-subtle/50 transition-colors", isActive ? "text-gold" : "text-theme-faint group-hover:text-theme")}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={cn("text-xs font-bold transition-colors", isActive ? "text-theme" : "text-theme-faint")}>{info.label}</p>
                                    <p className="text-2xl font-black text-theme mt-1 tabular-nums">{count}</p>
                                </div>
                                {isActive && (
                                    <motion.div 
                                        layoutId="active-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-1 bg-gold"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Operational View */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Main Feed */}
                <div className="space-y-5 lg:col-span-8">
                    <div className="flex items-center justify-between gap-4 py-2">
                        <div className="relative flex-1 group">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint group-focus-within:text-gold transition-colors" />
                            <input 
                                type="text"
                                placeholder="ابحث برقم الطلب أو اسم العميل..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--wusha-surface)]/60 border border-theme-soft focus:border-gold/30 rounded-2xl pr-11 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-xs text-theme-subtle">
                        <span>المسار الحالي: <strong className="text-theme">{activeQueueLabel}</strong></span>
                        <span>{currentOrders.length} طلب ظاهر</span>
                    </div>

                    <div className="space-y-5">
                        <AnimatePresence mode="popLayout">
                            {currentOrders.length > 0 ? (
                                currentOrders.map((order) => (
                                    <motion.div
                                        key={order.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                        className={cn(
                                            "group relative bg-[var(--wusha-surface)] border rounded-[32px] overflow-hidden transition-all duration-500 cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
                                            selectedIds.has(order.id) 
                                                ? "border-gold/50 bg-gold/[0.03] shadow-gold/10" 
                                                : "border-theme-soft hover:border-gold/30 hover:shadow-gold/10"
                                        )}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="p-7 relative overflow-hidden">
                                            {/* Selection Overlay */}
                                            <div 
                                                onClick={(e) => toggleSelection(e, order.id)}
                                                className={cn(
                                                    "absolute top-6 left-6 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                                                    selectedIds.has(order.id) 
                                                        ? "bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                                                        : "bg-white/5 border border-white/10 text-white/20 hover:text-white/40 hover:bg-white/10"
                                                )}
                                            >
                                                {selectedIds.has(order.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </div>

                                            <div className="flex flex-wrap items-start justify-between gap-6 mb-7 pl-10">
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                                                        selectedIds.has(order.id) 
                                                            ? "bg-gold/20 border-gold/50 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                                                            : "bg-gold/10 border-gold/10 group-hover:border-gold/40 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                                                    )}>
                                                        <ShoppingCart className="w-7 h-7 text-gold" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-2xl font-black text-theme tracking-tighter group-hover:text-gold transition-colors">#{order.order_number}</h3>
                                                            <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                                                                <span className="text-[10px] text-theme-faint tracking-widest">مرجع {order.id.slice(0, 6)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2.5 mt-2">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-subtle uppercase tracking-[0.1em]">
                                                                <Clock className="w-3.5 h-3.5 text-gold/60" />
                                                                <span>منذ {new Date(order.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                                                            </div>
                                                            <span className="w-1 h-1 rounded-full bg-theme-soft" />
                                                            <StatusBadge status={order.status as any} />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-6">
                                                    <div className="flex flex-col items-end border-r border-white/10 pr-6">
                                                        <p className="text-[10px] tracking-[0.12em] text-theme-faint font-black mb-1 text-right">حالة الدفع</p>
                                                        <div className="flex items-center gap-2">
                                                            {/* Store payment status */}
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                                                                order.payment_status === "paid" 
                                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                                    : "bg-white/5 border-white/10 text-white/20"
                                                            )} title="دفع المتجر مؤكد">
                                                                <Lock className="w-4 h-4" />
                                                            </div>
                                                            {/* Warehouse payment status */}
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                                                                isWarehousePaymentPaid(order.metadata)
                                                                    ? "bg-gold/10 border-gold/30 text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                                                    : "bg-theme-soft/20 border-white/5 text-white/10"
                                                            )} title="استحقاق المستودع بانتظار الدفع">
                                                                <Warehouse className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left min-w-[120px]">
                                                        <p className="text-[10px] tracking-[0.12em] text-theme-faint font-black mb-1">إجمالي الطلب</p>
                                                        {order.discount_amount > 0 ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] text-theme-faint line-through decoration-red-500/30">
                                                                    {formatCurrency(Number(order.subtotal + (order.shipping_cost || 0)))}
                                                                </span>
                                                                <span className="text-2xl font-black text-gold tracking-tighter">{formatCurrency(order.total)}</span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-3xl font-black text-gold tracking-tighter">{formatCurrency(order.total)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items Carousel-like grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
                                                {order.order_items.map((item) => {
                                                    const isCustom = !!(item.custom_design_url || item.custom_design_order_id || item.custom_title);
                                                    const imageUrl = isCustom ? item.custom_design_url : item.product?.image_url;
                                                    const title = isCustom ? (item.custom_title || "تصميم مخصص") : (item.product?.title || "منتج");
                                                    
                                                    return (
                                                        <div key={item.id} className="flex items-center gap-4 p-4 rounded-[24px] bg-theme-faint border border-theme-subtle/50 group-hover:border-gold/15 transition-all duration-500">
                                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-theme-subtle shrink-0 border border-white/5 shadow-inner">
                                                                {imageUrl ? (
                                                                    <Image 
                                                                        src={imageUrl} 
                                                                        alt={title} 
                                                                        width={64} 
                                                                        height={64} 
                                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Package className="w-7 h-7 text-theme-faint/50" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-theme truncate group-hover:text-gold transition-colors">{title}</p>
                                                                <div className="flex items-center gap-2.5 mt-1.5">
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-gold/10 text-[9px] font-black uppercase text-gold border border-gold/10 tracking-widest">{item.size || "STD"}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-theme-soft" />
                                                                    <span className="text-[10px] font-bold text-theme-faint uppercase font-mono">QTY: {item.quantity}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-between pt-7 border-t border-theme-faint/20">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-[14px] overflow-hidden bg-theme-subtle border border-theme-soft shrink-0 group-hover:border-gold/30 transition-colors">
                                                        {order.buyer.avatar_url ? (
                                                            <Image src={order.buyer.avatar_url} alt={order.buyer.display_name} width={40} height={40} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gold/5 text-gold text-sm font-black">{order.buyer.display_name[0]}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-theme group-hover:translate-x-1 transition-transform">{order.buyer.display_name}</p>
                                                        <p className="text-[10px] text-theme-faint font-medium">@{order.buyer.username}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => setInvoiceOrder({
                                                                ...order,
                                                                coupon_code: order.coupon?.code || null
                                                            })}
                                                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px] font-black text-theme-subtle hover:text-gold transition-all border border-white/5 hover:border-gold/20"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                            <span className="hidden sm:inline tracking-wide">الفاتورة</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => setLabelOrder({
                                                                ...order,
                                                                coupon_code: order.coupon?.code || null
                                                            })}
                                                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gold/5 hover:bg-gold/10 text-[11px] font-black text-gold/60 hover:text-gold transition-all border border-gold/10"
                                                        >
                                                            <Truck className="w-4 h-4" />
                                                            <span className="hidden sm:inline tracking-wide">البوليصة</span>
                                                        </button>
                                                    </div>
                                                    
                                                    {order.status === "confirmed" && (
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                disabled={isPending}
                                                                onClick={() => handleWarehousePayment(order.id)}
                                                                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gold/10 hover:bg-gold/20 text-gold text-xs font-black border border-gold/20 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                {isPending ? (
                                                                    <Activity className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <CreditCard className="w-4 h-4" />
                                                                )}
                                                                ادفع للمستودع
                                                            </button>
                                                            <button 
                                                                disabled={isPending}
                                                                onClick={() => handleStatusUpdate(order.id, "processing")}
                                                                className="px-7 py-3 rounded-2xl bg-gold text-[#0a0a0a] text-xs font-black hover:bg-gold-light transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:-translate-y-0.5 active:translate-y-0.5"
                                                            >
                                                                {isPending ? "جاري البدء..." : "بدء المعالجة"}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {order.status === "processing" && (
                                                        <div className="flex items-center gap-3">
                                                            <button 
                                                                disabled={isPending}
                                                                onClick={() => handleBookTorod(order.id)}
                                                                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-black border border-sky-500/30 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                                الشحن عبر طرود
                                                            </button>
                                                            <button 
                                                                disabled={isPending}
                                                                onClick={() => handleStatusUpdate(order.id, "shipped")}
                                                                className="px-7 py-3 rounded-2xl bg-sky-500 text-white text-xs font-black hover:bg-sky-400 transition-all shadow-[0_10px_20px_rgba(14,165,233,0.2)] hover:-translate-y-0.5 active:translate-y-0.5"
                                                            >
                                                                {isPending ? "جاري التأكيد..." : "تأكيد يدوي"}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {order.status === "shipped" && order.tracking_number && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col items-end mr-2">
                                                                <p className="text-[9px] font-black text-emerald-400 tracking-wide">{order.courier_name || "التتبع"}</p>
                                                                <p className="text-sm font-mono font-black text-theme tracking-tighter">{order.tracking_number}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {order.waybill_url && (
                                                                    <a 
                                                                        href={order.waybill_url} 
                                                                        target="_blank" 
                                                                        title="عرض بوليصة الشحن"
                                                                        className="p-3 rounded-xl bg-theme-faint border border-theme-soft hover:border-gold hover:text-gold transition-all"
                                                                    >
                                                                        <FileText className="w-4 h-4" />
                                                                    </a>
                                                                )}
                                                                <button 
                                                                    disabled={isPending}
                                                                    onClick={() => handleCancelTorod(order.id)}
                                                                    title="إلغاء شحنة طرود"
                                                                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 disabled:opacity-50"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </motion.div>
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                    className="py-40 text-center"
                                >
                                    <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-theme-soft/30 bg-theme-soft/20">
                                        <Package className="h-14 w-14 text-theme-faint/40" />
                                    </div>
                                    <h3 className="text-2xl font-black text-theme tracking-tight">لا توجد طلبات في هذا المسار</h3>
                                    <p className="text-sm text-theme-faint mt-3 max-w-sm mx-auto font-medium opacity-70">كل المهام الحالية مكتملة، وستظهر الطلبات الجديدة هنا عند انتقالها إلى هذا المسار.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar Operations */}
                <div className="space-y-6 lg:col-span-4">
                    {/* Performance Metrics */}
                    <FulfillmentPerformanceGauge stats={data.stats} />

                    {/* Recent Payments Watch (Digital Ledger) */}
                    <div className="theme-surface-panel rounded-[28px] p-5 sm:p-6">
                        <FulfillmentLedger transactions={data.warehouseLedger || []} />
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/dashboard/analytics" className="group flex flex-col items-center justify-center rounded-[24px] border border-theme-soft bg-[var(--wusha-surface)] p-5 text-center transition-all hover:border-gold/30 active:scale-[0.98]">
                            <div className="w-fit rounded-2xl bg-theme-faint p-3 transition-colors group-hover:bg-gold/10">
                                <FileText className="w-5 h-5 text-theme-faint group-hover:text-gold" />
                            </div>
                            <p className="text-[11px] font-black text-theme mt-4 tracking-wide">تقرير العمليات</p>
                            <p className="text-[9px] text-theme-faint mt-1 font-bold">ملخص يومي</p>
                        </Link>
                        <Link href="/dashboard/products-inventory?tab=inventory" className="group flex flex-col items-center justify-center rounded-[24px] border border-theme-soft bg-[var(--wusha-surface)] p-5 text-center transition-all hover:border-gold/30 active:scale-[0.98]">
                            <div className="w-fit rounded-2xl bg-theme-faint p-3 transition-colors group-hover:bg-gold/10">
                                <Warehouse className="w-5 h-5 text-theme-faint group-hover:text-gold" />
                            </div>
                            <p className="text-[11px] font-black text-theme mt-4 tracking-wide">إدارة المستودع</p>
                            <p className="text-[9px] text-theme-faint mt-1 font-bold">مزامنة المخزون</p>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bulk actions */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4"
                    >
                        <div className="theme-surface-panel flex flex-col gap-4 rounded-[28px] border border-gold/25 p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-6 pl-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/20">
                                        <CheckSquare className="w-5 h-5 text-gold" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-theme-faint tracking-[0.12em] mb-0.5">إجراءات جماعية</p>
                                        <h4 className="text-sm font-black text-theme">
                                            {selectedIds.size} طلبات مختارة
                                        </h4>
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-theme-subtle" />
                                <div>
                                    <p className="text-[10px] font-black text-gold/60 mb-0.5">إجمالي الدفعة</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-2xl font-black text-gold tracking-tighter tabular-nums">
                                            {formatCurrency(realBatchCalculation?.grandTotal || calculateBatchDebt())}
                                        </p>
                                        <button 
                                            onClick={() => setShowBreakdownModal(true)}
                                            className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center text-gold hover:bg-gold/20 transition-all border border-gold/20"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pr-2">
                                <button 
                                    onClick={clearSelection}
                                    className="rounded-2xl border border-theme-subtle bg-theme-faint px-5 py-2.5 text-[11px] font-black text-theme-faint transition-all hover:border-gold/20 hover:text-theme active:scale-[0.98]"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    disabled={isPending}
                                    onClick={handleBulkMarkAsPaid}
                                    className="rounded-2xl border border-theme-subtle bg-theme-faint px-5 py-2.5 text-[11px] font-black text-theme-subtle transition-all hover:border-gold/20 hover:text-gold active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isPending ? "جاري التأكيد..." : "تأكيد يدوي"}
                                </button>
                                <button 
                                    disabled={isPending}
                                    onClick={handleBulkPayment}
                                    className="flex items-center gap-2 rounded-2xl bg-gold px-8 py-3 text-xs font-black text-[#0a0a0a] transition-all hover:bg-gold-light active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isPending ? (
                                        <Activity className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CardIcon className="w-4 h-4" />
                                    )}
                                    {isPending ? "جاري الإرسال..." : "دفع مجمع للمستودع"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Real Calculation Breakdown Modal */}
            <AnimatePresence>
                {showBreakdownModal && realBatchCalculation && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[color-mix(in_srgb,var(--wusha-bg)_78%,transparent)] backdrop-blur-md"
                            onClick={() => setShowBreakdownModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="theme-surface-panel relative w-full max-w-2xl overflow-hidden rounded-[28px] p-6 shadow-2xl sm:p-8"
                        >
                            <h2 className="mb-6 flex items-center gap-3 text-xl font-black text-theme sm:text-2xl">
                                <Info className="h-5 w-5 text-gold" />
                                تفاصيل الدفعة المالية
                            </h2>
                            
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(realBatchCalculation.breakdowns).map(([id, breakdown]: [string, any]) => (
                                    <div key={id} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-black text-gold">
                                                معرف الطلب: {id.slice(-8)}
                                            </span>
                                            <span className="text-sm font-black text-theme">
                                                {formatCurrency(breakdown.summary.grandTotal)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[10px] text-theme-faint">
                                            <div className="flex justify-between"><span>القطع</span> <span>{formatCurrency(breakdown.summary.garmentSubtotal)}</span></div>
                                            <div className="flex justify-between"><span>الطباعة</span> <span>{formatCurrency(breakdown.summary.printingSubtotal)}</span></div>
                                            <div className="flex justify-between"><span>التغليف</span> <span>{formatCurrency(breakdown.summary.packagingTotal)}</span></div>
                                            <div className="flex justify-between"><span>المعالجة</span> <span>{formatCurrency(breakdown.summary.handlingFee)}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex items-center justify-between border-t border-theme-subtle pt-8">
                                <div>
                                    <p className="text-[10px] text-theme-faint">الإجمالي النهائي</p>
                                    <p className="text-4xl font-black text-gold tracking-tighter">{formatCurrency(realBatchCalculation.grandTotal)}</p>
                                </div>
                                <button 
                                    onClick={() => setShowBreakdownModal(false)}
                                    className="rounded-2xl border border-theme-subtle bg-theme-faint px-10 py-4 text-xs font-black text-theme transition-all hover:border-gold/20 hover:text-gold active:scale-[0.98]"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <OrderInspectionModal 
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />

            {invoiceOrder && (
                <InvoiceBuilder 
                    order={invoiceOrder} 
                    onClose={() => setInvoiceOrder(null)} 
                />
            )}

            {labelOrder && (
                <ShippingLabelBuilder 
                    order={labelOrder} 
                    onClose={() => setLabelOrder(null)} 
                />
            )}
        </div>
    );
}
