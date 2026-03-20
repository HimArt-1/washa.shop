"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
    updateArtworkStatus,
    deleteArtworkAdmin,
} from "@/app/actions/admin";
import { ArtworkFormModal } from "./ArtworkFormModal";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye,
    Heart,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Palette,
    Globe,
    Archive,
    XCircle,
    Plus,
    Pencil,
    Trash2,
    Shield,
    ExternalLink,
} from "lucide-react";

interface Artist {
    id: string;
    display_name: string;
    username: string;
}

interface Category {
    id: string;
    name_ar: string;
}

interface ArtworksClientProps {
    artworks: any[];
    count: number;
    totalPages: number;
    currentPage: number;
    currentStatus: string;
    artists: Artist[];
    categories: Category[];
}

const statuses = [
    { value: "all", label: "الكل" },
    { value: "pending", label: "مراجعة" },
    { value: "published", label: "منشور" },
    { value: "draft", label: "مسودة" },
    { value: "rejected", label: "مرفوض" },
    { value: "archived", label: "مؤرشف" },
];

export function ArtworksClient({
    artworks,
    count,
    totalPages,
    currentPage,
    currentStatus,
    artists,
    categories,
}: ArtworksClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingArtwork, setEditingArtwork] = useState<any | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [pendingDeleteArtwork, setPendingDeleteArtwork] = useState<any | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const navigate = (params: Record<string, string>) => {
        const sp = new URLSearchParams();
        if (params.status && params.status !== "all") sp.set("status", params.status);
        if (params.page && params.page !== "1") sp.set("page", params.page);
        startTransition(() => {
            router.push(`/dashboard/artworks?${sp.toString()}`);
        });
    };

    const handleStatusChange = async (id: string, status: "published" | "rejected" | "archived") => {
        setUpdatingId(id);
        setErrorMessage(null);
        try {
            const result = await updateArtworkStatus(id, status);
            if (result?.success === false) {
                setErrorMessage(result.error || "تعذر تحديث حالة العمل الفني.");
                return;
            }
            router.refresh();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "تعذر تحديث حالة العمل الفني.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (artwork: any) => {
        setErrorMessage(null);
        setUpdatingId(artwork.id);
        try {
            const result = await deleteArtworkAdmin(artwork.id, artwork.image_url);
            if (result.success) {
                showToast("تم حذف العمل الفني ✓");
                setPendingDeleteArtwork(null);
                router.refresh();
            } else {
                setErrorMessage(result.error || "فشل حذف العمل الفني.");
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "فشل حذف العمل الفني.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleFormSuccess = () => {
        setShowAddModal(false);
        setEditingArtwork(null);
        showToast("تم الحفظ بنجاح ✓");
        router.refresh();
    };

    return (
        <div className="space-y-6">
            {errorMessage ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                </div>
            ) : null}
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed top-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white shadow-lg"
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header: Tabs + Add Button */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="theme-surface-panel flex gap-1 overflow-x-auto rounded-xl p-1">
                    {statuses.map((s) => (
                        <button
                            key={s.value}
                            onClick={() => navigate({ status: s.value, page: "1" })}
                            className={`min-h-[40px] px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                                currentStatus === s.value
                                    ? "bg-gold/10 text-gold"
                                    : "text-theme-subtle hover:text-theme-soft hover:bg-theme-faint"
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="shrink-0 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold/90"
                >
                    <Plus className="w-4 h-4" />
                    إضافة عمل فني
                </button>
            </div>

            {/* Artworks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {artworks.map((artwork, i) => (
                    <motion.div
                        key={artwork.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="theme-surface-panel overflow-hidden rounded-2xl transition-all duration-500 group hover:border-gold/20"
                    >
                        {/* Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-theme-faint">
                            {artwork.image_url ? (
                                <Image
                                    src={artwork.image_url}
                                    alt={artwork.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Palette className="w-12 h-12 text-fg/10" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="absolute top-3 right-3">
                                <StatusBadge status={artwork.status} type="artwork" />
                            </div>

                            {artwork.is_featured && (
                                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-gold/20 text-gold text-[10px] font-bold">
                                    مميز
                                </div>
                            )}

                            <div className="absolute bottom-3 left-3 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="flex items-center gap-1 text-theme-strong text-xs">
                                    <Eye className="w-3.5 h-3.5" /> {artwork.views_count ?? 0}
                                </span>
                                <span className="flex items-center gap-1 text-theme-strong text-xs">
                                    <Heart className="w-3.5 h-3.5" /> {artwork.likes_count ?? 0}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <h3 className="font-bold text-theme text-sm mb-1 truncate">{artwork.title}</h3>

                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[10px] font-bold">
                                    {artwork.artist?.display_name?.[0] || "؟"}
                                </div>
                                <span className="text-theme-subtle text-xs truncate">{artwork.artist?.display_name || "—"}</span>
                                {artwork.artist?.is_verified && (
                                    <Shield className="w-3 h-3 text-gold shrink-0" />
                                )}
                            </div>

                            <div className="flex items-center justify-between text-xs mb-4">
                                <span className="text-theme-faint truncate">{artwork.category?.name_ar || "بدون تصنيف"}</span>
                                {artwork.price != null && artwork.price > 0 && (
                                    <span className="font-bold text-gold shrink-0">{Number(artwork.price).toLocaleString()} ر.س</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={`/artworks/${artwork.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-all hover:bg-gold/10 hover:text-gold"
                                    title="عرض"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                    onClick={() => setEditingArtwork(artwork)}
                                    className="rounded-lg border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-all hover:bg-gold/10 hover:text-gold"
                                    title="تعديل"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {artwork.status !== "published" && (
                                    <button
                                        onClick={() => handleStatusChange(artwork.id, "published")}
                                        disabled={updatingId === artwork.id}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-forest/10 text-forest border border-forest/20 rounded-xl text-[11px] font-bold hover:bg-forest/20 transition-all disabled:opacity-50"
                                    >
                                        {updatingId === artwork.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Globe className="w-3.5 h-3.5" />
                                        )}
                                        نشر
                                    </button>
                                )}
                                {artwork.status !== "rejected" && (
                                    <button
                                        onClick={() => handleStatusChange(artwork.id, "rejected")}
                                        disabled={updatingId === artwork.id}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-[11px] font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        رفض
                                    </button>
                                )}
                                {artwork.status !== "archived" && (
                                    <button
                                        onClick={() => handleStatusChange(artwork.id, "archived")}
                                        disabled={updatingId === artwork.id}
                                        className="rounded-xl border border-theme-subtle bg-theme-faint p-2 text-theme-faint transition-all hover:bg-[color:var(--surface-elevated)] disabled:opacity-50"
                                        title="أرشفة"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setPendingDeleteArtwork(artwork)}
                                    disabled={updatingId === artwork.id}
                                    className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all disabled:opacity-50"
                                    title="حذف"
                                >
                                    {updatingId === artwork.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {artworks.length === 0 && (
                <div className="theme-surface-panel rounded-2xl py-20 text-center">
                    <Palette className="w-16 h-16 text-fg/10 mx-auto mb-4" />
                    <p className="text-theme-faint text-lg font-medium mb-2">لا توجد أعمال فنية</p>
                    <p className="text-theme-faint text-sm mb-6">أضف عملاً فنياً جديداً للبدء</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold/90"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة عمل فني
                    </button>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-theme-faint">{count} عمل فني</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage - 1) })}
                            disabled={currentPage <= 1}
                            className="rounded-lg border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-colors hover:text-theme disabled:opacity-30"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-theme-subtle px-3">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => navigate({ status: currentStatus, page: String(currentPage + 1) })}
                            disabled={currentPage >= totalPages}
                            className="rounded-lg border border-theme-subtle bg-theme-faint p-2 text-theme-subtle transition-colors hover:text-theme disabled:opacity-30"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <ArtworkFormModal
                open={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleFormSuccess}
                artists={artists}
                categories={categories}
            />
            <ArtworkFormModal
                open={!!editingArtwork}
                onClose={() => setEditingArtwork(null)}
                onSuccess={handleFormSuccess}
                artists={artists}
                categories={categories}
                artwork={editingArtwork}
            />

            <AnimatePresence>
                {pendingDeleteArtwork ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="absolute inset-0 bg-[color-mix(in_srgb,var(--wusha-bg)_60%,transparent)] backdrop-blur-sm"
                            onClick={() => setPendingDeleteArtwork(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.98 }}
                            className="theme-surface-panel relative z-10 w-full max-w-md rounded-2xl p-5 sm:p-6"
                        >
                            <h3 className="text-lg font-bold text-theme">تأكيد حذف العمل الفني</h3>
                            <p className="mt-3 text-sm leading-7 text-theme-subtle">
                                سيتم حذف العمل الفني
                                <span className="mx-1 font-bold text-theme">{pendingDeleteArtwork.title}</span>
                                نهائيًا مع الصورة المرتبطة به.
                            </p>
                            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                <button
                                    onClick={() => handleDelete(pendingDeleteArtwork)}
                                    disabled={updatingId === pendingDeleteArtwork.id}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 disabled:opacity-50"
                                >
                                    {updatingId === pendingDeleteArtwork.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    تأكيد الحذف
                                </button>
                                <button
                                    onClick={() => setPendingDeleteArtwork(null)}
                                    disabled={updatingId === pendingDeleteArtwork.id}
                                    className="rounded-xl border border-theme-subtle bg-theme-faint px-4 py-3 text-sm font-medium text-theme-subtle"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
