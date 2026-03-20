"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MoreVertical, Trash2, ShoppingBag, Loader2, X } from "lucide-react";
import { deleteArtwork } from "@/app/actions/artworks";
import { motion, AnimatePresence } from "framer-motion";

interface Artwork {
    id: string;
    title: string;
    image_url: string;
    status: string;
    created_at: string;
}

export function ArtworkCard({ artwork }: { artwork: Artwork }) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            const result = await deleteArtwork(artwork.id, artwork.image_url);
            if (!result?.success) {
                setError(result?.error || "حدث خطأ أثناء الحذف");
                return;
            }
            setShowDeleteConfirm(false);
            setShowMenu(false);
            router.refresh();
        } catch (error) {
            console.error("Error deleting artwork:", error);
            setError("حدث خطأ أثناء الحذف");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group theme-surface-panel relative rounded-[1.75rem] overflow-hidden hover:shadow-lg transition-all duration-300"
        >
            {error && (
                <div className="absolute inset-x-3 top-3 z-20 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 backdrop-blur-sm">
                    {error}
                </div>
            )}
            {/* Image */}
            <div className="relative aspect-[3/4] bg-[color:color-mix(in_srgb,var(--wusha-text)_4%,transparent)]">
                <Image
                    src={artwork.image_url}
                    alt={artwork.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <Link
                        href={`/studio/design?artworkId=${artwork.id}`}
                        className="btn-gold w-full text-sm py-2.5 flex items-center justify-center gap-2 mb-2 scale-95 hover:scale-100 transition-transform"
                    >
                        <ShoppingBag className="w-4 h-4" />
                        تصميم منتج
                    </Link>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${artwork.status === 'published'
                            ? 'bg-green-500/90 text-theme'
                            : 'bg-yellow-500/90 text-theme'
                        }`}>
                        {artwork.status === 'published' ? 'منشور' : 'مسودة'}
                    </span>
                </div>

                {/* Menu Button */}
                <div className="absolute top-3 left-3">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="theme-icon-button h-9 w-9 bg-[color:rgba(15,15,15,0.32)] text-on-dark border-white/10 hover:bg-[color:rgba(15,15,15,0.5)]"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute top-full left-0 mt-2 w-36 theme-surface-panel rounded-xl shadow-xl overflow-hidden z-10"
                                onMouseLeave={() => setShowMenu(false)}
                            >
                                <button
                                    disabled={isDeleting}
                                    onClick={() => {
                                        setError(null);
                                        setShowDeleteConfirm(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-right px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    حذف العمل
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-[color:color-mix(in_srgb,var(--wusha-text)_2%,transparent)]">
                <h3 className="font-bold text-theme truncate" title={artwork.title}>
                    {artwork.title}
                </h3>
                <p className="text-theme-faint text-xs mt-1">
                    {new Date(artwork.created_at).toLocaleDateString('ar-SA')}
                </p>
            </div>

            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center bg-[color-mix(in_srgb,var(--wusha-bg)_68%,transparent)] p-4 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 12 }}
                            className="theme-surface-panel w-full max-w-xs rounded-2xl p-5 shadow-2xl"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-theme-faint">Delete Artwork</p>
                                    <h3 className="mt-2 text-base font-bold text-theme">حذف العمل الفني</h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="rounded-lg p-2 text-theme-subtle transition-colors hover:bg-theme-subtle disabled:opacity-40"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-theme-subtle">
                                سيتم حذف هذا العمل الفني من معرضك.
                            </p>
                            <div className="mt-5 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="flex-1 rounded-xl border border-theme-subtle bg-theme-faint px-4 py-2.5 text-sm font-bold text-theme-subtle transition-colors hover:bg-theme-subtle hover:text-theme disabled:opacity-40"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    حذف العمل
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
