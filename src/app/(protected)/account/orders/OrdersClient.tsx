"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Truck, CheckCircle2, XCircle, Clock, Search, ExternalLink, Brush, Loader2 } from "lucide-react";
import { DesignResultsPopup } from "@/components/design-your-piece/DesignResultsPopup";
import type { CustomDesignOrder } from "@/types/database";
import { cancelDesignOrderByCustomer } from "@/app/actions/smart-store";

// ─── Regular Orders Configuration ───────────────────────────
const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    pending: { label: "بانتظار المعالجة", icon: Clock, color: "text-amber-400", bgColor: "bg-amber-400/10" },
    confirmed: { label: "مؤكد", icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
    processing: { label: "قيد المعالجة", icon: Package, color: "text-blue-400", bgColor: "bg-blue-400/10" },
    shipped: { label: "تم الشحن", icon: Truck, color: "text-purple-400", bgColor: "bg-purple-400/10" },
    delivered: { label: "تم التوصيل", icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
    cancelled: { label: "ملغي", icon: XCircle, color: "text-red-400", bgColor: "bg-red-400/10" },
};
const progressSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

// ─── Custom Design Configurations ───────────────────────────
const designStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: "مستلم", color: "text-blue-400", bg: "bg-blue-400/10" },
    in_progress: { label: "قيد التصميم", color: "text-amber-400", bg: "bg-amber-400/10" },
    awaiting_review: { label: "جاهز للمراجعة", color: "text-gold", bg: "bg-gold/10" },
    completed: { label: "مضاف للسلة", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    cancelled: { label: "ملغي", color: "text-red-400", bg: "bg-red-400/10" },
};

function OrderProgressBar({ status }: { status: string }) {
    const currentIdx = progressSteps.indexOf(status);
    if (status === "cancelled") {
        return (
            <div className="flex items-center gap-1 mt-3">
                <span className="text-xs text-red-400">تم إلغاء الطلب</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-1 mt-4">
            {progressSteps.map((step, i) => (
                <div key={step} className="flex items-center gap-1 flex-1">
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIdx ? "bg-gold" : "bg-white/[0.06]"}`} />
                </div>
            ))}
        </div>
    );
}

export function OrdersClient({
    orders,
    designOrders,
}: {
    orders: any[];
    designOrders: CustomDesignOrder[];
}) {
    const [selectedDesignOrder, setSelectedDesignOrder] = useState<CustomDesignOrder | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    const hasNoOrders = orders.length === 0 && designOrders.length === 0;

    const handleCancelDesign = async (id: string) => {
        if (!confirm("هل أنت متأكد من إلغاء طلب التصميم؟")) return;
        setCancelingId(id);
        await cancelDesignOrderByCustomer(id);
        window.location.reload();
    };

    if (hasNoOrders) {
        return (
            <div className="text-center py-24 rounded-2xl border border-white/[0.04] bg-surface/20">
                <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                    <Package className="w-10 h-10 text-fg/20" />
                </div>
                <h3 className="text-lg font-bold text-fg/40 mb-2">لا توجد طلبات</h3>
                <p className="text-fg/30 text-sm mb-6 max-w-sm mx-auto">لم تقم بأي طلب بعد. تصفح المتجر واختر ما يعجبك</p>
                <Link href="/store" className="inline-flex items-center gap-2 btn-gold py-3 px-8 text-sm">
                    تصفح المتجر
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* ====== Custom Design Orders Section ====== */}
            {designOrders.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-fg/80 mb-4 flex items-center gap-2">
                        <Brush className="w-5 h-5 text-gold" />
                        طلبات التصميم المخصص
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {designOrders.map((dOrder) => {
                            const conf = designStatusConfig[dOrder.status];
                            const isAwaiting = dOrder.status === "awaiting_review";

                            return (
                                <div key={dOrder.id} className="p-5 border border-white/[0.06] rounded-2xl bg-surface/30 hover:border-gold/20 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-xs text-fg/30">تصميم #{dOrder.order_number}</span>
                                            <span className={`text-[10px] px-2.5 py-1 rounded-full ${conf.bg} ${conf.color} font-bold`}>
                                                {conf.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.04] shrink-0 p-1">
                                                {dOrder.garment_image_url ? (
                                                    <Image src={dOrder.garment_image_url} alt="Garment" width={64} height={64} className="object-contain w-full h-full" />
                                                ) : <Brush className="w-8 h-8 text-fg/20 m-auto mt-3" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-fg">{dOrder.garment_name}</p>
                                                <p className="text-xs text-fg/40 mt-1">{dOrder.size_name} · {dOrder.color_name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.04]">
                                        {isAwaiting ? (
                                            <button
                                                onClick={() => setSelectedDesignOrder(dOrder)}
                                                className="flex-1 bg-gold text-bg py-2 rounded-xl text-xs font-bold hover:bg-gold-light transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Search className="w-4 h-4" />
                                                معاينة واعتماد النتيجة
                                            </button>
                                        ) : dOrder.status !== "completed" && dOrder.status !== "cancelled" ? (
                                            <>
                                                <Link href={`/design/tracker?order=${dOrder.id}`} className="flex-1 bg-white/[0.04] text-fg py-2 rounded-xl text-xs font-bold hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 text-center">
                                                    تتبع الطلب والحوار <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleCancelDesign(dOrder.id)}
                                                    disabled={cancelingId === dOrder.id}
                                                    className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center"
                                                    title="إلغاء الطلب"
                                                >
                                                    {cancelingId === dOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ====== Regular Orders Section ====== */}
            {orders.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-fg/80 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-gold" />
                        الطلبات الشرائية
                    </h2>
                    {orders.map((order: any) => {
                        const config = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={order.id}
                                className="p-5 border border-white/[0.06] rounded-2xl bg-surface/30 hover:border-gold/20 hover:bg-surface/40 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-fg/20">#{order.order_number || order.id.slice(0, 8)}</span>
                                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {config.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-fg/20">
                                        {new Date(order.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                                    </span>
                                </div>

                                <OrderProgressBar status={order.status || "pending"} />

                                {order.items && order.items.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        {order.items.map((item: any) => {
                                            const isCustom = !!item.custom_design_url;
                                            const imageUrl = isCustom ? item.custom_design_url : item.product?.image_url;
                                            const title = isCustom ? (item.custom_title || "تصميم مخصص") : (item.product?.title || "منتج");
                                            return (
                                                <div key={item.id} className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.02] shrink-0">
                                                        {imageUrl && <Image src={imageUrl} alt={title} width={48} height={48} className="object-cover w-full h-full" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-fg truncate">{title}</p>
                                                        <p className="text-[10px] text-fg/20">
                                                            {item.quantity}× · {item.size && `مقاس ${item.size} · `}{Number(item.unit_price).toLocaleString()} ر.س
                                                        </p>
                                                    </div>
                                                    <span className="text-xs font-bold text-fg/40">{Number(item.total_price).toLocaleString()} ر.س</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                                    <span className="text-xs text-fg/20">الإجمالي</span>
                                    <span className="text-sm font-bold text-gold">{Number(order.total).toLocaleString()} ر.س</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full Screen Design Results Popup Editor */}
            {selectedDesignOrder && (
                <DesignResultsPopup
                    order={selectedDesignOrder}
                    onClose={() => setSelectedDesignOrder(null)}
                    onConfirm={() => {
                        setSelectedDesignOrder(null);
                        window.location.reload();
                    }}
                    onCancel={async () => {
                        await cancelDesignOrderByCustomer(selectedDesignOrder.id);
                        setSelectedDesignOrder(null);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
