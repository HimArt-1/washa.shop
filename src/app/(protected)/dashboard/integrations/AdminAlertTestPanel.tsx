"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    BellRing,
    Bot,
    CheckCircle2,
    Globe2,
    Loader2,
    RadioTower,
    RefreshCw,
    Send,
    ShieldCheck,
    Terminal,
    XCircle,
} from "lucide-react";
import {
    sendAdminAlertTest,
    syncTelegramBotSetup,
    type AdminAlertDiagnostics,
    type AdminAlertTestResult,
    type TelegramBotSetupSyncResult,
} from "@/app/actions/integration-health";
import type { TelegramBotDiagnostics } from "@/lib/telegram-bot";

function formatDate(value?: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
        timeZone: "Asia/Riyadh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function ChannelBadge({ configured, label, detail }: { configured: boolean; label: string; detail: string }) {
    return (
        <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-theme">{label}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${
                    configured
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                }`}>
                    {configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {configured ? "مفعّل" : "غير مكتمل"}
                </span>
            </div>
            <p className="mt-2 truncate text-xs text-theme-faint">{detail}</p>
        </div>
    );
}

function ResultPanel({ result }: { result: AdminAlertTestResult | null }) {
    if (!result) return null;

    return (
        <div className={`rounded-2xl border px-4 py-3 ${
            result.ok
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-amber-500/20 bg-amber-500/10"
        }`}>
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    result.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                }`}>
                    {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-theme">{result.message}</p>
                    <p className="mt-1 text-xs text-theme-faint">وقت الاختبار: {formatDate(result.generatedAt)}</p>
                    {result.channelResults.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {result.channelResults.map((channel) => (
                                <span
                                    key={`${channel.channel}-${channel.status ?? channel.error ?? "result"}`}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                                        channel.ok
                                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                            : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                                    }`}
                                >
                                    {channel.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                    {channel.channel}
                                    {channel.status ? ` · ${channel.status}` : ""}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TelegramSyncResultPanel({ result }: { result: TelegramBotSetupSyncResult | null }) {
    if (!result) return null;

    const commandStatus = result.commands.ok ? "تمت مزامنة الأوامر" : result.commands.error || "فشلت مزامنة الأوامر";
    const webhookStatus = result.webhook.skipped
        ? "تم تخطي webhook"
        : result.webhook.ok
            ? "تم تفعيل webhook"
            : result.webhook.error || "فشل تفعيل webhook";

    return (
        <div className={`rounded-2xl border px-4 py-3 ${
            result.ok
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-amber-500/20 bg-amber-500/10"
        }`}>
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    result.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                }`}>
                    {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-theme">{result.message}</p>
                    <p className="mt-1 text-xs text-theme-faint">وقت المزامنة: {formatDate(result.generatedAt)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            result.commands.ok
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                        }`}>
                            {result.commands.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                            {commandStatus}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            result.webhook.ok
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : result.webhook.skipped
                                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                    : "border-rose-500/20 bg-rose-500/10 text-rose-300"
                        }`}>
                            {result.webhook.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {webhookStatus}
                        </span>
                    </div>
                    {result.warnings.length > 0 && (
                        <div className="mt-3 space-y-1">
                            {result.warnings.map((warning) => (
                                <p key={warning} className="text-xs leading-5 text-amber-200">{warning}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TelegramCommandCenterPanel({
    diagnostics,
    isPending,
    onSync,
}: {
    diagnostics: TelegramBotDiagnostics;
    isPending: boolean;
    onSync: () => void;
}) {
    const readiness = [
        {
            label: "Token",
            ok: diagnostics.tokenConfigured,
            detail: diagnostics.tokenConfigured ? "مضبوط" : "ناقص",
            icon: Bot,
        },
        {
            label: "Webhook Secret",
            ok: diagnostics.webhookSecretConfigured,
            detail: diagnostics.webhookSecretConfigured ? "محمي" : "ناقص",
            icon: ShieldCheck,
        },
        {
            label: "مشرفو Telegram",
            ok: diagnostics.adminUsersConfigured,
            detail: diagnostics.adminUsersConfigured ? `${diagnostics.adminUserCount} مشرف` : "غير مقيد",
            icon: Terminal,
        },
        {
            label: "HTTPS",
            ok: diagnostics.appUrlIsPublicHttps,
            detail: diagnostics.appUrlIsPublicHttps ? "رابط عام" : "غير عام",
            icon: Globe2,
        },
    ];

    return (
        <div className="mt-5 rounded-2xl border border-theme-subtle bg-theme-faint p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-gold" />
                        <p className="text-sm font-black text-theme">مركز أوامر Telegram</p>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                        {diagnostics.readyForCommands
                            ? `جاهز لاستقبال ${diagnostics.commandCount} أمراً تشغيلياً من مجموعة الأدمن.`
                            : "يحتاج ضبط متغيرات الحماية والرابط العام قبل تفعيل استقبال الأوامر."}
                    </p>
                    <p className="mt-2 truncate text-xs font-bold text-theme-faint" dir="ltr">{diagnostics.webhookUrl}</p>
                </div>
                <button
                    type="button"
                    onClick={onSync}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-subtle bg-theme-subtle px-4 py-3 text-sm font-black text-theme transition hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    مزامنة أوامر البوت
                </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {readiness.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="rounded-2xl border border-theme-subtle bg-theme-subtle px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <Icon className="h-4 w-4 shrink-0 text-gold" />
                                    <p className="truncate text-sm font-bold text-theme">{item.label}</p>
                                </div>
                                {item.ok
                                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                                    : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />}
                            </div>
                            <p className="mt-2 truncate text-xs text-theme-faint">{item.detail}</p>
                        </div>
                    );
                })}
            </div>

            {diagnostics.warnings.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs font-black text-amber-200">ملاحظات التفعيل</p>
                    <div className="mt-2 space-y-1">
                        {diagnostics.warnings.map((warning) => (
                            <p key={warning} className="text-xs leading-5 text-theme-subtle">{warning}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdminAlertTestPanel({
    diagnostics,
    telegramCommandCenter,
}: {
    diagnostics: AdminAlertDiagnostics;
    telegramCommandCenter: TelegramBotDiagnostics;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSyncPending, startSyncTransition] = useTransition();
    const [result, setResult] = useState<AdminAlertTestResult | null>(null);
    const [syncResult, setSyncResult] = useState<TelegramBotSetupSyncResult | null>(null);

    const handleTest = () => {
        startTransition(async () => {
            const nextResult = await sendAdminAlertTest();
            setResult(nextResult);
            router.refresh();
        });
    };

    const handleSyncTelegram = () => {
        startSyncTransition(async () => {
            const nextResult = await syncTelegramBotSetup();
            setSyncResult(nextResult);
            router.refresh();
        });
    };

    return (
        <section className="theme-surface-panel rounded-[26px] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-theme-subtle bg-theme-subtle">
                            <BellRing className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-theme-faint">تنبيهات الأدمن</p>
                            <h2 className="text-lg font-black text-theme">اختبار القنوات التشغيلية</h2>
                        </div>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-theme-subtle">
                        يرسل الاختبار تنبيهاً داخلياً وخارجياً عبر القنوات المفعلة، ثم يحدّث سجل الإشعارات.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleTest}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-black text-gold transition hover:bg-gold/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    إرسال اختبار
                </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
                {diagnostics.channels.map((channel) => (
                    <ChannelBadge
                        key={channel.id}
                        configured={channel.configured}
                        label={channel.label}
                        detail={channel.detail}
                    />
                ))}
            </div>

            <TelegramCommandCenterPanel
                diagnostics={telegramCommandCenter}
                isPending={isSyncPending}
                onSync={handleSyncTelegram}
            />

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                    <div className="flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-gold" />
                        <p className="text-sm font-black text-theme">آخر تنبيه داخلي</p>
                    </div>
                    <p className="mt-2 text-sm font-bold text-theme-subtle">
                        {diagnostics.lastNotification?.title ?? "لا يوجد تنبيه مسجل"}
                    </p>
                    <p className="mt-1 text-xs text-theme-faint">
                        {diagnostics.lastNotification
                            ? `${diagnostics.lastNotification.category} · ${diagnostics.lastNotification.severity} · ${formatDate(diagnostics.lastNotification.createdAt)}`
                            : "—"}
                    </p>
                </div>

                <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3">
                    <div className="flex items-center gap-2">
                        <RadioTower className="h-4 w-4 text-gold" />
                        <p className="text-sm font-black text-theme">آخر إرسال خارجي</p>
                    </div>
                    <p className="mt-2 text-sm font-bold text-theme-subtle">
                        {diagnostics.lastWebhookDispatch?.eventType ?? "لا يوجد dispatch خارجي"}
                    </p>
                    <p className="mt-1 text-xs text-theme-faint">
                        {diagnostics.lastWebhookDispatch
                            ? `${diagnostics.lastWebhookDispatch.status} · ${formatDate(diagnostics.lastWebhookDispatch.updatedAt)}`
                            : "—"}
                    </p>
                    {diagnostics.lastWebhookDispatch?.lastError && (
                        <p className="mt-2 line-clamp-2 text-xs text-rose-300">
                            {diagnostics.lastWebhookDispatch.lastError}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-5">
                <ResultPanel result={result} />
                <div className="mt-3">
                    <TelegramSyncResultPanel result={syncResult} />
                </div>
            </div>
        </section>
    );
}
