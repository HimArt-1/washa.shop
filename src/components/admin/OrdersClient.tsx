"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateOrderStatus } from "@/app/actions/admin";
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
    "relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(8,8,8,0.92))] backdrop-blur-xl";

const subtlePanelClass =
    "rounded-[24px] border border-white/8 bg-white/[0.03] backdrop-blur-xl";

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
            className={`${subtlePanelClass} p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-2xl font-black text-theme">{value}</p>
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

function QueueLane({
    title,
    subtitle,
    hrefLabel,
    onOpen,
    items,
    emptyState,
}: {
    title: string;
    subtitle: string;
    hrefLabel: string;
    onOpen: () => void;
    items: any[];
    emptyState: string;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} h-full p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-theme">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
                </div>
                <button onClick={onOpen} className="text-sm font-medium text-gold hover:text-gold-light">
                    {hrefLabel}
                </button>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((order) => (
                        <div key={order.id} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-mono text-xs font-bold text-gold">#{order.order_number}</p>
                                    <p className="mt-2 truncate text-sm font-bold text-theme">
                                        {order.buyer?.display_name || "مشتري غير مسمى"}
                                    </p>
                                    {order.buyer?.username ? (
                                        <p className="mt-1 text-xs text-theme-faint">@{order.buyer.username}</p>
                                    ) : null}
                                </div>
                                <StatusBadge status={order.status} type="order" />
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-theme-subtle">
                                <span>{formatCurrency(Number(order.total) || 0)}</span>
                                <span>{paymentLabel(order.payment_status)}</span>
                                <span>{formatShortDate(order.created_at)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

export function OrdersClient({
    snapshot,
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
    const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);

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
        try {
            const result = await updateOrderStatus(orderId, newStatus);
            if (!result?.success) {
                alert(result?.error || "تعذر تحديث حالة الطلب.");
                return;
            }

            router.refresh();
        } catch (error) {
            console.error("Order status update failed", error);
            alert("تعذر تحديث حالة الطلب الآن. حاول مرة أخرى.");
        } finally {
            setUpdatingOrder(null);
        }
    };

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

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_30%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-gold uppercase">
                                Orders Operations Center
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-theme-subtle">
                                مراجعة، تحصيل، تنفيذ، وشحن
                            </span>
                        </div>

                        <div className="max-w-3xl">
                            <h2 className="text-3xl font-black leading-tight text-theme md:text-4xl">
                                صفحة الطلبات يجب أن تعمل كغرفة تشغيل، لا كجدول فقط.
                            </h2>
                            <p className="mt-4 text-sm leading-8 text-theme-subtle md:text-base">
                                هنا تراقب ما يحتاج تأكيدًا، ما ينتظر التحصيل، ما دخل مرحلة التنفيذ، وما تحرك إلى الشحن
                                دون أن تغرق في التفاصيل منذ اللحظة الأولى.
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">عناصر تحتاج تدخل الآن</p>
                                <p className="mt-2 text-3xl font-black text-theme">{attentionLoad}</p>
                                <p className="mt-2 text-sm text-theme-subtle">طلبات بانتظار مراجعة أو تحصيل أو نقل للتنفيذ.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">أداء اليوم</p>
                                <p className="mt-2 text-3xl font-black text-theme">{snapshot.stats.todayOrders}</p>
                                <p className="mt-2 text-sm text-theme-subtle">{formatCurrency(snapshot.stats.todayRevenue)} إيراد اليوم.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">معدل التحصيل</p>
                                <p className="mt-2 text-3xl font-black text-theme">{collectionRate.toFixed(1)}%</p>
                                <p className="mt-2 text-sm text-theme-subtle">نسبة الطلبات المدفوعة من إجمالي الطلبات.</p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <button
                                onClick={() => navigate({ status: "pending", page: "1" })}
                                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-all hover:border-gold/20 hover:bg-white/[0.06]"
                            >
                                <div className="text-right">
                                    <p className="text-sm font-bold text-theme">بانتظار التأكيد</p>
                                    <p className="text-xs text-theme-subtle">{snapshot.stats.pendingReview} طلب</p>
                                </div>
                                <ShoppingCart className="h-4 w-4 text-theme-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </button>
                            <button
                                onClick={() => navigate({ status: "processing", page: "1" })}
                                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-all hover:border-gold/20 hover:bg-white/[0.06]"
                            >
                                <div className="text-right">
                                    <p className="text-sm font-bold text-theme">طابور التنفيذ</p>
                                    <p className="text-xs text-theme-subtle">{snapshot.stats.fulfillmentQueue} طلب</p>
                                </div>
                                <Truck className="h-4 w-4 text-theme-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </button>
                            <button
                                onClick={() => navigate({ status: "all", page: "1" })}
                                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition-all hover:border-gold/20 hover:bg-white/[0.06]"
                            >
                                <div className="text-right">
                                    <p className="text-sm font-bold text-theme">مدفوعات معلقة</p>
                                    <p className="text-xs text-theme-subtle">{snapshot.stats.paymentPending} طلب</p>
                                </div>
                                <CreditCard className="h-4 w-4 text-theme-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </button>
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`${panelClass} p-6`}
                >
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-medium tracking-[0.2em] text-theme-faint uppercase">Flow Health</p>
                                <h3 className="mt-2 text-2xl font-black text-theme">صحة مسار الطلبات</h3>
                                <p className="mt-2 text-sm leading-7 text-theme-subtle">
                                    قياس سريع للتوازن بين الطلبات الجديدة، التنفيذ، التحصيل، والتسليم.
                                </p>
                            </div>
                            {attentionLoad > 0 ? (
                                <AlertTriangle className="mt-1 h-5 w-5 text-amber-300" />
                            ) : (
                                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">طلبات مدفوعة</p>
                                <p className="mt-2 text-2xl font-black text-theme">{snapshot.stats.paidOrders}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">تم تسليمها</p>
                                <p className="mt-2 text-2xl font-black text-theme">{snapshot.stats.delivered}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">ملغاة أو مسترجعة</p>
                                <p className="mt-2 text-2xl font-black text-theme">{snapshot.stats.cancelledOrRefunded}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                                <p className="text-xs text-theme-faint">إجمالي الطلبات</p>
                                <p className="mt-2 text-2xl font-black text-theme">{snapshot.stats.totalOrders}</p>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="الإيراد المحصل"
                    value={formatCurrency(snapshot.stats.totalRevenue)}
                    subtitle="إجمالي الطلبات المدفوعة حتى الآن."
                    icon={CreditCard}
                    accent="#d4af37"
                />
                <SummaryCard
                    title="بانتظار المراجعة"
                    value={String(snapshot.stats.pendingReview)}
                    subtitle="طلبات تحتاج تأكيدًا أو قرارًا سريعًا."
                    icon={ShoppingCart}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="التحصيل المعلق"
                    value={String(snapshot.stats.paymentPending)}
                    subtitle="طلبات ما زالت في منطقة الدفع غير المحسومة."
                    icon={AlertTriangle}
                    accent="#ef4444"
                />
                <SummaryCard
                    title="التنفيذ والشحن"
                    value={String(snapshot.stats.fulfillmentQueue)}
                    subtitle="طلبات تحركت إلى مرحلة المعالجة أو الشحن."
                    icon={Truck}
                    accent="#38bdf8"
                />
                <SummaryCard
                    title="المسار اليومي"
                    value={String(snapshot.stats.todayOrders)}
                    subtitle={`${formatCurrency(snapshot.stats.todayRevenue)} إيراد اليوم.`}
                    icon={Package}
                    accent="#22c55e"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <QueueLane
                    title="بانتظار التأكيد"
                    subtitle="طلبات دخلت المسار وتحتاج قرارًا سريعًا لتحريكها."
                    hrefLabel="تصفية العرض"
                    onOpen={() => navigate({ status: "pending", page: "1" })}
                    items={snapshot.awaitingConfirmation}
                    emptyState="لا توجد طلبات تنتظر التأكيد الآن."
                />
                <QueueLane
                    title="مراقبة التحصيل"
                    subtitle="طلبات معلقة ماليًا وتحتاج متابعة تحصيل أو تحقق."
                    hrefLabel="فتح القائمة"
                    onOpen={() => navigate({ status: "all", page: "1" })}
                    items={snapshot.paymentWatchlist}
                    emptyState="لا توجد مدفوعات معلقة تستحق الانتباه الآن."
                />
                <QueueLane
                    title="مكتب الشحن والتنفيذ"
                    subtitle="طلبات تحركت إلى التنفيذ أو خرجت للشحن وتحتاج متابعة."
                    hrefLabel="عرض الطابور"
                    onOpen={() => navigate({ status: "processing", page: "1" })}
                    items={snapshot.shippingDesk}
                    emptyState="طابور التنفيذ والشحن فارغ حاليًا."
                />
            </div>

            <div className={`${panelClass} overflow-hidden`}>
                <div className="border-b border-white/8 px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-medium tracking-[0.2em] text-theme-faint uppercase">Orders Table</p>
                            <h3 className="mt-2 text-2xl font-black text-theme">سجل التشغيل التفصيلي</h3>
                            <p className="mt-2 text-sm leading-7 text-theme-subtle">
                                استخدم التصفية التالية للتنقل بسرعة بين المراحل ثم حدّث الحالة أو اطبع الفاتورة من نفس المكان.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                <p className="text-xs text-theme-faint">نتائج الفلتر</p>
                                <p className="mt-2 text-xl font-black text-theme">{count}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                <p className="text-xs text-theme-faint">الصفحة الحالية</p>
                                <p className="mt-2 text-xl font-black text-theme">{currentPage}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                <p className="text-xs text-theme-faint">إجمالي الصفحات</p>
                                <p className="mt-2 text-xl font-black text-theme">{Math.max(totalPages, 1)}</p>
                            </div>
                            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                <p className="text-xs text-theme-faint">الفلتر</p>
                                <p className="mt-2 text-base font-bold text-theme">
                                    {statuses.find((item) => item.value === currentStatus)?.label || "الكل"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 py-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {statuses.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => navigate({ status: s.value, page: "1" })}
                                className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                                    currentStatus === s.value
                                        ? "bg-gold/10 text-gold ring-1 ring-gold/20"
                                        : "bg-white/[0.03] text-theme-subtle hover:bg-white/[0.06] hover:text-theme"
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                    {isPending && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/55 backdrop-blur-sm">
                            <Loader2 className="h-6 w-6 animate-spin text-gold" />
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-y border-white/8 text-right text-xs text-theme-faint">
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
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="border-b border-white/6 transition-colors hover:bg-white/[0.03]"
                                                >
                                                    <td className="px-3 py-4">
                                                        {items.length > 0 ? (
                                                            <button
                                                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                                                className="rounded-lg p-1 text-theme-faint transition-colors hover:bg-white/[0.06]"
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
                                                    <td className="px-4 py-4 font-bold text-theme">{formatCurrency(Number(order.total) || 0)}</td>
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
                                                                onClick={() => setInvoiceOrder(order)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold text-theme-soft transition-all hover:border-gold/20 hover:bg-gold/5 hover:text-gold"
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
                                                        className="border-b border-white/6 bg-white/[0.03]"
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
                                                                            <div key={item.id} className="flex min-w-[290px] items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3">
                                                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black/30">
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
                            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-theme-subtle transition-colors hover:text-theme disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <span className="px-3 text-xs text-theme-subtle">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-theme-subtle transition-colors hover:text-theme disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
