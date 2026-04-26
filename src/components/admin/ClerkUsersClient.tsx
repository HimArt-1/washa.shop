"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    ExternalLink,
    Link2,
    LogIn,
    Search,
    ShieldCheck,
    UserCog,
    UserPlus,
    Users,
} from "lucide-react";
import { linkClerkUserToProfile, type ClerkUserWithProfile } from "@/app/actions/clerk-users";

const ROLE_LABELS: Record<string, string> = {
    admin: "مسؤول",
    manager: "مدير",
    booth: "نقطة بيع (بوث)",
    wushsha: "وشّاي",
    artist: "فنان",
    subscriber: "مشترك",
    buyer: "مشتري",
    guest: "زائر",
};

function formatDate(ms: number) {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getSyncBadge(syncState: ClerkUserWithProfile["syncState"]) {
    if (syncState === "linked") {
        return {
            label: "مربوط",
            className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
            icon: ShieldCheck,
        };
    }

    if (syncState === "email_match") {
        return {
            label: "قابل للربط",
            className: "border-amber-500/20 bg-amber-500/10 text-amber-200",
            icon: Link2,
        };
    }

    return {
        label: "بدون ملف",
        className: "border-red-500/20 bg-red-500/10 text-red-200",
        icon: AlertTriangle,
    };
}

interface ClerkUsersClientProps {
    users: ClerkUserWithProfile[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    currentSearch: string;
    hideSummary?: boolean;
}

export function ClerkUsersClient({
    users,
    totalCount,
    totalPages,
    currentPage,
    currentSearch,
    hideSummary = false,
}: ClerkUsersClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);
    const [isPending, startTransition] = useTransition();
    const [isLinking, startLinkTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [linkingKey, setLinkingKey] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const exportToCSV = () => {
        const headers = ["Clerk ID", "Name", "Email", "Sync State", "Platform Role", "Created At", "Last Sign In"];
        const rows = users.map((u) => [
            u.id,
            `"${u.name || ""}"`,
            u.email || "",
            u.syncState,
            u.profile?.role || u.emailMatchedProfile?.role || "none",
            new Date(u.createdAt).toLocaleString("ar-SA"),
            u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString("ar-SA") : "Never",
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8,\uFEFF" +
            headers.join(",") +
            "\n" +
            rows.map((e) => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `wusha_auth_sync_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const navigate = (params: { page?: string; search?: string }) => {
        const sp = new URLSearchParams();
        if (params.page && params.page !== "1") sp.set("page", params.page);
        if (params.search) sp.set("search", params.search);
        startTransition(() => {
            router.push(`/dashboard/users-clerk?${sp.toString()}`);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({ search, page: "1" });
    };

    const handleLink = (user: ClerkUserWithProfile) => {
        if (!user.emailMatchedProfile) return;

        setErrorMessage(null);
        setLinkingKey(user.id);
        startLinkTransition(async () => {
            const result = await linkClerkUserToProfile(user.id, user.emailMatchedProfile!.id);
            if (!result.success) {
                setErrorMessage(result.error || "فشل ربط الحساب");
                setLinkingKey(null);
                return;
            }

            router.refresh();
            setLinkingKey(null);
        });
    };

    return (
        <div className="space-y-6">
            {!hideSummary && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel rounded-2xl p-4 backdrop-blur-sm sm:p-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gold/10 p-2.5">
                            <Users className="h-5 w-5 text-gold" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-theme-subtle">إجمالي مستخدمي Clerk</p>
                            <p className="text-xl font-bold text-theme sm:text-2xl">{totalCount}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <Link
                    href="/dashboard/users"
                    className="inline-flex min-h-[40px] items-center gap-2 text-sm text-theme-subtle transition-colors hover:text-gold"
                >
                    <UserCog className="h-4 w-4" />
                    العودة إلى مركز الهوية
                </Link>

                <form onSubmit={handleSearch} className="relative w-full sm:w-auto">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-faint" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالبريد أو الاسم أو المعرف..."
                        className="input-dark w-full rounded-xl py-2.5 pl-4 pr-10 text-sm sm:w-72"
                    />
                </form>

                <button
                    onClick={exportToCSV}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm font-medium text-theme transition-all hover:border-gold/20 hover:text-gold"
                >
                    <Download className="h-4 w-4" />
                    تصدير (CSV)
                </button>
            </div>

            {errorMessage && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {errorMessage}
                </div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="theme-surface-panel overflow-hidden rounded-2xl"
            >
                <div className="overflow-x-auto">
                    <table className="min-w-[980px] w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle bg-theme-faint">
                                <th className="px-4 py-4 text-right font-medium text-theme-soft">المستخدم</th>
                                <th className="px-4 py-4 text-right font-medium text-theme-soft">الحالة</th>
                                <th className="px-4 py-4 text-right font-medium text-theme-soft">البريد</th>
                                <th className="px-4 py-4 text-right font-medium text-theme-soft">هوية المنصة</th>
                                <th className="px-4 py-4 text-right font-medium text-theme-soft">تاريخ التسجيل</th>
                                <th className="px-4 py-4 text-right font-medium text-theme-soft">آخر دخول</th>
                                <th className="w-36 px-4 py-4 text-right font-medium text-theme-soft">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-theme-subtle">
                                            لا توجد حسابات مطابقة لهذا البحث
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user, index) => {
                                        const badge = getSyncBadge(user.syncState);
                                        const BadgeIcon = badge.icon;

                                        return (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                className="border-b border-theme-faint transition-colors hover:bg-theme-faint"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-theme-subtle">
                                                            {user.imageUrl ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={user.imageUrl}
                                                                    alt=""
                                                                    width={40}
                                                                    height={40}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-theme-faint">
                                                                    <Users className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="block max-w-[160px] truncate font-medium text-theme">
                                                                {user.name}
                                                            </span>
                                                            <div className="group/id mt-0.5 flex items-center gap-1">
                                                                <span className="block max-w-[120px] truncate font-mono text-[10px] text-theme-faint" dir="ltr">
                                                                    {user.id.slice(0, 16)}…
                                                                </span>
                                                                <button
                                                                    onClick={() => handleCopy(user.id, `clerk_${user.id}`)}
                                                                    className="opacity-0 transition-opacity group-hover/id:opacity-100"
                                                                >
                                                                    {copiedId === `clerk_${user.id}` ? (
                                                                        <Check className="h-3 w-3 text-green-400" />
                                                                    ) : (
                                                                        <Copy className="h-3 w-3 text-theme-faint hover:text-gold" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                                                        <BadgeIcon className="h-3.5 w-3.5" />
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="group/email flex items-center gap-1.5 text-xs">
                                                        <a
                                                            href={user.email ? `mailto:${user.email}` : undefined}
                                                            className="max-w-[180px] truncate text-theme-soft hover:text-gold"
                                                            dir="ltr"
                                                        >
                                                            {user.email || "—"}
                                                        </a>
                                                        {user.email && (
                                                            <button
                                                                onClick={() => handleCopy(user.email || "", `email_${user.id}`)}
                                                                className="opacity-0 transition-opacity group-hover/email:opacity-100"
                                                            >
                                                                {copiedId === `email_${user.id}` ? (
                                                                    <Check className="h-3 w-3 text-green-400" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3 text-theme-faint hover:text-gold" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {user.profile ? (
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-theme">
                                                                {user.profile.display_name || user.profile.username || "ملف منصة"}
                                                            </p>
                                                            <p className="text-xs text-theme-subtle">
                                                                {ROLE_LABELS[user.profile.role] || user.profile.role}
                                                            </p>
                                                        </div>
                                                    ) : user.emailMatchedProfile ? (
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-amber-100">
                                                                {user.emailMatchedProfile.display_name || user.emailMatchedProfile.username || "ملف مطابق بالبريد"}
                                                            </p>
                                                            <p className="text-xs text-theme-subtle">
                                                                {ROLE_LABELS[user.emailMatchedProfile.role] || user.emailMatchedProfile.role}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs text-theme-faint">
                                                            <UserPlus className="h-3.5 w-3.5" />
                                                            لا يوجد profile
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-theme-soft">
                                                    <span className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-theme-subtle" />
                                                        {mounted ? formatDate(user.createdAt) : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-theme-soft">
                                                    <span className="flex items-center gap-1.5">
                                                        <LogIn className="h-3.5 w-3.5 text-theme-subtle" />
                                                        {mounted ? formatDate(user.lastSignInAt ?? 0) : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col items-start gap-2">
                                                        {user.profile && (
                                                            <Link
                                                                href={`/dashboard/users/${user.profile.id}`}
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:text-gold/80"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                                ملف الهوية
                                                            </Link>
                                                        )}

                                                        {!user.profile && user.emailMatchedProfile && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleLink(user)}
                                                                    disabled={isLinking && linkingKey === user.id}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    <Link2 className="h-3.5 w-3.5" />
                                                                    {isLinking && linkingKey === user.id ? "جارٍ الربط..." : "ربط آمن"}
                                                                </button>
                                                                <Link
                                                                    href={`/dashboard/users/${user.emailMatchedProfile.id}`}
                                                                    className="inline-flex items-center gap-1 text-xs font-medium text-theme-subtle hover:text-gold"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                    مراجعة الملف
                                                                </Link>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col gap-3 border-t border-theme-subtle bg-theme-faint px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-theme-subtle">
                            الصفحة {currentPage} من {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate({ page: String(currentPage - 1), search })}
                                disabled={currentPage <= 1 || isPending}
                                className="rounded-lg bg-theme-subtle p-2 transition-colors hover:bg-theme-soft disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => navigate({ page: String(currentPage + 1), search })}
                                disabled={currentPage >= totalPages || isPending}
                                className="rounded-lg bg-theme-subtle p-2 transition-colors hover:bg-theme-soft disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
