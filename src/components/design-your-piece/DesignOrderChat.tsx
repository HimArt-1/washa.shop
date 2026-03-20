"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getDesignOrderMessages, customerSendOrderMessage } from "@/app/actions/design-order-chat";
import type { DesignOrderMessage } from "@/types/database";
import clsx from "clsx";

export function DesignOrderChat({ orderId, trackerToken }: { orderId: string; trackerToken?: string | null }) {
    const [messages, setMessages] = useState<DesignOrderMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        scrollContainerRef.current?.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
        });
    };

    const fetchMessages = async () => {
        try {
            const data = await getDesignOrderMessages(orderId, trackerToken);
            setMessages(Array.isArray(data) ? data : []);
        } catch (fetchError) {
            console.error("Failed to fetch design order messages", fetchError);
            setMessages([]);
            setError("تعذر تحميل المحادثة الآن");
        } finally {
            setLoading(false);
        }
    };

    const safeMessages = Array.isArray(messages) ? messages : [];

    useEffect(() => {
        setMounted(true);
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [orderId, trackerToken]);

    useEffect(() => {
        if (safeMessages.length > 0) {
            scrollToBottom();
        }
    }, [safeMessages.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        const res = await customerSendOrderMessage(orderId, newMessage, trackerToken);
        if (res.success) {
            setNewMessage("");
            await fetchMessages();
        } else {
            setError(res.error || "فشل إرسال الرسالة");
            console.error("Failed to send message", res.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="rounded-3xl border border-theme-soft bg-theme-faint overflow-hidden flex flex-col h-[400px]">
            {/* Header */}
            <div className="p-4 bg-theme-subtle border-b border-theme-subtle flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                    <h3 className="text-theme font-bold text-sm">محادثة الطلب</h3>
                    <p className="text-theme-subtle text-xs">تواصل مع فريق التصميم مباشرة</p>
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                    </div>
                ) : safeMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-theme-faint space-y-2">
                        <MessageCircle className="w-8 h-8 opacity-50" />
                        <p className="text-sm">لا توجد رسائل حتى الآن</p>
                        <p className="text-xs">اكتب أي استفسار أو ملاحظة حول تصميمك</p>
                    </div>
                ) : (
                    safeMessages.map((msg) => {
                        const isUser = !msg.is_admin_reply;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className={clsx(
                                    "flex flex-col gap-1 max-w-[85%]",
                                    isUser ? "mr-auto items-end" : "ml-auto items-start"
                                )}
                            >
                                <span className="text-[10px] text-theme-subtle px-1">
                                    {isUser ? "أنت" : "وشّى"}
                                </span>
                                <div className={clsx(
                                    "p-3 rounded-2xl text-sm leading-relaxed",
                                    isUser
                                        ? "bg-gold/10 border border-gold/20 text-theme rounded-tr-sm"
                                        : "bg-white/[0.05] border border-theme-soft text-theme-strong rounded-tl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-[10px] text-theme-faint px-1">
                                    {mounted ? format(new Date(msg.created_at), "p", { locale: ar }) : ""}
                                </span>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 bg-theme-surface border-t border-theme-subtle shrink-0">
                {error && (
                    <div className="mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] text-center">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        type="text"
                        disabled={isSubmitting}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="اكتب ملاحظاتك..."
                        className="w-full bg-theme-subtle border border-theme-soft disabled:opacity-50 text-theme text-sm rounded-xl pl-14 pr-4 py-3 focus:outline-none focus:border-gold/50 focus:bg-theme-soft transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSubmitting}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-gold text-[#111] flex items-center justify-center hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 -rotate-90 rtl:rotate-90" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
