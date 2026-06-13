import Link from "next/link";
import {
    AlertTriangle,
    CheckCircle2,
    CircleDashed,
    ExternalLink,
    KeyRound,
    Link2,
    ServerCog,
    ShieldCheck,
    Wifi,
} from "lucide-react";
import {
    getIntegrationHealthReport,
    type IntegrationHealthItem,
    type IntegrationHealthStatus,
} from "@/app/actions/integration-health";
import { AdminAlertTestPanel } from "./AdminAlertTestPanel";

const statusMeta: Record<IntegrationHealthStatus, {
    label: string;
    badge: string;
    icon: typeof CheckCircle2;
    panel: string;
}> = {
    ready: {
        label: "جاهز",
        badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        icon: CheckCircle2,
        panel: "border-emerald-500/15",
    },
    warning: {
        label: "يحتاج ضبط",
        badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
        icon: AlertTriangle,
        panel: "border-amber-500/15",
    },
    missing: {
        label: "متوقف",
        badge: "border-rose-500/20 bg-rose-500/10 text-rose-300",
        icon: CircleDashed,
        panel: "border-rose-500/15",
    },
};

function formatGeneratedAt(value: string) {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
        timeZone: "Asia/Riyadh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function StatusPill({ status }: { status: IntegrationHealthStatus }) {
    const meta = statusMeta[status];
    const Icon = meta.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.badge}`}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
        </span>
    );
}

function IntegrationCard({ integration }: { integration: IntegrationHealthItem }) {
    return (
        <article className={`theme-surface-panel rounded-[26px] border p-5 ${statusMeta[integration.status].panel}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-theme-subtle bg-theme-subtle">
                            <ServerCog className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-theme-faint">{integration.category}</p>
                            <h2 className="text-lg font-black text-theme">{integration.name}</h2>
                        </div>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-theme-subtle">{integration.summary}</p>
                </div>
                <StatusPill status={integration.status} />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {integration.checks.map((item) => (
                    <div
                        key={`${integration.id}-${item.label}`}
                        className="flex min-w-0 items-start gap-3 rounded-2xl border border-theme-subtle bg-theme-faint px-3 py-3"
                    >
                        <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                            item.ok
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : item.required
                                    ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                    : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                        }`}>
                            {item.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-theme">{item.label}</p>
                            <p className="mt-1 truncate text-xs text-theme-faint">{item.detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            {integration.endpoints && integration.endpoints.length > 0 && (
                <div className="mt-5 space-y-2">
                    {integration.endpoints.map((endpoint) => (
                        <a
                            key={`${integration.id}-${endpoint.label}`}
                            href={endpoint.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-theme-subtle bg-theme-subtle px-3 py-3 text-sm transition hover:border-gold/40 hover:text-gold"
                            dir="ltr"
                        >
                            <span className="truncate text-left text-theme-subtle">{endpoint.url}</span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-gold" dir="rtl">
                                {endpoint.label}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </span>
                        </a>
                    ))}
                </div>
            )}

            <div className="mt-5 rounded-2xl border border-gold/15 bg-gold/10 px-4 py-3">
                <p className="text-xs font-bold text-gold">الإجراء التالي</p>
                <p className="mt-1 text-sm leading-6 text-theme-subtle">{integration.action}</p>
            </div>
        </article>
    );
}

export default async function DashboardIntegrationsPage() {
    const report = await getIntegrationHealthReport();
    const allEndpoints = report.items.flatMap((item) =>
        (item.endpoints || []).map((endpoint) => ({
            ...endpoint,
            integration: item.name,
            status: item.status,
        }))
    );

    return (
        <div className="space-y-6" dir="rtl">
            <section className="theme-surface-panel overflow-hidden rounded-[30px] p-5 sm:p-6 lg:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
                            <Wifi className="h-3.5 w-3.5" />
                            حالة الربط التشغيلي
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-theme sm:text-3xl">
                            مركز حالة التكاملات
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle">
                            فحص سريع للخدمات التي تشغل الدفع، الشحن، الهوية، الذكاء، والتنبيهات داخل منصة وشّى.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
                            <p className="text-xs font-bold text-emerald-300">جاهز</p>
                            <p className="mt-2 text-3xl font-black text-theme">{report.totals.ready}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/10 p-4">
                            <p className="text-xs font-bold text-amber-300">يحتاج ضبط</p>
                            <p className="mt-2 text-3xl font-black text-theme">{report.totals.warning}</p>
                        </div>
                        <div className="rounded-2xl border border-rose-500/15 bg-rose-500/10 p-4">
                            <p className="text-xs font-bold text-rose-300">متوقف</p>
                            <p className="mt-2 text-3xl font-black text-theme">{report.totals.missing}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                        <p className="text-xs font-bold text-theme-faint">بيئة التشغيل</p>
                        <p className="mt-1 text-sm font-bold text-theme">{report.environment}</p>
                    </div>
                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                        <p className="text-xs font-bold text-theme-faint">الرابط العام</p>
                        <p className="mt-1 truncate text-sm font-bold text-theme" dir="ltr">{report.appUrl}</p>
                    </div>
                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                        <p className="text-xs font-bold text-theme-faint">آخر فحص</p>
                        <p className="mt-1 text-sm font-bold text-theme">{formatGeneratedAt(report.generatedAt)}</p>
                    </div>
                </div>
            </section>

            <AdminAlertTestPanel
                diagnostics={report.adminAlerts}
                telegramCommandCenter={report.telegramCommandCenter}
            />

            <section className="grid gap-4 xl:grid-cols-2">
                {report.items.map((integration) => (
                    <IntegrationCard key={integration.id} integration={integration} />
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="theme-surface-panel rounded-[26px] p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-theme-subtle bg-theme-subtle">
                            <ShieldCheck className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-theme">أولويات المعالجة</h2>
                            <p className="text-xs text-theme-faint">ابدأ بالمتوقف ثم التحذيرات.</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {report.items
                            .filter((integration) => integration.status !== "ready")
                            .map((integration) => (
                                <div key={`priority-${integration.id}`} className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="font-bold text-theme">{integration.name}</p>
                                        <StatusPill status={integration.status} />
                                    </div>
                                    <p className="text-sm leading-6 text-theme-subtle">{integration.action}</p>
                                </div>
                            ))}
                        {report.items.every((integration) => integration.status === "ready") && (
                            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
                                <p className="font-bold text-emerald-300">كل التكاملات الأساسية جاهزة.</p>
                                <p className="mt-1 text-sm text-theme-subtle">الخطوة التالية هي اختبار طلب كامل من المتجر حتى الشحن.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="theme-surface-panel rounded-[26px] p-5">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-theme-subtle bg-theme-subtle">
                            <Link2 className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-theme">روابط الويبهوك المطلوبة</h2>
                            <p className="text-xs text-theme-faint">ضع هذه الروابط داخل لوحات الخدمات الخارجية.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {allEndpoints.map((endpoint) => (
                            <a
                                key={`${endpoint.integration}-${endpoint.label}`}
                                href={endpoint.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 transition hover:border-gold/40"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-theme">{endpoint.integration} · {endpoint.label}</p>
                                    <p className="mt-1 truncate text-xs text-theme-faint" dir="ltr">{endpoint.url}</p>
                                </div>
                                <StatusPill status={endpoint.status} />
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-2 rounded-2xl border border-theme-subtle bg-theme-subtle px-4 py-3 text-sm font-bold text-theme transition hover:border-gold/40 hover:text-gold"
                >
                    <KeyRound className="h-4 w-4" />
                    إعدادات المنصة
                </Link>
                <Link
                    href="/dashboard/orders/command-center"
                    className="inline-flex items-center gap-2 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm font-bold text-gold transition hover:bg-gold/15"
                >
                    <ServerCog className="h-4 w-4" />
                    مركز أوامر الطلبات
                </Link>
            </div>
        </div>
    );
}
