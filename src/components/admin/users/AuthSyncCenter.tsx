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
    "relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(8,8,8,0.92))] backdrop-blur-xl";

const subtlePanelClass =
    "rounded-[24px] border border-white/8 bg-white/[0.03] backdrop-blur-xl";

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
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">{title}</p>
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

    return (
        <div className="space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                                Auth Sync Center
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical"
                                    ? "يوجد انفصال في الهوية"
                                    : missionTone === "warning"
                                      ? "يمكن توحيد الحسابات بأمان"
                                      : "الهوية متزامنة"}
                            </span>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h2 className="text-3xl font-black leading-tight text-theme md:text-4xl">
                                الشخص الواحد يجب أن يرى هوية واحدة، لا حسابين متفرقين.
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذا المركز يربط بين حساب الدخول في Clerk وملف المنصة الداخلي، ويكشف فقط الحالات التي تحتاج
                                إصلاحًا: تطابق بالبريد يمكن ربطه، حسابات دخول بلا profile، أو ملفات مؤقتة لم تكتمل بعد.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">الحسابات المرتبطة</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.linked}</p>
                                <p className="mt-2 text-sm text-theme-subtle">هذه الحسابات تعمل كهوية موحّدة سليمة داخل المنصة.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">قابلة للربط</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.emailMatches}</p>
                                <p className="mt-2 text-sm text-theme-subtle">نفس الشخص ظاهر في Clerk وprofile ويمكن دمجه بأمان.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">حالات منفصلة</p>
                                <p className="mt-3 text-3xl font-black text-theme">
                                    {snapshot.stats.clerkOnly + snapshot.stats.tempProfiles}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">إما حساب دخول بلا profile أو profile مؤقت لم يكتمل.</p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`${subtlePanelClass} p-5`}
                >
                    <div className="mb-5 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-300" />
                        <h3 className="text-lg font-bold text-theme">سياسة الهوية</h3>
                    </div>
                    <div className="space-y-4 text-sm leading-7 text-theme-subtle">
                        <p>Clerk ليس حسابًا ثانيًا للمستخدم. هو طبقة الدخول فقط، بينما profile هو سجل العمل داخل المنصة.</p>
                        <p>المشكلة ليست وجود الجدولين، بل فقدان الربط بينهما. لذلك الحل الصحيح هو توحيد العرض والإدارة والربط.</p>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">إجراء الإدارة التالي</p>
                            <p className="mt-3 text-base font-bold text-theme">
                                نظّف البريد المكرر أولًا، ثم اربط الحالات المطابقة بالبريد، ثم عالج الملفات المؤقتة.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/users"
                            className="inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold/80"
                        >
                            <UserCog className="h-4 w-4" />
                            فتح مركز الهوية العام
                        </Link>
                    </div>
                </motion.section>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Clerk Users"
                    value={String(snapshot.stats.totalClerkUsers)}
                    subtitle="إجمالي حسابات الدخول المرئية في Clerk."
                    icon={Users}
                    accent="#d4af37"
                />
                <SummaryCard
                    title="Linked"
                    value={String(snapshot.stats.linked)}
                    subtitle="مرتبطة مباشرة بـ profile داخل المنصة."
                    icon={ShieldCheck}
                    accent="#10b981"
                />
                <SummaryCard
                    title="Email Match"
                    value={String(snapshot.stats.emailMatches)}
                    subtitle="مطابقة بالبريد ويمكن ربطها آليًا بأمان."
                    icon={Link2}
                    accent="#f59e0b"
                />
                <SummaryCard
                    title="Clerk Only"
                    value={String(snapshot.stats.clerkOnly)}
                    subtitle="حسابات دخول بلا ملف منصة حتى الآن."
                    icon={AlertTriangle}
                    accent="#ef4444"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <SummaryCard
                    title="Duplicate Emails"
                    value={String(snapshot.stats.duplicateEmailGroups)}
                    subtitle="عدد مجموعات البريد المكرر داخل ملفات المنصة."
                    icon={ShieldX}
                    accent="#ef4444"
                />
                <SummaryCard
                    title="Profiles in Conflict"
                    value={String(snapshot.stats.duplicateProfiles)}
                    subtitle="إجمالي الملفات الداخلة في تضارب بريد يجب تنظيفه قبل فرض uniqueness."
                    icon={AlertTriangle}
                    accent="#f97316"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <QueueCard
                    title="تضارب البريد"
                    subtitle="ملفات منصة متعددة تستخدم نفس البريد. هذه أهم حالات التنظيف قبل فرض uniqueness."
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
                                    conflict
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
                    title="طابور الربط الآمن"
                    subtitle="حسابات Clerk التي تطابق profile بالبريد ويمكن توحيدها من نفس الشاشة."
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
                    title="Clerk بدون منصة"
                    subtitle="حسابات دخول موجودة لكن لا يوجد لها profile داخل المنصة."
                    emptyState="كل حسابات Clerk لديها ملفات منصة."
                    items={snapshot.clerkOnlyQueue}
                    renderItem={(item: ClerkUserWithProfile) => (
                        <div key={item.id} className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-theme">{item.name}</p>
                                    <p className="mt-1 truncate text-xs text-theme-subtle">{item.email || "بدون بريد"}</p>
                                </div>
                                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-200">
                                    بلا profile
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-theme-subtle">
                                يحتاج قرارًا: إنشاء profile أو ربطه لاحقًا بطلب/ملف موجود.
                            </p>
                        </div>
                    )}
                />

                <QueueCard
                    title="Profiles مؤقتة"
                    subtitle="ملفات منصة مرحلية تحمل `app_` وتحتاج ربطًا نهائيًا بحساب Clerk."
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
                                    <p className="mt-1 truncate text-xs text-theme-subtle">{item.email || item.clerk_id || "app profile"}</p>
                                </div>
                                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-200">
                                    temp
                                </span>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-theme-subtle">
                                أُنشئ {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ar })}
                            </p>
                        </Link>
                    )}
                />
            </div>

            <ClerkUsersClient {...clientProps} hideSummary />
        </div>
    );
}
