"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
    Clock, 
    Package, 
    Truck, 
    CheckCircle2, 
    ArrowLeft, 
    Search,
    Filter,
    ExternalLink,
    AlertCircle,
    User,
    CreditCard,
    ChevronDown,
    Printer,
    Boxes,
    ShoppingCart,
    Warehouse,
    FileText,
    ShieldCheck,
    Activity
} from "lucide-react";
import { OrderInspectionModal } from "./OrderInspectionModal";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateOrderStatus, initiateWarehousePayment, initiateBulkWarehousePayment, markBatchAsPaidToWarehouse } from "@/app/actions/admin";
import { toast } from "sonner";
import { Lock, CheckSquare, Square, X, BrainCircuit, CreditCard as CardIcon } from "lucide-react";

interface OrderItem {
    id: string;
    product_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    size: string | null;
    custom_title: string | null;
    custom_design_url?: string;
    custom_garment?: string;
    product?: {
        title: string;
        image_url: string;
    } | null;
}

interface Order {
    id: string;
    order_number: string;
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
    };
}

import { FulfillmentPerformanceGauge } from "./FulfillmentPerformanceGauge";
import { CyberGlitchText } from "./CyberGlitchText";

export function FulfillmentCommandCenter({ data }: FulfillmentCommandCenterProps) {
    const [activeQueue, setActiveQueue] = useState<keyof typeof data.queues>("confirmed");
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const clearSelection = () => setSelectedIds(new Set());

    const calculateBatchDebt = () => {
        const selectedOrders = data.queues.confirmed.filter(o => selectedIds.has(o.id));
        // Using a simplified calculation for the HUD recap to maintain performance
        // The real calculation happens on the server before payment
        return selectedOrders.length * 55; // Placeholder for UI estimate
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("ar-SA", {
            style: "currency",
            currency: "SAR",
            maximumFractionDigits: 0,
        }).format(val);
    };

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

    const currentOrders = data.queues[activeQueue].filter(o => 
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.buyer.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const queueLabels = {
        confirmed: { label: "بانتظار التجهيز", icon: Boxes, color: "text-amber-400" },
        processing: { label: "جاري التحضير", icon: Clock, color: "text-sky-400" },
        shipped: { label: "تم الشحن", icon: Truck, color: "text-emerald-400" },
    };

    const handleWarehousePayment = async (orderId: string) => {
        startTransition(async () => {
            const result = await initiateWarehousePayment(orderId);
            if (result.success && result.url) {
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
            if (result.success && result.url) {
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

    return (
        <div className="relative min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 select-none">
            {/* Tactical Grid Overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
                 style={{ backgroundImage: `radial-gradient(var(--wucha-gold) 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />
            
            {/* Scanline Effect */}
            <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.04] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] animate-scan" />

            {/* Premium HUD Header */}
            <div className="relative z-10 flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-12 bg-gold shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                    <div>
                        <CyberGlitchText text="OPS_COMMAND_CENTER" className="text-xl font-black text-gold tracking-[0.3em]" />
                        <p className="text-[10px] text-theme-faint font-mono tracking-widest mt-1">SECURE_ADMIN_TERMINAL // VER_7.07</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-left">
                        <p className="text-[10px] text-theme-faint font-mono uppercase tracking-widest mb-1">System Entropy</p>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <motion.div 
                                    key={i}
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-4 h-1 bg-gold/40"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Strategic Activity HUD */}
            <div className="relative z-10 mb-8 p-4 rounded-[40px] bg-theme-base/50 border border-theme-border/50 backdrop-blur-xl overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-emerald-500/5 opacity-50" />
                
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30 animate-pulse">
                            <Zap className="w-6 h-6 text-gold" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-theme-base tracking-tighter flex items-center gap-2">
                                مراقبة العمليات الاستراتيجية
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                            </h3>
                            <p className="text-xs text-theme-subtle font-mono uppercase tracking-[0.2em]">Live Tactical Monitoring Feed</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <div className="flex flex-col items-center border-r border-theme-border/30 pr-8">
                            <span className="text-2xl font-black text-gold tabular-nums">{data.stats.confirmedCount}</span>
                            <span className="text-[10px] text-gold/60 font-black uppercase tracking-widest">انتظار تنفيذ</span>
                        </div>
                        <div className="flex flex-col items-center border-r border-theme-border/30 pr-8">
                            <span className="text-2xl font-black text-emerald-400 tabular-nums">{data.stats.processingCount}</span>
                            <span className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest">قيد المعالجة</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-theme-base bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" />
                                النظام مستقر
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-1 p-6 rounded-[32px] bg-gold/10 border border-gold/20 flex flex-col justify-between relative overflow-hidden group">
                    {/* Pulsing Glow */}
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold/20 blur-[60px] rounded-full animate-pulse" />
                    
                    <div className="relative">
                        <p className="text-[10px] font-black tracking-[0.2em] text-gold uppercase mb-1 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-gold animate-ping" />
                            حالة العمليات النشطة
                        </p>
                        <h2 className="text-5xl font-black text-gold tracking-tighter tabular-nums drop-shadow-2xl">
                            <CyberGlitchText text={data.stats.totalPendingFulfillment.toString()} />
                        </h2>
                    </div>
                </div>

                <div className="md:col-span-1 p-6 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between relative overflow-hidden group">
                    <div className="relative">
                        <p className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase mb-1 flex items-center gap-2">
                            <Warehouse className="w-3 h-3" />
                            استحقاق المستودع
                        </p>
                        <h2 className="text-4xl font-black text-emerald-400 tracking-tighter tabular-nums">
                            {formatCurrency(data.stats.warehouseDebt)}
                        </h2>
                    </div>
                    <p className="text-[9px] text-emerald-400/50 font-mono mt-2 tracking-widest">DEBT_ESTIMATE_V1</p>
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
                                    "p-5 rounded-[24px] border transition-all duration-300 flex flex-col items-start gap-4 group relative overflow-hidden",
                                    isActive 
                                        ? "bg-[var(--wusha-surface)] border-gold/40 shadow-xl shadow-gold/5" 
                                        : "bg-[var(--wusha-surface)]/40 border-theme-soft hover:border-theme-subtle hover:bg-[var(--wusha-surface)]/60"
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
                                        className="absolute bottom-0 left-0 right-0 h-1 bg-gold shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Operational View */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Feed */}
                <div className="lg:col-span-8 space-y-6">
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
                        <button className="p-3.5 rounded-2xl bg-[var(--wusha-surface)]/60 border border-theme-soft text-theme-faint hover:text-theme transition-colors shadow-lg">
                            <Filter className="w-4 h-4" />
                        </button>
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
                                                                <span className="text-[10px] font-mono text-theme-faint tracking-widest uppercase">LOG_REF_{order.id.slice(0, 6)}</span>
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
                                                        <p className="text-[10px] uppercase tracking-[0.2em] text-theme-faint font-black mb-1 text-right">Vault Security</p>
                                                        <div className="flex items-center gap-2">
                                                            {/* Store Payment Status */}
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                                                                order.payment_status === "paid" 
                                                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                                                    : "bg-white/5 border-white/10 text-white/20"
                                                            )} title="Store Payment: Locked">
                                                                <Lock className="w-4 h-4" />
                                                            </div>
                                                            {/* Warehouse Payment Status */}
                                                            <div className={cn(
                                                                "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                                                                order.metadata?.fulfillment_paid
                                                                    ? "bg-gold/10 border-gold/30 text-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                                                                    : "bg-theme-soft/20 border-white/5 text-white/10"
                                                            )} title="Warehouse Fulfillment: Pending">
                                                                <Warehouse className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-left min-w-[120px]">
                                                        <p className="text-[10px] uppercase tracking-[0.2em] text-theme-faint font-black mb-1">Total Payload</p>
                                                        <p className="text-3xl font-black text-gold tracking-tighter">{formatCurrency(order.total)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items Carousel-like grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
                                                {order.order_items.map((item) => {
                                                    const isCustom = !!item.custom_design_url;
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
                                                    <button className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px] font-black text-theme-subtle hover:text-gold transition-all border border-white/5 hover:border-gold/20">
                                                        <Printer className="w-4 h-4" />
                                                        <span className="hidden sm:inline uppercase tracking-widest">Generate Invoice</span>
                                                    </button>
                                                    
                                                    {order.status === "confirmed" && (
                                                        <div className="flex items-center gap-3">
                                                            {!order.metadata?.fulfillment_paid && (
                                                                <button 
                                                                    disabled={isPending}
                                                                    onClick={() => handleWarehousePayment(order.id)}
                                                                    className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gold/10 hover:bg-gold/20 text-gold text-xs font-black border border-gold/20 transition-all active:scale-95"
                                                                >
                                                                    <CreditCard className="w-4 h-4" />
                                                                    ادفع للمستودع
                                                                </button>
                                                            )}
                                                            <button 
                                                                disabled={isPending}
                                                                onClick={() => handleStatusUpdate(order.id, "processing")}
                                                                className="px-7 py-3 rounded-2xl bg-gold text-[#0a0a0a] text-xs font-black hover:bg-gold-light transition-all shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:-translate-y-0.5 active:translate-y-0.5"
                                                            >
                                                                بدء المعالجة
                                                            </button>
                                                        </div>
                                                    )}
                                                    {order.status === "processing" && (
                                                        <button 
                                                            disabled={isPending}
                                                            onClick={() => handleStatusUpdate(order.id, "shipped")}
                                                            className="px-7 py-3 rounded-2xl bg-sky-500 text-white text-xs font-black hover:bg-sky-400 transition-all shadow-[0_10px_20px_rgba(14,165,233,0.2)] hover:-translate-y-0.5 active:translate-y-0.5"
                                                        >
                                                            تأكيد الشحن
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* HUD Corner Accents */}
                                        <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none">
                                            <div className="absolute top-6 right-6 w-2 h-2 bg-gold/20 rounded-full group-hover:bg-gold transition-all duration-500 group-hover:shadow-[0_0_10px_var(--wucha-gold)]" />
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                    className="py-40 text-center"
                                >
                                    <div className="w-32 h-32 rounded-full bg-theme-soft/20 flex items-center justify-center mx-auto mb-8 border border-theme-soft/30 group relative backdrop-blur-sm">
                                        <div className="absolute inset-0 rounded-full border-2 border-gold/10 animate-ping duration-[3s]" />
                                        <Package className="w-14 h-14 text-theme-faint/40 group-hover:text-gold group-hover:scale-110 transition-all duration-700" />
                                    </div>
                                    <h3 className="text-2xl font-black text-theme tracking-tight italic">Operations Depot Empty</h3>
                                    <p className="text-sm text-theme-faint mt-3 max-w-sm mx-auto font-medium opacity-60">تنبيه: جميع مهام القسم محققة. الأنظمة بانتظار إشارات دفع جديدة عبر رادار الطلبات.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sidebar Operations */}
                <div className="relative z-10 lg:col-span-4 space-y-8">
                    {/* Performance Metrics */}
                    <FulfillmentPerformanceGauge stats={data.stats} />

                    {/* Recent Payments Watch */}
                    <div className="bg-[var(--wusha-surface)] border border-theme-soft rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
                        <div className="p-7 border-b border-white/5 flex items-center justify-between bg-gold/[0.03]">
                            <h3 className="font-black text-theme text-sm uppercase tracking-[0.1em] flex items-center gap-3">
                                <CreditCard className="w-5 h-5 text-gold" />
                                Digital Ledger Activity
                            </h3>
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75" />
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150" />
                            </div>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[440px] overflow-y-auto styled-scrollbar">
                            {data.recentPaid.map((order: any) => (
                                <div key={order.id} className="p-6 hover:bg-gold/[0.04] transition-all duration-300 flex items-center justify-between gap-6 group">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-theme group-hover:text-gold transition-colors">#{order.order_number}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-theme-subtle font-black uppercase tracking-tight truncate max-w-[120px]">{order.buyer.display_name}</span>
                                            <span className="w-1 h-1 rounded-full bg-theme-soft" />
                                            <span className="text-[10px] text-theme-faint font-mono uppercase font-bold">{new Date(order.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                    </div>
                                    <div className="text-left shrink-0">
                                        <p className="text-sm font-black text-emerald-400 tabular-nums">{formatCurrency(order.total)}</p>
                                        <p className="text-[9px] text-theme-faint font-black mt-1 uppercase tracking-tighter opacity-40">Verified Tx ✓</p>
                                    </div>
                                </div>
                            ))}
                            {data.recentPaid.length === 0 && (
                                <div className="p-20 text-center opacity-30">
                                    <CreditCard className="w-12 h-12 text-theme-faint mx-auto mb-4" />
                                    <p className="text-[10px] text-theme-faint font-black uppercase tracking-[0.2em]">Silence in the Ledger</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Access Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-6 rounded-[32px] bg-[var(--wusha-surface)] border border-theme-soft hover:border-gold hover:shadow-xl hover:shadow-gold/5 transition-all group flex flex-col items-center justify-center text-center">
                            <div className="p-3 w-fit rounded-2xl bg-theme-faint group-hover:bg-gold/10 transition-colors shadow-inner">
                                <FileText className="w-5 h-5 text-theme-faint group-hover:text-gold" />
                            </div>
                            <p className="text-[11px] font-black text-theme mt-4 uppercase tracking-[0.1em]">Ops Report</p>
                            <p className="text-[9px] text-theme-faint mt-1 font-bold">Daily Intelligence</p>
                        </button>
                        <button className="p-6 rounded-[32px] bg-[var(--wusha-surface)] border border-theme-soft hover:border-gold hover:shadow-xl hover:shadow-gold/5 transition-all group flex flex-col items-center justify-center text-center">
                            <div className="p-3 w-fit rounded-2xl bg-theme-faint group-hover:bg-gold/10 transition-colors shadow-inner">
                                <Warehouse className="w-5 h-5 text-theme-faint group-hover:text-gold" />
                            </div>
                            <p className="text-[11px] font-black text-theme mt-4 uppercase tracking-[0.1em]">Depot Master</p>
                            <p className="text-[9px] text-theme-faint mt-1 font-bold">Inventory Sync</p>
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk Action HUD */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4"
                    >
                        <div className="bg-[#0a0a0a]/90 border border-gold/30 backdrop-blur-2xl rounded-[32px] p-4 flex items-center justify-between shadow-[0_-20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(212,175,55,0.1)] overflow-hidden">
                            {/* Accent Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-gold/5" />
                            
                            <div className="relative flex items-center gap-6 pl-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center border border-gold/30">
                                        <BrainCircuit className="w-6 h-6 text-gold" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-theme-faint uppercase tracking-[0.2em] mb-0.5">Batch Operations</p>
                                        <h4 className="text-sm font-black text-theme uppercase tracking-widest flex items-center gap-2">
                                            {selectedIds.size} طلبات مختارة
                                        </h4>
                                    </div>
                                </div>
                                <div className="h-10 w-px bg-white/10" />
                                <div>
                                    <p className="text-[10px] font-black text-gold/60 uppercase tracking-widest mb-0.5">إجمالي الدفعة</p>
                                    <p className="text-lg font-black text-gold tracking-tighter">{formatCurrency(calculateBatchDebt())}</p>
                                </div>
                            </div>

                            <div className="relative flex items-center gap-3 pr-2">
                                <button 
                                    onClick={clearSelection}
                                    className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px] font-black text-theme-faint hover:text-white transition-all border border-white/5 uppercase tracking-widest"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    disabled={isPending}
                                    onClick={handleBulkMarkAsPaid}
                                    className="px-5 py-2.5 rounded-2xl bg-theme-soft/20 hover:bg-theme-soft/40 text-[11px] font-black text-theme-subtle hover:text-gold transition-all border border-white/5 uppercase tracking-widest"
                                >
                                    تأكيد يدوي
                                </button>
                                <button 
                                    disabled={isPending}
                                    onClick={handleBulkPayment}
                                    className="px-8 py-3 rounded-2xl bg-gold text-[#0a0a0a] text-xs font-black hover:bg-gold-light transition-all shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:-translate-y-0.5 active:translate-y-0.5 flex items-center gap-2 uppercase tracking-widest"
                                >
                                    <CardIcon className="w-4 h-4" />
                                    دفع مجمع للمستودع
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Portal */}
            <OrderInspectionModal 
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />
        </div>
    );
}


