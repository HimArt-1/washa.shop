"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, MessageCircle, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getDesignOrderMessages, adminSendOrderMessage } from "@/app/actions/design-order-chat";
import type { DesignOrderMessage } from "@/types/database";
import clsx from "clsx";

export function DesignOrderAdminChat({ orderId }: { orderId: string }) {
    const [messages, setMessages] = useState<DesignOrderMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        const data = await getDesignOrderMessages(orderId);
        setMessages(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [orderId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const res = await adminSendOrderMessage(orderId, newMessage);
        if (res.success) {
            setNewMessage("");
            await fetchMessages();
        } else {
            console.error("Failed to send admin message", res.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-4 bg-white/[0.03] border-b border-white/[0.05] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm">محادثة العميل</h3>
                        <p className="text-white/40 text-xs">تواصل مع صاحب الطلب مباشرة</p>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white/30 space-y-2">
                        <MessageCircle className="w-8 h-8 opacity-50" />
                        <p className="text-sm">لا توجد رسائل حتى الآن</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isAdmin = msg.is_admin_reply;

                        return (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className={clsx(
                                    "flex flex-col gap-1 max-w-[85%]",
                                    isAdmin ? "mr-auto items-end" : "ml-auto items-start"
                                )}
                            >
                                <span className={clsx("text-[10px] px-1", isAdmin ? "text-blue-400" : "text-white/40")}>
                                    {isAdmin ? "الإدارة" : "العميل"}
                                </span>
                                <div className={clsx(
                                    "p-3 rounded-2xl text-sm leading-relaxed",
                                    isAdmin
                                        ? "bg-blue-500/10 border border-blue-500/20 text-white rounded-tr-sm"
                                        : "bg-white/[0.05] border border-white/10 text-white/90 rounded-tl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-[10px] text-white/30 px-1">
                                    {format(new Date(msg.created_at), "p", { locale: ar })}
                                </span>
                            </motion.div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#111] border-t border-white/[0.05] shrink-0">
                <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                    <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.05]">
                        <ShieldAlert className="w-4 h-4 text-white/50" />
                    </div>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            disabled={isSubmitting}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="اكتب ردك كمدير..."
                            className="w-full bg-white/[0.04] border border-white/[0.08] disabled:opacity-50 text-white text-sm rounded-xl pl-14 pr-4 py-3 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSubmitting}
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 -rotate-90 rtl:rotate-90" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
