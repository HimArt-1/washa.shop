"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateUserRole } from "@/app/actions/admin";
import { motion } from "framer-motion";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Shield,
    Loader2,
} from "lucide-react";

interface UsersClientProps {
    users: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentRole: string;
    currentSearch: string;
}

const roles = [
    { value: "all", label: "الكل" },
    { value: "admin", label: "مسؤول" },
    { value: "artist", label: "فنان" },
    { value: "buyer", label: "مشتري" },
    { value: "guest", label: "زائر" },
];

export function UsersClient({
    users,
    count,
    totalPages,
    currentPage,
    currentRole,
    currentSearch,
}: UsersClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);
    const [isPending, startTransition] = useTransition();
    const [changingRole, setChangingRole] = useState<string | null>(null);

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        if (params.role && params.role !== "all") sp.set("role", params.role);
        if (params.search) sp.set("search", params.search);
        if (params.page && params.page !== "1") sp.set("page", params.page);
        startTransition(() => {
            router.push(`/dashboard/users?${sp.toString()}`);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({ role: currentRole, search, page: "1" });
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!confirm(`هل أنت متأكد من تغيير الدور إلى "${newRole}"؟`)) return;
        setChangingRole(userId);
        await updateUserRole(userId, newRole);
        setChangingRole(null);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            {/* ─── Filters ─── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Role Tabs */}
                <div className="flex gap-1 p-1 bg-surface/50 rounded-xl border border-white/[0.06]">
                    {roles.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => navigate({ role: r.value, search, page: "1" })}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentRole === r.value
                                    ? "bg-gold/10 text-gold"
                                    : "text-fg/40 hover:text-fg/60 hover:bg-white/[0.03]"
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/20" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم..."
                        className="w-64 pl-4 pr-10 py-2.5 bg-surface/50 border border-white/[0.06] rounded-xl text-sm text-fg placeholder:text-fg/20 focus:outline-none focus:border-gold/30 transition-colors"
                    />
                </form>
            </div>

            {/* ─── Table ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-surface/50 backdrop-blur-sm overflow-hidden">
                {isPending && (
                    <div className="absolute inset-0 bg-bg/50 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                    </div>
                )}
                <div className="overflow-x-auto relative">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-right px-6 py-3.5 text-fg/30 font-medium text-xs">المستخدم</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">اسم المستخدم</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">الدور</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">التحقق</th>
                                <th className="text-right px-4 py-3.5 text-fg/30 font-medium text-xs">تاريخ الانضمام</th>
                                <th className="text-right px-6 py-3.5 text-fg/30 font-medium text-xs">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, i) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-xs font-bold shrink-0">
                                                {user.display_name?.[0] || "؟"}
                                            </div>
                                            <span className="font-medium text-fg truncate max-w-[160px]">{user.display_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-fg/50 font-mono text-xs">@{user.username}</td>
                                    <td className="px-4 py-3.5"><StatusBadge status={user.role} type="role" /></td>
                                    <td className="px-4 py-3.5">
                                        {user.is_verified ? (
                                            <Shield className="w-4 h-4 text-gold" />
                                        ) : (
                                            <span className="text-fg/20 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-fg/30 text-xs" dir="ltr">
                                        {new Date(user.created_at).toLocaleDateString("ar-SA")}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            disabled={changingRole === user.id}
                                            className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-fg focus:outline-none focus:border-gold/30 disabled:opacity-50 cursor-pointer"
                                        >
                                            <option value="admin">مسؤول</option>
                                            <option value="artist">فنان</option>
                                            <option value="buyer">مشتري</option>
                                            <option value="guest">زائر</option>
                                        </select>
                                    </td>
                                </motion.tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-fg/20 text-sm">
                                        لا توجد نتائج
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-fg/30">{count} مستخدم</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate({ role: currentRole, search, page: String(currentPage - 1) })}
                            disabled={currentPage <= 1}
                            className="p-2 rounded-lg bg-surface/50 border border-white/[0.06] text-fg/40 hover:text-fg disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-fg/40 px-3">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => navigate({ role: currentRole, search, page: String(currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg bg-surface/50 border border-white/[0.06] text-fg/40 hover:text-fg disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
