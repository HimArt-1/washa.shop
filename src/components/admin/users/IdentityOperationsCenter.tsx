"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { ComponentType } from "react";
import {
    BadgeCheck,
    MailWarning,
    Sparkles,
    UserCog,
    Users,
} from "lucide-react";
import { UsersClient } from "@/components/admin/UsersClient";

interface IdentityOperationsCenterProps {
    snapshot: {
        stats: {
            total: number;
            admin: number;
            wushsha: number;
            subscriber: number;
            verified: number;
            recent7d: number;
            tempProfiles: number;
            missingContact: number;
            acceptedWithoutProfile: number;
            acceptedWithoutClerk: number;
        };
        identityBacklog: any[];
        profileHygieneQueue: any[];
        recentProfiles: any[];
    };
    clientProps: {
        users: any[];
        count: number;
        totalPages: number;
        currentPage: number;
        currentRole: string;
        currentSearch: string;
        stats: { total: number; wushsha: number; subscriber: number; admin: number };
    };
}

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

function IdentityBacklogLane({
    title,
    subtitle,
    emptyState,
    items,
    tone,
    variant,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: any[];
    tone: "critical" | "warning" | "calm";
    variant: "applications" | "profiles" | "recent";
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
                    items.map((item) => {
                        const href =
                            variant === "applications"
                                ? `/dashboard/applications/${item.id}`
                                : `/dashboard/users/${item.id}`;

                        return (
                            <Link
                                key={item.id}
                                href={href}
                                className={`block rounded-2xl border p-4 transition-all hover:border-gold/30 ${toneClass}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-theme">
                                            {variant === "applications" ? item.full_name : item.display_name || item.username || "مستخدم"}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-theme-subtle">
                                            {variant === "applications"
                                                ? item.email || item.art_style || "طلب انضمام"
                                                : item.email || `@${item.username || "—"}`}
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-bold text-theme-subtle">
                                        {variant === "applications" ? "طلب" : item.role || "profile"}
                                    </span>
                                </div>

                                <div className="mt-3 text-xs leading-6 text-theme-subtle">
                                    {variant === "applications"
                                        ? !item.hasProfile
                                            ? "تم قبول الطلب لكن لم يُنشأ profile بعد."
                                            : !item.hasClerkAccount
                                              ? "تم إنشاء profile لكن حساب Clerk ما زال غير مكتمل."
                                              : "الهوية مكتملة."
                                        : variant === "profiles"
                                          ? String(item.clerk_id || "").startsWith("app_")
                                              ? "هذا profile مؤقت ما زال يحمل clerk_id مرحليًا."
                                              : !item.email && !item.phone
                                                ? "يفتقد البريد والهاتف معًا."
                                                : !item.email
                                                  ? "يفتقد البريد الإلكتروني."
                                                  : !item.phone
                                                    ? "يفتقد رقم الهاتف."
                                                    : "ملف نظيف."
                                          : `انضم ${formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ar })}`}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

export function IdentityOperationsCenter({
    snapshot,
    clientProps,
}: IdentityOperationsCenterProps) {
    const missionTone =
        snapshot.stats.acceptedWithoutProfile > 0 || snapshot.stats.acceptedWithoutClerk > 0
            ? "critical"
            : snapshot.stats.tempProfiles > 0 || snapshot.stats.missingContact > 0
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
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                                تشغيل الهوية
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical" ? "تعطّل في الهوية" : missionTone === "warning" ? "تحتاج مراجعة" : "مستقرة"}
                            </span>
                        </div>
                        <h2 className="mt-3 text-2xl font-black text-theme md:text-3xl">مكتب المستخدمين</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                            إدارة الأدوار، المستويات، البحث، التصدير، وربط ملفات المستخدمين.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/users-clerk"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-bold text-gold transition-colors hover:bg-gold/15"
                    >
                        مستخدمو Clerk
                        <UserCog className="h-4 w-4" />
                    </Link>
                </div>
            </motion.section>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <UsersClient
                    users={clientProps.users}
                    count={clientProps.count}
                    totalPages={clientProps.totalPages}
                    currentPage={clientProps.currentPage}
                    currentRole={clientProps.currentRole}
                    currentSearch={clientProps.currentSearch}
                    stats={clientProps.stats}
                    hideStatsSummary
                />
            </motion.section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="ملفات المستخدمين"
                    value={String(snapshot.stats.total)}
                    subtitle="إجمالي ملفات المستخدمين الموجودة على المنصة."
                    icon={Users}
                    accent="#60a5fa"
                />
                <SummaryCard
                    title="موثقة"
                    value={String(snapshot.stats.verified)}
                    subtitle="عدد الحسابات الموثقة داخل المنصة."
                    icon={BadgeCheck}
                    accent="#34d399"
                />
                <SummaryCard
                    title="الوشّايون"
                    value={String(snapshot.stats.wushsha)}
                    subtitle="عدد الوشّايين النشطين داخل ملفات profiles."
                    icon={Sparkles}
                    accent="#c084fc"
                />
                <SummaryCard
                    title="ملفات مؤقتة"
                    value={String(snapshot.stats.tempProfiles)}
                    subtitle="ملفات تحمل clerk_id مرحليًا وتحتاج إكمال الربط."
                    icon={UserCog}
                    accent="#f87171"
                />
                <SummaryCard
                    title="نقص التواصل"
                    value={String(snapshot.stats.missingContact)}
                    subtitle="ملفات ينقصها البريد أو الهاتف."
                    icon={MailWarning}
                    accent="#f59e0b"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <IdentityBacklogLane
                    title="طابور القبول"
                    subtitle="طلبات مقبولة لم تصل بعد إلى profile أو Clerk مكتمل."
                    emptyState="لا توجد طلبات مقبولة معلقة على مستوى الهوية."
                    items={snapshot.identityBacklog}
                    tone="critical"
                    variant="applications"
                />
                <IdentityBacklogLane
                    title="طابور نظافة الملفات"
                    subtitle="ملفات مؤقتة أو ملفات ينقصها البريد أو الهاتف."
                    emptyState="جميع الملفات الرئيسية نظيفة على مستوى الربط وبيانات التواصل."
                    items={snapshot.profileHygieneQueue}
                    tone="warning"
                    variant="profiles"
                />
                <IdentityBacklogLane
                    title="آخر المنضمين"
                    subtitle="آخر الملفات التي دخلت النظام لمراجعة جودة الربط والنمو."
                    emptyState="لا توجد ملفات مستخدمين حديثة بعد."
                    items={snapshot.recentProfiles}
                    tone="calm"
                    variant="recent"
                />
            </div>

        </div>
    );
}
