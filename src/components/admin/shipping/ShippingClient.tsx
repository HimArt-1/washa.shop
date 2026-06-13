"use client";

import { forwardRef, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    Ban,
    Banknote,
    BarChart2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Download,
    Eye,
    FileText,
    Loader2,
    MapPin,
    Package,
    PackageCheck,
    Printer,
    RadioTower,
    RefreshCw,
    Route,
    Search,
    ShieldCheck,
    TimerReset,
    Truck,
    X,
    XCircle,
} from "lucide-react";
import Link from "next/link";
import {
    bookShipmentAction,
    bulkBookShipmentAction,
    cancelShipmentAction,
    markDeliveredAction,
    trackShipmentAction,
} from "@/app/actions/shipping";
import type { ShippingOrder, ShippingStats } from "@/app/actions/shipping";
import type { ShippingLifecycle } from "@/lib/shipping/ops";

type ToastState = { type: "success" | "error"; message: string } | null;
type ConfirmAction =
    | { type: "cancel"; order: ShippingOrder }
    | { type: "deliver"; order: ShippingOrder }
    | null;

const LIFECYCLE_CONFIG: Record<ShippingLifecycle, {
    label: string;
    description: string;
    classes: string;
    dot: string;
    icon: React.ElementType;
}> = {
    ready_to_book: {
        label: "جاهز للحجز",
        description: "كل بيانات الشحن مكتملة ولم ينشأ طلب طرود بعد",
        classes: "border-amber-400/20 bg-amber-400/10 text-amber-300",
        dot: "bg-amber-400",
        icon: PackageCheck,
    },
    pending_torod: {
        label: "بانتظار طرود",
        description: "تم إنشاء طلب طرود وينتظر رقم التتبع أو تحديث شركة الشحن",
        classes: "border-gold/25 bg-gold/10 text-gold",
        dot: "bg-gold",
        icon: RadioTower,
    },
    in_transit: {
        label: "في الطريق",
        description: "الشحنة خرجت للتوصيل ويمكن تتبعها",
        classes: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        dot: "bg-emerald-400",
        icon: Route,
    },
    delivered: {
        label: "مكتملة",
        description: "تم تسليم الشحنة وإغلاق دورة الشحن",
        classes: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        dot: "bg-emerald-400",
        icon: CheckCircle2,
    },
    exception: {
        label: "استثناء",
        description: "طرود أعاد حالة فشل أو RTO أو إشكال يحتاج متابعة",
        classes: "border-red-400/25 bg-red-400/10 text-red-300",
        dot: "bg-red-400",
        icon: AlertTriangle,
    },
    blocked: {
        label: "متوقف",
        description: "بيانات الشحن ناقصة أو الطلب غير قابل للحجز الآن",
        classes: "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
        dot: "bg-zinc-400",
        icon: Ban,
    },
};

const PAYMENT_LABEL: Record<string, { label: string; classes: string }> = {
    paid: { label: "مدفوع", classes: "text-emerald-300" },
    pending: { label: "تحصيل عند التسليم", classes: "text-amber-300" },
    refunded: { label: "مسترد", classes: "text-red-300" },
    failed: { label: "فشل الدفع", classes: "text-red-300" },
};

function formatCurrency(value: number) {
    return `${Math.round(Number(value) || 0).toLocaleString("ar-SA")} ر.س`;
}

function formatDateTime(value?: string | null) {
    if (!value) return "لا يوجد وقت";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("ar-SA", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function issueClasses(severity: string) {
    if (severity === "critical") return "border-red-400/20 bg-red-400/10 text-red-300";
    if (severity === "warning") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    return "border-sky-400/20 bg-sky-400/10 text-sky-300";
}

function getLastEventText(order: ShippingOrder) {
    const event = order.latest_shipping_event;
    return event?.description_ar || event?.description || order.torod_last_status || "لا توجد أحداث طرود بعد";
}

function getRecipientName(order: ShippingOrder) {
    return order.shipping_address?.name || order.buyer?.display_name || order.buyer?.username || "عميل";
}

function getRecipientPhone(order: ShippingOrder) {
    return order.shipping_address?.phone || "";
}

function getShipmentReference(order: ShippingOrder) {
    return order.tracking_number || order.torod_order_id || "لم يصدر بعد";
}

function csvCell(value: unknown) {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
}

function htmlEscape(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function exportManifestCsv(orders: ShippingOrder[]) {
    const headers = [
        "رقم الطلب",
        "العميل",
        "الجوال",
        "المدينة",
        "العنوان",
        "الحالة",
        "رقم التتبع أو طرود",
        "شركة الشحن",
        "تحصيل عند التسليم",
        "عدد المنتجات",
        "آخر حدث",
    ];

    const rows = orders.map((order) => [
        order.order_number,
        getRecipientName(order),
        getRecipientPhone(order),
        order.shipping_address?.city || "",
        [order.shipping_address?.line1, order.shipping_address?.line2].filter(Boolean).join(" "),
        LIFECYCLE_CONFIG[order.lifecycle].label,
        getShipmentReference(order),
        order.courier_name || "طرود",
        order.cod_amount_due,
        order.items_count,
        getLastEventText(order),
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `washa-shipping-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function printManifest(orders: ShippingOrder[]) {
    const printWindow = window.open("", "_blank", "width=1160,height=820");
    if (!printWindow) return false;

    const generatedAt = new Date().toLocaleString("ar-SA");
    const totalCod = orders.reduce((sum, order) => sum + order.cod_amount_due, 0);
    const waybillsCount = orders.filter((order) => Boolean(order.waybill_url)).length;
    const rows = orders.map((order, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <strong>#${htmlEscape(order.order_number)}</strong>
                <span>${htmlEscape(getRecipientName(order))}</span>
            </td>
            <td>${htmlEscape(getRecipientPhone(order))}</td>
            <td>
                <strong>${htmlEscape(order.shipping_address?.city || "غير محدد")}</strong>
                <span>${htmlEscape([order.shipping_address?.line1, order.shipping_address?.line2].filter(Boolean).join(" "))}</span>
            </td>
            <td>${htmlEscape(LIFECYCLE_CONFIG[order.lifecycle].label)}</td>
            <td>${htmlEscape(getShipmentReference(order))}</td>
            <td>${htmlEscape(order.courier_name || "طرود")}</td>
            <td>${htmlEscape(order.cod_amount_due > 0 ? formatCurrency(order.cod_amount_due) : "-")}</td>
            <td>${order.items_count}</td>
        </tr>
    `).join("");

    printWindow.document.open();
    printWindow.document.write(`
        <!doctype html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="utf-8" />
            <title>كشف شحن وشّى</title>
            <style>
                @font-face {
                    font-family: "TheYearOfTheCamel";
                    src: url("/fonts/TheYearofTheCamel-Regular.otf") format("opentype");
                    font-weight: 400;
                    font-style: normal;
                    font-display: swap;
                }
                @font-face {
                    font-family: "TheYearOfTheCamel";
                    src: url("/fonts/TheYearofTheCamel-ExtraBold.otf") format("opentype");
                    font-weight: 800 900;
                    font-style: normal;
                    font-display: swap;
                }
                @page { size: A4 landscape; margin: 12mm; }
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    color: #171412;
                    background: #fff;
                    font-family: "TheYearOfTheCamel", "Arial", sans-serif;
                }
                .header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 24px;
                    border-bottom: 2px solid #171412;
                    padding-bottom: 16px;
                    margin-bottom: 18px;
                }
                .brand { font-size: 24px; font-weight: 900; letter-spacing: 0; }
                .title { margin-top: 6px; font-size: 14px; font-weight: 800; color: #6f6358; }
                .meta { text-align: left; font-size: 11px; line-height: 1.9; color: #6f6358; }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .metric {
                    border: 1px solid #ded6cd;
                    border-radius: 10px;
                    padding: 10px 12px;
                    background: #fbfaf8;
                }
                .metric span { display: block; font-size: 10px; color: #786b60; }
                .metric strong { display: block; margin-top: 4px; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                th, td {
                    border-bottom: 1px solid #e7dfd7;
                    padding: 9px 8px;
                    text-align: right;
                    vertical-align: top;
                    font-size: 10px;
                    line-height: 1.55;
                    word-break: break-word;
                }
                th {
                    background: #171412;
                    color: #fff;
                    font-size: 9px;
                    font-weight: 900;
                }
                td strong { display: block; font-size: 11px; }
                td span { display: block; margin-top: 2px; color: #6f6358; }
                .footer {
                    margin-top: 18px;
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    color: #6f6358;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <section class="header">
                <div>
                    <div class="brand">WASHA | وشّى</div>
                    <div class="title">كشف تشغيل الشحن اليومي</div>
                </div>
                <div class="meta">
                    <div>تاريخ الإصدار: ${htmlEscape(generatedAt)}</div>
                    <div>النطاق: الطلبات المحددة من مركز عمليات الشحن</div>
                </div>
            </section>
            <section class="summary">
                <div class="metric"><span>عدد الشحنات</span><strong>${orders.length}</strong></div>
                <div class="metric"><span>بوالص متاحة</span><strong>${waybillsCount}</strong></div>
                <div class="metric"><span>تحصيل عند التسليم</span><strong>${htmlEscape(formatCurrency(totalCod))}</strong></div>
                <div class="metric"><span>جاهزة للحجز</span><strong>${orders.filter((order) => order.can_book_shipment).length}</strong></div>
            </section>
            <table>
                <thead>
                    <tr>
                        <th style="width: 34px;">#</th>
                        <th>الطلب والعميل</th>
                        <th>الجوال</th>
                        <th>العنوان</th>
                        <th>الحالة</th>
                        <th>التتبع</th>
                        <th>الناقل</th>
                        <th>التحصيل</th>
                        <th>المنتجات</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <section class="footer">
                <span>تم توليد الكشف من مركز شحن وشّى.</span>
                <span>المراجعة التشغيلية: الاستلام، البوليصة، التحصيل، والاستثناءات.</span>
            </section>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 250);
    return true;
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
    onClick,
    active,
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`theme-surface-panel min-h-[118px] rounded-2xl p-4 text-right transition-all border ${
                active ? "border-gold/35 bg-gold/5" : "border-transparent hover:border-theme-subtle"
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl border ${color}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <div className="text-left tabular-nums">
                    <p className="text-xl font-black text-theme">{value}</p>
                    {sub && <p className="text-[10px] font-medium text-theme-faint">{sub}</p>}
                </div>
            </div>
            <p className="mt-4 text-xs font-bold text-theme-subtle">{label}</p>
        </motion.button>
    );
}

function LifecycleBadge({ lifecycle }: { lifecycle: ShippingLifecycle }) {
    const config = LIFECYCLE_CONFIG[lifecycle];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${config.classes}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
            <Icon className="h-3.5 w-3.5" />
            {config.label}
        </span>
    );
}

function IssueChips({ order }: { order: ShippingOrder }) {
    if (order.issues.length === 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
                لا توجد إنذارات
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {order.issues.slice(0, 3).map((issue) => (
                <span
                    key={issue.code}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${issueClasses(issue.severity)}`}
                >
                    {issue.severity === "critical" ? <AlertTriangle className="h-3 w-3" /> : <TimerReset className="h-3 w-3" />}
                    {issue.label}
                </span>
            ))}
        </div>
    );
}

type OrderRowProps = {
    order: ShippingOrder;
    loading: string | null;
    selected: boolean;
    onBook: (order: ShippingOrder) => void;
    onTrack: (order: ShippingOrder) => void;
    onConfirm: (action: ConfirmAction) => void;
    onToggleSelection: (order: ShippingOrder) => void;
};

const OrderRow = forwardRef<HTMLTableRowElement, OrderRowProps>(function OrderRow({
    order,
    loading,
    selected,
    onBook,
    onTrack,
    onConfirm,
    onToggleSelection,
}, ref) {
    const isLoading = loading === order.id;
    const payment = PAYMENT_LABEL[order.payment_status] || { label: order.payment_status, classes: "text-theme-faint" };
    const hasCriticalIssue = order.issues.some((issue) => issue.severity === "critical");

    return (
        <motion.tr
            ref={ref}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`border-b border-theme-faint transition-colors hover:bg-theme-faint/50 ${
                hasCriticalIssue ? "bg-red-500/[0.03]" : ""
            } ${
                selected ? "bg-gold/[0.04]" : ""
            }`}
        >
            <td className="px-3 py-4 align-top">
                <label
                    className={`grid h-10 w-10 cursor-pointer place-items-center rounded-xl border transition-colors ${
                        selected
                            ? "border-gold/35 bg-gold/15"
                            : "border-theme-subtle bg-theme-faint hover:border-gold/25"
                    }`}
                >
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelection(order)}
                        aria-label={`تحديد الطلب ${order.order_number}`}
                        className="h-4 w-4 accent-[var(--wusha-gold)]"
                    />
                </label>
            </td>

            <td className="px-4 py-4 align-top">
                <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/10">
                        <Package className="h-4 w-4 text-gold" />
                    </div>
                    <div className="min-w-0">
                        <Link href={`/dashboard/orders/${order.id}`} className="text-sm font-black text-theme transition-colors hover:text-gold">
                            #{order.order_number}
                        </Link>
                        <p className="mt-1 text-[10px] text-theme-faint">{order.items_count} منتج</p>
                        <p className="mt-2 max-w-[190px] truncate text-[10px] text-theme-faint">
                            {order.buyer?.display_name || "عميل غير معروف"}
                        </p>
                    </div>
                </div>
            </td>

            <td className="px-4 py-4 align-top">
                <div className="space-y-2">
                    <LifecycleBadge lifecycle={order.lifecycle} />
                    <p className="max-w-[240px] text-[11px] leading-5 text-theme-subtle">
                        {LIFECYCLE_CONFIG[order.lifecycle].description}
                    </p>
                    <IssueChips order={order} />
                </div>
            </td>

            <td className="px-4 py-4 align-top">
                <div className="space-y-2">
                    {order.tracking_number ? (
                        <div>
                            <p className="font-mono text-xs font-bold text-gold">{order.tracking_number}</p>
                            <p className="mt-1 text-[10px] text-theme-faint">{order.courier_name || "طرود"}</p>
                        </div>
                    ) : order.torod_order_id ? (
                        <div>
                            <p className="font-mono text-xs font-bold text-gold">{order.torod_order_id}</p>
                            <p className="mt-1 text-[10px] text-theme-faint">طلب طرود بدون تتبع</p>
                        </div>
                    ) : (
                        <p className="text-[11px] text-theme-faint">لم يتم الحجز بعد</p>
                    )}
                    <p className="max-w-[260px] text-[11px] leading-5 text-theme-soft">{getLastEventText(order)}</p>
                    {order.latest_shipping_event && (
                        <p className="text-[10px] text-theme-faint">{formatDateTime(order.latest_shipping_event.timestamp)}</p>
                    )}
                </div>
            </td>

            <td className="px-4 py-4 align-top">
                <div className="space-y-2">
                    <p className="text-sm font-black text-theme tabular-nums">{formatCurrency(order.total)}</p>
                    <p className={`text-[10px] font-black ${payment.classes}`}>{payment.label}</p>
                    {order.cod_amount_due > 0 && (
                        <p className="rounded-lg border border-amber-400/15 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                            مطلوب تحصيل {formatCurrency(order.cod_amount_due)}
                        </p>
                    )}
                </div>
            </td>

            <td className="px-4 py-4 align-top">
                <div className="max-w-[220px] space-y-1 text-[11px] text-theme-subtle">
                    <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gold" />
                        {order.shipping_address?.city || "مدينة غير محددة"}
                    </p>
                    <p className="line-clamp-2 text-theme-faint">
                        {order.shipping_address?.line1 || "العنوان التفصيلي غير مكتمل"}
                    </p>
                </div>
            </td>

            <td className="sticky left-0 z-10 border-r border-theme-subtle bg-[var(--wusha-surface)] px-4 py-4 align-top shadow-[-12px_0_24px_rgba(0,0,0,0.04)]">
                <div className="flex flex-wrap items-center gap-1.5">
                    {order.can_book_shipment && (
                        <button
                            onClick={() => onBook(order)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-black text-[#0a0a0a] transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                            حجز
                        </button>
                    )}

                    {order.lifecycle === "pending_torod" && (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-bold text-gold">
                            <RadioTower className="h-3.5 w-3.5" />
                            بانتظار التتبع
                        </span>
                    )}

                    {order.can_mark_delivered && (
                        <button
                            onClick={() => onConfirm({ type: "deliver", order })}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
                        >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            تسليم
                        </button>
                    )}

                    {order.tracking_number && (
                        <button
                            onClick={() => onTrack(order)}
                            className="rounded-lg border border-gold/20 bg-gold/10 p-2 text-gold transition-colors hover:bg-gold/20"
                            title="تتبع الشحنة"
                        >
                            <Eye className="h-3.5 w-3.5" />
                        </button>
                    )}

                    {order.waybill_url && (
                        <a
                            href={order.waybill_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-theme-subtle bg-theme-subtle p-2 text-theme-soft transition-colors hover:text-gold"
                            title="طباعة البوليصة"
                        >
                            <Printer className="h-3.5 w-3.5" />
                        </a>
                    )}

                    {order.can_cancel_shipment && (
                        <button
                            onClick={() => onConfirm({ type: "cancel", order })}
                            disabled={isLoading}
                            className="rounded-lg border border-red-400/20 bg-red-400/10 p-2 text-red-300 transition-colors hover:bg-red-400/20 disabled:opacity-40"
                            title="إلغاء الشحنة"
                        >
                            <XCircle className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </td>
        </motion.tr>
    );
});

function BulkSelectionBar({
    selectedCount,
    readyCount,
    waybillCount,
    codTotal,
    loading,
    onBulkBook,
    onPrint,
    onExport,
    onClear,
}: {
    selectedCount: number;
    readyCount: number;
    waybillCount: number;
    codTotal: number;
    loading: boolean;
    onBulkBook: () => void;
    onPrint: () => void;
    onExport: () => void;
    onClear: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-5xl rounded-3xl border border-theme-soft bg-[var(--wusha-surface)] p-3 shadow-2xl"
        >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-2">
                        <p className="text-[10px] font-bold text-theme-faint">محدد</p>
                        <p className="mt-1 text-lg font-black text-theme tabular-nums">{selectedCount}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 px-3 py-2">
                        <p className="text-[10px] font-bold text-amber-200/80">جاهز للحجز</p>
                        <p className="mt-1 text-lg font-black text-amber-300 tabular-nums">{readyCount}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2">
                        <p className="text-[10px] font-bold text-emerald-200/80">بوالص</p>
                        <p className="mt-1 text-lg font-black text-emerald-300 tabular-nums">{waybillCount}</p>
                    </div>
                    <div className="rounded-2xl border border-gold/15 bg-gold/10 px-3 py-2">
                        <p className="text-[10px] font-bold text-gold/80">التحصيل</p>
                        <p className="mt-1 text-sm font-black text-gold tabular-nums">{formatCurrency(codTotal)}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={onBulkBook}
                        disabled={loading || readyCount === 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-3 text-xs font-black text-[#0a0a0a] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                        حجز الجاهز
                    </button>
                    <button
                        onClick={onPrint}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-xs font-bold text-theme-subtle transition-colors hover:text-gold disabled:opacity-45"
                    >
                        <Printer className="h-4 w-4" />
                        كشف الشحن
                    </button>
                    <button
                        onClick={onExport}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-xs font-bold text-theme-subtle transition-colors hover:text-gold disabled:opacity-45"
                    >
                        <Download className="h-4 w-4" />
                        ملف CSV
                    </button>
                    <button
                        onClick={onClear}
                        disabled={loading}
                        className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs font-bold text-red-300 transition-colors hover:bg-red-400/20 disabled:opacity-45"
                    >
                        مسح التحديد
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function TrackModal({ order, onClose }: { order: ShippingOrder; onClose: () => void }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(Boolean(order.tracking_number));

    useEffect(() => {
        let active = true;
        if (!order.tracking_number) {
            setLoading(false);
            return;
        }

        trackShipmentAction(order.tracking_number).then((res) => {
            if (!active) return;
            setData(res);
            setLoading(false);
        });

        return () => {
            active = false;
        };
    }, [order.tracking_number]);

    const remoteTimeline = Array.isArray(data?.data?.timeline)
        ? data.data.timeline
        : Array.isArray(data?.timeline)
            ? data.timeline
            : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="relative max-h-[86dvh] w-full max-w-2xl overflow-hidden rounded-3xl border border-theme-soft bg-[var(--wusha-surface)] shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4 border-b border-theme-subtle p-5">
                    <div>
                        <h3 className="flex items-center gap-2 font-black text-theme">
                            <Route className="h-4 w-4 text-gold" />
                            مسار الشحنة #{order.order_number}
                        </h3>
                        <p className="mt-1 text-xs text-theme-faint">
                            {order.tracking_number || order.torod_order_id || "لا يوجد رقم تتبع بعد"}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-theme-subtle">
                        <X className="h-4 w-4 text-theme-faint" />
                    </button>
                </div>

                <div className="max-h-[calc(86dvh-82px)] overflow-y-auto p-5 styled-scrollbar">
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-[10px] font-bold text-theme-faint">حالة التشغيل</p>
                            <div className="mt-2"><LifecycleBadge lifecycle={order.lifecycle} /></div>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-[10px] font-bold text-theme-faint">شركة الشحن</p>
                            <p className="mt-2 text-sm font-bold text-theme">{order.courier_name || "طرود"}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-[10px] font-bold text-theme-faint">التحصيل</p>
                            <p className="mt-2 text-sm font-bold text-theme">{order.cod_amount_due > 0 ? formatCurrency(order.cod_amount_due) : "لا يوجد"}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <section>
                            <h4 className="mb-3 flex items-center gap-2 text-xs font-black text-theme">
                                <FileText className="h-4 w-4 text-gold" />
                                سجل وشّى وطرود
                            </h4>
                            {order.shipping_history.length === 0 ? (
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4 text-sm text-theme-subtle">
                                    لم يصل أي تحديث محفوظ من شركة الشحن لهذه الشحنة بعد.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {order.shipping_history.slice().reverse().map((event, index) => (
                                        <div key={`${event.timestamp}-${index}`} className="flex gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                                            <div>
                                                <p className="text-sm font-bold text-theme">{event.description_ar || event.description || event.status}</p>
                                                <p className="mt-1 text-[10px] text-theme-faint">{event.status} · {formatDateTime(event.timestamp)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section>
                            <h4 className="mb-3 flex items-center gap-2 text-xs font-black text-theme">
                                <RadioTower className="h-4 w-4 text-gold" />
                                استعلام طرود المباشر
                            </h4>
                            {loading ? (
                                <div className="grid place-items-center rounded-2xl border border-theme-subtle bg-theme-faint py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-gold" />
                                </div>
                            ) : data?.success === false ? (
                                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                                    {data.error || "لا يمكن جلب معلومات التتبع الآن"}
                                </div>
                            ) : remoteTimeline.length > 0 ? (
                                <div className="space-y-3">
                                    {remoteTimeline.map((event: any, index: number) => (
                                        <div key={index} className="flex gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                                            <div>
                                                <p className="text-sm font-bold text-theme">{event.status || event.description}</p>
                                                <p className="mt-1 text-[10px] text-theme-faint">{event.time || event.date || event.date_time || "وقت غير محدد"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4 text-sm text-theme-subtle">
                                    لا توجد بيانات مسار مباشرة من طرود لهذا الرقم الآن.
                                </div>
                            )}
                        </section>
                    </div>

                    {order.waybill_url && (
                        <a
                            href={order.waybill_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold py-3 text-sm font-black text-[#0a0a0a] transition-transform hover:scale-[1.01]"
                        >
                            <Printer className="h-4 w-4" />
                            طباعة البوليصة
                        </a>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

function ConfirmActionModal({
    action,
    loading,
    onClose,
    onConfirm,
}: {
    action: ConfirmAction;
    loading: boolean;
    onClose: () => void;
    onConfirm: (codCollected?: boolean) => void;
}) {
    const [codCollected, setCodCollected] = useState(false);

    useEffect(() => {
        setCodCollected(false);
    }, [action?.type, action?.order.id]);

    if (!action) return null;

    const isDelivery = action.type === "deliver";
    const requiresCod = isDelivery && action.order.payment_status === "pending";
    const title = isDelivery ? "تأكيد تسليم الشحنة" : "إلغاء الشحنة";
    const tone = isDelivery ? "emerald" : "red";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
            <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="relative w-full max-w-md rounded-3xl border border-theme-soft bg-[var(--wusha-surface)] p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-black text-theme">{title}</h3>
                        <p className="mt-1 text-xs text-theme-faint">الطلب #{action.order.order_number}</p>
                    </div>
                    <button disabled={loading} onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-theme-subtle disabled:opacity-40">
                        <X className="h-4 w-4 text-theme-faint" />
                    </button>
                </div>

                <div className="mt-5 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                    {isDelivery ? (
                        <div className="space-y-3 text-sm text-theme-subtle">
                            <p>سيتم إغلاق الشحنة كتسليم مكتمل وتحديث حالة الطلب.</p>
                            {requiresCod && (
                                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">
                                    <input
                                        type="checkbox"
                                        checked={codCollected}
                                        onChange={(event) => setCodCollected(event.target.checked)}
                                        className="mt-1 h-4 w-4 accent-amber-400"
                                    />
                                    <span className="text-xs font-bold leading-5">
                                        أؤكد تحصيل مبلغ الدفع عند التسليم وقدره {formatCurrency(action.order.cod_amount_due)}
                                    </span>
                                </label>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm text-theme-subtle">
                            <p>سيتم إلغاء الشحنة في طرود وإرجاع الطلب إلى مرحلة التجهيز.</p>
                            <p className="font-mono text-xs text-theme-faint">{action.order.tracking_number || action.order.torod_order_id}</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        disabled={loading}
                        onClick={onClose}
                        className="flex-1 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-xs font-bold text-theme-subtle transition-colors hover:text-theme disabled:opacity-40"
                    >
                        تراجع
                    </button>
                    <button
                        disabled={loading || (requiresCod && !codCollected)}
                        onClick={() => onConfirm(codCollected)}
                        className={`flex-[2] rounded-2xl px-4 py-3 text-xs font-black text-white transition-all disabled:opacity-40 ${
                            tone === "emerald" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-red-500 hover:bg-red-400"
                        }`}
                    >
                        {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isDelivery ? "تأكيد التسليم" : "تأكيد الإلغاء"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

interface Props {
    orders: ShippingOrder[];
    stats: ShippingStats;
    total: number;
    currentPage: number;
    totalPages: number;
    currentStatus: string;
    currentSearch: string;
    error: string | null;
}

export function ShippingClient({
    orders,
    stats,
    total,
    currentPage,
    totalPages,
    currentStatus,
    currentSearch,
    error,
}: Props) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState>(null);
    const [trackOrder, setTrackOrder] = useState<ShippingOrder | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentStatus, currentSearch, currentPage]);

    const totalExpectedRevenue = stats.deliveredRevenue + stats.totalCodAmount;
    const revenuePercent = totalExpectedRevenue > 0 ? (stats.deliveredRevenue / totalExpectedRevenue) * 100 : 0;
    const pendingCodPercent = totalExpectedRevenue > 0 ? (stats.totalCodAmount / totalExpectedRevenue) * 100 : 0;
    const activePipeline = stats.readyToBook + stats.pendingTorod + stats.inTransit + stats.blocked + stats.exceptions;

    const health = useMemo(() => {
        if (stats.exceptions > 0) return { label: "استثناءات تحتاج تدخل", classes: "border-red-400/20 bg-red-400/10 text-red-300", icon: AlertTriangle };
        if (stats.blocked > 0) return { label: "طلبات متوقفة بسبب بيانات ناقصة", classes: "border-amber-400/20 bg-amber-400/10 text-amber-300", icon: Ban };
        return { label: "مسار الشحن مستقر", classes: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300", icon: ShieldCheck };
    }, [stats.blocked, stats.exceptions]);

    const selectedOrders = useMemo(
        () => orders.filter((order) => selectedIds.has(order.id)),
        [orders, selectedIds]
    );
    const selectedReadyOrders = useMemo(
        () => selectedOrders.filter((order) => order.can_book_shipment),
        [selectedOrders]
    );
    const selectedWaybillCount = useMemo(
        () => selectedOrders.filter((order) => Boolean(order.waybill_url)).length,
        [selectedOrders]
    );
    const selectedCodTotal = useMemo(
        () => selectedOrders.reduce((sum, order) => sum + order.cod_amount_due, 0),
        [selectedOrders]
    );
    const allVisibleSelected = orders.length > 0 && orders.every((order) => selectedIds.has(order.id));

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        window.setTimeout(() => setToast(null), 4200);
    };

    const toggleOrderSelection = (order: ShippingOrder) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(order.id)) {
                next.delete(order.id);
            } else {
                next.add(order.id);
            }
            return next;
        });
    };

    const toggleVisibleSelection = () => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (allVisibleSelected) {
                orders.forEach((order) => next.delete(order.id));
            } else {
                orders.forEach((order) => next.add(order.id));
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const navigate = (params: { status?: string; search?: string; page?: string }) => {
        const nextStatus = params.status ?? currentStatus;
        const nextSearch = params.search ?? search;
        const nextPage = params.page ?? String(currentPage);
        const sp = new URLSearchParams();

        if (nextStatus && nextStatus !== "all") sp.set("status", nextStatus);
        if (nextSearch.trim()) sp.set("search", nextSearch.trim());
        if (nextPage && nextPage !== "1") sp.set("page", nextPage);

        const queryString = sp.toString();
        startTransition(() => {
            router.push(`/dashboard/shipping${queryString ? `?${queryString}` : ""}`);
        });
    };

    const handleBook = async (order: ShippingOrder) => {
        setLoadingId(order.id);
        const res = await bookShipmentAction(order.id);
        setLoadingId(null);

        if (res.success) {
            showToast(
                "success",
                res.pending_shipment
                    ? `تم إنشاء طلب طرود ${res.torod_order_id || ""} وينتظر رقم التتبع`
                    : `تم حجز الشحنة ${res.tracking_number || ""}`
            );
            router.refresh();
            return;
        }

        showToast("error", res.error || "فشل الحجز");
    };

    const handleBulkBook = async () => {
        if (selectedReadyOrders.length === 0) {
            showToast("error", "لا توجد شحنات جاهزة للحجز ضمن التحديد الحالي");
            return;
        }

        setBulkLoading(true);
        const res = await bulkBookShipmentAction(selectedReadyOrders.map((order) => order.id));
        setBulkLoading(false);

        if (res.success) {
            const skippedText = res.skipped > 0 ? ` وتم تجاوز ${res.skipped} بسبب حد الدفعة` : "";
            showToast("success", `تم حجز ${res.succeeded} من ${res.processed} شحنة${skippedText}`);
            clearSelection();
            router.refresh();
            return;
        }

        showToast("error", res.error || "لم يتم حجز أي شحنة");
    };

    const handleExportCsv = () => {
        if (selectedOrders.length === 0) {
            showToast("error", "حدد شحنات أولاً لتصدير ملف التشغيل");
            return;
        }

        exportManifestCsv(selectedOrders);
        showToast("success", "تم تجهيز ملف التشغيل للطلبات المحددة");
    };

    const handlePrintManifest = () => {
        if (selectedOrders.length === 0) {
            showToast("error", "حدد شحنات أولاً لطباعة كشف التشغيل");
            return;
        }

        const opened = printManifest(selectedOrders);
        if (!opened) {
            showToast("error", "تعذر فتح نافذة الطباعة. تحقق من إعدادات منع النوافذ المنبثقة.");
        }
    };

    const handleConfirmAction = async (codCollected?: boolean) => {
        if (!confirmAction) return;

        const order = confirmAction.order;
        setLoadingId(order.id);

        const res = confirmAction.type === "cancel"
            ? await cancelShipmentAction(order.id)
            : await markDeliveredAction(order.id, { codCollected });

        setLoadingId(null);

        if (res.success) {
            showToast("success", confirmAction.type === "cancel" ? "تم إلغاء الشحنة" : "تم تأكيد التسليم");
            setConfirmAction(null);
            router.refresh();
            return;
        }

        showToast("error", res.error || "تعذر تنفيذ العملية");
    };

    const statusTabs = [
        { value: "all", label: "الكل", count: stats.totalOrders },
        { value: "ready_to_book", label: "جاهز للحجز", count: stats.readyToBook },
        { value: "pending_torod", label: "بانتظار طرود", count: stats.pendingTorod },
        { value: "in_transit", label: "في الطريق", count: stats.inTransit },
        { value: "exception", label: "استثناءات", count: stats.exceptions },
        { value: "blocked", label: "متوقف", count: stats.blocked },
        { value: "delivered", label: "مكتمل", count: stats.delivered },
    ];

    const HealthIcon = health.icon;

    return (
        <div className="space-y-6">
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -18 }}
                        className={`fixed right-4 top-4 z-[999] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl ${
                            toast.type === "success"
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                : "border-red-500/25 bg-red-500/10 text-red-300"
                        }`}
                    >
                        {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {trackOrder && <TrackModal order={trackOrder} onClose={() => setTrackOrder(null)} />}
                {confirmAction && (
                    <ConfirmActionModal
                        action={confirmAction}
                        loading={loadingId === confirmAction.order.id}
                        onClose={() => setConfirmAction(null)}
                        onConfirm={handleConfirmAction}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedOrders.length > 0 && (
                    <BulkSelectionBar
                        selectedCount={selectedOrders.length}
                        readyCount={selectedReadyOrders.length}
                        waybillCount={selectedWaybillCount}
                        codTotal={selectedCodTotal}
                        loading={bulkLoading}
                        onBulkBook={handleBulkBook}
                        onPrint={handlePrintManifest}
                        onExport={handleExportCsv}
                        onClear={clearSelection}
                    />
                )}
            </AnimatePresence>

            <section className="theme-surface-panel overflow-hidden rounded-3xl border border-theme-subtle">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.35fr_0.65fr]">
                    <div className="p-5 md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-bold text-theme-faint">غرفة الشحن</p>
                                <h2 className="mt-2 text-2xl font-black tracking-tight text-theme md:text-3xl">مكتب الشحن والتتبع</h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                                    دورة حياة كاملة للحجز، طرود، التتبع، الاستثناءات، البوالص، وتحصيل الدفع عند التسليم من شاشة واحدة.
                                </p>
                            </div>
                            <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${health.classes}`}>
                                <HealthIcon className="h-4 w-4" />
                                {health.label}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-theme-subtle bg-theme-faint p-5 lg:border-r lg:border-t-0">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[10px] font-bold text-theme-faint">نشط</p>
                                <p className="mt-1 text-2xl font-black text-theme tabular-nums">{activePipeline}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-theme-faint">استثناء</p>
                                <p className="mt-1 text-2xl font-black text-red-300 tabular-nums">{stats.exceptions}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-theme-faint">التحصيل</p>
                                <p className="mt-1 text-lg font-black text-gold tabular-nums">{mounted ? formatCurrency(stats.totalCodAmount) : "..."}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatCard icon={PackageCheck} label="جاهز للحجز" value={stats.readyToBook} color="border-amber-400/20 bg-amber-400/10 text-amber-300" onClick={() => navigate({ status: "ready_to_book", page: "1" })} active={currentStatus === "ready_to_book"} />
                <StatCard icon={RadioTower} label="بانتظار طرود" value={stats.pendingTorod} color="border-gold/20 bg-gold/10 text-gold" onClick={() => navigate({ status: "pending_torod", page: "1" })} active={currentStatus === "pending_torod"} />
                <StatCard icon={Route} label="في الطريق" value={stats.inTransit} color="border-emerald-400/20 bg-emerald-400/10 text-emerald-300" onClick={() => navigate({ status: "in_transit", page: "1" })} active={currentStatus === "in_transit"} />
                <StatCard icon={CheckCircle2} label="مكتمل" value={stats.delivered} color="border-emerald-400/20 bg-emerald-400/10 text-emerald-300" onClick={() => navigate({ status: "delivered", page: "1" })} active={currentStatus === "delivered"} />
                <StatCard icon={AlertTriangle} label="استثناءات" value={stats.exceptions} color="border-red-400/20 bg-red-400/10 text-red-300" onClick={() => navigate({ status: "exception", page: "1" })} active={currentStatus === "exception"} />
                <StatCard icon={Banknote} label="تحصيل معلّق" value={mounted ? formatCurrency(stats.totalCodAmount) : "..."} sub={`${stats.pendingCod} طلب`} color="border-gold/20 bg-gold/10 text-gold" />
            </div>

            <section className="theme-surface-panel rounded-2xl border border-theme-subtle p-5 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-gold/10 p-2 text-gold">
                        <BarChart2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-theme">تحليلات الشحن والتحصيل</h2>
                        <p className="text-xs text-theme-soft">مؤشرات مختصرة للأداء، التحصيل، والاستثناءات التشغيلية.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-theme-soft">معدل التسليم</span>
                            <span className="font-black text-emerald-300">{stats.deliveryRate}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-theme-faint">
                            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${stats.deliveryRate}%` }} />
                        </div>
                        <p className="text-[10px] text-theme-subtle">{stats.delivered} مكتملة من {stats.inTransit + stats.delivered} خرجت للتوصيل</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-theme-soft">إيراد مكتمل</span>
                            <span className="font-black text-gold">{formatCurrency(stats.deliveredRevenue)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-theme-faint">
                            <div className="h-full bg-gold transition-all duration-700" style={{ width: `${revenuePercent}%` }} />
                        </div>
                        <p className="text-[10px] text-theme-subtle">طلبات تم إغلاقها كتسليم مكتمل</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-theme-soft">تحصيل معلق</span>
                            <span className="font-black text-amber-300">{formatCurrency(stats.totalCodAmount)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-theme-faint">
                            <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${pendingCodPercent}%` }} />
                        </div>
                        <p className="text-[10px] text-theme-subtle">{stats.pendingCod} طلب يحتاج تحصيلًا أو تأكيد تحصيل</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-theme-soft">معدل الاستثناء</span>
                            <span className="font-black text-red-300">{stats.totalOrders > 0 ? Math.round((stats.exceptions / stats.totalOrders) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-theme-faint">
                            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${stats.totalOrders > 0 ? (stats.exceptions / stats.totalOrders) * 100 : 0}%` }} />
                        </div>
                        <p className="text-[10px] text-theme-subtle">{stats.exceptions} استثناء و{stats.blocked} طلب متوقف</p>
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => navigate({ status: tab.value, page: "1" })}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-black transition-all active:scale-[0.98] ${
                                currentStatus === tab.value
                                    ? "border-gold/30 bg-gold/15 text-gold"
                                    : "border-theme-subtle bg-theme-faint text-theme-subtle hover:text-theme"
                            }`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="mr-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-current/10 px-1 text-[10px]">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        navigate({ search, page: "1" });
                    }}
                    className="relative mr-auto w-full sm:w-auto"
                >
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="بحث برقم الطلب، التتبع، أو رقم طرود..."
                        className="input-theme w-full rounded-xl py-2 pl-4 pr-10 text-sm sm:w-80"
                    />
                </form>

                <button
                    onClick={() => router.refresh()}
                    className="rounded-xl border border-theme-subtle bg-theme-faint p-2.5 text-theme-soft transition-all hover:text-gold active:scale-[0.98]"
                    title="تحديث"
                >
                    <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                </button>
            </div>

            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            <div className="theme-surface-panel overflow-hidden rounded-2xl">
                <div className="overflow-x-auto" dir="ltr">
                    <table className="min-w-[1190px] w-full text-sm" dir="rtl">
                        <thead>
                            <tr className="border-b border-theme-subtle bg-theme-faint">
                                <th className="w-14 px-3 py-3.5 text-right">
                                    <label className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-theme-subtle bg-[var(--wusha-surface)] transition-colors hover:border-gold/25">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleVisibleSelection}
                                            disabled={orders.length === 0}
                                            aria-label="تحديد كل الطلبات الظاهرة"
                                            className="h-4 w-4 accent-[var(--wusha-gold)] disabled:opacity-40"
                                        />
                                    </label>
                                </th>
                                {["الطلب", "حالة التشغيل", "طرود والتتبع", "الدفع والتحصيل", "العنوان"].map((heading) => (
                                    <th key={heading} className="px-4 py-3.5 text-right text-xs font-bold text-theme-soft">
                                        {heading}
                                    </th>
                                ))}
                                <th className="sticky left-0 z-10 border-r border-theme-subtle bg-theme-faint px-4 py-3.5 text-right text-xs font-bold text-theme-soft shadow-[-12px_0_24px_rgba(0,0,0,0.04)]">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <Truck className="mx-auto mb-3 h-10 w-10 text-theme-faint" />
                                            <p className="text-sm font-bold text-theme">لا توجد شحنات في هذا العرض</p>
                                            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-theme-faint">
                                                غيّر الفلتر، امسح البحث، أو حدّث الصفحة للتأكد من آخر حالة للطلبات والشحنات.
                                            </p>
                                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                                {(currentStatus !== "all" || currentSearch) && (
                                                    <button
                                                        onClick={() => {
                                                            setSearch("");
                                                            navigate({ status: "all", search: "", page: "1" });
                                                        }}
                                                        className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-2 text-xs font-bold text-theme-subtle transition-all hover:border-gold/20 hover:text-gold active:scale-[0.98]"
                                                    >
                                                        عرض كل الشحنات
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => router.refresh()}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-3 py-2 text-xs font-bold text-gold transition-all hover:bg-gold/15 active:scale-[0.98]"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                    تحديث الحالة
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            loading={loadingId}
                                            selected={selectedIds.has(order.id)}
                                            onBook={handleBook}
                                            onTrack={setTrackOrder}
                                            onConfirm={setConfirmAction}
                                            onToggleSelection={toggleOrderSelection}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-theme-subtle bg-theme-faint px-4 py-3">
                        <p className="text-xs text-theme-subtle">
                            {total} طلب · صفحة {currentPage} من {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate({ page: String(currentPage - 1) })}
                                disabled={currentPage <= 1 || isPending}
                                className="rounded-lg bg-theme-subtle p-2 transition-colors hover:bg-theme-soft disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => navigate({ page: String(currentPage + 1) })}
                                disabled={currentPage >= totalPages || isPending}
                                className="rounded-lg bg-theme-subtle p-2 transition-colors hover:bg-theme-soft disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
