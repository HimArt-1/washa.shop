"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Brush, Clock, CheckCircle2, XCircle, Loader2,
    Send, ArrowRight, Package, MessageCircle
} from "lucide-react";
import { getDesignOrderPublic } from "@/app/actions/smart-store";
import { getDesignOrderMessages, customerSendOrderMessage } from "@/app/actions/design-order-chat";
import type { CustomDesignOrder, DesignOrderMessage } from "@/types/database";

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    new: { label: "مستلم", color: "text-blue-400", bg: "bg-blue-400/10", icon: Package },
    in_progress: { label: "قيد التصميم", color: "text-amber-400", bg: "bg-amber-400/10", icon: Brush },
    awaiting_review: { label: "جاهز للمراجعة", color: "text-gold", bg: "bg-gold/10", icon: CheckCircle2 },
    completed: { label: "مكتمل", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 },
    cancelled: { label: "ملغي", color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
};

const progressSteps = ["new", "in_progress", "awaiting_review", "completed"];

export default function DesignTrackerClient({ orderId }: { orderId: string }) {
    const [order, setOrder] = useState<CustomDesignOrder | null>(null);
    const [messages, setMessages] = useState<DesignOrderMessage[]>([]);
    const [newMsg, setNewMsg] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const [orderData, msgs] = await Promise.all([
                getDesignOrderPublic(orderId),
                getDesignOrderMessages(orderId),
            ]);
            if (!orderData) {
                setNotFound(true);
            } else {
                setOrder(orderData);
                setMessages(msgs);
            }
            setLoading(false);
        }
        load();
    }, [orderId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMsg.trim() || sending) return;
        setSending(true);
        const res = await customerSendOrderMessage(orderId, newMsg);
        if (res.success) {
            setNewMsg("");
            const msgs = await getDesignOrderMessages(orderId);
            setMessages(msgs);
        }
        setSending(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="text-center py-32">
                <div className="w-16 h-16 rounded-2xl bg-theme-subtle border border-theme-subtle flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-400/50" />
                </div>
                <h2 className="text-xl font-bold text-theme-soft mb-2">طلب غير موجود</h2>
                <p className="text-theme-faint text-sm mb-6">الرجاء التأكد من رابط الطلب.</p>
                <Link href="/account/orders" className="text-gold text-sm hover:underline">
                    العودة لطلباتي
                </Link>
            </div>
        );
    }

    const conf = statusConfig[order.status] || statusConfig.new;
    const StatusIcon = conf.icon;
    const currentIdx = progressSteps.indexOf(order.status);
    const isCancelled = order.status === "cancelled";

    return (
        <div className="space-y-8">
            {/* ── Order Info Card ── */}
            <div className="bg-theme-subtle border border-theme-subtle rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                            <Brush className="w-6 h-6 text-gold" />
                        </div>
                        <div>
                            <h2 className="font-bold text-theme">طلب #{order.order_number}</h2>
                            <p suppressHydrationWarning className="text-xs text-theme-faint">
                                {new Date(order.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                        </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${conf.bg} ${conf.color} font-bold`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {conf.label}
                    </span>
                </div>

                {/* Progress Bar */}
                {!isCancelled && (
                    <div className="flex items-center gap-1 mb-6">
                        {progressSteps.map((step, i) => (
                            <div key={step} className="flex-1">
                                <div className={`h-1.5 rounded-full transition-colors ${i <= currentIdx ? "bg-gold" : "bg-theme-soft"}`} />
                            </div>
                        ))}
                    </div>
                )}
                {isCancelled && (
                    <p className="text-red-400 text-xs mb-6">تم إلغاء هذا الطلب</p>
                )}

                {/* Order Details */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-theme-faint border border-theme-faint shrink-0 p-1">
                        {order.garment_image_url ? (
                            <Image src={order.garment_image_url} alt="القطعة" width={64} height={64} className="object-contain w-full h-full" />
                        ) : (
                            <Brush className="w-8 h-8 text-theme-faint m-auto mt-3" />
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-theme-strong">{order.garment_name}</p>
                        <p className="text-xs text-theme-subtle mt-1">
                            {order.size_name} · {order.color_name}
                        </p>
                        {order.style_name && order.style_name !== "—" && (
                            <p className="text-xs text-theme-faint mt-0.5">نمط: {order.style_name}</p>
                        )}
                    </div>
                </div>

                {/* Text Prompt */}
                {order.text_prompt && (
                    <div className="mt-4 p-4 bg-theme-faint border border-theme-faint rounded-xl">
                        <p className="text-xs text-theme-faint mb-1">وصف التصميم:</p>
                        <p className="text-sm text-theme-soft leading-relaxed">{order.text_prompt}</p>
                    </div>
                )}

                {/* Result Preview */}
                {order.result_mockup_url && (
                    <div className="mt-4">
                        <p className="text-xs text-theme-faint mb-2">نتيجة التصميم:</p>
                        <div className="w-32 h-32 rounded-xl overflow-hidden border border-gold/20">
                            <Image src={order.result_mockup_url} alt="نتيجة التصميم" width={128} height={128} className="object-cover w-full h-full" />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Chat Section ── */}
            <div className="bg-theme-subtle border border-theme-subtle rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-theme-subtle flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-gold" />
                    <h3 className="font-bold text-theme-strong">المحادثة مع فريق التصميم</h3>
                    <span className="text-xs text-theme-faint mr-auto">({messages.length} رسالة)</span>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {messages.length === 0 && (
                        <p className="text-center text-theme-faint text-sm py-8">لا توجد رسائل بعد. أرسل رسالتك الأولى!</p>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.is_admin_reply ? "justify-start" : "justify-end"}`}
                        >
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.is_admin_reply
                                ? "bg-gold/10 text-theme-strong rounded-tr-sm"
                                : "bg-theme-soft text-theme-soft rounded-tl-sm"
                                }`}>
                                <p className="text-[10px] text-theme-faint mb-1 font-bold">
                                    {msg.is_admin_reply ? "فريق التصميم" : "أنت"}
                                </p>
                                {msg.message}
                                <p suppressHydrationWarning className="text-[9px] text-theme-faint mt-1.5">
                                    {new Date(msg.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                {/* Send Message */}
                {!isCancelled && order.status !== "completed" && (
                    <form onSubmit={handleSend} className="p-4 border-t border-theme-subtle flex items-center gap-3">
                        <input
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            placeholder="اكتب رسالتك..."
                            className="flex-1 px-4 py-3 bg-theme-subtle border border-theme-soft rounded-xl text-sm text-theme placeholder-white/20 focus:border-gold/30 focus:outline-none transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={sending || !newMsg.trim()}
                            className="w-11 h-11 rounded-xl bg-gold flex items-center justify-center text-[#0a0a0a] shrink-0 hover:bg-gold-light transition-colors disabled:opacity-40"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>
                )}
            </div>

            {/* Back Link */}
            <div className="text-center">
                <Link href="/account/orders" className="inline-flex items-center gap-2 text-theme-faint text-sm hover:text-gold transition-colors">
                    <ArrowRight className="w-4 h-4" />
                    العودة لطلباتي
                </Link>
            </div>
        </div>
    );
}
