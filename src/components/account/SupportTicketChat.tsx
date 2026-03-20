"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, ArrowRight, Loader2, CheckCircle2, Clock, X, MessageSquare } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { createSupportMessage } from "@/app/actions/support-tickets";
import clsx from "clsx";

export function SupportTicketChat({ ticket, initialMessages }: { ticket: any, initialMessages: any[] }) {
    const router = useRouter();
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case "open": return { label: "مفتوحة", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" };
            case "in_progress": return { label: "جاري المعالجة", icon: Clock, color: "text-gold", bg: "bg-gold/10 border-gold/20" };
            case "resolved": return { label: "تم الحل", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" };
            case "closed": return { label: "مغلقة", icon: X, color: "text-theme-subtle", bg: "bg-theme-subtle border-theme-soft" };
            default: return { label: status, icon: MessageSquare, color: "text-theme-soft", bg: "bg-theme-subtle border-theme-soft" };
        }
    };

    const statusObj = getStatusInfo(ticket.status);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSubmitting) return;

        const messageText = newMessage.trim();
        setErrorMsg("");
        setIsSubmitting(true);

        try {
            const res = await createSupportMessage(ticket.id, messageText);
            if (!res.success) {
                setErrorMsg(res.error || "تعذر إرسال الرسالة.");
                return;
            }

            setMessages((current) => [
                ...current,
                {
                    id: `temp-${Date.now()}`,
                    message: messageText,
                    created_at: new Date().toISOString(),
                    is_admin_reply: false,
                    sender: null,
                },
            ]);
            setNewMessage("");
            router.refresh();
        } catch (error) {
            console.error("Failed to send message", error);
            setErrorMsg(error instanceof Error ? error.message : "تعذر إرسال الرسالة.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isClosed = ticket.status === "closed" || ticket.status === "resolved";

    return (
        <div className="relative flex min-h-[540px] h-[calc(100dvh-9.5rem)] flex-col overflow-hidden rounded-3xl border border-theme-subtle bg-theme-faint sm:h-[calc(100vh-12rem)]">
            {/* Header */}
            <div className="z-10 border-b border-theme-subtle bg-theme-faint p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/account/support" className="p-2 -ml-2 hover:bg-theme-subtle rounded-full transition-colors text-theme-subtle hover:text-theme">
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <div className="min-w-0">
                            <h2 className="max-w-[210px] text-lg font-bold text-theme line-clamp-2 sm:max-w-md sm:line-clamp-1">{ticket.subject}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${statusObj.bg} ${statusObj.color}`}>
                                    <statusObj.icon className="w-2.5 h-2.5" />
                                    <span>{statusObj.label}</span>
                                </div>
                                <span className="text-xs text-theme-subtle">
                                    {format(new Date(ticket.created_at), "dd MMM yyyy, p", { locale: ar })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="scrollbar-hide flex-1 overflow-y-auto space-y-6 p-4 sm:p-6">
                {messages.map((msg, idx) => {
                    const isUser = !msg.is_admin_reply;
                    const avatarUrl = msg.sender?.avatar_url || "/images/default-avatar.png";
                    const senderName = msg.sender?.display_name || "المستخدم";

                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={clsx(
                                "flex max-w-[96%] gap-3 sm:max-w-[75%]",
                                isUser ? "mr-auto flex-row-reverse" : "ml-auto"
                            )}
                        >
                            <div className="shrink-0">
                                <Image
                                    src={avatarUrl}
                                    alt={senderName}
                                    width={36}
                                    height={36}
                                    className="rounded-full object-cover border border-theme-soft"
                                />
                            </div>
                            <div className={clsx(
                                    "flex min-w-0 flex-col gap-1",
                                    isUser ? "items-end" : "items-start"
                                )}>
                                <span className="text-xs text-theme-subtle px-1">
                                    {isUser ? "أنت" : "دعم وشّى"}
                                </span>
                                <div className={clsx(
                                    "p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed",
                                    isUser
                                        ? "bg-gold/10 border border-gold/20 text-theme rounded-tr-sm"
                                        : "bg-theme-subtle border border-theme-soft text-theme-strong rounded-tl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-[10px] text-theme-faint px-1">
                                    {format(new Date(msg.created_at), "p", { locale: ar })}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 sm:p-6 border-t border-theme-subtle bg-theme-surface">
                {errorMsg && (
                    <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {errorMsg}
                    </div>
                )}
                {isClosed ? (
                    <div className="text-center p-4 bg-theme-faint rounded-xl border border-theme-subtle">
                        <p className="text-theme-subtle text-sm">هذه التذكرة مغلقة ولا يمكن الرد عليها.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="relative">
                        <input
                            type="text"
                            disabled={isSubmitting}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="اكتب ردك هنا..."
                            className="w-full rounded-2xl border border-theme-soft bg-theme-subtle py-4 pl-16 pr-4 text-sm text-theme transition-all focus:border-gold/50 focus:bg-theme-soft focus:outline-none disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSubmitting}
                            className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-gold text-[#111] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4 -rotate-90 rtl:rotate-90" />
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
