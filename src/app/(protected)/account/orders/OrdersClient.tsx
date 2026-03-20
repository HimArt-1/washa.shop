"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Package, Truck, CheckCircle2, XCircle, Clock, Search, ExternalLink, Brush, Loader2, FileText } from "lucide-react";
import { DesignResultsPopup } from "@/components/design-your-piece/DesignResultsPopup";
import { openInvoicePrint } from "@/lib/invoice";
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
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIdx ? "bg-gold" : "bg-theme-soft"}`} />
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDesignOrder, setSelectedDesignOrder] = useState<CustomDesignOrder | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const hasNoOrders = orders.length === 0 && designOrders.length === 0;

    // التمرير للطلب أو التصميم عند القدوم من إشعار
    useEffect(() => {
        const orderId = searchParams.get("order");
        const designId = searchParams.get("design");
        if (orderId || designId) {
            const el = document.querySelector(
                orderId ? `[data-order-id="${orderId}"]` : `[data-design-id="${designId}"]`
            );
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                (el as HTMLElement).classList.add("ring-2", "ring-gold/50", "ring-offset-2");
                setTimeout(() => (el as HTMLElement).classList.remove("ring-2", "ring-gold/50", "ring-offset-2"), 2500);
            }
        }
    }, [searchParams]);

    const handleCancelDesign = async (id: string) => {
        if (!confirm("هل أنت متأكد من إلغاء طلب التصميم؟")) return;
        setCancelingId(id);
        setActionError(null);

        try {
            const result = await cancelDesignOrderByCustomer(id);
            if (result?.error) {
                setActionError(result.error);
                return;
            }

            router.refresh();
        } catch (error) {
            setActionError(error instanceof Error ? error.message : "تعذر إلغاء الطلب الآن.");
        } finally {
            setCancelingId(null);
        }
    };

    if (hasNoOrders) {
        return (
            <div className="theme-surface-panel rounded-[2rem] py-20 text-center sm:py-24">
                <div className="w-20 h-20 rounded-2xl bg-theme-subtle border border-theme-subtle flex items-center justify-center mx-auto mb-5">
                    <Package className="w-10 h-10 text-theme-faint" />
                </div>
                <h3 className="text-lg font-bold text-theme-subtle mb-2">لا توجد طلبات</h3>
                <p className="text-theme-faint text-sm mb-6 max-w-sm mx-auto">لم تقم بأي طلب بعد. تصفح المتجر واختر ما يعجبك</p>
                <Link href="/store" className="inline-flex items-center gap-2 btn-gold py-3 px-8 text-sm">
                    تصفح المتجر
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {actionError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:px-5">
                    {actionError}
                </div>
            )}
            {/* ====== Custom Design Orders Section ====== */}
            {designOrders.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-theme-strong mb-4 flex items-center gap-2">
                        <Brush className="w-5 h-5 text-gold" />
                        طلبات التصميم المخصص
                    </h2>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {designOrders.map((dOrder) => {
                            const conf = designStatusConfig[dOrder.status];
                            const isAwaiting = dOrder.status === "awaiting_review";

                            return (
                                <div key={dOrder.id} data-design-id={dOrder.id} className="flex flex-col justify-between rounded-[1.75rem] border border-theme-subtle bg-surface/30 p-4 transition-all hover:border-gold/20 sm:p-5">
                                    <div>
                                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-xs text-theme-faint">تصميم #{dOrder.order_number}</span>
                                            <span className={`text-[10px] px-2.5 py-1 rounded-full ${conf.bg} ${conf.color} font-bold`}>
                                                {conf.label}
                                            </span>
                                        </div>
                                        <div className="mb-4 flex items-center gap-3 sm:gap-4">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-theme-faint border border-theme-faint shrink-0 p-1">
                                                {dOrder.garment_image_url ? (
                                                    <Image src={dOrder.garment_image_url} alt="Garment" width={64} height={64} className="object-contain w-full h-full" />
                                                ) : <Brush className="w-8 h-8 text-theme-faint m-auto mt-3" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-theme">{dOrder.garment_name}</p>
                                                <p className="text-xs text-theme-subtle mt-1">{dOrder.size_name} · {dOrder.color_name}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-theme-faint pt-4">
                                        {isAwaiting ? (
                                            <>
                                                <button
                                                    onClick={() => setSelectedDesignOrder(dOrder)}
                                                    className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-bg shadow-lg transition-colors sm:flex-1 ${dOrder.is_sent_to_customer ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : "bg-gold hover:bg-gold-light"}`}
                                                >
                                                    {dOrder.is_sent_to_customer ? (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4" /> دفع وإضافة للسلة · {dOrder.final_price} ر.س
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Search className="w-4 h-4" /> معاينة واعتماد النتيجة
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        ) : dOrder.status === "completed" ? (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        const invoiceOrder = {
                                                            id: dOrder.id,
                                                            order_number: String(dOrder.order_number || dOrder.id.slice(0, 8)),
                                                            status: "completed",
                                                            payment_status: "paid",
                                                            subtotal: dOrder.final_price || 0,
                                                            shipping_cost: 0,
                                                            tax: 0,
                                                            total: dOrder.final_price || 0,
                                                            currency: "SAR",
                                                            buyer: { display_name: "مستخدم وشّى" },
                                                            created_at: dOrder.created_at,
                                                            order_items: [{
                                                                id: dOrder.id,
                                                                custom_title: dOrder.garment_name,
                                                                custom_garment: dOrder.garment_name,
                                                                size: dOrder.size_name,
                                                                quantity: 1,
                                                                unit_price: dOrder.final_price || 0,
                                                                total_price: dOrder.final_price || 0,
                                                                custom_design_url: dOrder.garment_image_url
                                                            }]
                                                        };
                                                        openInvoicePrint(invoiceOrder);
                                                    }}
                                                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-theme-subtle py-2 text-center text-xs font-bold text-theme transition-colors hover:border-gold/20 hover:bg-gold/10 hover:text-gold sm:flex-1"
                                                >
                                                    <FileText className="w-4 h-4" /> الفاتورة الذكية
                                                </button>
                                                <Link href={`/design/tracker?order=${dOrder.id}`} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-theme-subtle py-2 text-center text-xs font-bold text-theme transition-colors hover:bg-theme-soft sm:flex-1">
                                                    تفاصيل الطلب <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                            </>
                                        ) : dOrder.status !== "cancelled" ? (
                                            <>
                                                <Link href={`/design/tracker?order=${dOrder.id}`} className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-theme-subtle py-2 text-center text-xs font-bold text-theme transition-colors hover:bg-theme-soft">
                                                    تتبع الطلب والحوار <ExternalLink className="w-3.5 h-3.5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleCancelDesign(dOrder.id)}
                                                    disabled={cancelingId === dOrder.id}
                                                    className="flex min-h-[44px] items-center justify-center rounded-xl bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
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
                    <h2 className="text-lg font-bold text-theme-strong mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-gold" />
                        الطلبات الشرائية
                    </h2>
                    {orders.map((order: any) => {
                        const config = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={order.id}
                                data-order-id={order.id}
                                className="rounded-[1.75rem] border border-theme-subtle bg-surface/30 p-4 transition-all duration-300 hover:border-gold/20 hover:bg-surface/40 sm:p-5"
                            >
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="text-xs text-theme-faint">#{order.order_number || order.id.slice(0, 8)}</span>
                                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {config.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-theme-faint">
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
                                                <div key={item.id} className="flex items-center gap-3 sm:gap-4">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-theme-faint bg-theme-faint shrink-0">
                                                        {imageUrl && <Image src={imageUrl} alt={title} width={48} height={48} className="object-cover w-full h-full" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate text-sm text-theme">{title}</p>
                                                        <p className="text-[10px] text-theme-faint">
                                                            {item.quantity}× · {item.size && `مقاس ${item.size} · `}{Number(item.unit_price).toLocaleString()} ر.س
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 text-xs font-bold text-theme-subtle">{Number(item.total_price).toLocaleString()} ر.س</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-col gap-3 border-t border-theme-faint pt-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-xs text-theme-subtle block mb-0.5">الإجمالي</span>
                                            <span className="text-sm font-bold text-gold">{Number(order.total).toLocaleString()} ر.س</span>
                                        </div>
                                        {/* Invoice Button */}
                                        <button
                                            onClick={() => openInvoicePrint(order)}
                                            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-theme-soft px-3 py-1.5 text-[10px] font-bold text-theme-soft transition-all hover:border-gold/20 hover:bg-gold/5 hover:text-gold"
                                            title="عرض الفاتورة"
                                        >
                                            <FileText className="w-4 h-4" />
                                            الفاتورة الذكية
                                        </button>
                                    </div>
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
                        setActionError(null);
                        router.refresh();
                    }}
                    onCancel={async () => {
                        setActionError(null);
                        const result = await cancelDesignOrderByCustomer(selectedDesignOrder.id);
                        if (result?.error) {
                            setActionError(result.error);
                            return;
                        }

                        setSelectedDesignOrder(null);
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
