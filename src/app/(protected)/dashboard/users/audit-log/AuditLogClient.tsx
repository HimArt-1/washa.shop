"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
    Shield, ArrowRight, Search, Filter, Clock,
    User, ShieldCheck, Cpu, Wrench, HelpCircle,
    ChevronRight, ChevronLeft,
} from "lucide-react";
import type { AuditLogEntry } from "@/app/actions/admin";

// ─── Constants ───────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
    admin: "مدير",
    wushsha: "وشّاي",
    subscriber: "مشترك",
    dev: "مطوّر",
};

const ROLE_COLORS: Record<string, string> = {
    admin: "text-red-400 bg-red-400/10 border-red-400/20",
    wushsha: "text-gold bg-gold/10 border-gold/20",
    subscriber: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    dev: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const CONTEXT_LABELS: Record<string, string> = {
    admin_action: "لوحة الإدارة",
    webhook_created: "Clerk Webhook",
    bootstrap: "إعداد أولي",
    system: "النظام",
    unknown: "غير محدد",
};

const CONTEXT_ICONS: Record<string, React.ElementType> = {
    admin_action: ShieldCheck,
    webhook_created: Cpu,
    bootstrap: Wrench,
    system: Cpu,
    unknown: HelpCircle,
};

const CONTEXT_COLORS: Record<string, string> = {
    admin_action: "text-blue-400 bg-blue-400/10",
    webhook_created: "text-purple-400 bg-purple-400/10",
    bootstrap: "text-amber-400 bg-amber-400/10",
    system: "text-theme-subtle bg-theme-faint",
    unknown: "text-theme-faint bg-theme-faint",
};

const ALL_CONTEXTS = ["all", "admin_action", "webhook_created", "bootstrap", "system"];

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "الآن";
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function RoleBadge({ role }: { role: string | null }) {
    if (!role) return <span className="text-xs text-theme-faint italic">—</span>;
    const color = ROLE_COLORS[role] ?? "text-theme-subtle bg-theme-faint border-theme-subtle";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${color}`}>
            {ROLE_LABELS[role] ?? role}
        </span>
    );
}

// ─── Component ───────────────────────────────────────────────

interface AuditLogClientProps {
    entries: AuditLogEntry[];
    total: number;
    totalPages: number;
    currentPage: number;
    currentContext: string;
    currentSearch: string;
}

export function AuditLogClient({
    entries,
    total,
    totalPages,
    currentPage,
    currentContext,
    currentSearch,
}: AuditLogClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [, startTransition] = useTransition();
    const [searchInput, setSearchInput] = useState(currentSearch);

    function navigate(overrides: Record<string, string | number>) {
        const sp = new URLSearchParams();
        const merged = {
            page: currentPage,
            context: currentContext,
            search: currentSearch,
            ...overrides,
        };
        if (merged.page && Number(merged.page) > 1) sp.set("page", String(merged.page));
        if (merged.context && merged.context !== "all") sp.set("context", String(merged.context));
        if (merged.search) sp.set("search", String(merged.search));
        startTransition(() => {
            router.push(`${pathname}${sp.toString() ? "?" + sp.toString() : ""}`);
        });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        navigate({ search: searchInput, page: 1 });
    }

    return (
        <div className="space-y-5">
            {/* ─── Toolbar ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="بحث بالاسم أو البريد أو الدور..."
                        className="input-dark w-full rounded-lg py-2 pr-10 pl-4 text-sm transition-all"
                    />
                </form>

                <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-theme-faint" />
                    {ALL_CONTEXTS.map((ctx) => (
                        <button
                            key={ctx}
                            onClick={() => navigate({ context: ctx, page: 1 })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                currentContext === ctx
                                    ? "bg-gold text-[var(--wusha-bg)]"
                                    : "border border-theme-subtle bg-theme-faint text-theme-subtle hover:bg-[color:var(--surface-elevated)]"
                            }`}
                        >
                            {ctx === "all" ? "الكل" : CONTEXT_LABELS[ctx]}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── Table ─── */}
            <div className="theme-surface-panel overflow-hidden rounded-2xl">
                {entries.length === 0 ? (
                    <div className="p-16 text-center text-theme-faint">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">لا توجد تغييرات مسجّلة</p>
                    </div>
                ) : (
                    <>
                        {/* Header row */}
                        <div className="hidden md:grid grid-cols-[1fr_auto_auto_1fr_auto_auto] gap-4 px-5 py-2.5 bg-theme-faint/60 border-b border-theme-subtle text-[10px] font-bold text-theme-faint uppercase tracking-wider">
                            <span>المستخدم</span>
                            <span>من</span>
                            <span></span>
                            <span>إلى</span>
                            <span>بواسطة</span>
                            <span>الوقت</span>
                        </div>

                        <div className="divide-y divide-theme-faint">
                            {entries.map((entry, index) => {
                                const CtxIcon = CONTEXT_ICONS[entry.context] ?? HelpCircle;
                                const ctxColor = CONTEXT_COLORS[entry.context] ?? CONTEXT_COLORS.unknown;

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.015 }}
                                        className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_1fr_auto_auto] gap-3 md:gap-4 px-5 py-3.5 hover:bg-theme-faint/40 transition-colors"
                                    >
                                        {/* Target user */}
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-theme-subtle flex items-center justify-center shrink-0">
                                                <User className="w-4 h-4 text-theme-faint" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-theme-strong truncate">
                                                    {entry.target?.display_name ?? "—"}
                                                </p>
                                                <p className="text-[11px] text-theme-faint truncate">
                                                    @{entry.target?.username ?? "—"}
                                                    {entry.target?.email ? ` · ${entry.target.email}` : ""}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Old role */}
                                        <div className="flex items-center">
                                            <RoleBadge role={entry.old_role} />
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex items-center">
                                            <ArrowRight className="w-3.5 h-3.5 text-theme-faint" />
                                        </div>

                                        {/* New role */}
                                        <div className="flex items-center gap-2.5">
                                            <RoleBadge role={entry.new_role} />
                                            {/* Context badge */}
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${ctxColor}`}>
                                                <CtxIcon className="w-3 h-3" />
                                                {CONTEXT_LABELS[entry.context] ?? entry.context}
                                            </span>
                                        </div>

                                        {/* Changed by */}
                                        <div className="flex items-center min-w-0">
                                            {entry.changed_by ? (
                                                <div className="flex items-center gap-1.5">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-theme-faint shrink-0" />
                                                    <span className="text-xs text-theme-subtle truncate max-w-[120px]">
                                                        {entry.changed_by.display_name}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-theme-faint italic">تلقائي</span>
                                            )}
                                        </div>

                                        {/* Time */}
                                        <div className="flex items-center">
                                            <span
                                                className="text-[11px] text-theme-faint font-medium shrink-0 whitespace-nowrap"
                                                title={new Date(entry.changed_at).toLocaleString("ar-SA")}
                                            >
                                                <Clock className="w-3 h-3 inline ml-1 opacity-60" />
                                                {timeAgo(entry.changed_at)}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-theme-faint">
                        صفحة {currentPage} من {totalPages} · إجمالي {total.toLocaleString("ar-SA")} سجل
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate({ page: currentPage - 1 })}
                            disabled={currentPage <= 1}
                            className="p-2 rounded-lg border border-theme-subtle text-theme-subtle hover:text-theme hover:border-gold/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => navigate({ page: currentPage + 1 })}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg border border-theme-subtle text-theme-subtle hover:text-theme hover:border-gold/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
