"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
    AlertTriangle,
    Clock3,
    FolderClock,
    Palette,
    Send,
    Sparkles,
    TrendingUp,
    UserCircle2,
    Users,
    WandSparkles,
} from "lucide-react";
import type { ComponentType } from "react";
import { DesignOrdersClient } from "@/components/admin/DesignOrdersClient";
import type { CustomDesignOrder } from "@/types/database";

type AdminProfile = {
    id: string;
    display_name: string;
    avatar_url: string | null;
};

interface DesignOperationsCenterProps {
    snapshot: {
        stats: {
            total: number;
            new: number;
            in_progress: number;
            awaiting_review: number;
            modification_requested: number;
            completed: number;
            cancelled: number;
            createdToday: number;
            unassignedActive: number;
            readyToSend: number;
            revenue: number;
            avgActiveHours: number;
            avgCompletionHours: number;
            activeLoad: number;
        };
        intakeQueue: CustomDesignOrder[];
        reviewQueue: CustomDesignOrder[];
        assignmentBacklog: CustomDesignOrder[];
        recentlyCompleted: CustomDesignOrder[];
    };
    clientProps: {
        orders: CustomDesignOrder[];
        count: number;
        totalPages: number;
        currentPage: number;
        currentStatus: string;
        currentMethod: "studio" | "from_text" | "from_image" | "all";
        promptTemplate: string;
        stats: {
            new: number;
            in_progress: number;
            awaiting_review: number;
            modification_requested: number;
            completed: number;
            cancelled: number;
            revenue: number;
        };
        adminList: AdminProfile[];
    };
}

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

function formatCurrency(value: number) {
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatHours(value: number) {
    if (!value) return "—";
    if (value < 24) return `${value}س`;

    const days = Math.round((value / 24) * 10) / 10;
    return `${days}ي`;
}

function getStatusMeta(status: CustomDesignOrder["status"]) {
    switch (status) {
        case "new":
            return { label: "جديد", className: "border-blue-500/20 bg-blue-500/10 text-blue-300" };
        case "in_progress":
            return { label: "قيد التنفيذ", className: "border-amber-500/20 bg-amber-500/10 text-amber-300" };
        case "awaiting_review":
            return { label: "بانتظار المراجعة", className: "border-violet-500/20 bg-violet-500/10 text-violet-300" };
        case "modification_requested":
            return { label: "طلب تعديل", className: "border-red-500/20 bg-red-500/10 text-red-300" };
        case "completed":
            return { label: "مكتمل", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" };
        case "cancelled":
            return { label: "ملغي", className: "border-theme-subtle bg-theme-faint text-theme-subtle" };
        default:
            return { label: status, className: "border-theme-subtle bg-theme-faint text-theme-subtle" };
    }
}

function getMethodLabel(method: CustomDesignOrder["design_method"]) {
    switch (method) {
        case "from_text":
            return "من وصف";
        case "from_image":
            return "من صورة";
        case "studio":
            return "من الاستوديو";
        default:
            return method;
    }
}

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
    icon: ComponentType<{ className?: string }>;
    accent: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-2xl font-black text-theme">{value}</p>
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

function QueueLane({
    title,
    subtitle,
    emptyState,
    items,
    tone,
    getAdminName,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: CustomDesignOrder[];
    tone: "critical" | "warning" | "calm";
    getAdminName: (id: string | null) => string | null;
}) {
    const toneClass =
        tone === "critical"
            ? "border-red-500/20 bg-red-500/[0.04]"
            : tone === "warning"
              ? "border-amber-500/20 bg-amber-500/[0.04]"
              : "border-emerald-500/20 bg-emerald-500/[0.04]";

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} h-full p-5`}
        >
            <div className="mb-5">
                <h3 className="text-lg font-bold text-theme">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items.map((order) => {
                        const statusMeta = getStatusMeta(order.status);
                        const assignedAdmin = getAdminName(order.assigned_to);

                        return (
                            <Link key={order.id} href={`/dashboard/design-orders/${order.id}`}>
                                <div className={`rounded-2xl border p-4 transition-all hover:border-gold/30 ${toneClass}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs font-bold text-gold">#{order.order_number}</p>
                                            <p className="mt-2 truncate text-sm font-bold text-theme">{order.customer_name || "عميل بدون اسم"}</p>
                                            <p className="mt-1 text-xs text-theme-subtle">
                                                {order.garment_name} · {order.color_name} · {order.size_name}
                                            </p>
                                        </div>
                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusMeta.className}`}>
                                            {statusMeta.label}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-theme-subtle">
                                        <span>{getMethodLabel(order.design_method)}</span>
                                        <span className="text-theme-faint">•</span>
                                        <span>{formatDistanceToNow(new Date(order.updated_at), { addSuffix: true, locale: ar })}</span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-theme-faint">
                                        <span>{assignedAdmin ? `المسؤول: ${assignedAdmin}` : "غير معيّن"}</span>
                                        <span>{order.final_price ? formatCurrency(order.final_price) : "سعر غير محدد"}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

export function DesignOperationsCenter({ snapshot, clientProps }: DesignOperationsCenterProps) {
    const getAdminName = (id: string | null) => {
        if (!id) return null;
        return clientProps.adminList.find((admin) => admin.id === id)?.display_name ?? null;
    };

    const missionTone =
        snapshot.stats.modification_requested > 0
            ? "critical"
            : snapshot.stats.awaiting_review > 0 || snapshot.stats.unassignedActive > 0
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
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-violet-200 uppercase">
                                Design Operations Center
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical" ? "ضغط تعديلات حرج" : missionTone === "warning" ? "مراجعة وتعيين مطلوب" : "تدفق التصميم مستقر"}
                            </span>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h2 className="text-3xl font-black leading-tight text-theme md:text-4xl">
                                غرفة تشغيل التصميم لمراقبة الوارد، التنفيذ، المراجعة، والتسليم من زاوية واحدة.
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هنا نرى اختناق طابور التصميم بوضوح: ما دخل اليوم، ما ينتظر مراجعة، ما لا يزال بلا مسؤول، وما تم
                                إنجازه وإرساله للعميل.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الضغط النشط</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.activeLoad}</p>
                                <p className="mt-2 text-sm text-theme-subtle">يشمل الجديد، الجاري، المراجعة، والتعديلات.</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">العمر النشط</p>
                                <p className="mt-3 text-3xl font-black text-theme">{formatHours(snapshot.stats.avgActiveHours)}</p>
                                <p className="mt-2 text-sm text-theme-subtle">متوسط عمر الطلبات غير المنتهية حاليًا.</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">إيقاع الإنجاز</p>
                                <p className="mt-3 text-3xl font-black text-theme">{formatHours(snapshot.stats.avgCompletionHours)}</p>
                                <p className="mt-2 text-sm text-theme-subtle">متوسط الزمن من إنشاء الطلب حتى اكتماله.</p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.aside
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${subtlePanelClass} p-6`}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-theme-subtle bg-theme-faint">
                            <WandSparkles className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">Studio Pulse</p>
                            <h3 className="mt-1 text-lg font-bold text-theme">قرارات التشغيل الآن</h3>
                        </div>
                    </div>

                    <div className="mt-6 space-y-3">
                        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-violet-200">
                                <Palette className="h-4 w-4" />
                                <span className="text-sm font-bold">الوارد الجديد</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                دخل اليوم {snapshot.stats.createdToday} طلبات تصميم جديدة، بينما يقف {snapshot.stats.new} في طابور
                                الاستقبال الحالي.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-amber-200">
                                <FolderClock className="h-4 w-4" />
                                <span className="text-sm font-bold">مكتب المراجعة</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.awaiting_review + snapshot.stats.modification_requested > 0
                                    ? `هناك ${snapshot.stats.awaiting_review + snapshot.stats.modification_requested} طلبات تنتظر مراجعة أو تعديل.`
                                    : "لا يوجد ازدحام حالي في مكتب المراجعة."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-red-200">
                                <Users className="h-4 w-4" />
                                <span className="text-sm font-bold">التعيين والتسليم</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.unassignedActive > 0
                                    ? `${snapshot.stats.unassignedActive} طلبات نشطة بلا مسؤول، و${snapshot.stats.readyToSend} طلبات مكتملة لم تُرسل بعد.`
                                    : `الطلبات غير المعيّنة تحت السيطرة، و${snapshot.stats.readyToSend} طلبات مكتملة تنتظر الإرسال.`}
                            </p>
                        </div>
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="New Intake"
                    value={String(snapshot.stats.new)}
                    subtitle="وارد التصميم الذي يحتاج فرزًا وتوزيعًا سريعًا."
                    icon={Sparkles}
                    accent="#60a5fa"
                />
                <SummaryCard
                    title="In Production"
                    value={String(snapshot.stats.in_progress)}
                    subtitle="طلبات تتحرك فعليًا داخل خط التنفيذ الإبداعي."
                    icon={Clock3}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="Review Desk"
                    value={String(snapshot.stats.awaiting_review + snapshot.stats.modification_requested)}
                    subtitle="طلبات تنتظر اعتمادًا أو تحتاج جولة تعديل جديدة."
                    icon={AlertTriangle}
                    accent="#f87171"
                />
                <SummaryCard
                    title="Unassigned"
                    value={String(snapshot.stats.unassignedActive)}
                    subtitle="طلبات نشطة بلا مالك تشغيلي واضح داخل الفريق."
                    icon={UserCircle2}
                    accent="#c084fc"
                />
                <SummaryCard
                    title="Revenue"
                    value={formatCurrency(snapshot.stats.revenue)}
                    subtitle="إجمالي العوائد المحققة من الطلبات المكتملة."
                    icon={TrendingUp}
                    accent="#34d399"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
                <QueueLane
                    title="الوارد الجديد"
                    subtitle="أحدث الطلبات التي دخلت خط التصميم وتحتاج تقييمًا أوليًا."
                    emptyState="لا توجد طلبات جديدة حاليًا."
                    items={snapshot.intakeQueue}
                    tone="warning"
                    getAdminName={getAdminName}
                />
                <QueueLane
                    title="مكتب المراجعة والتعديل"
                    subtitle="الطلبات الجاهزة للمراجعة أو التي رجعت بجولة تعديل جديدة."
                    emptyState="لا يوجد ضغط حالي في مكتب المراجعة."
                    items={snapshot.reviewQueue}
                    tone="critical"
                    getAdminName={getAdminName}
                />
                <QueueLane
                    title="طابور غير المعيّن"
                    subtitle="طلبات نشطة بلا مسؤول مباشر، وهي مخاطرة تشغيلية يجب تصفيرها سريعًا."
                    emptyState="جميع الطلبات النشطة معيّنة حاليًا."
                    items={snapshot.assignmentBacklog}
                    tone="warning"
                    getAdminName={getAdminName}
                />
                <QueueLane
                    title="آخر ما اكتمل"
                    subtitle="الطلبات المنجزة مؤخرًا لمراجعة الإيقاع والجودة والإرسال."
                    emptyState="لا توجد طلبات مكتملة بعد في السجل."
                    items={snapshot.recentlyCompleted}
                    tone="calm"
                    getAdminName={getAdminName}
                />
            </div>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Execution Desk</p>
                        <h3 className="mt-2 text-xl font-bold text-theme">مكتب التنفيذ التفصيلي</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                            كل أدوات التنفيذ العملية تبقى هنا: الفلترة، التعيين، تحديث الحالة، رفع النتائج، والمراجعة النهائية.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm text-theme-subtle">
                        <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-gold" />
                            <span>{snapshot.stats.readyToSend} طلبات مكتملة لم تُرسل للعميل بعد</span>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <DesignOrdersClient {...clientProps} hideStatsSummary />
                </div>
            </motion.section>
        </div>
    );
}
