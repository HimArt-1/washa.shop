"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import type { ComponentType } from "react";
import {
    BadgeCheck,
    Clock3,
    MailWarning,
    ShieldAlert,
    Sparkles,
    UserCog,
    UserPlus,
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
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${panelClass} p-6 md:p-7`}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.14),transparent_32%)]" />
                    <div className="relative space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-sky-200 uppercase">
                                Identity Operations Center
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${missionToneClass}`}>
                                {missionTone === "critical" ? "تعطّل في الهوية" : missionTone === "warning" ? "نظافة البيانات تحتاج تدخلًا" : "هوية مستقرة"}
                            </span>
                        </div>

                        <div className="max-w-3xl space-y-4">
                            <h2 className="text-3xl font-black leading-tight text-theme md:text-4xl">
                                مركز تشغيل الهوية لربط الطلبات المقبولة، ملفات المستخدمين، وحالة البيانات من شاشة واحدة.
                            </h2>
                            <p className="max-w-2xl text-sm leading-7 text-theme-subtle md:text-base">
                                هذه الطبقة تكشف أين تتوقف رحلة المستخدم بعد القبول: ملفات مؤقتة، نقص بيانات تواصل،
                                وحسابات تحتاج ربطًا أو إكمالًا قبل أن تصبح قابلة للتشغيل الكامل.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">تعطّل القبول</p>
                                <p className="mt-3 text-3xl font-black text-theme">
                                    {snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">طلبات مقبولة لم تصل بعد إلى هوية تشغيلية مكتملة.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">نظافة البيانات</p>
                                <p className="mt-3 text-3xl font-black text-theme">
                                    {snapshot.stats.tempProfiles + snapshot.stats.missingContact}
                                </p>
                                <p className="mt-2 text-sm text-theme-subtle">ملفات مؤقتة أو ملفات ينقصها البريد أو الهاتف.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-theme-faint">النمو الحديث</p>
                                <p className="mt-3 text-3xl font-black text-theme">{snapshot.stats.recent7d}</p>
                                <p className="mt-2 text-sm text-theme-subtle">عدد الملفات التي انضمت خلال آخر 7 أيام.</p>
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
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
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
                                <UserPlus className="h-4 w-4" />
                                <span className="text-sm font-bold">handoff القبول</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk > 0
                                    ? `هناك ${snapshot.stats.acceptedWithoutProfile + snapshot.stats.acceptedWithoutClerk} طلبات مقبولة لم تُستكمل هويتها بعد.`
                                    : "كل الطلبات المقبولة انتقلت إلى هوية تشغيلية مكتملة."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-amber-200">
                                <MailWarning className="h-4 w-4" />
                                <span className="text-sm font-bold">جودة البيانات</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                {snapshot.stats.missingContact > 0 || snapshot.stats.tempProfiles > 0
                                    ? `${snapshot.stats.missingContact} ملفات ناقصة التواصل و${snapshot.stats.tempProfiles} ملفات مؤقتة تحتاج تنظيفًا.`
                                    : "لا توجد ملفات مؤقتة أو بيانات تواصل ناقصة حاليًا."}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                            <div className="flex items-center gap-2 text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-sm font-bold">الرؤية الموحدة</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-theme-subtle">
                                يمكنك من هنا متابعة profiles ثم الانتقال إلى [Clerk] لإدارة نظام المصادقة نفسه.
                            </p>
                            <Link
                                href="/dashboard/users-clerk"
                                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-gold hover:text-gold-light"
                            >
                                فتح مستخدمي Clerk
                                <UserCog className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </motion.aside>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <SummaryCard
                    title="Profiles"
                    value={String(snapshot.stats.total)}
                    subtitle="إجمالي ملفات المستخدمين الموجودة على المنصة."
                    icon={Users}
                    accent="#60a5fa"
                />
                <SummaryCard
                    title="Verified"
                    value={String(snapshot.stats.verified)}
                    subtitle="عدد الحسابات الموثقة داخل المنصة."
                    icon={BadgeCheck}
                    accent="#34d399"
                />
                <SummaryCard
                    title="Wushsha"
                    value={String(snapshot.stats.wushsha)}
                    subtitle="عدد الوشّايين النشطين داخل ملفات profiles."
                    icon={Sparkles}
                    accent="#c084fc"
                />
                <SummaryCard
                    title="Temp Profiles"
                    value={String(snapshot.stats.tempProfiles)}
                    subtitle="ملفات تحمل clerk_id مرحليًا وتحتاج إكمال الربط."
                    icon={UserCog}
                    accent="#f87171"
                />
                <SummaryCard
                    title="Contact Gaps"
                    value={String(snapshot.stats.missingContact)}
                    subtitle="ملفات ينقصها البريد أو الهاتف."
                    icon={MailWarning}
                    accent="#f59e0b"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <IdentityBacklogLane
                    title="Backlog القبول"
                    subtitle="طلبات مقبولة لم تصل بعد إلى profile أو Clerk مكتمل."
                    emptyState="لا توجد طلبات مقبولة معلقة على مستوى الهوية."
                    items={snapshot.identityBacklog}
                    tone="critical"
                    variant="applications"
                />
                <IdentityBacklogLane
                    title="طابور نظافة الملفات"
                    subtitle="Profiles مؤقتة أو ملفات ينقصها البريد أو الهاتف."
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

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${subtlePanelClass} p-5`}
            >
                <div className="mb-5">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-theme-faint">Execution Desk</p>
                    <h3 className="mt-2 text-xl font-bold text-theme">مكتب تشغيل المستخدمين</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-theme-subtle">
                        جدول التنفيذ الكامل يبقى هنا: تعديل الأدوار، المستويات، البحث، التصدير، وإدارة الملفات.
                    </p>
                </div>

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
        </div>
    );
}
