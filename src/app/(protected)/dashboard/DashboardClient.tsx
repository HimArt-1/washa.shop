"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowUpRight,
    Bell,
    Brush,
    DollarSign,
    FileText,
    HeadphonesIcon,
    ShoppingCart,
    TrendingUp,
    Truck,
    Users,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { LowStockItem, TopProduct } from "@/app/actions/analytics";
import LowStockWidget from "@/components/admin/analytics/LowStockWidget";
import TopProductsList from "@/components/admin/analytics/TopProductsList";
import { cn } from "@/lib/utils";

type DashboardProps = {
    stats: {
        totalUsers: number;
        totalArtists: number;
        totalPlatformSubscribers: number;
        totalOrders: number;
        totalRevenue: number;
        thisMonthRevenue: number;
        revenueGrowth: number;
        totalArtworks: number;
        totalProducts: number;
        pendingApplications: number;
        totalNewsletterSubscribers: number;
        averageOrderValue: number;
    };
    recentOrders: Array<{
        id: string;
        order_number: string;
        total: number;
        status: string;
        payment_status: string;
        created_at: string;
        buyer?: { display_name?: string | null } | null;
    }>;
    pendingApplications: Array<{
        id: string;
        full_name: string;
        email: string;
        art_style: string;
        created_at: string;
    }>;
    controlTower: {
        ops: {
            ordersNeedingReview: number;
            fulfillmentQueue: number;
            pendingPayments: number;
            supportOpen: number;
            supportUrgent: number;
            designNew: number;
            designAwaitingReview: number;
            alertsUnread: number;
            alertsCritical: number;
        };
        recentAlerts: Array<{
            id: string;
            title: string;
            message: string | null;
            category: string;
            severity: "info" | "warning" | "critical";
            created_at: string;
            link: string | null;
            is_read: boolean;
        }>;
        supportQueue: Array<{
            id: string;
            subject: string;
            status: string;
            priority: string;
            name: string | null;
            email: string | null;
            created_at: string;
        }>;
        designQueue: Array<{
            id: string;
            order_number: number;
            customer_name: string | null;
            garment_name: string;
            status: string;
            created_at: string;
        }>;
    };
    topProductsList: TopProduct[];
    monthlyRevenue: Array<{ date: string; revenue: number; orders: number }>;
    lowStockList: LowStockItem[];
    lastUpdatedLabel: string;
    dataQuality: {
        degraded: boolean;
        issues: string[];
    };
};

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[30px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[26px]";

function DashboardSection({
    eyebrow,
    title,
    description,
    action,
    children,
    className,
    sectionId,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    sectionId?: string;
}) {
    return (
        <section id={sectionId} className={cn("scroll-mt-24 space-y-5", className)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gold/90">{eyebrow}</p>
                    <h2 className="mt-1.5 text-xl font-black tracking-tight text-theme sm:text-2xl">{title}</h2>
                    {description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-theme-subtle">{description}</p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            {children}
        </section>
    );
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatCompactNumber(value: number) {
    return new Intl.NumberFormat("ar-SA", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value || 0);
}

function formatShortDate(value: string) {
    return new Date(value).toLocaleDateString("ar-SA", {
        month: "short",
        day: "numeric",
    });
}

function formatShortMonth(value: string) {
    return value.length <= 4 ? value : value.slice(0, 3);
}

function getAlertCategoryLabel(category: string) {
    switch (category) {
        case "orders":
            return "الطلبات";
        case "payments":
            return "المدفوعات";
        case "applications":
            return "الانضمام";
        case "support":
            return "الدعم";
        case "design":
            return "التصميم";
        case "security":
            return "الأمان";
        case "system":
        default:
            return "النظام";
    }
}

function getSeverityTone(severity: "info" | "warning" | "critical") {
    if (severity === "critical") {
        return {
            label: "حرج",
            badge: "bg-red-500/15 text-red-300 border-red-500/30",
            dot: "bg-red-400",
        };
    }

    if (severity === "warning") {
        return {
            label: "تحذير",
            badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
            dot: "bg-amber-400",
        };
    }

    return {
        label: "معلومة",
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-400",
    };
}

function getSupportPriorityMeta(priority: string) {
    if (priority === "high") return { label: "عالية", className: "text-red-300" };
    if (priority === "normal") return { label: "عادية", className: "text-amber-300" };
    return { label: "منخفضة", className: "text-theme-subtle" };
}

function getDesignStatusLabel(status: string) {
    switch (status) {
        case "new":
            return "جديد";
        case "in_progress":
            return "قيد التنفيذ";
        case "awaiting_review":
            return "بانتظار المراجعة";
        case "completed":
            return "مكتمل";
        case "modification_requested":
            return "طلب تعديل";
        case "cancelled":
            return "ملغي";
        default:
            return status;
    }
}

function calculateHealthScore(
    ops: DashboardProps["controlTower"]["ops"],
    lowStockCount: number
) {
    const penalty =
        ops.alertsCritical * 18 +
        ops.supportUrgent * 10 +
        ops.pendingPayments * 7 +
        lowStockCount * 4 +
        Math.max(0, ops.ordersNeedingReview - 3) * 3 +
        Math.max(0, ops.designAwaitingReview - 2) * 3;

    return Math.max(28, Math.min(100, 100 - penalty));
}

function getHealthMeta(score: number) {
    if (score >= 85) {
        return {
            label: "مستقر",
            summary: "التشغيل متماسك والضغط اليومي تحت السيطرة.",
            accent: "#22c55e",
            className: "text-emerald-300",
        };
    }

    if (score >= 65) {
        return {
            label: "تحت المراقبة",
            summary: "توجد نقاط تحتاج متابعة قريبة قبل أن تتحول إلى عنق زجاجة.",
            accent: "#f59e0b",
            className: "text-amber-300",
        };
    }

    return {
        label: "ضغط مرتفع",
        summary: "هناك مؤشرات تشغيلية حرجة أو متراكمة وتستحق تدخلًا مباشرًا.",
        accent: "#ef4444",
        className: "text-red-300",
    };
}



type PriorityEntry = {
    key: string;
    label: string;
    count: number;
    href: string;
    tone: "critical" | "warning" | "info";
};

function buildPriorityEntries(
    ops: DashboardProps["controlTower"]["ops"],
    lowStockCount: number,
    pendingApplications: number
): PriorityEntry[] {
    const raw: PriorityEntry[] = [];
    if (ops.alertsCritical > 0) {
        raw.push({
            key: "alerts-critical",
            label: "تنبيهات حرجة",
            count: ops.alertsCritical,
            href: "/dashboard/notifications",
            tone: "critical",
        });
    }
    if (ops.supportUrgent > 0) {
        raw.push({
            key: "support-urgent",
            label: "دعم عاجل",
            count: ops.supportUrgent,
            href: "/dashboard/support",
            tone: "critical",
        });
    }
    if (ops.pendingPayments > 0) {
        raw.push({
            key: "payments",
            label: "مدفوعات معلقة",
            count: ops.pendingPayments,
            href: "/dashboard/orders",
            tone: "warning",
        });
    }
    if (lowStockCount > 0) {
        raw.push({
            key: "low-stock",
            label: "أصناف مخزون منخفض",
            count: lowStockCount,
            href: "/dashboard/products-inventory",
            tone: "warning",
        });
    }
    if (ops.ordersNeedingReview > 0) {
        raw.push({
            key: "orders-review",
            label: "طلبات تحتاج مراجعة",
            count: ops.ordersNeedingReview,
            href: "/dashboard/orders",
            tone: "info",
        });
    }
    if (pendingApplications > 0) {
        raw.push({
            key: "applications",
            label: "طلبات انضمام معلقة",
            count: pendingApplications,
            href: "/dashboard/applications",
            tone: "info",
        });
    }
    if (ops.designAwaitingReview > 0) {
        raw.push({
            key: "design-review",
            label: "تصميم بانتظار المراجعة",
            count: ops.designAwaitingReview,
            href: "/dashboard/design-orders",
            tone: "info",
        });
    }

    const toneOrder = { critical: 0, warning: 1, info: 2 } as const;
    raw.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone] || b.count - a.count);
    return raw.slice(0, 6);
}

function priorityToneClass(tone: PriorityEntry["tone"]) {
    if (tone === "critical") {
        return "border-red-500/25 bg-red-500/[0.07] hover:border-red-500/35 hover:bg-red-500/[0.1]";
    }
    if (tone === "warning") {
        return "border-amber-500/25 bg-amber-500/[0.06] hover:border-amber-500/35 hover:bg-amber-500/[0.09]";
    }
    return "border-theme-subtle bg-theme-faint hover:border-theme-soft hover:bg-theme-subtle";
}



function PriorityStrip({ entries }: { entries: PriorityEntry[] }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            aria-labelledby="dashboard-priority-heading"
            className="rounded-[28px] border border-theme-subtle bg-gradient-to-br from-theme-faint/90 to-theme-faint/40 p-4 sm:p-5"
        >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h3 id="dashboard-priority-heading" className="text-base font-black text-theme">
                        أولويات تحتاج تدخلًا
                    </h3>
                    <p className="mt-1 text-xs text-theme-subtle">مرتبة حسب الخطورة ثم الحجم — اضغط للانتقال إلى الصفحة المناسبة.</p>
                </div>
            </div>
            {entries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-emerald-500/25 bg-emerald-500/[0.05] px-4 py-6 text-center text-sm text-emerald-200/90">
                    لا توجد عناصر في قائمة الأولويات — التشغيل يبدو هادئًا من هذه الزاوية.
                </p>
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {entries.map((e) => (
                        <li key={e.key}>
                            <Link
                                href={e.href}
                                className={cn(
                                    "flex min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors",
                                    priorityToneClass(e.tone)
                                )}
                            >
                                <span className="min-w-0 text-sm font-bold text-theme">{e.label}</span>
                                <span className="shrink-0 tabular-nums text-lg font-black text-gold">{e.count}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </motion.section>
    );
}

function KpiCard({
    title,
    value,
    subtitle,
    icon: Icon,
    accent,
    href,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    href?: string;
}) {
    const content = (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-theme-soft`}
        >
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] text-theme-faint uppercase">{title}</p>
                    <p className="mt-3 text-2xl font-black text-theme">{value}</p>
                </div>
                <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{
                        backgroundColor: `${accent}18`,
                        borderColor: `${accent}33`,
                        color: accent,
                    }}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
                <p className="text-theme-subtle">{subtitle}</p>
                {href ? <ArrowUpRight className="h-4 w-4 text-theme-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> : null}
            </div>
        </motion.div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

function RevenueRunway({
    data,
    totalRevenue,
    totalOrders,
}: {
    data: DashboardProps["monthlyRevenue"];
    totalRevenue: number;
    totalOrders: number;
}) {
    const maxRevenue = Math.max(...data.map((item) => item.revenue), 1);
    const maxOrders = Math.max(...data.map((item) => item.orders), 1);
    const bestMonth = data.reduce(
        (best, item) => (item.revenue > best.revenue ? item : best),
        data[0] || { date: "-", revenue: 0, orders: 0 }
    );

    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${panelClass} p-6`}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16),transparent_42%)]" />
            <div className="relative space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gold/90">مسار الإيرادات</p>
                        <h3 className="mt-2 text-2xl font-black text-theme">الزخم الشهري للإيراد والطلبات</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-theme-subtle">
                            مقارنة شهرية بين الإيراد وعدد الطلبات لمعرفة أين يتسارع الأداء.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs text-theme-faint">أفضل شهر</p>
                            <p className="mt-2 text-lg font-bold text-theme">{bestMonth.date}</p>
                            <p className="mt-1 text-sm text-gold">{formatCurrency(bestMonth.revenue)}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                            <p className="text-xs text-theme-faint">الإيراد السنوي</p>
                            <p className="mt-2 text-lg font-bold text-theme">{formatCompactNumber(totalRevenue)}</p>
                            <p className="mt-1 text-sm text-emerald-300">{totalOrders} طلبات مدفوعة</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-[26px] border border-theme-subtle bg-theme-faint p-4 sm:p-5">
                    <div className="overflow-x-auto pb-2">
                        <div className="grid h-[290px] min-w-[640px] grid-cols-12 items-end gap-2 md:gap-3">
                        {data.map((item) => {
                            const revenueHeight = `${Math.max(10, (item.revenue / maxRevenue) * 100)}%`;
                            const ordersHeight = `${Math.max(8, (item.orders / maxOrders) * 72)}%`;

                            return (
                                <div key={item.date} className="flex min-w-0 flex-col items-center gap-3">
                                    <div className="flex h-[230px] w-full items-end justify-center gap-1 rounded-2xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_70%,transparent)] px-1 py-3">
                                        <div className="flex h-full flex-1 items-end justify-center">
                                            <div
                                                className="w-full rounded-full bg-gradient-to-t from-gold/15 via-gold/55 to-gold shadow-[0_0_24px_rgba(212,175,55,0.18)]"
                                                style={{ height: revenueHeight }}
                                                title={`${item.date}: ${formatCurrency(item.revenue)}`}
                                            />
                                        </div>
                                        <div className="flex h-full w-2.5 items-end justify-center">
                                            <div
                                                className="w-full rounded-full bg-gradient-to-t from-emerald-500/15 to-emerald-400"
                                                style={{ height: ordersHeight }}
                                                title={`${item.date}: ${item.orders} طلبات`}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-theme-faint md:text-xs">{formatShortMonth(item.date)}</p>
                                        <p className="mt-1 text-[11px] font-bold text-theme-soft">{item.orders}</p>
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-theme-subtle">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                            الإيراد
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            عدد الطلبات
                        </div>
                    </div>
                </div>
            </div>
        </motion.section>
    );
}



function QueueCard({
    title,
    subtitle,
    href,
    items,
    emptyState,
}: {
    title: string;
    subtitle: string;
    href: string;
    items: React.ReactNode[];
    emptyState: string;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${subtlePanelClass} h-full p-5`}
        >
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-theme">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-theme-subtle">{subtitle}</p>
                </div>
                <Link href={href} className="text-sm font-medium text-gold hover:text-gold-light">
                    عرض الكل
                </Link>
            </div>

            <div className="space-y-3">
                {items.length > 0 ? (
                    items
                ) : (
                    <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

export function DashboardClient({
    stats,
    recentOrders,
    pendingApplications,
    controlTower,
    topProductsList,
    monthlyRevenue,
    lowStockList,
    lastUpdatedLabel,
    dataQuality,
}: DashboardProps) {
    const [mounted, setMounted] = useState(false);
    const lowStockCount = lowStockList.length;
    const healthScore = calculateHealthScore(controlTower.ops, lowStockCount);
    const healthMeta = getHealthMeta(healthScore);
    const attentionNow =
        controlTower.ops.alertsCritical +
        controlTower.ops.supportUrgent +
        controlTower.ops.pendingPayments +
        lowStockCount;
    const activeQueues =
        controlTower.ops.ordersNeedingReview +
        controlTower.ops.fulfillmentQueue +
        controlTower.ops.supportOpen +
        controlTower.ops.designNew +
        controlTower.ops.designAwaitingReview;
    const managedCommunity = stats.totalArtists + stats.totalPlatformSubscribers;
    const priorityEntries = buildPriorityEntries(
        controlTower.ops,
        lowStockCount,
        pendingApplications.length
    );

    return (
        <div className="space-y-10 sm:space-y-12">
            <motion.section
                id="dashboard-hero"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${panelClass} scroll-mt-24 p-5 sm:p-6 md:p-7`}
                aria-labelledby="dashboard-hero-heading"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_32%)]" />
                <div className="relative space-y-6">
                    {/* ─── Header Row: Title + Health Badge ─── */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                                    نبض المنصة
                                </span>
                                <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs text-theme-subtle">
                                    {lastUpdatedLabel}
                                </span>
                            </div>
                            <h2 id="dashboard-hero-heading" className="text-xl font-black leading-snug text-theme sm:text-2xl">
                                ملخص التشغيل — ما يحتاج انتباهك الآن
                            </h2>
                        </div>

                        {/* Compact Health Gauge */}
                        <div className="flex items-center gap-4 rounded-2xl border border-theme-subtle bg-theme-faint/80 px-5 py-4 lg:min-w-[260px]">
                            <div
                                className="grid h-16 w-16 shrink-0 place-items-center rounded-full p-1"
                                style={{ background: `conic-gradient(${healthMeta.accent} ${healthScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
                                role="img"
                                aria-label={`سلامة التشغيل ${healthScore}%`}
                            >
                                <div className="grid h-full w-full place-items-center rounded-full bg-[color:var(--wusha-surface)]">
                                    <span className="text-lg font-black text-theme">{healthScore}</span>
                                </div>
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${healthMeta.className}`}>{healthMeta.label}</p>
                                <p className="mt-1 text-xs leading-relaxed text-theme-subtle">{healthMeta.summary}</p>
                            </div>
                        </div>
                    </div>

                    {/* ─── Key Metrics Row ─── */}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                            <p className="text-xs text-theme-faint">يحتاج تدخلًا</p>
                            <p className="mt-1.5 text-2xl font-black tabular-nums text-theme">{attentionNow}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                            <p className="text-xs text-theme-faint">طوابير نشطة</p>
                            <p className="mt-1.5 text-2xl font-black tabular-nums text-theme">{activeQueues}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                            <p className="text-xs text-theme-faint">مجتمع المنصة</p>
                            <p className="mt-1.5 text-2xl font-black tabular-nums text-theme">{managedCommunity}</p>
                        </div>
                        <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                            <p className="text-xs text-theme-faint">مدفوعات معلقة</p>
                            <p className="mt-1.5 text-2xl font-black tabular-nums text-theme">{controlTower.ops.pendingPayments}</p>
                        </div>
                    </div>

                    {/* ─── Data Quality Warning ─── */}
                    {dataQuality.degraded ? (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                                <div>
                                    <p className="text-sm font-bold text-amber-200">بعض البيانات في وضع احتياطي</p>
                                    <p className="mt-1 text-xs leading-6 text-amber-100/85">{dataQuality.issues.join(" ")}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* ─── Quick Shortcuts ─── */}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: "الطلبات", hint: `${controlTower.ops.ordersNeedingReview} تحتاج مراجعة`, href: "/dashboard/orders", icon: ShoppingCart },
                            { label: "الدعم الفني", hint: `${controlTower.ops.supportOpen} تذكرة مفتوحة`, href: "/dashboard/support", icon: HeadphonesIcon },
                            { label: "طلبات التصميم", hint: `${controlTower.ops.designNew} جديدة الآن`, href: "/dashboard/design-orders", icon: Brush },
                            { label: "التنبيهات", hint: `${controlTower.ops.alertsUnread} غير مقروءة`, href: "/dashboard/notifications", icon: Bell },
                        ].map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex items-center justify-between rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 transition-all hover:border-gold/20 hover:bg-theme-subtle"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_72%,transparent)] text-theme-soft">
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-theme">{item.label}</p>
                                        <p className="text-xs text-theme-subtle">{item.hint}</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-theme-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                            </Link>
                        ))}
                    </div>
                </div>
            </motion.section>

            <PriorityStrip entries={priorityEntries} />

            <DashboardSection
                sectionId="dashboard-kpi"
                className="border-t border-theme-subtle/45 pt-10 sm:pt-12"
                eyebrow="الأداء المالي"
                title="المؤشرات الرئيسية"
                description="قراءة لحظية للإيراد والطلبات وتماسك المجتمع داخل المنصة."
            >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    title="الإيراد الكلي"
                    value={formatCurrency(stats.totalRevenue)}
                    subtitle={`نمو شهري ${stats.revenueGrowth >= 0 ? "+" : ""}${stats.revenueGrowth.toFixed(1)}%`}
                    icon={DollarSign}
                    accent="#d4af37"
                />
                <KpiCard
                    title="إيراد هذا الشهر"
                    value={formatCurrency(stats.thisMonthRevenue)}
                    subtitle={`${formatCompactNumber(stats.totalOrders)} طلبات مدفوعة`}
                    icon={TrendingUp}
                    accent="#22c55e"
                    href="/dashboard/analytics"
                />
                <KpiCard
                    title="متوسط قيمة الطلب"
                    value={formatCurrency(stats.averageOrderValue)}
                    subtitle="متوسط قيمة السلة"
                    icon={Truck}
                    accent="#38bdf8"
                    href="/dashboard/orders"
                />
                <KpiCard
                    title="المجتمع والإبداع"
                    value={formatCompactNumber(stats.totalUsers)}
                    subtitle={`${stats.totalArtists} وشّاي • ${stats.totalProducts} منتج • ${stats.totalArtworks} عمل`}
                    icon={Users}
                    accent="#a78bfa"
                    href="/dashboard/users"
                />
                </div>
            </DashboardSection>

            <DashboardSection
                sectionId="dashboard-analytics"
                className="border-t border-theme-subtle/45 pt-10 sm:pt-12"
                eyebrow="التحليل"
                title="الإيرادات والتنبيهات"
                description="مسار الشهور بجانب أحدث التنبيهات التي تحتاج قرارًا."
            >
            <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
                <RevenueRunway
                    data={monthlyRevenue}
                    totalRevenue={stats.totalRevenue}
                    totalOrders={stats.totalOrders}
                />

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-5 sm:p-6`}
                >
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold text-gold/90">التنبيهات</p>
                            <h3 className="mt-2 text-2xl font-black text-theme">موجز القرارات</h3>
                            <p className="mt-2 text-sm leading-relaxed text-theme-subtle">
                                أحدث الإشارات قبل الدخول إلى التفاصيل.
                            </p>
                        </div>
                        <Link href="/dashboard/notifications" className="text-sm font-medium text-gold hover:text-gold-light">
                            سجل التنبيهات
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {controlTower.recentAlerts.length > 0 ? (
                            controlTower.recentAlerts.map((alert) => {
                                const tone = getSeverityTone(alert.severity);
                                return (
                                    <Link
                                        key={alert.id}
                                        href={alert.link || "/dashboard/notifications"}
                                        className="block rounded-2xl border border-theme-subtle bg-theme-faint p-4 transition-colors hover:border-theme-soft hover:bg-theme-subtle"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}>
                                                        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                                                        {tone.label}
                                                    </span>
                                                    <span className="text-[11px] text-theme-faint">{getAlertCategoryLabel(alert.category)}</span>
                                                </div>
                                                <p className="mt-3 text-sm font-bold text-theme">{alert.title}</p>
                                                {alert.message ? (
                                                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-theme-subtle">{alert.message}</p>
                                                ) : null}
                                            </div>
                                            <div className="shrink-0 text-left">
                                                <p className="text-xs text-theme-faint">{formatShortDate(alert.created_at)}</p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="rounded-2xl border border-dashed border-theme-subtle bg-theme-faint px-4 py-10 text-center text-sm text-theme-subtle">
                                لا توجد تنبيهات حديثة، والواجهة التنفيذية هادئة حاليًا.
                            </div>
                        )}
                    </div>
                </motion.section>
            </div>
            </DashboardSection>



        </div>
    );
}
