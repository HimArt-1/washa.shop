import { getArtistArtworks } from "@/app/actions/artworks";
import { ArtworkCard } from "@/components/studio/artworks/ArtworkCard";
import { Plus, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default async function StudioArtworksPage() {
    const { data: artworks } = await getArtistArtworks();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-ink">أعمالي الفنية</h1>
                    <p className="text-ink/60 mt-2">
                        إدارة معرضك الرقمي وتحويل أعمالك لمنتجات
                    </p>
                </div>
                <Link
                    href="/studio/artworks/upload"
                    className="btn-gold flex items-center gap-2 px-6 py-3 text-sm font-bold shadow-lg shadow-gold/20 hover:scale-105 transition-transform"
                >
                    <Plus className="w-5 h-5" />
                    رفع عمل جديد
                </Link>
            </div>

            {/* Content */}
            <Suspense fallback={<div className="text-center py-20 text-ink/40">جاري التحميل...</div>}>
                {artworks && artworks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {artworks.map((artwork: any) => (
                            <ArtworkCard key={artwork.id} artwork={artwork} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-ink/5 p-16 text-center space-y-6">
                        <div className="w-20 h-20 bg-sand rounded-full flex items-center justify-center mx-auto text-gold mb-2">
                            <ImageIcon className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-ink">المعرض فارغ حالياً</h3>
                            <p className="text-ink/50 mt-2 max-w-md mx-auto">
                                ابدأ رحلتك الفنية برفع أول عمل لك، وحوله إلى منتجات يرتديها الجميع.
                            </p>
                        </div>
                        <Link
                            href="/studio/artworks/upload"
                            className="btn-gold inline-flex items-center gap-2 px-8 py-3.5 mt-4"
                        >
                            <Plus className="w-5 h-5" />
                            رفع أول عمل فني
                        </Link>
                    </div>
                )}
            </Suspense>
        </div>
    );
}
