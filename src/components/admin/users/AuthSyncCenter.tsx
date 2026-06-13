"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { ComponentType, ReactNode } from "react";
import {
    AlertTriangle,
    Check,
    Link2,
    Merge,
    ShieldCheck,
    ShieldX,
    UserCog,
    UserPlus,
    Users,
} from "lucide-react";
import { mergeDuplicateProfiles, type ClerkUserWithProfile } from "@/app/actions/clerk-users";
import { ClerkUsersClient } from "@/components/admin/ClerkUsersClient";

const panelClass =
    "theme-surface-panel relative overflow-hidden rounded-[28px]";

const subtlePanelClass =
    "theme-surface-panel rounded-[24px]";

function SummaryCard({
    title,
    value,
    icon: Icon,
    accent,
}: {
    title: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    accent: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3"
        >
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-theme-faint">{title}</p>
                    <p className="mt-1 text-2xl font-black text-theme tabular-nums">{value}</p>
                </div>
                <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                    style={{
                        backgroundColor: `${accent}18`,
                        borderColor: `${accent}33`,
                        color: accent,
                    }}
                >
                    <Icon className="h-4 w-4" />
                </div>
            </div>
        </motion.div>
    );
}

function QueueCard({
    title,
    subtitle,
    emptyState,
    items,
    renderItem,
}: {
    title: string;
    subtitle: string;
    emptyState: string;
    items: any[];
    renderItem: (item: any) => ReactNode;
}) {
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
                    items.map(renderItem)
                ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-theme-subtle">
                        {emptyState}
                    </div>
                )}
            </div>
        </motion.section>
    );
}

interface AuthSyncCenterProps {
    snapshot: {
        stats: {
            totalClerkUsers: number;
            linked: number;
            emailMatches: number;
            clerkOnly: number;
            tempProfiles: number;
            duplicateEmailGroups: number;
            duplicateProfiles: number;
        };
        recoverableQueue: ClerkUserWithProfile[];
        clerkOnlyQueue: ClerkUserWithProfile[];
        tempProfilesQueue: Array<{
            id: string;
            display_name: string | null;
            username: string | null;
            email: string | null;
            created_at: string;
            clerk_id: string | null;
        }>;
        duplicateEmailQueue: Array<{
            email: string;
            profiles: Array<{
                id: string;
                display_name: string | null;
                username: string | null;
                clerk_id: string;
                created_at: string;
            }>;
            mergeSuggestion: {
                primaryProfileId: string;
                secondaryProfileId: string;
            } | null;
        }>;
    };
    clientProps: {
        users: ClerkUserWithProfile[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
        currentSearch: string;
    };
}

type DuplicateEmailGroup = AuthSyncCenterProps["snapshot"]["duplicateEmailQueue"][number];
type DuplicateEmailProfile = DuplicateEmailGroup["profiles"][number];

export function AuthSyncCenter({ snapshot, clientProps }: AuthSyncCenterProps) {
    const [isMerging, startMergeTransition] = useTransition();
    const [mergeState, setMergeState] = useState<{ key: string | null; error: string | null; success: string | null }>({
        key: null,
        error: null,
        success: null,
    });

    const missionTone =
        snapshot.stats.duplicateEmailGroups > 0 || snapshot.stats.duplicateProfiles > 0
            ? "critical"
            : snapshot.stats.emailMatches > 0
            ? "warning"
            : snapshot.stats.clerkOnly > 0 || snapshot.stats.tempProfiles > 0
              ? "critical"
              : "calm";

    const missionToneClass =
        missionTone === "critical"
            ? "border-red-500/20 bg-red-500/10 text-red-200"
            : missionTone === "warning"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    const reviewCount =
        snapshot.stats.emailMatches +
        snapshot.stats.clerkOnly +
        snapshot.stats.tempProfiles +
        snapshot.stats.duplicateEmailGroups;

    return (
        <div className="space-y-6">
            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${panelClass} p-5 md:p-6`}
            >
                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${missionToneClass}`}>
                                {missionTone === "critical"
                                    ? "تحتاج مراجعة"
                                    : missionTone === "warning"
                                      ? "قابلة للربط"
                                      : "متزامنة"}
                            </span>
                            <span className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[11px] font-bold text-theme-subtle">
                                {reviewCount > 0 ? `${reviewCount} حالة متابعة` : "لا توجد حالات مفتوحة"}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-theme">مزامنة الهوية</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                            راجع حسابات الدخول واربطها بملفات المنصة عند الحاجة.
                        </p>
                    </div>

                    <Link
                        href="/dashboard/users"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-bold text-theme transition hover:border-gold/30 hover:text-gold"
                    >
                        <UserCog className="h-4 w-4" />
                        مركز الهوية
                    </Link>
                </div>
            </motion.section>

            <ClerkUsersClient {...clientProps} hideSummary />

            <section className={`${panelClass} p-5 md:p-6`}>
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h3 className="text-xl font-black text-theme">مراجعة الحالات</h3>
                        <p className="mt-2 text-sm leading-6 text-theme-subtle">
                            ملخص مختصر للحالات التي قد تحتاج ربطًا أو تنظيفًا.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs font-bold text-theme-subtle">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                        {snapshot.stats.linked} مرتبطة
                    </span>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <SummaryCard
                        title="حسابات الدخول"
                        value={String(snapshot.stats.totalClerkUsers)}
                        icon={Users}
                        accent="#d4af37"
                    />
                    <SummaryCard
                        title="مرتبطة"
                        value={String(snapshot.stats.linked)}
                        icon={ShieldCheck}
                        accent="#10b981"
                    />
                    <SummaryCard
                        title="قابلة للربط"
                        value={String(snapshot.stats.emailMatches)}
                        icon={Link2}
                        accent="#f59e0b"
                    />
                    <SummaryCard
                        title="بدون ملف"
                        value={String(snapshot.stats.clerkOnly)}
                        icon={AlertTriangle}
                        accent="#ef4444"
                    />
                    <SummaryCard
                        title="بريد مكرر"
                        value={String(snapshot.stats.duplicateEmailGroups)}
                        icon={ShieldX}
                        accent="#ef4444"
                    />
                    <SummaryCard
                        title="ملفات مؤقتة"
                        value={String(snapshot.stats.tempProfiles)}
                        icon={UserPlus}
                        accent="#38bdf8"
                    />
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                <QueueCard
                    title="تضارب البريد"
                    subtitle="أكثر من ملف يستخدم البريد نفسه."
                    emptyState="لا توجد تضاربات بريدية مرئية حاليًا."
                    items={snapshot.duplicateEmailQueue}
                    renderItem={(item: DuplicateEmailGroup) => (
                        <div key={item.email} className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme" dir="ltr">{item.email}</p>
                                    <p className="mt-1 text-xs text-theme-subtle">
                                        {item.profiles.length} ملفات تشترك في هذا البريد
                                    </p>
                                </div>
                                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-200">
                                    تعارض
                                </span>
                            </div>
                            <div className="mt-3 space-y-2">
                                {item.profiles.slice(0, 3).map((profile: DuplicateEmailProfile) => (
                                    <Link
                                        key={profile.id}
                                        href={`/dashboard/users/${profile.id}`}
                                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-theme-subtle transition hover:border-gold/20"
                                    >
                                        <span className="truncate">
                                            {profile.display_name || profile.username || profile.id}
                                        </span>
                                        <span className="font-mono text-[10px] text-theme-faint">
                                            {profile.clerk_id?.slice(0, 12)}...
                                        </span>
                                    </Link>
                                ))}
                            </div>
                            {item.mergeSuggestion ? (
                                <div className="mt-4 border-t border-white/10 pt-4">
                                    <button
                                        onClick={() => {
                                            setMergeState({ key: item.email, error: null, success: null });
                                            startMergeTransition(async () => {
                                                const result = await mergeDuplicateProfiles(
                                                    item.mergeSuggestion!.primaryProfileId,
                                                    item.mergeSuggestion!.secondaryProfileId
                                                );

                                                if (!result.success) {
                                                    setMergeState({ key: item.email, error: result.error || "فشل الدمج", success: null });
                                                    return;
                                                }

                                                setMergeState({ key: item.email, error: null, success: "تم الدمج بنجاح. حدّث الصفحة لرؤية النتيجة." });
                                            });
                                        }}
                                        disabled={isMerging}
                                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/15 disabled:opacity-60"
                                    >
                                        <Merge className="h-3.5 w-3.5" />
                                        {isMerging && mergeState.key === item.email ? "جارٍ الدمج..." : "دمج ذكي"}
                                    </button>
                                    <p className="mt-2 text-[11px] leading-5 text-theme-faint">
                                        سيُبقي النظام على الملف الأقوى ويرحل العلاقات من الملف الثانوي إليه.
                                    </p>
                                    {mergeState.key === item.email && mergeState.error ? (
                                        <p className="mt-2 text-[11px] font-medium text-red-200">{mergeState.error}</p>
                                    ) : null}
                                    {mergeState.key === item.email && mergeState.success ? (
                                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200">
                                            <Check className="h-3 w-3" />
                                            {mergeState.success}
                                        </p>
                                    ) : null}
                                </div>
                            ) : (
                                <p className="mt-4 text-[11px] leading-5 text-theme-faint">
                                    هذه المجموعة تحتاج مراجعة يدوية لأنها تحتوي أكثر من ملفين.
                                </p>
                            )}
                        </div>
                    )}
                />

                <QueueCard
                    title="قابلة للربط"
                    subtitle="حسابات دخول لها ملف مطابق بالبريد."
                    emptyState="لا توجد حالات قابلة للربط الآن."
                    items={snapshot.recoverableQueue}
                    renderItem={(item: ClerkUserWithProfile) => (
                        <div key={item.id} className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme">{item.name}</p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">{item.email || "بدون بريد"}</p>
                                </div>
                                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200">
                                    قابل للربط
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-theme-subtle">
                                الملف المطابق: {item.emailMatchedProfile?.display_name || item.emailMatchedProfile?.username || "—"}
                            </p>
                            {item.emailMatchedProfile && (
                                <Link
                                    href={`/dashboard/users/${item.emailMatchedProfile.id}`}
                                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gold hover:text-gold/80"
                                >
                                    <Link2 className="h-3.5 w-3.5" />
                                    مراجعة الملف قبل الربط
                                </Link>
                            )}
                        </div>
                    )}
                />

                <QueueCard
                    title="بدون ملف منصة"
                    subtitle="حسابات دخول لم ترتبط بملف منصة."
                    emptyState="كل حسابات الدخول لديها ملفات منصة."
                    items={snapshot.clerkOnlyQueue}
                    renderItem={(item: ClerkUserWithProfile) => (
                        <div key={item.id} className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme">{item.name}</p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">{item.email || "بدون بريد"}</p>
                                </div>
                                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-200">
                                    بلا ملف
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-theme-subtle">
                                يحتاج مراجعة: إنشاء ملف أو ربطه بطلب/ملف موجود.
                            </p>
                        </div>
                    )}
                />

                <QueueCard
                    title="ملفات مؤقتة"
                    subtitle="ملفات تحتاج ربطًا نهائيًا بحساب دخول."
                    emptyState="لا توجد ملفات مؤقتة حاليًا."
                    items={snapshot.tempProfilesQueue}
                    renderItem={(item) => (
                        <Link
                            key={item.id}
                            href={`/dashboard/users/${item.id}`}
                            className="block rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] p-4 transition hover:border-sky-400/30"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme">
                                        {item.display_name || item.username || "ملف مؤقت"}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">{item.email || item.clerk_id || "بدون بريد"}</p>
                                </div>
                                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-200">
                                    مؤقت
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-theme-subtle">
                                أُنشئ {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ar })}
                            </p>
                        </Link>
                    )}
                />
                </div>
            </section>
        </div>
    );
}
