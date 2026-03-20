"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    Loader2,
    Mail,
    MessageSquareMore,
    Send,
    ShieldAlert,
    Sparkles,
    User,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupportMessage, adminUpdateSupportTicketStatus } from "@/app/actions/support-tickets";
import { SupportTicketStatus, SupportTicket, SupportMessage } from "@/types/database";
import clsx from "clsx";

type TicketWithProfile = SupportTicket & {
    profile?: { display_name?: string | null; avatar_url?: string | null; role?: string | null };
};

type MessageWithSender = SupportMessage & {
    sender?: { display_name?: string | null; avatar_url?: string | null; role?: string | null };
};

function getStatusInfo(status: string) {
    switch (status) {
        case "open":
            return { label: "مفتوحة", icon: MessageSquareMore, className: "border-blue-500/20 bg-blue-500/10 text-blue-300" };
        case "in_progress":
            return { label: "قيد المعالجة", icon: Clock3, className: "border-amber-500/20 bg-amber-500/10 text-amber-300" };
        case "resolved":
            return { label: "تم الحل", icon: CheckCircle2, className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" };
        case "closed":
            return { label: "مغلقة", icon: X, className: "border-theme-subtle bg-theme-faint text-theme-subtle" };
        default:
            return { label: status, icon: MessageSquareMore, className: "border-theme-subtle bg-theme-faint text-theme-subtle" };
    }
}

function getPriorityInfo(priority: string) {
    switch (priority) {
        case "high":
            return { label: "عاجلة", className: "border-red-500/20 bg-red-500/10 text-red-300" };
        case "low":
            return { label: "منخفضة", className: "border-theme-subtle bg-theme-faint text-theme-faint" };
        default:
            return { label: "عادية", className: "border-theme-subtle bg-theme-faint text-theme-subtle" };
    }
}

function getSlaMeta(ticket: TicketWithProfile) {
    const ageHours = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
    const riskThreshold = ticket.priority === "high" ? 2 : 8;
    const breachThreshold = ticket.priority === "high" ? 6 : 24;

    if (ageHours >= breachThreshold) {
        return {
            label: "متجاوز",
            tone: "critical" as const,
            summary: `التذكرة تجاوزت SLA بعد ${Math.round(ageHours)} ساعة.`,
        };
    }

    if (ageHours >= riskThreshold) {
        return {
            label: "على حافة التجاوز",
            tone: "warning" as const,
            summary: `التذكرة تقترب من تجاوز SLA بعد ${Math.round(ageHours)} ساعة.`,
        };
    }

    return {
        label: "ضمن الهدف",
        tone: "healthy" as const,
        summary: "الإيقاع الحالي ما زال ضمن نافذة المعالجة المتوقعة.",
    };
}

function metricToneClass(tone: "critical" | "warning" | "healthy") {
    if (tone === "critical") return "border-red-500/20 bg-red-500/10 text-red-300";
    if (tone === "warning") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}

function SummaryCard({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: string;
    subtitle: string;
}) {
    return (
        <div className="theme-surface-panel rounded-[22px] p-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-theme-faint uppercase">{title}</p>
            <p className="mt-3 text-xl font-black text-theme sm:text-2xl">{value}</p>
            <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
        </div>
    );
}

export function SupportCaseWorkspace({
    ticket,
    initialMessages,
}: {
    ticket: TicketWithProfile;
    initialMessages: MessageWithSender[];
}) {
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, startSending] = useTransition();
    const [isUpdatingStatus, startUpdatingStatus] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const messages = initialMessages;

    const statusInfo = getStatusInfo(ticket.status);
    const priorityInfo = getPriorityInfo(ticket.priority);
    const slaInfo = getSlaMeta(ticket);
    const customerName = ticket.profile?.display_name || ticket.name || "عميل";
    const customerAvatar = ticket.profile?.avatar_url || null;
    const lastAdminReply = [...messages].reverse().find((message) => message.is_admin_reply);
    const lastCustomerReply = [...messages].reverse().find((message) => !message.is_admin_reply);
    const messageCount = messages.length;
    const ageLabel = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ar });
    const lastUpdateLabel = formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ar });

    const timeline = useMemo(
        () => [
            {
                id: "opened",
                title: "تم فتح التذكرة",
                subtitle: format(new Date(ticket.created_at), "dd MMM yyyy - p", { locale: ar }),
            },
            ticket.message
                ? {
                      id: "initial-message",
                      title: "الرسالة الأساسية",
                      subtitle: ticket.message,
                  }
                : null,
            lastCustomerReply
                ? {
                      id: "last-customer",
                      title: "آخر رد من العميل",
                      subtitle: formatDistanceToNow(new Date(lastCustomerReply.created_at), {
                          addSuffix: true,
                          locale: ar,
                      }),
                  }
                : null,
            lastAdminReply
                ? {
                      id: "last-admin",
                      title: "آخر رد من الدعم",
                      subtitle: formatDistanceToNow(new Date(lastAdminReply.created_at), {
                          addSuffix: true,
                          locale: ar,
                      }),
                  }
                : null,
            {
                id: "updated",
                title: "آخر تحديث",
                subtitle: format(new Date(ticket.updated_at), "dd MMM yyyy - p", { locale: ar }),
            },
        ].filter(Boolean) as Array<{ id: string; title: string; subtitle: string }>,
        [lastAdminReply, lastCustomerReply, ticket.created_at, ticket.message, ticket.updated_at]
    );

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        const content = newMessage.trim();
        if (!content) return;

        setError(null);
        startSending(async () => {
            try {
                const result = await createSupportMessage(ticket.id, content);
                if (!result.success) {
                    setError(result.error || "تعذر إرسال الرد.");
                    return;
                }

                setNewMessage("");
                router.refresh();
            } catch (error) {
                setError(error instanceof Error ? error.message : "تعذر إرسال الرد.");
            }
        });
    };

    const handleUpdateStatus = (nextStatus: SupportTicketStatus) => {
        if (ticket.status === nextStatus) return;

        setError(null);
        startUpdatingStatus(async () => {
            try {
                const result = await adminUpdateSupportTicketStatus(ticket.id, nextStatus);
                if (!result.success) {
                    setError(result.error || "تعذر تحديث حالة التذكرة.");
                    return;
                }

                router.refresh();
            } catch (error) {
                setError(error instanceof Error ? error.message : "تعذر تحديث حالة التذكرة.");
            }
        });
    };

    return (
        <div className="space-y-6">
            <section className="theme-surface-panel relative overflow-hidden rounded-[28px] p-5 sm:p-6 md:p-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.10),transparent_28%)]" />
                <div className="relative space-y-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs font-semibold text-theme-soft">
                                    Support Case Workspace
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                                    {statusInfo.label}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityInfo.className}`}>
                                    {priorityInfo.label}
                                </span>
                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${metricToneClass(slaInfo.tone)}`}>
                                    SLA: {slaInfo.label}
                                </span>
                            </div>

                            <h2 className="mt-4 text-2xl font-black text-theme md:text-3xl">{ticket.subject}</h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذه المساحة تجمع سياق التذكرة، جودة الخدمة، وخط الرد من شاشة واحدة حتى يقرر الفريق بسرعة:
                                هل نرد، نرفع الحالة، أم نغلق الملف.
                            </p>
                        </div>

                        <div className="flex flex-col items-stretch gap-3 xl:min-w-[300px]">
                            <Link
                                href="/dashboard/support"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-semibold text-theme-soft transition-colors hover:border-gold/20 hover:text-gold"
                            >
                                <ArrowRight className="h-4 w-4" />
                                العودة إلى مركز الدعم
                            </Link>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-[11px] font-semibold tracking-[0.18em] text-theme-faint uppercase">قرار سريع</p>
                                <p className="mt-3 text-sm leading-6 text-theme-subtle">{slaInfo.summary}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard title="عمر التذكرة" value={ageLabel} subtitle="منذ فتح هذه الحالة حتى الآن." />
                        <SummaryCard title="آخر تحديث" value={lastUpdateLabel} subtitle="آخر نشاط على التذكرة بغض النظر عن الطرف." />
                        <SummaryCard title="عدد الرسائل" value={String(messageCount)} subtitle="يشمل الرسالة الافتتاحية والردود اللاحقة." />
                        <SummaryCard
                            title="آخر رد من الدعم"
                            value={
                                lastAdminReply
                                    ? formatDistanceToNow(new Date(lastAdminReply.created_at), { addSuffix: true, locale: ar })
                                    : "لا يوجد"
                            }
                            subtitle="مؤشر مباشر على وتيرة استجابة الفريق."
                        />
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.78fr,1.22fr]">
                <aside className="space-y-6">
                    <section className="theme-surface-panel rounded-[24px] p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint">
                                {customerAvatar ? (
                                    <Image src={customerAvatar} alt={customerName} width={48} height={48} className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-5 w-5 text-theme-subtle" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-theme">{customerName}</p>
                                <p className="mt-1 text-xs text-theme-subtle">#{ticket.id.slice(0, 8)}</p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3 text-sm">
                            {ticket.email ? (
                                <div className="flex items-center gap-2 text-theme-subtle">
                                    <Mail className="h-4 w-4 text-theme-faint" />
                                    <span>{ticket.email}</span>
                                </div>
                            ) : null}
                            <div className="flex items-center gap-2 text-theme-subtle">
                                <Clock3 className="h-4 w-4 text-theme-faint" />
                                <span>فُتحت {format(new Date(ticket.created_at), "dd MMM yyyy - p", { locale: ar })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-theme-subtle">
                                <Sparkles className="h-4 w-4 text-theme-faint" />
                                <span>آخر تحديث {format(new Date(ticket.updated_at), "dd MMM yyyy - p", { locale: ar })}</span>
                            </div>
                        </div>

                        {ticket.message ? (
                            <div className="mt-5 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">الرسالة الأساسية</p>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-theme-subtle">{ticket.message}</p>
                            </div>
                        ) : null}
                    </section>

                    <section className="theme-surface-panel rounded-[24px] p-4 sm:p-5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">سكة الإجراءات</p>
                        <div className="mt-4 grid gap-2">
                            {[
                                { id: "open", label: "إرجاعها كمفتوحة" },
                                { id: "in_progress", label: "وضعها قيد المعالجة" },
                                { id: "resolved", label: "تعليمها كمحلولة" },
                                { id: "closed", label: "إغلاق الملف" },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    disabled={isUpdatingStatus || ticket.status === item.id}
                                    onClick={() => handleUpdateStatus(item.id as SupportTicketStatus)}
                                    className={`rounded-2xl border px-4 py-3 text-right text-sm font-semibold transition-colors ${
                                        ticket.status === item.id
                                            ? `${statusInfo.className} cursor-default`
                                            : "border-theme-subtle bg-theme-faint text-theme-soft hover:border-gold/20 hover:text-gold"
                                    } disabled:opacity-60`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="theme-surface-panel rounded-[24px] p-4 sm:p-5">
                        <p className="text-xs font-semibold tracking-[0.18em] text-theme-faint uppercase">الخط الزمني</p>
                        <div className="mt-4 space-y-4">
                            {timeline.map((item) => (
                                <div key={item.id} className="relative pl-5">
                                    <span className="absolute top-1 left-0 h-2.5 w-2.5 rounded-full bg-gold" />
                                    <p className="text-sm font-bold text-theme">{item.title}</p>
                                    <p className="mt-1 text-sm leading-6 text-theme-subtle">{item.subtitle}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>

                <section className="theme-surface-panel rounded-[24px]">
                    <div className="border-b border-theme-subtle px-4 py-4 sm:px-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-lg font-bold text-theme">محادثة الدعم</p>
                                <p className="mt-1 text-sm text-theme-subtle">الردود المتبادلة بين الفريق والعميل مع سياق التذكرة.</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${metricToneClass(slaInfo.tone)}`}>
                                {slaInfo.label}
                            </span>
                        </div>
                    </div>

                    <div className="max-h-[620px] space-y-5 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                        {messages.map((message, index) => {
                            const isAdmin = message.is_admin_reply;
                            const senderName = message.sender?.display_name || (isAdmin ? "الإدارة" : "العميل");
                            const senderAvatar = message.sender?.avatar_url || customerAvatar || "/images/default-avatar.png";

                            return (
                                <motion.div
                                    key={message.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.03, 0.18) }}
                                    className={clsx("flex gap-3", isAdmin ? "mr-auto max-w-[94%] flex-row-reverse sm:max-w-[88%]" : "ml-auto max-w-[94%] sm:max-w-[88%]")}
                                >
                                    <div className="relative shrink-0">
                                        <Image
                                            src={senderAvatar}
                                            alt={senderName}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 rounded-full border border-theme-subtle object-cover"
                                        />
                                        {isAdmin ? (
                                            <div className="absolute -right-1 -bottom-1 rounded-full border-2 border-[var(--wusha-bg)] bg-blue-500 p-0.5">
                                                <ShieldAlert className="h-3 w-3 text-white" />
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className={clsx("flex flex-col gap-1", isAdmin ? "items-end" : "items-start")}>
                                        <span className={clsx("px-1 text-xs font-medium", isAdmin ? "text-blue-300" : "text-theme-subtle")}>
                                            {senderName}
                                        </span>
                                        <div
                                            className={clsx(
                                                "rounded-2xl border px-4 py-3 text-sm leading-7",
                                                isAdmin
                                                    ? "rounded-tr-sm border-blue-500/20 bg-blue-500/10 text-theme"
                                                    : "rounded-tl-sm border-theme-subtle bg-theme-faint text-theme-subtle"
                                            )}
                                        >
                                            <p className="whitespace-pre-wrap">{message.message}</p>
                                        </div>
                                        <span className="px-1 text-[10px] text-theme-faint">
                                            {format(new Date(message.created_at), "dd MMM yyyy - p", { locale: ar })}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-theme-subtle px-4 py-4 sm:px-5 sm:py-5">
                        {error ? (
                            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <textarea
                                value={newMessage}
                                onChange={(event) => setNewMessage(event.target.value)}
                                rows={4}
                                placeholder="اكتب رد الفريق على هذه التذكرة..."
                                className="input-dark w-full rounded-2xl px-4 py-3 text-sm"
                            />

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-theme-faint">
                                    إذا كان الرد الإداري هو أول تفاعل من الفريق فستتحول التذكرة تلقائيًا إلى قيد المعالجة.
                                </p>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-3 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-500/15 disabled:opacity-50 sm:w-auto"
                                >
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -rotate-90 rtl:rotate-90" />}
                                    {isSending ? "جارٍ إرسال الرد..." : "إرسال الرد"}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
}
