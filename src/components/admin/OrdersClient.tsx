"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateOrderStatus } from "@/app/actions/admin";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Loader2,
    Package,
} from "lucide-react";
import { openInvoicePrint } from "@/lib/invoice";
import Image from "next/image";

interface OrdersClientProps {
    orders: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentStatus: string;
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

export function OrdersClient({
    orders = [],
    count = 0,
    totalPages = 0,
    currentPage = 1,
    currentStatus = "all",
}: OrdersClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        if (params.status && params.status !== "all") sp.set("status", params.status);
        if (params.page && params.page !== "1") sp.set("page", params.page);
        startTransition(() => {
            router.push(`/dashboard/orders?${sp.toString()}`);
        });
    };

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setUpdatingOrder(orderId);
        await updateOrderStatus(orderId, newStatus);
        setUpdatingOrder(null);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            {/* ─── Status Tabs ─── */}
            <div className="flex gap-1 p-1 bg-surface/50 rounded-xl border border-white/[0.06] overflow-x-auto">
                {statuses.map((s) => (
                    <button
                        key={s.value}
                        onClick={() => navigate({ status: s.value, page: "1" })}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${currentStatus === s.value
                                ? "bg-gold/10 text-gold"
                                : "text-fg/40 hover:text-fg/60 hover:bg-white/[0.03]"
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ─── Orders Table ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden relative">
                {isPending && (
                    <div className="absolute inset-0 bg-bg/50 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="w-10"></th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">رقم الطلب</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">المشتري</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">المبلغ</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">الحالة</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">الدفع</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">التاريخ</th>
                                <th className="text-right px-6 py-3.5 text-fg/30 font-medium text-xs">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, i) => {
                                const isExpanded = expandedOrder === order.id;
                                const available = nextStatuses[order.status] || [];
                                const items = order.order_items || [];

                                return (
                                    <AnimatePresence key={order.id}>
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <td className="px-3 py-3.5">
                                                {items.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                        className="p-1 rounded hover:bg-white/5 text-fg/30 transition-colors"
                                                    >
                                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 font-mono text-xs text-gold">{order.order_number}</td>
                                            <td className="px-4 py-3.5">
                                                <div>
                                                    <span className="text-fg font-medium">{order.buyer?.display_name || "—"}</span>
                                                    {order.buyer?.username && (
                                                        <span className="text-fg/30 text-xs block">@{order.buyer.username}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-bold text-fg">{Number(order.total).toLocaleString()} ر.س</td>
                                            <td className="px-4 py-3.5"><StatusBadge status={order.status} type="order" /></td>
                                            <td className="px-4 py-3.5">
                                                <span className={`text-xs font-bold ${order.payment_status === "paid" ? "text-forest" : "text-amber-400"
                                                    }`}>
                                                    {order.payment_status === "paid" ? "مدفوع" :
                                                        order.payment_status === "failed" ? "فشل" :
                                                            order.payment_status === "refunded" ? "مسترجع" : "معلق"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-fg/30 text-xs" dir="ltr">
                                                {new Date(order.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openInvoicePrint(order)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-white/10 text-fg/60 hover:text-gold hover:border-gold/20 hover:bg-gold/5 transition-all"
                                                        title="تصدير فاتورة"
                                                    >
                                                        <FileDown className="w-3.5 h-3.5" />
                                                        فاتورة
                                                    </button>
                                                    {available.length > 0 ? (
                                                        <div className="flex gap-1">
                                                            {available.map((s) => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => handleStatusChange(order.id, s)}
                                                                    disabled={updatingOrder === order.id}
                                                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all disabled:opacity-50 ${s === "cancelled"
                                                                            ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                                                                            : "border-gold/20 text-gold hover:bg-gold/10"
                                                                        }`}
                                                                >
                                                                    {s === "confirmed" ? "تأكيد" :
                                                                        s === "processing" ? "معالجة" :
                                                                            s === "shipped" ? "شحن" :
                                                                                s === "delivered" ? "تسليم" :
                                                                                    s === "cancelled" ? "إلغاء" : s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-fg/20 text-xs">—</span>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                        {isExpanded && items.length > 0 && (
                                            <motion.tr
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="border-b border-white/[0.03] bg-white/[0.02]"
                                            >
                                                <td colSpan={8} className="px-6 py-4">
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold text-fg/50 mb-2">عناصر الطلب</p>
                                                        <div className="flex flex-wrap gap-4">
                                                            {items.map((item: any) => {
                                                                const isCustom = !!item.custom_design_url;
                                                                const imageUrl = isCustom ? item.custom_design_url : item.product?.image_url;
                                                                const title = isCustom ? (item.custom_title || "تصميم مخصص") : (item.product?.title || "منتج");
                                                                const subtitle = isCustom
                                                                    ? `${item.custom_garment || ""} · مقاس ${item.size || "—"}`
                                                                    : item.size ? `مقاس ${item.size}` : "";
                                                                return (
                                                                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] min-w-[280px]">
                                                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
                                                                            {imageUrl && (
                                                                                <Image
                                                                                    src={imageUrl}
                                                                                    alt={title}
                                                                                    width={56}
                                                                                    height={56}
                                                                                    className="object-cover w-full h-full"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-fg truncate">{title}</p>
                                                                            <p className="text-xs text-fg/40">{subtitle}</p>
                                                                            <p className="text-xs text-fg/50 mt-0.5">
                                                                                {item.quantity} × {Number(item.unit_price).toLocaleString()} ر.س
                                                                            </p>
                                                                        </div>
                                                                        <span className="text-sm font-bold text-gold">
                                                                            {Number(item.total_price).toLocaleString()} ر.س
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                );
                            })}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-16">
                                        <Package className="w-12 h-12 text-fg/10 mx-auto mb-3" />
                                        <p className="text-fg/20 text-sm">لا توجد طلبات</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-fg/30">{count} طلب</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage - 1) })}
                            disabled={currentPage <= 1}
                            className="p-2 rounded-lg bg-surface/50 border border-white/[0.06] text-fg/40 hover:text-fg disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-fg/40 px-3">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg bg-surface/50 border border-white/[0.06] text-fg/40 hover:text-fg disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
