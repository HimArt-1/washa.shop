import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrders } from "@/app/actions/orders";
import Image from "next/image";
import Link from "next/link";
import { Package, ArrowLeft, Clock, Truck, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "طلباتي — وشّى",
    description: "تتبع حالة طلباتك على منصة وشّى",
};

// ─── Status Config ──────────────────────────────────────────
const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    pending: { label: "بانتظار المعالجة", icon: Clock, color: "text-amber-400", bgColor: "bg-amber-400/10" },
    confirmed: { label: "مؤكد", icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
    processing: { label: "قيد المعالجة", icon: Package, color: "text-blue-400", bgColor: "bg-blue-400/10" },
    shipped: { label: "تم الشحن", icon: Truck, color: "text-purple-400", bgColor: "bg-purple-400/10" },
    delivered: { label: "تم التوصيل", icon: CheckCircle2, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
    cancelled: { label: "ملغي", icon: XCircle, color: "text-red-400", bgColor: "bg-red-400/10" },
};

// ─── Progress Steps ─────────────────────────────────────────
const progressSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

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
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIdx ? "bg-gold" : "bg-white/[0.06]"
                        }`} />
                </div>
            ))}
        </div>
    );
}

// ─── Page ───────────────────────────────────────────────────

export default async function OrdersPage() {
    const user = await currentUser();
    if (!user) redirect("/sign-in");

    const { data: orders, count } = await getUserOrders();

    return (
        <div className="pt-8 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-fg">طلباتي</h1>
                        <p className="text-fg/30 text-sm mt-1">{count || 0} طلب</p>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 text-xs text-fg/30 hover:text-gold transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        حسابي
                    </Link>
                </div>

                {/* Orders List */}
                {orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order: any) => {
                            const config = statusConfig[order.status] || statusConfig.pending;
                            const StatusIcon = config.icon;

                            return (
                                <div
                                    key={order.id}
                                    className="p-5 border border-white/[0.06] rounded-2xl bg-surface/30 hover:border-white/[0.1] transition-all"
                                >
                                    {/* Order Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-fg/20">#{order.order_number || order.id.slice(0, 8)}</span>
                                            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {config.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-fg/20">
                                            {new Date(order.created_at).toLocaleDateString("ar-SA", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <OrderProgressBar status={order.status || "pending"} />

                                    {/* Order Items */}
                                    {order.items && order.items.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                            {order.items.map((item: any) => {
                                                const isCustom = !!item.custom_design_url;
                                                const imageUrl = isCustom ? item.custom_design_url : item.product?.image_url;
                                                const title = isCustom ? (item.custom_title || "تصميم مخصص") : (item.product?.title || "منتج");
                                                return (
                                                    <div key={item.id} className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/[0.04] bg-white/[0.02] shrink-0">
                                                            {imageUrl && (
                                                                <Image
                                                                    src={imageUrl}
                                                                    alt={title}
                                                                    width={48}
                                                                    height={48}
                                                                    className="object-cover w-full h-full"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-fg truncate">{title}</p>
                                                            <p className="text-[10px] text-fg/20">
                                                                {item.quantity}× · {item.size && `مقاس ${item.size} · `}{Number(item.unit_price).toLocaleString()} ر.س
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-bold text-fg/40">
                                                            {Number(item.total_price).toLocaleString()} ر.س
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Order Total */}
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                                        <span className="text-xs text-fg/20">الإجمالي</span>
                                        <span className="text-sm font-bold text-gold">{Number(order.total).toLocaleString()} ر.س</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-24">
                        <Package className="w-16 h-16 text-fg/10 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-fg/30 mb-2">لا توجد طلبات</h3>
                        <p className="text-fg/15 text-sm mb-6">لم تقم بأي طلب بعد</p>
                        <Link href="/store" className="btn-gold py-3 px-8 text-sm">
                            تصفح المتجر
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
