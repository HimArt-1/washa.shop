"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Users,
    Mail,
    Calendar,
    LogIn,
    ExternalLink,
    UserCog,
} from "lucide-react";
import type { ClerkUserWithProfile } from "@/app/actions/clerk-users";

const ROLE_LABELS: Record<string, string> = {
    admin: "مسؤول",
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

interface ClerkUsersClientProps {
    users: ClerkUserWithProfile[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    currentSearch: string;
}

export function ClerkUsersClient({
    users,
    totalCount,
    totalPages,
    currentPage,
    currentSearch,
}: ClerkUsersClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    return (
        <div className="space-y-6">
            {/* ─── Stats ─── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-theme-subtle bg-surface/50 backdrop-blur-sm p-5"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gold/10">
                        <Users className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                        <p className="text-theme-subtle text-xs font-medium">إجمالي المستخدمين في Clerk</p>
                        <p className="text-2xl font-bold text-theme">{totalCount}</p>
                    </div>
                </div>
            </motion.div>

            {/* ─── Toolbar ─── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <Link
                    href="/dashboard/users"
                    className="flex items-center gap-2 text-sm text-theme-subtle hover:text-gold transition-colors"
                >
                    <UserCog className="w-4 h-4" />
                    عرض مستخدمي المنصة (الملفات)
                </Link>

                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالبريد أو الاسم أو المعرف..."
                        className="w-64 pl-4 pr-10 py-2.5 bg-surface/50 border border-theme-subtle rounded-xl text-sm text-theme placeholder:text-theme-faint focus:outline-none focus:border-gold/30 transition-colors"
                    />
                </form>
            </div>

            {/* ─── Table ─── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-theme-subtle bg-surface/30 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle bg-theme-faint">
                                <th className="text-right py-4 px-4 font-medium text-theme-soft">المستخدم</th>
                                <th className="text-right py-4 px-4 font-medium text-theme-soft">البريد</th>
                                <th className="text-right py-4 px-4 font-medium text-theme-soft">الدور في المنصة</th>
                                <th className="text-right py-4 px-4 font-medium text-theme-soft">تاريخ التسجيل</th>
                                <th className="text-right py-4 px-4 font-medium text-theme-soft">آخر دخول</th>
                                <th className="text-right py-4 px-4 font-medium text-theme-soft w-20">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {users.length === 0 ? (
                                    <tr key="empty-row">
                                        <td colSpan={6} className="py-16 text-center text-theme-subtle">
                                            لا يوجد مستخدمون
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user, i) => (
                                        <motion.tr
                                            key={user.id}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            className="border-b border-theme-faint hover:bg-theme-faint transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-theme-subtle shrink-0">
                                                        {user.imageUrl ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={user.imageUrl}
                                                                alt=""
                                                                width={40}
                                                                height={40}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-theme-faint">
                                                                <Users className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-theme">
                                                            {user.profile?.display_name || user.name}
                                                        </p>
                                                        <p className="text-xs text-theme-subtle font-mono truncate max-w-[140px]">
                                                            {user.id.slice(0, 20)}…
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="flex items-center gap-1.5 text-theme-soft">
                                                    <Mail className="w-3.5 h-3.5 text-theme-subtle" />
                                                    {user.email || "—"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                {user.profile ? (
                                                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-gold/10 text-gold text-xs font-medium">
                                                        {ROLE_LABELS[user.profile.role] || user.profile.role}
                                                    </span>
                                                ) : (
                                                    <span className="text-theme-faint text-xs">بدون ملف</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-theme-soft">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-theme-subtle" />
                                                    {mounted ? formatDate(user.createdAt) : "—"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-theme-soft">
                                                <span className="flex items-center gap-1.5">
                                                    <LogIn className="w-3.5 h-3.5 text-theme-subtle" />
                                                    {mounted ? formatDate(user.lastSignInAt ?? 0) : "—"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                {user.profile && (
                                                    <Link
                                                        href={`/dashboard/users?search=${encodeURIComponent(user.profile.username || user.id)}`}
                                                        className="inline-flex items-center gap-1 text-gold hover:text-gold/80 text-xs font-medium"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        إدارة
                                                    </Link>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* ─── Pagination ─── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-theme-subtle bg-theme-faint">
                        <p className="text-xs text-theme-subtle">
                            الصفحة {currentPage} من {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate({ page: String(currentPage - 1), search })}
                                disabled={currentPage <= 1 || isPending}
                                className="p-2 rounded-lg bg-theme-subtle hover:bg-theme-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate({ page: String(currentPage + 1), search })}
                                disabled={currentPage >= totalPages || isPending}
                                className="p-2 rounded-lg bg-theme-subtle hover:bg-theme-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
