import { getArtworkById, getArtworks } from "@/app/actions/artworks";
import { getArtworkReviews } from "@/app/actions/reviews";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ArtworkActions } from "./ArtworkActions";
import { ArtworkReviews } from "@/components/reviews/ArtworkReviews";

// ─── Dynamic Metadata ───────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const artwork = await getArtworkById(id);
    if (!artwork) return { title: "غير موجود — وشّى" };

    return {
        title: `${artwork.title} — وشّى`,
        description: artwork.description || `عمل فني بواسطة ${artwork.artist?.display_name}`,
        openGraph: {
            images: [artwork.image_url],
        },
    };
}

// ─── Page ───────────────────────────────────────────────────

export default async function ArtworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const artwork = await getArtworkById(id);
    if (!artwork) notFound();

    const reviews = await getArtworkReviews(id);

    // Fetch similar artworks (same category, excluding current)
    const similar = await getArtworks(1, "all", "");
    const similarArtworks = similar.data?.filter((a: any) => a.id !== artwork.id).slice(0, 4) || [];

    return (
        <div className="min-h-[60vh] bg-bg pt-6 sm:pt-8 pb-12 sm:pb-16" dir="rtl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* ─── Breadcrumb ─── */}
                <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs text-theme-faint">
                    <Link href="/" className="hover:text-gold transition-colors">الرئيسية</Link>
                    <span>/</span>
                    <Link href="/gallery" className="hover:text-gold transition-colors">المعرض</Link>
                    <span>/</span>
                    <span className="text-theme-subtle">{artwork.title}</span>
                </nav>

                {/* ─── Main Content ─── */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                    {/* Image */}
                    <div className="theme-surface-panel rounded-[2rem] p-3 sm:p-4">
                        <div className="relative aspect-square rounded-[1.55rem] overflow-hidden bg-theme-subtle">
                            <Image
                                src={artwork.image_url}
                                alt={artwork.title}
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                                priority
                            />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="theme-surface-panel flex flex-col justify-center rounded-[2rem] p-6 sm:p-8 lg:p-10">
                        {/* Category Badge */}
                        {artwork.category && (
                            <span className="inline-block w-fit text-xs bg-gold/10 text-gold px-3 py-1 rounded-full mb-4">
                                {artwork.category.name_ar}
                            </span>
                        )}

                        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-4">{artwork.title}</h1>

                        {/* Artist */}
                        <Link
                            href={`/artists/${artwork.artist?.username}`}
                            className="group mb-6 flex items-center gap-3"
                        >
                            <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-theme-soft bg-surface">
                                {artwork.artist?.avatar_url ? (
                                    <Image src={artwork.artist.avatar_url} alt="" width={48} height={48} className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                                        {artwork.artist?.display_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="font-bold text-theme text-sm group-hover:text-gold transition-colors flex items-center gap-1.5">
                                    {artwork.artist?.display_name}
                                    {artwork.artist?.is_verified && <span className="text-gold text-xs">✦</span>}
                                </span>
                                <span className="text-xs text-theme-faint">@{artwork.artist?.username}</span>
                            </div>
                        </Link>

                        {/* Description */}
                        {artwork.description && (
                            <p className="text-theme-subtle text-sm leading-relaxed mb-6">{artwork.description}</p>
                        )}

                        {/* Details Grid */}
                        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {artwork.medium && (
                                <div className="p-3 bg-theme-faint border border-theme-subtle rounded-xl">
                                    <span className="text-[10px] text-theme-faint block">الخامة</span>
                                    <span className="text-sm text-theme-soft">{artwork.medium}</span>
                                </div>
                            )}
                            {artwork.dimensions && (
                                <div className="p-3 bg-theme-faint border border-theme-subtle rounded-xl">
                                    <span className="text-[10px] text-theme-faint block">الأبعاد</span>
                                    <span className="text-sm text-theme-soft">{artwork.dimensions}</span>
                                </div>
                            )}
                            {artwork.year && (
                                <div className="p-3 bg-theme-faint border border-theme-subtle rounded-xl">
                                    <span className="text-[10px] text-theme-faint block">السنة</span>
                                    <span className="text-sm text-theme-soft">{artwork.year}</span>
                                </div>
                            )}
                            <div className="p-3 bg-theme-faint border border-theme-subtle rounded-xl">
                                <span className="text-[10px] text-theme-faint block">المشاهدات</span>
                                <span className="text-sm text-theme-soft">{artwork.views_count || 0}</span>
                            </div>
                        </div>

                        {/* Price + Add to Cart */}
                        {artwork.price && (
                            <div className="mb-6 flex items-center gap-4">
                                <span className="text-3xl font-bold text-gold">{Number(artwork.price).toLocaleString()} ر.س</span>
                            </div>
                        )}

                        {/* Client Actions (Add to Cart + Share) */}
                        <ArtworkActions artwork={artwork} />

                        {/* Tags */}
                        {artwork.tags && artwork.tags.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-2">
                                {artwork.tags.map((tag: string) => (
                                    <Link
                                        key={tag}
                                        href={`/search?q=${tag}`}
                                        className="text-[10px] bg-theme-faint border border-theme-subtle text-theme-faint px-3 py-1 rounded-full hover:bg-gold/10 hover:text-gold hover:border-gold/20 transition-colors"
                                    >
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Reviews ─── */}
                <ArtworkReviews artworkId={id} initialReviews={reviews} />

                {/* ─── Similar Artworks ─── */}
                {similarArtworks.length > 0 && (
                    <div className="mt-20">
                        <h2 className="text-2xl font-bold text-theme mb-8">أعمال قد تعجبك</h2>
                        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
                            {similarArtworks.map((item: any) => (
                                <Link
                                    key={item.id}
                                    href={`/artworks/${item.id}`}
                                    className="group theme-surface-panel rounded-[1.65rem] overflow-hidden hover:border-gold/30 transition-all"
                                >
                                    <div className="aspect-square relative">
                                        <Image
                                            src={item.image_url}
                                            alt={item.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-bold text-theme truncate">{item.title}</h3>
                                        <p className="text-xs text-theme-faint mt-1">{item.artist?.display_name}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
