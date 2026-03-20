"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoreVertical, Trash2, ShoppingBag, Loader2 } from "lucide-react";
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const handleDelete = async () => {
        if (!confirm("هل أنت متأكد من حذف هذا العمل الفني؟")) return;

        setIsDeleting(true);
        try {
            await deleteArtwork(artwork.id, artwork.image_url);
        } catch (error) {
            console.error("Error deleting artwork:", error);
            alert("حدث خطأ أثناء الحذف");
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
                                    onClick={handleDelete}
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
        </motion.div>
    );
}
