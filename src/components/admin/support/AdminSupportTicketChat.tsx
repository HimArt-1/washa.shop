"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, ArrowRight, Loader2, CheckCircle2, Clock, X, MessageSquare, ShieldAlert } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { createSupportMessage, adminUpdateSupportTicketStatus } from "@/app/actions/support-tickets";
import { SupportTicketStatus, SupportTicket, SupportMessage } from "@/types/database";
import clsx from "clsx";

type TicketWithProfile = SupportTicket & {
    profile?: { display_name: string; avatar_url: string | null; };
};

type MessageWithSender = SupportMessage & {
    sender?: { display_name: string; avatar_url: string | null; };
};

export function AdminSupportTicketChat({ ticket, initialMessages }: { ticket: TicketWithProfile, initialMessages: MessageWithSender[] }) {
    const router = useRouter();
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

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

        setIsSubmitting(true);
        setError(null);
        try {
            const res = await createSupportMessage(ticket.id, newMessage);
            if (res.success) {
                setNewMessage("");
                router.refresh();
            } else {
                setError(res.error || "فشل إرسال الرد");
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل إرسال الرد");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: SupportTicketStatus) => {
        if (ticket.status === newStatus) return;
        setIsUpdatingStatus(true);
        setError(null);
        try {
            const res = await adminUpdateSupportTicketStatus(ticket.id, newStatus);
            if (res.success) {
                router.refresh();
            } else {
                setError(res.error || "فشل تحديث حالة التذكرة");
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل تحديث حالة التذكرة");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] bg-theme-faint border border-theme-subtle rounded-3xl overflow-hidden relative shadow-xl">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-theme-subtle bg-theme-faint flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/support" className="p-2 -ml-2 hover:bg-theme-subtle rounded-full transition-colors text-theme-subtle hover:text-theme">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-lg font-bold text-theme max-w-[200px] sm:max-w-md truncate">{ticket.subject}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-theme-subtle">بواسطة:</span>
                            <span className="text-xs text-theme-strong">{ticket.profile?.display_name || "مستخدم"}</span>
                            <span className="text-theme-faint">•</span>
                            <span className="text-xs text-theme-subtle">
                                {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: ar })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-xs text-theme-subtle ml-2">الحالة:</div>
                    {[
                        { id: "open", label: "مفتوحة" },
                        { id: "in_progress", label: "جاري المعالجة" },
                        { id: "resolved", label: "تم الحل" },
                        { id: "closed", label: "مغلقة" },
                    ].map(st => (
                        <button
                            key={st.id}
                            disabled={isUpdatingStatus || ticket.status === st.id}
                            onClick={() => handleUpdateStatus(st.id as SupportTicketStatus)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${ticket.status === st.id
                                ? statusObj.bg + " " + statusObj.color + " border cursor-default"
                                : "bg-theme-subtle text-theme-subtle hover:bg-theme-soft hover:text-theme border border-transparent disabled:opacity-50"
                                }`}
                        >
                            {st.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
                {messages.map((msg, idx) => {
                    const isAdmin = msg.is_admin_reply;
                    const avatarUrl = msg.sender?.avatar_url || "/images/default-avatar.png";
                    const senderName = msg.sender?.display_name || (isAdmin ? "الإدارة" : "المستخدم");

                    return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={clsx(
                                "flex gap-3 max-w-[85%] sm:max-w-[75%]",
                                isAdmin ? "mr-auto flex-row-reverse" : "ml-auto"
                            )}
                        >
                            <div className="shrink-0 relative">
                                <Image
                                    src={avatarUrl}
                                    alt={senderName}
                                    width={36}
                                    height={36}
                                    className="rounded-full object-cover border border-theme-soft"
                                />
                                {isAdmin && (
                                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-[#111]">
                                        <ShieldAlert className="w-3 h-3 text-theme" />
                                    </div>
                                )}
                            </div>
                            <div className={clsx(
                                "flex flex-col gap-1",
                                isAdmin ? "items-end" : "items-start"
                            )}>
                                <span className={clsx("text-xs px-1 font-medium", isAdmin ? "text-blue-400" : "text-theme-subtle")}>
                                    {senderName}
                                </span>
                                <div className={clsx(
                                    "p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed",
                                    isAdmin
                                        ? "bg-blue-500/10 border border-blue-500/20 text-theme rounded-tr-sm"
                                        : "bg-theme-subtle border border-theme-soft text-theme-strong rounded-tl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-[10px] text-theme-faint px-1 mt-0.5">
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
                {error ? (
                    <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                ) : null}
                <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
                    <div className="shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.05] border border-theme-subtle">
                        <ShieldAlert className="w-5 h-5 text-theme-subtle" />
                    </div>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            disabled={isSubmitting}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="اكتب ردك كمدير دعم..."
                            className="w-full bg-theme-subtle border border-theme-soft disabled:opacity-50 text-theme text-sm rounded-2xl pl-16 pr-4 py-4 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSubmitting}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-500 text-theme flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
