"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Image from "next/image";
import Link from "next/link";
import {
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    ExternalLinkIcon,
    FileTextIcon,
    ImageIcon,
    KeyIcon,
    RefreshCwIcon,
    SlashIcon,
    UserIcon,
    XIcon,
} from "lucide-react";
import type { DtfStudioActivityLog } from "@/types/database";

interface DtfMonitorClientProps {
    initialLogs: DtfStudioActivityLog[];
    totalCount: number;
    currentPage: number;
}

type StatusTone = "success" | "error" | "warning" | "neutral";

function getStatusMeta(status: string): {
    label: string;
    tone: StatusTone;
    icon: ReactElement;
    chipClass: string;
    softClass: string;
} {
    switch (status) {
        case "success":
            return {
                label: "ناجح",
                tone: "success",
                icon: <CheckCircleIcon className="h-4 w-4" />,
                chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                softClass: "bg-emerald-500/10 text-emerald-300",
            };
        case "error":
            return {
                label: "خطأ",
                tone: "error",
                icon: <AlertTriangleIcon className="h-4 w-4" />,
                chipClass: "border-red-500/20 bg-red-500/10 text-red-300",
                softClass: "bg-red-500/10 text-red-300",
            };
        case "timeout":
            return {
                label: "انقضاء الوقت",
                tone: "warning",
                icon: <RefreshCwIcon className="h-4 w-4" />,
                chipClass: "border-amber-500/20 bg-amber-500/10 text-amber-300",
                softClass: "bg-amber-500/10 text-amber-300",
            };
        case "quota_exceeded":
            return {
                label: "تجاوز الحد",
                tone: "warning",
                icon: <SlashIcon className="h-4 w-4" />,
                chipClass: "border-gold/25 bg-gold/10 text-gold",
                softClass: "bg-gold/10 text-gold",
            };
        default:
            return {
                label: status || "غير معروف",
                tone: "neutral",
                icon: <AlertTriangleIcon className="h-4 w-4" />,
                chipClass: "border-theme-subtle bg-theme-faint text-theme-subtle",
                softClass: "bg-theme-faint text-theme-subtle",
            };
    }
}

function getActionLabel(action: string) {
    switch (action) {
        case "generate-mockup":
            return "توليد صورة";
        case "extract-design":
            return "عزل التصميم";
        default:
            return action || "عملية غير محددة";
    }
}

function getPromptPreview(prompt: string | null, maxLength = 140) {
    const value = prompt?.trim();
    if (!value) return "عملية بدون وصف نصي";
    const normalized = value.replace(/\s+/g, " ");
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function getPromptFull(prompt: string | null) {
    return prompt?.trim() || "عملية بدون وصف نصي";
}

export function DtfMonitorClient({ initialLogs, totalCount, currentPage }: DtfMonitorClientProps) {
    const totalPages = Math.max(1, Math.ceil(totalCount / 15));
    const [selectedLog, setSelectedLog] = useState<DtfStudioActivityLog | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const pageSnapshot = useMemo(() => {
        const errors = initialLogs.filter((log) => log.status === "error" || log.status === "timeout").length;
        const protectedRequests = initialLogs.filter((log) => log.status === "quota_exceeded").length;
        const users = new Set(initialLogs.map((log) => log.profile_id).filter(Boolean));

        return {
            errors,
            protectedRequests,
            users: users.size,
        };
    }, [initialLogs]);

    const formatDate = (date: string) => {
        if (!mounted) return "جار التحميل";
        return format(new Date(date), "d MMM yyyy - h:mm a", { locale: ar });
    };

    return (
        <>
            <section className="theme-surface-panel overflow-hidden rounded-[28px]">
                <div className="border-b border-theme-subtle p-5 sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-xs font-semibold text-theme-faint">سجل التنفيذ</p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight text-theme md:text-3xl">
                                عمليات التصميم الذكي
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                راقب آخر عمليات التوليد والعزل، افتح تفاصيل أي عملية، وتابع الأخطاء التي تحتاج تدخلاً.
                            </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[440px]">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-3">
                                <p className="text-[11px] text-theme-faint">السجلات</p>
                                <p className="mt-1 text-xl font-black tabular-nums text-theme">{totalCount}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-3">
                                <p className="text-[11px] text-theme-faint">أخطاء الصفحة</p>
                                <p className="mt-1 text-xl font-black tabular-nums text-theme">{pageSnapshot.errors}</p>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-3">
                                <p className="text-[11px] text-theme-faint">مستخدمون</p>
                                <p className="mt-1 text-xl font-black tabular-nums text-theme">{pageSnapshot.users}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {initialLogs.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-theme-subtle bg-theme-faint">
                            <FileTextIcon className="h-6 w-6 text-theme-faint" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-theme">لا توجد عمليات مسجلة</h3>
                        <p className="mt-2 max-w-md text-sm leading-6 text-theme-subtle">
                            سيظهر هنا سجل التوليد والعزل بمجرد استخدام تجربة التصميم الذكي.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto xl:block">
                            <table className="w-full min-w-[980px] text-right text-sm">
                                <thead className="border-b border-theme-subtle bg-theme-faint text-xs text-theme-faint">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">الحالة</th>
                                        <th className="px-5 py-4 font-semibold">العملية</th>
                                        <th className="px-5 py-4 font-semibold">وصف الطلب</th>
                                        <th className="px-5 py-4 text-center font-semibold">المخرج</th>
                                        <th className="px-5 py-4 text-center font-semibold">المستخدم</th>
                                        <th className="px-5 py-4 font-semibold">الوقت</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-faint">
                                    {initialLogs.map((log) => {
                                        const status = getStatusMeta(log.status);
                                        return (
                                            <tr
                                                key={log.id}
                                                tabIndex={0}
                                                role="button"
                                                onClick={() => setSelectedLog(log)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        setSelectedLog(log);
                                                    }
                                                }}
                                                className="cursor-pointer transition-colors hover:bg-theme-faint focus:bg-theme-faint focus:outline-none"
                                            >
                                                <td className="px-5 py-4 align-top">
                                                    <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${status.chipClass}`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </span>
                                                    {log.error_message ? (
                                                        <p className="mt-2 max-w-[240px] truncate text-xs text-red-300" title={log.error_message}>
                                                            {log.error_message}
                                                        </p>
                                                    ) : null}
                                                </td>
                                                <td className="px-5 py-4 align-top">
                                                    <span className="inline-flex rounded-xl border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs font-semibold text-theme-soft">
                                                        {getActionLabel(log.action)}
                                                    </span>
                                                </td>
                                                <td className="max-w-md px-5 py-4 align-top">
                                                    <p className="line-clamp-2 leading-6 text-theme-subtle" dir="auto">
                                                        {getPromptPreview(log.prompt)}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4 text-center align-top">
                                                    {log.result_image_url ? (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setSelectedLog(log);
                                                            }}
                                                            className="relative inline-flex h-14 w-14 overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint transition-colors hover:border-gold/30"
                                                            aria-label="عرض مخرج العملية"
                                                        >
                                                            <Image src={log.result_image_url} alt="مخرج العملية" fill className="object-cover" unoptimized />
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex rounded-xl border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs text-theme-faint">
                                                            غير متاح
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-center align-top">
                                                    <span className="inline-flex items-center gap-2 rounded-xl border border-theme-subtle bg-theme-faint px-3 py-1.5 text-xs text-theme-subtle">
                                                        <UserIcon className="h-3.5 w-3.5 text-gold/70" />
                                                        {log.profile_id ? `${log.profile_id.slice(0, 8)}...` : "زائر"}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 align-top text-xs text-theme-subtle">
                                                    {formatDate(log.created_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="divide-y divide-theme-faint xl:hidden">
                            {initialLogs.map((log) => {
                                const status = getStatusMeta(log.status);
                                return (
                                    <button
                                        key={log.id}
                                        type="button"
                                        onClick={() => setSelectedLog(log)}
                                        className="block w-full p-4 text-right transition-colors hover:bg-theme-faint"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${status.chipClass}`}>
                                                    {status.icon}
                                                    {status.label}
                                                </span>
                                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-theme" dir="auto">
                                                    {getPromptPreview(log.prompt, 112)}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-xl border border-theme-subtle bg-theme-faint px-2.5 py-1 text-[11px] text-theme-subtle">
                                                {getActionLabel(log.action)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-theme-faint">
                                            <span>{formatDate(log.created_at)}</span>
                                            <span className="h-1 w-1 rounded-full bg-theme-faint" />
                                            <span>{log.profile_id ? "مستخدم مسجل" : "زائر"}</span>
                                            {log.result_image_url ? (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-theme-faint" />
                                                    <span>يوجد مخرج</span>
                                                </>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {totalPages > 1 ? (
                    <div className="flex flex-col gap-3 border-t border-theme-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-theme-subtle bg-theme-faint px-3 py-2 text-xs font-semibold text-theme-subtle">
                            صفحة {currentPage} من {totalPages}
                            {pageSnapshot.protectedRequests > 0 ? (
                                <span className="rounded-lg bg-gold/10 px-2 py-0.5 text-gold">
                                    {pageSnapshot.protectedRequests} حماية
                                </span>
                            ) : null}
                        </div>
                        <div className="flex gap-2">
                            {currentPage > 1 ? (
                                <Link
                                    href={`/dashboard/design-orders/dtf-monitor?page=${currentPage - 1}`}
                                    className="inline-flex items-center justify-center rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2 text-sm font-semibold text-theme-subtle transition-colors hover:border-gold/25 hover:text-gold"
                                >
                                    الصفحة السابقة
                                </Link>
                            ) : null}
                            {currentPage < totalPages ? (
                                <Link
                                    href={`/dashboard/design-orders/dtf-monitor?page=${currentPage + 1}`}
                                    className="inline-flex items-center justify-center rounded-xl border border-gold/25 bg-gold/10 px-4 py-2 text-sm font-bold text-gold transition-colors hover:bg-gold/15"
                                >
                                    الصفحة التالية
                                </Link>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </section>

            {selectedLog ? (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_76%,transparent)] p-4 backdrop-blur-xl"
                    onClick={() => setSelectedLog(null)}
                >
                    <section
                        className="theme-surface-panel flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px]"
                        onClick={(event) => event.stopPropagation()}
                        aria-modal="true"
                        role="dialog"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-theme-subtle p-5 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl ${getStatusMeta(selectedLog.status).softClass}`}>
                                    {getStatusMeta(selectedLog.status).icon}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-theme-faint">تفاصيل العملية</p>
                                    <h3 className="mt-1 text-xl font-black text-theme">تشخيص عملية التصميم</h3>
                                    <p className="mt-1 text-xs text-theme-faint">
                                        معرف التتبع: {selectedLog.id.split("-").pop()?.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-xl border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-colors hover:text-theme"
                                aria-label="إغلاق التفاصيل"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 sm:p-6">
                            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                            <div className="flex items-start gap-3">
                                                <KeyIcon className="mt-1 h-4 w-4 text-gold" />
                                                <div className="min-w-0">
                                                    <p className="text-xs text-theme-faint">معرف المستخدم</p>
                                                    <p className="mt-1 break-all text-sm font-medium text-theme" dir="ltr">
                                                        {selectedLog.profile_id || "جلسة زائر"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <ClockIcon className="mt-1 h-4 w-4 text-gold" />
                                                <div>
                                                    <p className="text-xs text-theme-faint">وقت العملية</p>
                                                    <p className="mt-1 text-sm font-medium text-theme">{formatDate(selectedLog.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <RefreshCwIcon className="mt-1 h-4 w-4 text-gold" />
                                                <div>
                                                    <p className="text-xs text-theme-faint">نوع العملية</p>
                                                    <p className="mt-1 text-sm font-medium text-theme">{getActionLabel(selectedLog.action)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedLog.error_message ? (
                                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                                            <div className="flex items-center gap-2 text-red-300">
                                                <AlertTriangleIcon className="h-4 w-4" />
                                                <p className="text-sm font-bold">رسالة الخطأ</p>
                                            </div>
                                            <p className="mt-3 break-words text-sm leading-6 text-red-100">
                                                {selectedLog.error_message}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
                                            لا توجد رسالة خطأ مرتبطة بهذه العملية.
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                        <div className="mb-3 flex items-center gap-2">
                                            <FileTextIcon className="h-4 w-4 text-gold" />
                                            <p className="text-sm font-bold text-theme">مدخلات التصميم</p>
                                        </div>
                                        <div className="max-h-44 overflow-y-auto rounded-2xl border border-theme-subtle bg-[color:var(--wusha-surface)] p-4">
                                            <p className="whitespace-pre-wrap text-sm leading-7 text-theme-subtle" dir="auto">
                                                {getPromptFull(selectedLog.prompt)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-theme-subtle bg-theme-faint p-4">
                                        <div className="mb-3 flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-gold" />
                                            <p className="text-sm font-bold text-theme">مخرجات التوليد</p>
                                        </div>
                                        {selectedLog.result_image_url ? (
                                            <Link
                                                href={selectedLog.result_image_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative block aspect-video overflow-hidden rounded-2xl border border-theme-subtle bg-theme-faint"
                                            >
                                                <Image src={selectedLog.result_image_url} alt="مخرج التوليد" fill className="object-contain p-3" unoptimized />
                                                <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-[color:var(--wusha-surface)]/90 px-3 py-2 text-xs font-bold text-gold backdrop-blur">
                                                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                                                    فتح الصورة
                                                </span>
                                            </Link>
                                        ) : (
                                            <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-theme-subtle bg-theme-faint text-center">
                                                <ImageIcon className="h-7 w-7 text-theme-faint" />
                                                <p className="mt-3 text-sm text-theme-subtle">لا توجد صورة ناتجة لهذه العملية.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            ) : null}
        </>
    );
}
