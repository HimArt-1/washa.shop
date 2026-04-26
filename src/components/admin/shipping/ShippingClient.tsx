"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Truck, Package, CheckCircle2, AlertCircle, Search, RefreshCw,
    ExternalLink, Printer, X, ChevronLeft, ChevronRight, Loader2,
    MapPin, Phone, Clock, TrendingUp, Banknote, Eye,
} from "lucide-react";
import Link from "next/link";
import {
    bookShipmentAction, cancelShipmentAction, markDeliveredAction,
    trackShipmentAction,
} from "@/app/actions/shipping";
import type { ShippingOrder, ShippingStats } from "@/app/actions/shipping";

// ─── Status Config ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    processing: { label: "جاهز للشحن", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Package },
    shipped:    { label: "تم الشحن",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20",      icon: Truck },
    delivered:  { label: "تم التوصيل", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
};

const PAYMENT_COLOR: Record<string, string> = {
    paid:    "text-emerald-400",
    pending: "text-amber-400",
    refunded:"text-red-400",
};

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, onClick, active }: {
    icon: React.ElementType; label: string; value: string | number;
    sub?: string; color: string; onClick?: () => void; active?: boolean;
}) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`theme-surface-panel rounded-2xl p-4 text-right w-full transition-all border ${
                active ? "border-gold/30 bg-gold/5" : "border-transparent hover:border-theme-subtle"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className={`rounded-xl p-2.5 ${color.replace("text-", "bg-").replace(/text-\w+/, "")}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-left">
                    <p className="text-xl font-bold text-theme">{value}</p>
                    {sub && <p className="text-[10px] text-theme-faint">{sub}</p>}
                </div>
            </div>
            <p className="mt-2 text-xs font-medium text-theme-subtle">{label}</p>
        </motion.button>
    );
}

// ─── Order Row ────────────────────────────────────────────────

function OrderRow({ order, onBook, onCancel, onDeliver, onTrack, loading }: {
    order: ShippingOrder;
    onBook: (id: string) => void;
    onCancel: (id: string) => void;
    onDeliver: (id: string) => void;
    onTrack: (order: ShippingOrder) => void;
    loading: string | null;
}) {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.processing;
    const StatusIcon = cfg.icon;
    const addr = order.shipping_address;
    const isLoading = loading === order.id;

    return (
        <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b border-theme-faint hover:bg-theme-faint/50 transition-colors"
        >
            {/* Order */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                        <Link href={`/dashboard/orders/${order.id}`} className="font-bold text-theme hover:text-gold transition-colors text-sm">
                            #{order.order_number}
                        </Link>
                        <p className="text-[10px] text-theme-faint">{order.items_count} منتج</p>
                    </div>
                </div>
            </td>
            {/* Customer */}
            <td className="px-4 py-4">
                <p className="text-sm font-medium text-theme">{order.buyer?.display_name || "—"}</p>
                {addr && (
                    <p className="text-[10px] text-theme-faint flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{addr.city}
                    </p>
                )}
            </td>
            {/* Status */}
            <td className="px-4 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cfg.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                </span>
            </td>
            {/* Payment */}
            <td className="px-4 py-4">
                <p className="text-sm font-bold text-theme">{order.total.toLocaleString()} ر.س</p>
                <p className={`text-[10px] font-bold ${PAYMENT_COLOR[order.payment_status] || "text-theme-faint"}`}>
                    {order.payment_status === "paid" ? "مدفوع" : order.payment_status === "pending" ? "COD" : "مسترد"}
                </p>
            </td>
            {/* Tracking */}
            <td className="px-4 py-4">
                {order.tracking_number ? (
                    <div>
                        <p className="text-xs font-mono text-sky-400">{order.tracking_number}</p>
                        <p className="text-[10px] text-theme-faint">{order.courier_name}</p>
                    </div>
                ) : (
                    <span className="text-[11px] text-theme-faint">—</span>
                )}
            </td>
            {/* Actions */}
            <td className="px-4 py-4">
                <div className="flex items-center gap-1.5">
                    {order.status === "processing" && !order.tracking_number && (
                        <button
                            onClick={() => onBook(order.id)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold text-[#0a0a0a] text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
                            حجز شحنة
                        </button>
                    )}
                    {order.status === "shipped" && (
                        <>
                            <button
                                onClick={() => onDeliver(order.id)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                تم التوصيل
                            </button>
                            {order.tracking_number && (
                                <button
                                    onClick={() => onTrack(order)}
                                    className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors"
                                    title="تتبع الشحنة"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={() => onCancel(order.id)}
                                disabled={isLoading}
                                className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                                title="إلغاء الشحنة"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    {order.waybill_url && (
                        <a
                            href={order.waybill_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-theme-subtle border border-theme-subtle text-theme-soft hover:text-gold transition-colors"
                            title="طباعة البوليصة"
                        >
                            <Printer className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </td>
        </motion.tr>
    );
}

// ─── Track Modal ──────────────────────────────────────────────

function TrackModal({ order, onClose }: { order: ShippingOrder; onClose: () => void }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!order.tracking_number) return;
        trackShipmentAction(order.tracking_number).then((res) => {
            setData(res);
            setLoading(false);
        });
    }, [order.tracking_number]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-md rounded-3xl bg-[var(--wusha-surface)] border border-theme-soft p-6 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-theme flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gold" />
                        تتبع الشحنة #{order.order_number}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-theme-subtle rounded-lg transition-colors">
                        <X className="w-4 h-4 text-theme-faint" />
                    </button>
                </div>
                <div className="rounded-2xl bg-theme-faint p-4 mb-4">
                    <p className="text-xs text-theme-faint mb-1">رقم التتبع</p>
                    <p className="font-mono text-sky-400 text-sm">{order.tracking_number}</p>
                    {order.courier_name && <p className="text-xs text-theme-subtle mt-1">{order.courier_name}</p>}
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : data?.success === false ? (
                    <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                        {data.error || "لا يمكن جلب معلومات التتبع الآن"}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data?.data?.timeline?.map((t: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-sm text-theme">{t.status || t.description}</p>
                                    <p className="text-[10px] text-theme-faint">{t.time || t.date}</p>
                                </div>
                            </div>
                        )) || (
                            <pre className="text-[10px] text-theme-faint overflow-auto max-h-40">
                                {JSON.stringify(data, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
                {order.waybill_url && (
                    <a
                        href={order.waybill_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gold text-[#0a0a0a] font-bold text-sm hover:scale-[1.01] transition-transform"
                    >
                        <Printer className="w-4 h-4" /> طباعة البوليصة
                    </a>
                )}
            </motion.div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────

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
    orders, stats, total, currentPage, totalPages,
    currentStatus, currentSearch, error,
}: Props) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [trackOrder, setTrackOrder] = useState<ShippingOrder | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => { setMounted(true); }, []);

    const showToast = (type: "success" | "error", message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        if (params.status && params.status !== "all") sp.set("status", params.status);
        if (params.search) sp.set("search", params.search);
        if (params.page && params.page !== "1") sp.set("page", params.page);
        startTransition(() => router.push(`/dashboard/shipping?${sp.toString()}`));
    };

    const handleBook = async (id: string) => {
        setLoadingId(id);
        const res = await bookShipmentAction(id);
        setLoadingId(null);
        if (res.success) {
            showToast("success", res.is_simulation
                ? `تم الحجز (محاكاة) — رقم التتبع: ${res.tracking_number}`
                : `✅ تم حجز الشحنة — ${res.tracking_number}`);
            router.refresh();
        } else {
            showToast("error", res.error || "فشل الحجز");
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("هل أنت متأكد من إلغاء الشحنة؟")) return;
        setLoadingId(id);
        const res = await cancelShipmentAction(id);
        setLoadingId(null);
        if (res.success) {
            showToast("success", "تم إلغاء الشحنة وإعادة الطلب لـ قيد التجهيز");
            router.refresh();
        } else {
            showToast("error", res.error || "فشل الإلغاء");
        }
    };

    const handleDeliver = async (id: string) => {
        setLoadingId(id);
        const res = await markDeliveredAction(id);
        setLoadingId(null);
        if (res.success) {
            showToast("success", "✅ تم تأكيد التوصيل وتحديث الطلب");
            router.refresh();
        } else {
            showToast("error", res.error || "فشل التحديث");
        }
    };

    const STATUSES = [
        { value: "all", label: "الكل", count: stats.readyToShip + stats.shipped + stats.delivered },
        { value: "processing", label: "جاهز للشحن", count: stats.readyToShip },
        { value: "shipped", label: "تم الشحن", count: stats.shipped },
        { value: "delivered", label: "تم التوصيل", count: stats.delivered },
    ];

    return (
        <div className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-4 right-4 z-[999] flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold shadow-2xl ${
                            toast.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                                : "bg-red-500/10 border-red-500/25 text-red-400"
                        }`}
                    >
                        {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Track Modal */}
            <AnimatePresence>
                {trackOrder && <TrackModal order={trackOrder} onClose={() => setTrackOrder(null)} />}
            </AnimatePresence>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon={Package}       label="جاهز للشحن"    value={stats.readyToShip}    color="text-amber-400"   onClick={() => navigate({ status: "processing", page: "1" })} active={currentStatus === "processing"} />
                <StatCard icon={Truck}         label="تم الشحن"      value={stats.shipped}        color="text-sky-400"     onClick={() => navigate({ status: "shipped",    page: "1" })} active={currentStatus === "shipped"} />
                <StatCard icon={CheckCircle2}  label="تم التوصيل"    value={stats.delivered}      color="text-emerald-400" onClick={() => navigate({ status: "delivered",  page: "1" })} active={currentStatus === "delivered"} />
                <StatCard icon={Banknote}      label="COD معلّق"     value={mounted ? `${stats.totalCodAmount.toLocaleString()} ر.س` : "..."} sub={`${stats.pendingCod} شحنة`} color="text-gold" />
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                    {STATUSES.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => navigate({ status: s.value, page: "1" })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                currentStatus === s.value
                                    ? "bg-gold/15 text-gold border-gold/30"
                                    : "bg-theme-faint text-theme-subtle border-theme-subtle hover:text-theme"
                            }`}
                        >
                            {s.label}
                            {s.count > 0 && (
                                <span className="mr-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-current/10 text-[10px] px-1">
                                    {s.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); navigate({ search, page: "1" }); }}
                    className="relative mr-auto"
                >
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث برقم الطلب أو التتبع..."
                        className="input-dark rounded-xl py-2 pl-4 pr-10 text-sm w-64"
                    />
                </form>
                <button
                    onClick={() => router.refresh()}
                    className="p-2.5 rounded-xl border border-theme-subtle bg-theme-faint text-theme-soft hover:text-gold transition-colors"
                    title="تحديث"
                >
                    <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="theme-surface-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle bg-theme-faint">
                                {["الطلب", "العميل", "الحالة", "المبلغ", "رقم التتبع", "الإجراءات"].map((h) => (
                                    <th key={h} className="px-4 py-3.5 text-right font-medium text-theme-soft text-xs">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <Truck className="w-10 h-10 text-theme-faint mx-auto mb-3" />
                                            <p className="text-theme-subtle text-sm">لا توجد طلبات شحن في هذه الفئة</p>
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                            onBook={handleBook}
                                            onCancel={handleCancel}
                                            onDeliver={handleDeliver}
                                            onTrack={setTrackOrder}
                                            loading={loadingId}
                                        />
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-theme-subtle bg-theme-faint">
                        <p className="text-xs text-theme-subtle">
                            {total} طلب — صفحة {currentPage} من {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate({ status: currentStatus, page: String(currentPage - 1) })}
                                disabled={currentPage <= 1 || isPending}
                                className="p-2 rounded-lg bg-theme-subtle hover:bg-theme-soft transition-colors disabled:opacity-40"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate({ status: currentStatus, page: String(currentPage + 1) })}
                                disabled={currentPage >= totalPages || isPending}
                                className="p-2 rounded-lg bg-theme-subtle hover:bg-theme-soft transition-colors disabled:opacity-40"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
