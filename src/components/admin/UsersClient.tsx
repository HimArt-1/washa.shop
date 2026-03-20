"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
    updateUserRole,
    updateUserWushshaLevel,
    deleteUser,
    deleteUsers,
    createUser,
    updateUser,
} from "@/app/actions/admin";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Shield,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Users,
    Palette,
    UserCheck,
    UserX,
    X,
    AlertTriangle,
    Eye,
    Download,
    Copy,
    Check,
} from "lucide-react";

interface UsersClientProps {
    users: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentRole: string;
    currentSearch: string;
    stats?: { total: number; wushsha: number; subscriber: number; admin: number };
    hideStatsSummary?: boolean;
}

const roles = [
    { value: "all", label: "الكل" },
    { value: "admin", label: "مشرف" },
    { value: "wushsha", label: "وشّاي" },
    { value: "subscriber", label: "مشترك" },
];

const roleOptions = [
    { value: "admin", label: "مشرف" },
    { value: "wushsha", label: "وشّاي" },
    { value: "subscriber", label: "مشترك" },
];
const ROLE_VALUES = new Set(roleOptions.map((r) => r.value));

export function UsersClient({
    users,
    count,
    totalPages,
    currentPage,
    currentRole,
    currentSearch,
    stats = { total: 0, wushsha: 0, subscriber: 0, admin: 0 },
    hideStatsSummary = false,
}: UsersClientProps) {
    const router = useRouter();
    const [search, setSearch] = useState(currentSearch);
    const [isPending, startTransition] = useTransition();
    const [changingRole, setChangingRole] = useState<string | null>(null);
    const [changingLevel, setChangingLevel] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [pendingDeleteUser, setPendingDeleteUser] = useState<any | null>(null);
    const [bulkDeleteRequested, setBulkDeleteRequested] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
        setChangingRole(userId);
        setError(null);
        try {
            const res = await updateUserRole(userId, newRole);
            if (res.success) {
                setSuccess("تم تغيير الدور بنجاح");
                setTimeout(() => setSuccess(null), 3000);
                router.refresh();
            } else {
                setError(res.error || "فشل تغيير الدور");
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل تغيير الدور");
        } finally {
            setChangingRole(null);
        }
    };

    const handleLevelChange = async (userId: string, level: number) => {
        setChangingLevel(userId);
        setError(null);
        try {
            const res = await updateUserWushshaLevel(userId, level);
            if (res.success) {
                router.refresh();
            } else {
                setError(res.error || "فشل تحديث المستوى");
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل تحديث المستوى");
        } finally {
            setChangingLevel(null);
        }
    };

    const handleDelete = async (user: any) => {
        setDeletingId(user.id);
        setError(null);
        try {
            const res = await deleteUser(user.id);
            if (res.success) {
                setSuccess("تم حذف المستخدم بنجاح");
                setTimeout(() => setSuccess(null), 3000);
                setPendingDeleteUser(null);
                router.refresh();
            } else {
                setError(res.error || "فشل الحذف");
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل الحذف");
        } finally {
            setDeletingId(null);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === users.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(users.map((u) => u.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setError(null);
        setBulkDeleting(true);
        try {
            const res = await deleteUsers(Array.from(selectedIds));
            if (res.success) {
                setSelectedIds(new Set());
                setBulkDeleteRequested(false);
                setSuccess(`تم حذف ${res.deleted} مستخدم بنجاح`);
                setTimeout(() => setSuccess(null), 3000);
                router.refresh();
            } else {
                setError(res.error || "فشل الحذف");
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : "فشل الحذف");
        } finally {
            setBulkDeleting(false);
        }
    };

    const clearFeedback = () => {
        setError(null);
        setSuccess(null);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const exportToCSV = () => {
        const headers = ["ID", "Clerk ID", "Name", "Username", "Email", "Phone", "Role", "Wushsha Level", "Verified", "Created At"];
        const rows = users.map(u => [
            u.id, 
            u.clerk_id, 
            `"${u.display_name || ""}"`, 
            u.username, 
            u.email || "", 
            u.phone || "", 
            u.role, 
            u.wushsha_level || "", 
            u.is_verified ? "Yes" : "No", 
            u.created_at
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `wusha_users_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* ─── Stats Cards ─── */}
            {!hideStatsSummary ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "إجمالي المستخدمين", value: stats.total, icon: Users, color: "from-gold/20 to-gold/5" },
                        { label: "الوشّايون", value: stats.wushsha, icon: Palette, color: "from-accent/20 to-accent/5" },
                        { label: "المشتركون", value: stats.subscriber, icon: UserCheck, color: "from-forest/20 to-forest/5" },
                        { label: "المشرفون", value: stats.admin, icon: UserX, color: "from-gray-500/20 to-gray-500/5" },
                    ].map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="theme-surface-panel rounded-2xl p-5"
                        >
                            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${s.color} mb-3`}>
                                <s.icon className="w-5 h-5 text-theme-soft" />
                            </div>
                            <p className="text-theme-subtle text-xs font-medium">{s.label}</p>
                            <p className="text-2xl font-bold text-theme mt-0.5">{s.value}</p>
                        </motion.div>
                    ))}
                </div>
            ) : null}

            {/* ─── Toolbar ─── */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard/users-clerk"
                        className="flex items-center gap-2 px-4 py-2.5 text-theme-subtle hover:text-gold border border-theme-subtle hover:border-gold/20 rounded-xl text-sm font-medium transition-all"
                    >
                        <UserCheck className="w-4 h-4" />
                        مستخدمي Clerk
                    </Link>
                    {/* Role Tabs */}
                    <div className="theme-surface-panel flex gap-1 rounded-xl p-1">
                        {roles.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => navigate({ role: r.value, search, page: "1" })}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${currentRole === r.value
                                    ? "bg-gold/10 text-gold"
                                    : "text-theme-subtle hover:text-theme-soft hover:bg-theme-subtle"
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Add User */}
                    <button
                        onClick={() => { setShowAddModal(true); clearFeedback(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-bold hover:bg-gold/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة مستخدم
                    </button>

                    {/* Export CSV */}
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-theme-subtle text-theme hover:text-gold border border-theme-subtle hover:border-gold/20 rounded-xl text-sm font-medium transition-all"
                    >
                        <Download className="w-4 h-4" />
                        تصدير (CSV)
                    </button>

                    {/* Bulk Delete */}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setBulkDeleteRequested(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            حذف المحدد ({selectedIds.size})
                        </button>
                    )}
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم أو اسم المستخدم..."
                        className="input-dark w-64 rounded-xl py-2.5 pl-4 pr-10 text-sm"
                    />
                </form>
            </div>

            {/* ─── Feedback Messages ─── */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400"
                    >
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="text-sm">{error}</span>
                        <button onClick={() => setError(null)} className="mr-auto p-1 hover:bg-red-500/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-forest/10 border border-forest/20 text-forest"
                    >
                        <span className="text-sm">{success}</span>
                        <button onClick={() => setSuccess(null)} className="mr-auto p-1 hover:bg-forest/20 rounded">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Table ─── */}
            <div className="theme-surface-panel rounded-2xl overflow-hidden">
                {isPending && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_40%,transparent)] backdrop-blur-[1px]">
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                    </div>
                )}
                <div className="overflow-x-auto relative">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-theme-subtle">
                                <th className="text-right px-4 py-3.5">
                                    <input
                                        type="checkbox"
                                        checked={users.length > 0 && selectedIds.size === users.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-theme-soft"
                                    />
                                </th>
                                <th className="text-right px-6 py-3.5 text-theme-faint font-medium text-xs">المستخدم</th>
                                <th className="text-right px-4 py-3.5 text-theme-faint font-medium text-xs">معلومات الاتصال</th>
                                <th className="text-right px-4 py-3.5 text-theme-faint font-medium text-xs">اسم المستخدم</th>
                                <th className="text-right px-4 py-3.5 text-theme-faint font-medium text-xs">الدور</th>
                                <th className="text-right px-4 py-3.5 text-theme-faint font-medium text-xs">التحقق</th>
                                <th className="text-right px-4 py-3.5 text-theme-faint font-medium text-xs">تاريخ الانضمام</th>
                                <th className="text-right px-6 py-3.5 text-theme-faint font-medium text-xs">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, i) => (
                                <motion.tr
                                    key={user.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="border-b border-theme-faint hover:bg-theme-faint transition-colors group"
                                >
                                    <td className="px-4 py-3.5">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(user.id)}
                                            onChange={() => toggleSelect(user.id)}
                                            className="rounded border-theme-soft"
                                        />
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold text-sm font-bold shrink-0">
                                                {user.display_name?.[0] || "؟"}
                                            </div>
                                            <div>
                                                <span className="font-medium text-theme truncate max-w-[140px] block">{user.display_name}</span>
                                                <div className="flex items-center gap-1 mt-0.5 group/id">
                                                    <span className="text-theme-faint text-[10px] font-mono truncate max-w-[120px] block" dir="ltr">{user.clerk_id?.slice(0, 16)}…</span>
                                                    <button onClick={() => handleCopy(user.clerk_id, `clerk_${user.id}`)} className="opacity-0 group-hover/id:opacity-100 transition-opacity">
                                                        {copiedId === `clerk_${user.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-theme-faint hover:text-gold" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex flex-col gap-1 text-xs">
                                            {user.email ? (
                                                <div className="flex items-center gap-1.5 group/email">
                                                    <a href={`mailto:${user.email}`} className="text-theme-soft hover:text-gold truncate max-w-[160px]" dir="ltr">{user.email}</a>
                                                    <button onClick={() => handleCopy(user.email, `email_${user.id}`)} className="opacity-0 group-hover/email:opacity-100 transition-opacity">
                                                        {copiedId === `email_${user.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-theme-faint hover:text-gold" />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-theme-faint">—</span>
                                            )}
                                            {user.phone && (
                                                <div className="flex items-center gap-1.5 group/phone mt-0.5">
                                                    <span className="text-theme-soft font-mono" dir="ltr">{user.phone}</span>
                                                    <button onClick={() => handleCopy(user.phone, `phone_${user.id}`)} className="opacity-0 group-hover/phone:opacity-100 transition-opacity">
                                                        {copiedId === `phone_${user.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-theme-faint hover:text-gold" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-theme-subtle font-mono text-xs">@{user.username}</td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={user.role} type="role" />
                                            {user.role === "wushsha" && (
                                                <select
                                                    value={user.wushsha_level ?? 1}
                                                    onChange={(e) => handleLevelChange(user.id, Number(e.target.value))}
                                                    disabled={changingLevel === user.id}
                                                    className="input-dark w-12 rounded-lg px-2 py-1 text-[10px] disabled:opacity-50 cursor-pointer"
                                                    title="مستوى الوشّاي"
                                                >
                                                    {[1, 2, 3, 4, 5].map((l) => (
                                                        <option key={l} value={l}>م{l}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {user.is_verified ? (
                                            <span title="موثق"><Shield className="w-4 h-4 text-gold" /></span>
                                        ) : (
                                            <span className="text-theme-faint text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5 text-theme-faint text-xs" dir="ltr">
                                        {mounted ? new Date(user.created_at).toLocaleDateString("ar-SA") : user.created_at?.split("T")[0] || "—"}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={user.role}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (v === "__custom__") {
                                                        const custom = prompt("أدخل الدور المطلوب:");
                                                        if (custom?.trim()) handleRoleChange(user.id, custom.trim());
                                                    } else {
                                                        handleRoleChange(user.id, v);
                                                    }
                                                }}
                                                disabled={changingRole === user.id}
                                                className="input-dark min-w-[100px] rounded-lg px-3 py-1.5 text-xs disabled:opacity-50 cursor-pointer"
                                            >
                                                {roleOptions.map((r) => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                                {user.role && !ROLE_VALUES.has(user.role) && (
                                                    <option value={user.role}>{user.role}</option>
                                                )}
                                                <option value="__custom__">— أدخل دوراً —</option>
                                            </select>
                                            <Link
                                                href={`/dashboard/users/${user.id}`}
                                                className="p-2 rounded-lg text-theme-subtle hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                                title="عرض الملف الشخصي"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => { setEditingUser(user); clearFeedback(); }}
                                                className="p-2 rounded-lg text-theme-subtle hover:text-gold hover:bg-gold/10 transition-all"
                                                title="تعديل"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setPendingDeleteUser(user)}
                                                disabled={deletingId === user.id}
                                                className="p-2 rounded-lg text-theme-subtle hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                                title="حذف"
                                            >
                                                {deletingId === user.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-20 text-theme-faint">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">لا يوجد مستخدمون</p>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="mt-3 text-gold hover:text-gold-light text-sm font-medium"
                                        >
                                            إضافة أول مستخدم
                                        </button>
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
                    <p className="text-xs text-theme-faint">{count} مستخدم</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate({ role: currentRole, search, page: String(currentPage - 1) })}
                            disabled={currentPage <= 1}
                            className="p-2 rounded-lg bg-theme-faint border border-theme-subtle text-theme-subtle hover:text-theme hover:bg-theme-subtle disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-theme-subtle px-3">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => navigate({ role: currentRole, search, page: String(currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg bg-theme-faint border border-theme-subtle text-theme-subtle hover:text-theme hover:bg-theme-subtle disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Add User Modal ─── */}
            <AddUserModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                    setShowAddModal(false);
                    setSuccess("تم إضافة المستخدم بنجاح");
                    setTimeout(() => setSuccess(null), 3000);
                    router.refresh();
                }}
                onError={(msg) => setError(msg)}
            />

            {/* ─── Edit User Modal ─── */}
            <EditUserModal
                user={editingUser}
                onClose={() => setEditingUser(null)}
                onSuccess={() => {
                    setEditingUser(null);
                    setSuccess("تم تحديث المستخدم بنجاح");
                    setTimeout(() => setSuccess(null), 3000);
                    router.refresh();
                }}
                onError={(msg) => setError(msg)}
            />

            <ConfirmActionModal
                open={!!pendingDeleteUser}
                title="حذف المستخدم"
                description={
                    pendingDeleteUser
                        ? `سيتم حذف المستخدم "${pendingDeleteUser.display_name}" مع جميع بياناته المرتبطة مثل الأعمال والمنتجات والطلبات.`
                        : ""
                }
                confirmLabel="حذف المستخدم"
                loading={!!pendingDeleteUser && deletingId === pendingDeleteUser.id}
                onClose={() => setPendingDeleteUser(null)}
                onConfirm={() => pendingDeleteUser && handleDelete(pendingDeleteUser)}
            />

            <ConfirmActionModal
                open={bulkDeleteRequested}
                title="حذف المستخدمين المحددين"
                description={`سيتم حذف ${selectedIds.size} مستخدم مع بياناتهم المرتبطة.`}
                confirmLabel="حذف المحدد"
                loading={bulkDeleting}
                onClose={() => setBulkDeleteRequested(false)}
                onConfirm={handleBulkDelete}
            />
        </div>
    );
}

function ConfirmActionModal({
    open,
    title,
    description,
    confirmLabel,
    loading,
    onClose,
    onConfirm,
}: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] p-4 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                onClick={(event) => event.stopPropagation()}
                className="theme-surface-panel w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">Confirmation</p>
                        <h3 className="mt-2 text-lg font-bold text-theme">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-lg p-2 text-theme-subtle transition-colors hover:bg-theme-subtle disabled:opacity-40"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-theme-subtle">{description}</p>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:opacity-40"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {confirmLabel}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Add User Modal ─────────────────────────────────────────

function AddUserModal({
    open,
    onClose,
    onSuccess,
    onError,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        clerk_id: "",
        display_name: "",
        username: "",
        email: "",
        phone: "",
        role: "subscriber",
        bio: "",
        wushsha_level: 1,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clerk_id.trim() || !form.display_name.trim() || !form.username.trim()) {
            onError("جميع الحقول المطلوبة يجب تعبئتها");
            return;
        }
        setLoading(true);
        onError("");
        try {
            const res = await createUser({
                clerk_id: form.clerk_id,
                display_name: form.display_name,
                username: form.username,
                email: form.email || undefined,
                phone: form.phone || undefined,
                role: form.role as any,
                bio: form.bio || undefined,
                wushsha_level: form.role === "wushsha" ? form.wushsha_level : undefined,
            });
            if (res.success) {
                setForm({ clerk_id: "", display_name: "", username: "", email: "", phone: "", role: "subscriber", bio: "", wushsha_level: 1 });
                onSuccess();
            } else {
                onError(res.error || "فشل الإضافة");
            }
        } catch (error) {
            onError(error instanceof Error ? error.message : "فشل الإضافة");
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel w-full max-w-lg rounded-2xl shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle">
                    <h2 className="text-lg font-bold text-theme">إضافة مستخدم جديد</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الحساب المربوط بـ Clerk (clerk_id) *</label>
                        <input
                            type="text"
                            value={form.clerk_id}
                            onChange={(e) => setForm((f) => ({ ...f, clerk_id: e.target.value }))}
                            placeholder="user_xxxxxxxx"
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            dir="ltr"
                        />
                        <p className="text-[10px] text-theme-faint mt-1">يُربط تلقائيًا إذا لم تقم بتحديده</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الاسم *</label>
                        <input
                            type="text"
                            value={form.display_name}
                            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                            placeholder="الاسم المعروض"
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">اسم المستخدم *</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                            placeholder="username"
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الدور</label>
                        <input
                            type="text"
                            value={form.role}
                            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                            list="add-role-list"
                            placeholder="مثال: subscriber, wushsha, admin..."
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                        />
                        <datalist id="add-role-list">
                            {roleOptions.map((r) => (
                                <option key={r.value} value={r.value} />
                            ))}
                        </datalist>
                        <p className="text-[10px] text-theme-faint mt-1">أدخل أي دور — أو اختر من القائمة المقترحة</p>
                    </div>
                    {form.role === "wushsha" && (
                        <div>
                            <label className="block text-xs font-medium text-theme-subtle mb-1.5">مستوى الوشّاي</label>
                            <select
                                value={form.wushsha_level}
                                onChange={(e) => setForm((f) => ({ ...f, wushsha_level: Number(e.target.value) }))}
                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            >
                                {[1, 2, 3, 4, 5].map((l) => (
                                    <option key={l} value={l}>المستوى {l}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">نبذة (اختياري)</label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                            placeholder="نبذة قصيرة..."
                            rows={2}
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-xl bg-gold py-2.5 font-bold text-[var(--wusha-bg)] hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            إضافة
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ─── Edit User Modal ───────────────────────────────────────

function EditUserModal({
    user,
    onClose,
    onSuccess,
    onError,
}: {
    user: any | null;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        display_name: "",
        username: "",
        email: "",
        phone: "",
        bio: "",
        role: "",
        wushsha_level: 1,
        is_verified: false,
        website: "",
    });

    useEffect(() => {
        if (user) {
            setForm({
                display_name: user.display_name || "",
                username: user.username || "",
                email: user.email || "",
                phone: user.phone || "",
                bio: user.bio || "",
                role: user.role || "subscriber",
                wushsha_level: user.wushsha_level ?? 1,
                is_verified: user.is_verified ?? false,
                website: user.website || "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    if (!user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        onError("");
        try {
            const res = await updateUser(user.id, {
                display_name: form.display_name,
                username: form.username,
                email: form.email || null,
                phone: form.phone || null,
                bio: form.bio || undefined,
                role: form.role as any,
                wushsha_level: form.role === "wushsha" ? form.wushsha_level : null,
                is_verified: form.is_verified,
                website: form.website || null,
            });
            if (res.success) {
                onSuccess();
            } else {
                onError(res.error || "فشل التحديث");
            }
        } catch (error) {
            onError(error instanceof Error ? error.message : "فشل التحديث");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="theme-surface-panel w-full max-w-lg rounded-2xl shadow-2xl"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle">
                    <h2 className="text-lg font-bold text-theme">تعديل المستخدم</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-theme-subtle text-theme-subtle">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الاسم *</label>
                        <input
                            type="text"
                            value={form.display_name}
                            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">اسم المستخدم *</label>
                        <input
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الدور</label>
                        <input
                            type="text"
                            value={form.role}
                            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                            list="edit-role-list"
                            placeholder="مثال: subscriber, wushsha, admin..."
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                        />
                        <datalist id="edit-role-list">
                            {roleOptions.map((r) => (
                                <option key={r.value} value={r.value} />
                            ))}
                        </datalist>
                        <p className="text-[10px] text-theme-faint mt-1">أدخل أي دور — أو اختر من القائمة المقترحة</p>
                    </div>
                    {form.role === "wushsha" && (
                        <div>
                            <label className="block text-xs font-medium text-theme-subtle mb-1.5">مستوى الوشّاي</label>
                            <select
                                value={form.wushsha_level}
                                onChange={(e) => setForm((f) => ({ ...f, wushsha_level: Number(e.target.value) }))}
                                className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            >
                                {[1, 2, 3, 4, 5].map((l) => (
                                    <option key={l} value={l}>المستوى {l}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">الموقع (اختياري)</label>
                        <input
                            type="url"
                            value={form.website}
                            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                            placeholder="https://..."
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm"
                            dir="ltr"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-theme-subtle mb-1.5">نبذة</label>
                        <textarea
                            value={form.bio}
                            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                            rows={3}
                            className="input-dark w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_verified}
                            onChange={(e) => setForm((f) => ({ ...f, is_verified: e.target.checked }))}
                            className="rounded border-theme-soft"
                        />
                        <span className="text-sm text-theme-soft">حساب موثق</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-theme-soft text-theme-soft hover:bg-theme-subtle transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-gold text-[var(--wusha-bg)] font-bold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                            حفظ
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
