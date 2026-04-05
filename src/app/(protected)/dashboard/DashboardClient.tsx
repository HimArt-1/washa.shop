"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowUpRight,
    Bell,
    Brush,
    Clock3,
    DollarSign,
    FileText,
    HeadphonesIcon,
    LayoutList,
    Mail,
    Package,
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

const DASHBOARD_QUICK_NAV = [
    { id: "dashboard-hero", label: "الملخص" },
    { id: "dashboard-kpi", label: "المؤشرات" },
    { id: "dashboard-analytics", label: "التحليل" },
    { id: "dashboard-lanes", label: "المراكز" },
    { id: "dashboard-queues", label: "الطوابير" },
    { id: "dashboard-commerce", label: "المبيعات" },
    { id: "dashboard-community", label: "المجتمع" },
] as const;

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

const quickNavLinkClass =
    "rounded-full border border-transparent bg-theme-faint/80 px-3 py-1.5 text-xs font-semibold text-theme-subtle transition-colors hover:border-gold/25 hover:bg-theme-subtle hover:text-theme";

function DashboardQuickNav() {
    const primary = DASHBOARD_QUICK_NAV.slice(0, 4);
    const extra = DASHBOARD_QUICK_NAV.slice(4);

    return (
        <nav
            aria-label="انتقال سريع داخل لوحة المؤشرات"
            className="sticky top-0 z-20 -mx-1 mb-1 rounded-[22px] border border-theme-subtle/55 bg-[color:color-mix(in_srgb,var(--wusha-surface)_90%,transparent)] px-2 py-2.5 shadow-sm backdrop-blur-md sm:-mx-2 sm:px-3"
        >
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-1.5 text-[11px] font-bold text-theme-faint">
                    <LayoutList className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    انتقال
                </span>

                {primary.map((item) => (
                    <a key={item.id} href={`#${item.id}`} className={quickNavLinkClass}>
                        {item.label}
                    </a>
                ))}

                <details className="group relative sm:hidden">
                    <summary className="list-none cursor-pointer rounded-full border border-theme-subtle bg-theme-faint/90 px-3 py-1.5 text-xs font-semibold text-gold transition-colors marker:content-none hover:border-gold/30 [&::-webkit-details-marker]:hidden">
                        المزيد
                        <span className="mr-1 text-[10px] text-theme-faint group-open:rotate-180">▼</span>
                    </summary>
                    <div className="absolute end-0 top-[calc(100%+6px)] z-30 flex min-w-[10rem] flex-col gap-1 rounded-2xl border border-theme-subtle bg-[color:var(--wusha-surface)] p-2 shadow-lg">
                        {extra.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className="rounded-xl px-3 py-2 text-sm font-semibold text-theme-subtle transition-colors hover:bg-theme-faint hover:text-theme"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </details>

                {extra.map((item) => (
                    <a key={item.id} href={`#${item.id}`} className={cn(quickNavLinkClass, "hidden sm:inline-flex")}>
                        {item.label}
                    </a>
                ))}
            </div>
        </nav>
    );
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

function OperationLaneCard({
    title,
    description,
    primaryValue,
    primaryLabel,
    secondary,
    icon: Icon,
    href,
    accent,
}: {
    title: string;
    description: string;
    primaryValue: number;
    primaryLabel: string;
    secondary: Array<{ label: string; value: number }>;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    accent: string;
}) {
    return (
        <Link href={href}>
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} group h-full p-5 transition-all duration-300 hover:-translate-y-1 hover:border-theme-soft`}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-theme">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-theme-subtle">{description}</p>
                    </div>
                    <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                        style={{
                            backgroundColor: `${accent}18`,
                            borderColor: `${accent}33`,
                            color: accent,
                        }}
                    >
                        <Icon className="h-5 w-5" />
                    </div>
                </div>

                <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                    <p className="text-xs text-theme-faint">{primaryLabel}</p>
                    <p className="mt-2 text-3xl font-black text-theme">{primaryValue}</p>
                </div>

                <div className="mt-4 space-y-2">
                    {secondary.map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                            <span className="text-theme-subtle">{item.label}</span>
                            <span className="font-bold text-theme">{item.value}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-theme-subtle pt-4 text-sm text-theme-subtle">
                    <span>افتح المركز</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
            </motion.div>
        </Link>
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
    const router = useRouter();
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
            <DashboardQuickNav />
            <div id="dashboard-hero" className="grid scroll-mt-24 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-5 sm:p-6 md:p-7`}
                    aria-labelledby="dashboard-hero-heading"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.06),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                                مركز التشغيل
                            </span>
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs text-theme-subtle">
                                تحديث مباشر · {lastUpdatedLabel}
                            </span>
                        </div>

                        <div className="max-w-3xl">
                            <p className="text-xs font-semibold text-gold/90">نظرة تنفيذية</p>
                            <h2
                                id="dashboard-hero-heading"
                                className="mt-2 text-2xl font-black leading-snug text-theme sm:text-3xl md:text-[1.65rem] md:leading-tight"
                            >
                                صورة واحدة للإيراد والطوابير والضغط التشغيلي
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-theme-subtle md:text-[15px]">
                                اختصر التنقل بين الصفحات: راقب ما يحتاج تدخلًا الآن، ثم انتقل بالاختصارات أدناه.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                                <p className="text-xs text-theme-faint">يحتاج تدخلًا الآن</p>
                                <p className="mt-2 text-3xl font-black tabular-nums text-theme">{attentionNow}</p>
                                <p className="mt-2 text-xs leading-relaxed text-theme-subtle">حرج، دعم عاجل، مدفوعات، مخزون منخفض</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                                <p className="text-xs text-theme-faint">طوابير نشطة</p>
                                <p className="mt-2 text-3xl font-black tabular-nums text-theme">{activeQueues}</p>
                                <p className="mt-2 text-xs leading-relaxed text-theme-subtle">طلبات، تنفيذ، دعم، تصميم</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint/80 p-4">
                                <p className="text-xs text-theme-faint">مجتمع المنصة</p>
                                <p className="mt-2 text-3xl font-black tabular-nums text-theme">{managedCommunity}</p>
                                <p className="mt-2 text-xs leading-relaxed text-theme-subtle">وشّايون ومشتركون (دون النشرة)</p>
                            </div>
                        </div>

                        {dataQuality.degraded ? (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-200">بعض بيانات الداشبورد عادت بوضع احتياطي</p>
                                        <p className="mt-1 text-xs leading-6 text-amber-100/85">
                                            {dataQuality.issues.join(" ")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

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
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-theme-subtle bg-[color:color-mix(in_srgb,var(--wusha-surface)_72%,transparent)] text-theme-soft">
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

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`${panelClass} p-5 sm:p-6`}
                >
                    <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gold/90">الصحة التشغيلية</p>
                                <h3 className="mt-2 text-2xl font-black text-theme">مؤشر سلامة التشغيل</h3>
                                <p className="mt-2 text-sm leading-relaxed text-theme-subtle">{healthMeta.summary}</p>
                            </div>
                            <Clock3 className="mt-1 h-5 w-5 shrink-0 text-theme-faint" aria-hidden />
                        </div>

                        <div className="flex items-center justify-center py-3">
                            <div
                                className="grid h-36 w-36 place-items-center rounded-full p-3 sm:h-44 sm:w-44"
                                style={{
                                    background: `conic-gradient(${healthMeta.accent} ${healthScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                                }}
                                role="img"
                                aria-label={`مؤشر سلامة التشغيل ${healthScore} من مئة، الحالة: ${healthMeta.label}`}
                            >
                                <div className="grid h-full w-full place-items-center rounded-full border border-theme-subtle bg-[color:var(--wusha-surface)]">
                                    <div className="text-center">
                                        <p className={`text-sm font-semibold ${healthMeta.className}`}>{healthMeta.label}</p>
                                        <p className="mt-2 text-5xl font-black text-theme">{healthScore}</p>
                                        <p className="mt-1 text-xs text-theme-faint">من 100</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs text-theme-faint">حرج غير مقروء</p>
                                <p className="mt-2 text-2xl font-black text-theme">{controlTower.ops.alertsCritical}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs text-theme-faint">مخزون منخفض</p>
                                <p className="mt-2 text-2xl font-black text-theme">{lowStockCount}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs text-theme-faint">مدفوعات معلقة</p>
                                <p className="mt-2 text-2xl font-black text-theme">{controlTower.ops.pendingPayments}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                <p className="text-xs text-theme-faint">دعم عاجل</p>
                                <p className="mt-2 text-2xl font-black text-theme">{controlTower.ops.supportUrgent}</p>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>

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

            <DashboardSection
                sectionId="dashboard-lanes"
                className="border-t border-theme-subtle/45 pt-10 sm:pt-12"
                eyebrow="المراكز"
                title="اختصارات التشغيل"
                description="انتقال سريع إلى صفحة كل محور مع أبرز رقم لكل قسم."
            >
            <div className="grid gap-4 xl:grid-cols-4">
                <OperationLaneCard
                    title="مركز الطلبات"
                    description="مراجعة فورية، تنفيذ، ومدفوعات."
                    primaryValue={controlTower.ops.ordersNeedingReview}
                    primaryLabel="طلبات بحاجة مراجعة أو تأكيد"
                    secondary={[
                        { label: "في طابور التنفيذ", value: controlTower.ops.fulfillmentQueue },
                        { label: "مدفوعات معلقة", value: controlTower.ops.pendingPayments },
                    ]}
                    icon={ShoppingCart}
                    href="/dashboard/orders"
                    accent="#d4af37"
                />
                <OperationLaneCard
                    title="مركز الدعم"
                    description="تذاكر مفتوحة وأولويات وارتباط بالتنبيهات."
                    primaryValue={controlTower.ops.supportOpen}
                    primaryLabel="تذاكر مفتوحة أو قيد المتابعة"
                    secondary={[
                        { label: "أولوية عالية", value: controlTower.ops.supportUrgent },
                        { label: "تنبيهات غير مقروءة", value: controlTower.ops.alertsUnread },
                    ]}
                    icon={HeadphonesIcon}
                    href="/dashboard/support"
                    accent="#22c55e"
                />
                <OperationLaneCard
                    title="مركز التصميم"
                    description="جديد، مراجعة، وطلبات انضمام مرتبطة."
                    primaryValue={controlTower.ops.designNew}
                    primaryLabel="طلبات تصميم جديدة"
                    secondary={[
                        { label: "بانتظار المراجعة", value: controlTower.ops.designAwaitingReview },
                        { label: "طلبات الانضمام", value: stats.pendingApplications },
                    ]}
                    icon={Brush}
                    href="/dashboard/design-orders"
                    accent="#a78bfa"
                />
                <OperationLaneCard
                    title="مركز المخاطر"
                    description="تنبيهات حرجة، غير مقروءة، ومخزون منخفض."
                    primaryValue={controlTower.ops.alertsCritical}
                    primaryLabel="تنبيهات حرجة"
                    secondary={[
                        { label: "غير مقروءة", value: controlTower.ops.alertsUnread },
                        { label: "مخزون منخفض", value: lowStockCount },
                    ]}
                    icon={AlertTriangle}
                    href="/dashboard/notifications"
                    accent="#ef4444"
                />
            </div>
            </DashboardSection>

            <DashboardSection
                sectionId="dashboard-queues"
                className="border-t border-theme-subtle/45 pt-10 sm:pt-12"
                eyebrow="الطوابير"
                title="دعم، تصميم، انضمام"
                description="عناصر بانتظار الاستجابة — من نفس مصادر البيانات في أعلى الصفحة."
            >
            <div className="grid gap-5 xl:grid-cols-3">
                <QueueCard
                    title="صف الدعم"
                    subtitle="أحدث التذاكر التي تحتاج استجابة أو متابعة من الفريق."
                    href="/dashboard/support"
                    emptyState="لا توجد تذاكر مفتوحة الآن."
                    items={controlTower.supportQueue.map((ticket) => {
                        const priorityMeta = getSupportPriorityMeta(ticket.priority);
                        return (
                            <Link
                                key={ticket.id}
                                href={`/dashboard/support/${ticket.id}`}
                                className="block rounded-2xl border border-theme-subtle bg-theme-faint p-4 transition-colors hover:border-theme-soft hover:bg-theme-subtle"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-theme">{ticket.subject}</p>
                                        <p className="mt-1 text-xs text-theme-subtle">
                                            {ticket.name || ticket.email || "عميل غير مسمى"}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-semibold ${priorityMeta.className}`}>{priorityMeta.label}</span>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-theme-faint">
                                    <span>{formatShortDate(ticket.created_at)}</span>
                                    <span>{ticket.status === "in_progress" ? "قيد المتابعة" : "مفتوحة"}</span>
                                </div>
                            </Link>
                        );
                    })}
                />

                <QueueCard
                    title="صف التصميم"
                    subtitle="الطلبات التي تتطلب بدء تنفيذ أو مراجعة مع العميل."
                    href="/dashboard/design-orders"
                    emptyState="لا توجد طلبات تصميم نشطة في الوقت الحالي."
                    items={controlTower.designQueue.map((order) => (
                        <Link
                            key={order.id}
                            href={`/dashboard/design-orders/${order.id}`}
                            className="block rounded-2xl border border-theme-subtle bg-theme-faint p-4 transition-colors hover:border-theme-soft hover:bg-theme-subtle"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-theme">
                                        #{order.order_number} · {order.customer_name || "عميل ضيف"}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">{order.garment_name}</p>
                                </div>
                                <span className="text-xs font-semibold text-gold">{getDesignStatusLabel(order.status)}</span>
                            </div>
                            <div className="mt-3 text-xs text-theme-faint">{formatShortDate(order.created_at)}</div>
                        </Link>
                    ))}
                />

                <QueueCard
                    title="طلبات الانضمام"
                    subtitle="قائمة مختصرة بالمرشحين الذين ينتظرون قرار قبول أو متابعة."
                    href="/dashboard/applications"
                    emptyState="لا توجد طلبات انضمام معلقة حاليًا."
                    items={pendingApplications.map((application) => (
                        <Link
                            key={application.id}
                            href={`/dashboard/applications/${application.id}`}
                            className="block rounded-2xl border border-theme-subtle bg-theme-faint p-4 transition-colors hover:border-theme-soft hover:bg-theme-subtle"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme">{application.full_name}</p>
                                    <p className="mt-1 text-xs text-theme-subtle">{application.art_style}</p>
                                </div>
                                <FileText className="h-4 w-4 shrink-0 text-theme-faint" />
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-theme-faint">
                                <span>{application.email}</span>
                                <span>{formatShortDate(application.created_at)}</span>
                            </div>
                        </Link>
                    ))}
                />
            </div>
            </DashboardSection>

            <DashboardSection
                sectionId="dashboard-commerce"
                className="border-t border-theme-subtle/45 pt-10 sm:pt-12"
                eyebrow="التجارة والمخزون"
                title="الطلبات الأخيرة والمنتجات"
                description="آخر المبيعات مع أعلى المنتجات والمخزون المنخفض."
            >
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} overflow-hidden`}
                >
                    <div className="border-b border-theme-subtle px-6 py-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold text-gold/90">المبيعات</p>
                                <h3 className="mt-2 text-2xl font-black text-theme">آخر الطلبات</h3>
                                <p className="mt-2 text-sm leading-relaxed text-theme-subtle">
                                    انتقال سريع إلى تفاصيل الطلب.
                                </p>
                            </div>
                            <Link href="/dashboard/orders" className="text-sm font-medium text-gold hover:text-gold-light">
                                إدارة الطلبات
                            </Link>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-[720px] w-full text-sm">
                            <thead>
                                <tr className="border-b border-theme-subtle text-right text-xs text-theme-faint">
                                    <th className="px-6 py-4 font-medium">رقم الطلب</th>
                                    <th className="px-4 py-4 font-medium">العميل</th>
                                    <th className="px-4 py-4 font-medium">المبلغ</th>
                                    <th className="px-4 py-4 font-medium">الحالة</th>
                                    <th className="px-4 py-4 font-medium">الدفع</th>
                                    <th className="px-6 py-4 font-medium">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.length > 0 ? (
                                    recentOrders.map((order) => (
                                        <tr
                                            key={order.id}
                                            role="link"
                                            tabIndex={0}
                                            title="فتح الطلب في مركز العمليات"
                                            className="cursor-pointer border-b border-theme-faint transition-colors hover:bg-theme-faint"
                                            onClick={() =>
                                                router.push(`/dashboard/orders?focus=${encodeURIComponent(order.id)}`)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    router.push(`/dashboard/orders?focus=${encodeURIComponent(order.id)}`);
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-gold">{order.order_number}</td>
                                            <td className="px-4 py-4 text-theme-soft">{order.buyer?.display_name || "—"}</td>
                                            <td className="px-4 py-4 font-bold text-theme">{formatCurrency(Number(order.total) || 0)}</td>
                                            <td className="px-4 py-4">
                                                <StatusBadge status={order.status} type="order" />
                                            </td>
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                        order.payment_status === "paid"
                                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                            : order.payment_status === "failed"
                                                                ? "border-red-500/30 bg-red-500/10 text-red-300"
                                                                : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                                    }`}
                                                >
                                                    {order.payment_status === "paid"
                                                        ? "مدفوع"
                                                        : order.payment_status === "failed"
                                                            ? "فشل"
                                                            : "معلق"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-theme-faint">{formatShortDate(order.created_at)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-14 text-center text-sm text-theme-subtle">
                                            لا توجد طلبات حديثة لعرضها.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.section>

                <div className="space-y-5">
                    <div className="min-h-[360px]">
                        <TopProductsList products={topProductsList} />
                    </div>
                    <div className="min-h-[360px]">
                        <LowStockWidget items={lowStockList} />
                    </div>
                </div>
            </div>
            </DashboardSection>

            <DashboardSection
                sectionId="dashboard-community"
                className="border-t border-theme-subtle/45 pt-10 sm:pt-12"
                eyebrow="المجتمع والمحتوى"
                title="أرقام إضافية"
                description="مستخدمون، نشرة، أعمال، وتنبيهات — مع روابط للتفاصيل."
            >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Link href="/dashboard/users" className={`${subtlePanelClass} p-4 transition-colors hover:border-theme-soft`}>
                    <div className="flex items-center justify-between">
                        <Users className="h-5 w-5 text-theme-faint" />
                        <span className="text-xs text-theme-faint">المستخدمون</span>
                    </div>
                    <p className="mt-4 text-2xl font-black text-theme">{stats.totalUsers}</p>
                    <p className="mt-2 text-sm text-theme-subtle">{stats.totalArtists} وشّايين فاعلين داخل المنصة</p>
                </Link>
                <Link href="/dashboard/newsletter" className={`${subtlePanelClass} p-4 transition-colors hover:border-theme-soft`}>
                    <div className="flex items-center justify-between">
                        <Mail className="h-5 w-5 text-theme-faint" />
                        <span className="text-xs text-theme-faint">النشرة البريدية</span>
                    </div>
                    <p className="mt-4 text-2xl font-black text-theme">{stats.totalNewsletterSubscribers}</p>
                    <p className="mt-2 text-sm text-theme-subtle">مشتركو النشرة البريدية الذين ينتظرون حملات أدق ومحتوى أفضل.</p>
                </Link>
                <Link href="/dashboard/artworks" className={`${subtlePanelClass} p-4 transition-colors hover:border-theme-soft`}>
                    <div className="flex items-center justify-between">
                        <Package className="h-5 w-5 text-theme-faint" />
                        <span className="text-xs text-theme-faint">المحتوى الإبداعي</span>
                    </div>
                    <p className="mt-4 text-2xl font-black text-theme">{stats.totalArtworks}</p>
                    <p className="mt-2 text-sm text-theme-subtle">{stats.totalProducts} منتجًا متصلًا بالهوية التجارية.</p>
                </Link>
                <Link href="/dashboard/notifications" className={`${subtlePanelClass} p-4 transition-colors hover:border-theme-soft`}>
                    <div className="flex items-center justify-between">
                        <Bell className="h-5 w-5 text-theme-faint" />
                        <span className="text-xs text-theme-faint">نبض التنبيهات</span>
                    </div>
                    <p className="mt-4 text-2xl font-black text-theme">{controlTower.ops.alertsUnread}</p>
                    <p className="mt-2 text-sm text-theme-subtle">{controlTower.ops.alertsCritical} منها في مستوى حرج.</p>
                </Link>
            </div>
            </DashboardSection>
        </div>
    );
}
