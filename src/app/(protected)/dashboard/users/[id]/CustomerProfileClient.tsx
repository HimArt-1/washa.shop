"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { ElementType } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
    BadgeCheck,
    Calendar,
    Clock3,
    ExternalLink,
    FileText,
    Globe,
    Mail,
    MailWarning,
    MessageSquare,
    Package,
    Phone,
    ShieldAlert,
    ShoppingCart,
    Sparkles,
    Ticket,
    User,
    UserCog,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";

function getRoleMeta(role: string) {
    switch (role) {
        case "admin":
            return {
                label: "مدير النظام",
                className: "border-red-500/20 bg-red-500/10 text-red-300",
            };
        case "wushsha":
            return {
                label: "وشّاي",
                className: "border-violet-500/20 bg-violet-500/10 text-violet-300",
            };
        case "subscriber":
            return {
                label: "مشترك",
                className: "border-blue-500/20 bg-blue-500/10 text-blue-300",
            };
        default:
            return {
                label: role,
                className: "border-theme-subtle bg-theme-faint text-theme-subtle",
            };
    }
}

function getTicketStatusMeta(status: string) {
    switch (status) {
        case "open":
            return "text-blue-300";
        case "in_progress":
            return "text-amber-300";
        case "resolved":
            return "text-emerald-300";
        default:
            return "text-theme-subtle";
    }
}

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

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
    icon: ElementType;
    accent: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} p-4 sm:p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-xl font-black text-theme sm:text-2xl">{value}</p>
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

interface Props {
    profile: any;
    orders: any[];
    tickets: any[];
    application: any | null;
    identity: {
        isTempProfile: boolean;
        hasContactInfo: boolean;
        hasLinkedApplication: boolean;
    };
    stats: {
        totalOrders: number;
        totalSpent: number;
        paidOrders: number;
        activeOrders: number;
        openTickets: number;
    };
}

export function CustomerProfileClient({
    profile,
    orders,
    tickets,
    application,
    identity,
    stats,
}: Props) {
    const role = getRoleMeta(String(profile.role || "subscriber"));
    const avatarUrl = profile.avatar_url ? String(profile.avatar_url) : null;
    const joinDate = profile.created_at
        ? new Date(String(profile.created_at)).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "—";

    const missionTone =
        identity.isTempProfile || !identity.hasContactInfo
            ? "critical"
            : !identity.hasLinkedApplication
              ? "warning"
              : "calm";

    const missionToneClass =
        missionTone === "critical"
            ? "border-red-500/20 bg-red-500/10 text-red-200"
            : missionTone === "warning"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";

    return (
        <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-5 sm:p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-200 uppercase">
                                Identity Case Workspace
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical" ? "ملف يحتاج تدخلًا" : missionTone === "warning" ? "هوية تحتاج مراجعة" : "هوية مستقرة"}
                            </span>
                        </div>

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-theme-subtle bg-theme-faint">
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt="" width={96} height={96} className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10 text-theme-faint" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-2xl font-black leading-tight text-theme sm:text-3xl md:text-4xl">
                                        {String(profile.display_name || "مستخدم")}
                                    </h2>
                                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${role.className}`}>
                                        {role.label}
                                    </span>
                                    {profile.is_verified ? (
                                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                            موثّق
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-2 text-sm text-theme-subtle">
                                    @{String(profile.username || "—")} · انضم {joinDate}
                                </p>

                                {profile.bio ? (
                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-theme-subtle">
                                        {String(profile.bio)}
                                    </p>
                                ) : (
                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-theme-faint">
                                        لا توجد نبذة مكتوبة لهذا المستخدم حتى الآن.
                                    </p>
                                )}

                                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-theme-subtle">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {joinDate}
                                    </span>
                                    {profile.wushsha_level ? (
                                        <span className="inline-flex items-center gap-1.5 text-violet-300">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            مستوى وشّى {String(profile.wushsha_level)}
                                        </span>
                                    ) : null}
                                    {profile.website ? (
                                        <a
                                            href={String(profile.website)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-gold hover:text-gold-light"
                                        >
                                            <Globe className="h-3.5 w-3.5" />
                                            {String(profile.website).replace(/https?:\/\//, "")}
                                        </a>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">حالة Clerk</p>
                                <p className="mt-3 text-2xl font-black text-theme">
                                    {identity.isTempProfile ? "مؤقت" : "مربوط"}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">
                                    {String(profile.clerk_id || "—")}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">بيانات التواصل</p>
                                <p className="mt-3 text-2xl font-black text-theme">
                                    {identity.hasContactInfo ? "مكتملة" : "ناقصة"}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">
                                    {profile.email && profile.phone ? "البريد والهاتف متوفران" : "ينقص البريد أو الهاتف أو كلاهما"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">أصل الهوية</p>
                                <p className="mt-3 text-2xl font-black text-theme">
                                    {application ? "من طلب انضمام" : "مستخدم مباشر"}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">
                                    {application ? `آخر تحديث ${formatDistanceToNow(new Date(application.updated_at || application.created_at), { addSuffix: true, locale: ar })}` : "لا يوجد طلب انضمام مرتبط بهذا الملف"}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.aside
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${subtlePanelClass} p-5 sm:p-6`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-theme-subtle bg-theme-faint">
                            <ShieldAlert className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Mission Pulse</p>
                            <h3 className="mt-1 text-lg font-bold text-theme">ما الذي يحتاج قرارًا الآن؟</h3>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-red-200">
                                <UserCog className="h-4 w-4" />
                                <span className="text-sm font-bold">سلامة الهوية</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {identity.isTempProfile
                                    ? "الملف ما زال يحمل clerk_id مؤقتًا ويحتاج إكمال الربط."
                                    : "ربط Clerk مستقر داخل هذا الملف."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-amber-200">
                                <MailWarning className="h-4 w-4" />
                                <span className="text-sm font-bold">جودة البيانات</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {identity.hasContactInfo
                                    ? "بيانات التواصل مكتملة."
                                    : "الملف يحتاج استكمال البريد أو الهاتف قبل الاعتماد التشغيلي الكامل."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-emerald-200">
                                <BadgeCheck className="h-4 w-4" />
                                <span className="text-sm font-bold">مسار المراجعة</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {application
                                    ? `هذا الملف مرتبط بطلب انضمام حالته الحالية: ${application.status}.`
                                    : "لا يوجد طلب انضمام مرتبط، والمسار بدأ مباشرة من إنشاء المستخدم."}
                            </p>
                            {application ? (
                                <Link
                                    href={`/dashboard/applications/${application.id}`}
                                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-gold-light"
                                >
                                    فتح طلب الانضمام
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="Orders"
                    value={String(stats.totalOrders)}
                    subtitle="إجمالي الطلبات المرتبطة بهذا المستخدم."
                    icon={ShoppingCart}
                    accent="#60a5fa"
                />
                <SummaryCard
                    title="Active Orders"
                    value={String(stats.activeOrders)}
                    subtitle="طلبات ما زالت في دورة التنفيذ أو الشحن."
                    icon={Clock3}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="Paid Orders"
                    value={String(stats.paidOrders)}
                    subtitle="عدد الطلبات المدفوعة بنجاح."
                    icon={BadgeCheck}
                    accent="#34d399"
                />
                <SummaryCard
                    title="Revenue"
                    value={`${stats.totalSpent.toLocaleString()} ر.س`}
                    subtitle="إجمالي ما أنفقه هذا المستخدم على المنصة."
                    icon={Sparkles}
                    accent="#d4af37"
                />
                <SummaryCard
                    title="Open Tickets"
                    value={String(stats.openTickets)}
                    subtitle="تذاكر دعم مفتوحة أو قيد المعالجة الآن."
                    icon={Ticket}
                    accent="#c084fc"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
                <section className="space-y-5">
                    <div className={`${panelClass} p-4 sm:p-5`}>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Identity Rail</p>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                <p className="text-xs text-theme-faint">البريد الإلكتروني</p>
                                <p className="mt-2 text-sm font-semibold text-theme">{profile.email || "غير متوفر"}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                <p className="text-xs text-theme-faint">رقم الهاتف</p>
                                <p className="mt-2 text-sm font-semibold text-theme">{profile.phone || "غير متوفر"}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                <p className="text-xs text-theme-faint">Clerk ID</p>
                                <p className="mt-2 break-all font-mono text-xs text-theme">{profile.clerk_id || "—"}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                <p className="text-xs text-theme-faint">معرّف الملف</p>
                                <p className="mt-2 break-all font-mono text-xs text-theme">{profile.id || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {application ? (
                        <div className={`${panelClass} p-4 sm:p-5`}>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Application Context</p>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-bold text-theme">طلب الانضمام المرتبط</p>
                                        <StatusBadge status={application.status} type="application" />
                                    </div>
                                    <p className="mt-3 text-sm leading-7 text-theme-subtle">
                                        {application.motivation || "لا توجد رسالة دافع محفوظة مع الطلب."}
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <a
                                        href={application.portfolio_url || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4 text-sm text-theme transition-colors ${application.portfolio_url ? "hover:border-gold/30" : "pointer-events-none opacity-50"}`}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-gold" />
                                            معرض الأعمال
                                        </span>
                                    </a>
                                    <a
                                        href={application.instagram_url || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`rounded-2xl border border-theme-subtle bg-[color:var(--surface-elevated)] p-4 text-sm text-theme transition-colors ${application.instagram_url ? "hover:border-gold/30" : "pointer-events-none opacity-50"}`}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-accent" />
                                            انستقرام
                                        </span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="space-y-5">
                    <div className={`${panelClass} overflow-hidden`}>
                        <div className="flex items-center justify-between border-b border-theme-subtle px-4 py-4 sm:px-5">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Commerce Rail</p>
                                <h3 className="mt-2 text-xl font-bold text-theme">سجل الطلبات</h3>
                            </div>
                            <span className="text-xs font-bold text-theme-faint">{orders.length} طلب</span>
                        </div>

                        {orders.length > 0 ? (
                            <div className="divide-y divide-theme-faint">
                                {orders.map((order) => (
                                    <div key={order.id} className="px-4 py-4 transition-colors hover:bg-theme-faint sm:px-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-mono text-xs font-bold text-gold">#{order.order_number}</p>
                                                <p className="mt-2 text-sm font-bold text-theme">
                                                    {Number(order.total).toLocaleString()} ر.س
                                                </p>
                                                <p className="mt-1 text-xs text-theme-subtle">
                                                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ar })}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <StatusBadge status={order.status} type="order" />
                                                <span className={`text-xs font-bold ${order.payment_status === "paid" ? "text-emerald-300" : order.payment_status === "failed" ? "text-red-300" : "text-amber-300"}`}>
                                                    {order.payment_status === "paid" ? "مدفوع" : order.payment_status === "failed" ? "فشل الدفع" : "بانتظار الدفع"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 text-xs text-theme-faint">
                                            {order.order_items?.length || 0} عنصر
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-5 py-14 text-center text-theme-subtle">
                                <Package className="mx-auto mb-3 h-8 w-8 text-theme-faint" />
                                لا توجد طلبات مرتبطة بهذا المستخدم.
                            </div>
                        )}
                    </div>

                    <div className={`${panelClass} overflow-hidden`}>
                        <div className="flex items-center justify-between border-b border-theme-subtle px-4 py-4 sm:px-5">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Support Rail</p>
                                <h3 className="mt-2 text-xl font-bold text-theme">تذاكر الدعم</h3>
                            </div>
                            <span className="text-xs font-bold text-theme-faint">{tickets.length} تذكرة</span>
                        </div>

                        {tickets.length > 0 ? (
                            <div className="divide-y divide-theme-faint">
                                {tickets.map((ticket) => (
                                    <Link
                                        key={ticket.id}
                                        href={`/dashboard/support/${ticket.id}`}
                                        className="block px-4 py-4 transition-colors hover:bg-theme-faint sm:px-5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-theme">{ticket.subject}</p>
                                                <p className="mt-1 text-xs text-theme-faint">
                                                    {formatDistanceToNow(new Date(ticket.updated_at || ticket.created_at), { addSuffix: true, locale: ar })}
                                                </p>
                                            </div>
                                            <span className={`text-xs font-bold ${getTicketStatusMeta(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="px-5 py-14 text-center text-theme-subtle">
                                <MessageSquare className="mx-auto mb-3 h-8 w-8 text-theme-faint" />
                                لا توجد تذاكر دعم لهذا المستخدم.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <Link
                    href="/dashboard/users"
                    className={`${subtlePanelClass} flex items-center gap-3 p-4 text-sm font-bold text-theme transition-colors hover:border-gold/30`}
                >
                    <User className="h-4 w-4 text-gold" />
                    العودة إلى مركز الهوية
                </Link>
                <Link
                    href="/dashboard/users-clerk"
                    className={`${subtlePanelClass} flex items-center gap-3 p-4 text-sm font-bold text-theme transition-colors hover:border-gold/30`}
                >
                    <UserCog className="h-4 w-4 text-gold" />
                    فتح مستخدمي Clerk
                </Link>
                {application ? (
                    <Link
                        href={`/dashboard/applications/${application.id}`}
                        className={`${subtlePanelClass} flex items-center gap-3 p-4 text-sm font-bold text-theme transition-colors hover:border-gold/30`}
                    >
                        <Mail className="h-4 w-4 text-gold" />
                        فتح طلب الانضمام
                    </Link>
                ) : (
                    <div className={`${subtlePanelClass} flex items-center gap-3 p-4 text-sm font-bold text-theme-faint`}>
                        <MailWarning className="h-4 w-4" />
                        لا يوجد طلب انضمام مرتبط
                    </div>
                )}
            </div>
        </div>
    );
}
