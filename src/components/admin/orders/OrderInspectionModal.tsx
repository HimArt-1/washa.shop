"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, MapPin, Package, CreditCard, Clock, Calendar, Hash, FileText, ExternalLink, ShieldCheck, Printer, Loader2, Check } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getFulfillmentCalculation, initiateWarehousePayment, updateOrderStatus } from "@/app/actions/admin";
import { toast } from "sonner";

interface OrderInspectionModalProps {
    order: any;
    isOpen: boolean;
    onClose: () => void;
}

export function OrderInspectionModal({ order, isOpen, onClose }: OrderInspectionModalProps) {
    const [fulfillmentCalc, setFulfillmentCalc] = useState<any>(null);
    const [isLoadingCalc, setIsLoadingCalc] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    useEffect(() => {
        if (isOpen && order?.id) {
            loadCalculation();
        }
    }, [isOpen, order?.id]);

    async function loadCalculation() {
        setIsLoadingCalc(true);
        const res = await getFulfillmentCalculation(order.id);
        if (res.success) {
            setFulfillmentCalc(res.breakdown);
        }
        setIsLoadingCalc(false);
    }

    async function handleWarehousePayment() {
        setIsPaying(true);
        const res = await initiateWarehousePayment(order.id);
        if (res.success && res.url) {
            window.open(res.url, "_blank");
            toast.success("تم إنشاء رابط الدفع للمستودع");
        } else {
            toast.error(res.error || "فشل إنشاء رابط الدفع");
        }
        setIsPaying(false);
    }

    async function handleUpdateStatus(newStatus: string) {
        const res = await updateOrderStatus(order.id, newStatus);
        if (res.success) {
            toast.success(`تم تحديث حالة الطلب إلى ${newStatus}`);
            onClose();
        } else {
            toast.error("فشل تحديث الحالة");
        }
    }

    if (!order) return null;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("ar-SA", {
            style: "currency",
            currency: "SAR",
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0a0a0a]/90 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-5xl h-[min(90vh,900px)] bg-[#121212] border border-gold/20 rounded-[40px] shadow-[0_0_100px_-20px_rgba(206,174,127,0.15)] overflow-hidden flex flex-col"
                    >
                        {/* Tactical HUD Header */}
                        <div className="relative px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            {/* Animated mesh bg for header */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                                 style={{ backgroundImage: `radial-gradient(var(--wucha-gold) 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
                            
                            <div className="relative flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                                    <Hash className="w-7 h-7 text-gold" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black text-theme tracking-tight">تفاصيل الطلب #{order.order_number}</h2>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <p className="text-xs text-theme-subtle font-mono mt-1 opacity-60">TRANS_ID: {order.id}</p>
                                </div>
                            </div>

                            <button 
                                onClick={onClose}
                                className="relative w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group"
                            >
                                <X className="w-5 h-5 text-theme-subtle group-hover:text-theme transition-colors" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 styled-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                
                                {/* Left Column: Order Items & Breakdown */}
                                <div className="lg:col-span-2 space-y-8">
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Package className="w-4 h-4 text-gold" />
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-gold/80">محتويات الشحنة</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {order.order_items.map((item: any) => (
                                                <div key={item.id} className="flex items-center gap-6 p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-gold/20 transition-all group">
                                                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative">
                                                        {(item.custom_design_url || item.product?.image_url) ? (
                                                            <Image 
                                                                src={item.custom_design_url || item.product?.image_url} 
                                                                alt={item.custom_title || item.product?.title || "Product"} 
                                                                fill
                                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-white/10" /></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-lg font-bold text-theme truncate">
                                                            {item.custom_title || item.product?.title}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {item.size && (
                                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-theme-subtle border border-white/10 uppercase">
                                                                    Size: {item.size}
                                                                </span>
                                                            )}
                                                            {item.custom_garment && (
                                                                <span className="px-2 py-0.5 rounded-md bg-gold/10 text-[10px] font-bold text-gold border border-gold/20">
                                                                    {item.custom_garment}
                                                                </span>
                                                            )}
                                                            {item.custom_position && (
                                                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[10px] font-bold text-emerald-500 border border-emerald-500/20 uppercase">
                                                                    Spots: {item.custom_position}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="mt-3 text-sm text-theme-subtle">
                                                            <span className="text-gold font-bold">{item.quantity}</span> × {formatCurrency(item.unit_price)}
                                                        </p>
                                                    </div>
                                                    <div className="text-left shrink-0">
                                                        <p className="text-xl font-black text-theme">{formatCurrency(item.total_price)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="p-6 rounded-3xl bg-gold/5 border border-gold/10">
                                        <div className="flex items-center gap-2 mb-6">
                                            <CreditCard className="w-4 h-4 text-gold" />
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-gold/80">ملخص الدفعة</h3>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-theme-subtle text-sm">
                                                <span>المجموع الفرعي</span>
                                                <span className="font-mono">{formatCurrency(order.total)}</span>
                                            </div>
                                            <div className="flex justify-between text-theme-subtle text-sm">
                                                <span>الشحن</span>
                                                <span className="text-emerald-400 font-bold">مجاني</span>
                                            </div>
                                            <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                                                <span className="text-lg font-bold text-theme">الإجمالي النهائي</span>
                                                <span className="text-3xl font-black text-gold">{formatCurrency(order.total)}</span>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column: Customer & Meta */}
                                <div className="space-y-8">
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <User className="w-4 h-4 text-gold" />
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-gold/80">بيانات العميل</h3>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10">
                                                    {order.buyer.avatar_url ? (
                                                        <Image src={order.buyer.avatar_url} alt={order.buyer.display_name} width={48} height={48} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gold/10 text-gold font-bold">{order.buyer.display_name[0]}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-theme">{order.buyer.display_name}</p>
                                                    <p className="text-xs text-theme-subtle">@{order.buyer.username}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-white/10 space-y-3">
                                                <div className="flex items-center gap-2 text-xs text-theme-subtle">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>تاريخ الطلب: {new Date(order.created_at).toLocaleDateString("ar-SA")}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-theme-subtle">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    <span>حالة الدفع: <span className="text-emerald-400 font-bold">مدفوع ✓</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400/80">ذكاء التنفيذ — Fulfillment HUD</h3>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-[#0d0d0d] border border-emerald-500/10 relative overflow-hidden group">
                                            {/* Scanning line effect */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-1/2 w-full -translate-y-full animate-[scan_4s_linear_infinite] pointer-events-none" />
                                            
                                            <div className="relative space-y-4">
                                                {isLoadingCalc ? (
                                                    <div className="flex flex-col items-center py-6 gap-3">
                                                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                                        <p className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-widest text-center">Calculating Fulfillment Cost...</p>
                                                    </div>
                                                ) : fulfillmentCalc ? (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                                                <p className="text-[9px] uppercase tracking-tighter text-theme-faint mb-1">Base Garments</p>
                                                                <p className="text-sm font-bold text-theme">{formatCurrency(fulfillmentCalc.summary.garmentSubtotal)}</p>
                                                            </div>
                                                            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                                                                <p className="text-[9px] uppercase tracking-tighter text-theme-faint mb-1">Print Ops</p>
                                                                <p className="text-sm font-bold text-theme">{formatCurrency(fulfillmentCalc.summary.printingSubtotal)}</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-theme-subtle">استحقاق المستودع النهائي</span>
                                                            <span className="text-xl font-black text-emerald-500">{formatCurrency(fulfillmentCalc.summary.grandTotal)}</span>
                                                        </div>

                                                        {order.metadata?.fulfillment_paid ? (
                                                            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-mono text-[10px]">
                                                                <Check className="w-3 h-3" />
                                                                <span>PAID_TO_WAREHOUSE_SUCCESS</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={handleWarehousePayment}
                                                                disabled={isPaying}
                                                                className="w-full relative group/btn py-4 rounded-2xl bg-emerald-500 text-black font-black text-sm overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                                                                <span className="relative flex items-center justify-center gap-2">
                                                                    {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                                                    ادفع للمستودع الآن
                                                                </span>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="text-center py-4 text-xs text-theme-faint font-mono">CALC_ERROR: FAILED_TO_FETCH_BREAKDOWN</div>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                                        <button className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-theme text-sm font-bold border border-white/10 transition-all">
                                            <Printer className="w-4 h-4" />
                                            طباعة ملصق الشحن
                                        </button>
                                        {(order.status === 'confirmed' || order.status === 'paid') && (
                                            <button 
                                                onClick={() => handleUpdateStatus("processing")}
                                                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gold text-[#0a0a0a] text-sm font-black hover:bg-gold-light transition-all shadow-xl shadow-gold/10"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                تأكيد ومتابعة التنفيذ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tactical Footer Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
