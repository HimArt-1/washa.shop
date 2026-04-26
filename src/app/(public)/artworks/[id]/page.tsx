import { getArtworkById, getArtworks } from "@/app/actions/artworks";
import { getArtworkReviews } from "@/app/actions/reviews";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ArtworkActions } from "./ArtworkActions";
import { ArtworkReviews } from "@/components/reviews/ArtworkReviews";
import { ChevronLeft, Eye, Sparkles } from "lucide-react";
import { buildArtworkSchema, buildBreadcrumbSchema, JsonLd } from "@/lib/seo";

// ─── Dynamic Metadata ───────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const artwork = await getArtworkById(id);
    if (!artwork) return { title: "غير موجود — وشّى" };

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
    const canonical = `${siteUrl}/artworks/${id}`;
    const artistName = (artwork as any).artist?.display_name || "فنان";
    const desc = artwork.description || `عمل فني حصري بواسطة ${artistName} — اكتشف المعرض في وشّى`;

    return {
        title: `${artwork.title} — وشّى`,
        description: desc,
        alternates: { canonical },
        openGraph: {
            title: `${artwork.title} | وشّى`,
            description: desc,
            url: canonical,
            type: "website",
            siteName: "وشّى | WASHA",
            images: [{ url: artwork.image_url, width: 1200, height: 1200, alt: artwork.title }],
        },
        twitter: {
            card: "summary_large_image",
            title: `${artwork.title} | وشّى`,
            description: desc,
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

    const similar = await getArtworks(1, "all", "");
    const similarArtworks = similar.data?.filter((a: any) => a.id !== artwork.id).slice(0, 4) || [];

    return (
        <div className="min-h-[60vh] bg-theme pt-6 sm:pt-8 pb-16 sm:pb-24" dir="rtl">
            {/* JSON-LD Structured Data */}
            <JsonLd schema={buildArtworkSchema({
                id: artwork.id,
                title: artwork.title,
                description: artwork.description,
                image_url: artwork.image_url,
                price: artwork.price,
                currency: artwork.currency,
                medium: artwork.medium,
                year: artwork.year,
                likes_count: artwork.likes_count,
                artist: (artwork as any).artist ?? null,
            })} />
            <JsonLd schema={buildBreadcrumbSchema([
                { name: "الرئيسية", href: "/" },
                { name: "المعرض", href: "/gallery" },
                { name: artwork.title, href: `/artworks/${artwork.id}` },
            ])} />
            <div className="max-w-7xl mx-auto px-4 sm:px-6">

                {/* ─── Breadcrumb ─── */}
                <nav className="mb-8 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'color-mix(in srgb, var(--wusha-text) 40%, transparent)' }}>
                    <Link href="/" className="hover:text-[var(--wusha-gold)] transition-colors">الرئيسية</Link>
                    <ChevronLeft className="w-3 h-3 opacity-40" />
                    <Link href="/gallery" className="hover:text-[var(--wusha-gold)] transition-colors">المعرض</Link>
                    <ChevronLeft className="w-3 h-3 opacity-40" />
                    <span style={{ color: 'color-mix(in srgb, var(--wusha-text) 65%, transparent)' }}>{artwork.title}</span>
                </nav>

                {/* ─── Main Content ─── */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">

                    {/* ── Image Panel ── */}
                    <div className="relative">
                        <div className="premium-card rounded-[2rem] p-3.5">
                            <div className="relative aspect-square rounded-[1.6rem] overflow-hidden bg-[var(--wusha-surface)]">
                                <Image
                                    src={artwork.image_url}
                                    alt={artwork.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    priority
                                />
                                {/* Subtle vignette */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                            </div>
                        </div>
                        {/* Ambient glow behind image */}
                        <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-[var(--wusha-gold)]/5 blur-3xl opacity-60 pointer-events-none" />
                    </div>

                    {/* ── Info Panel ── */}
                    <div className="premium-card rounded-[2rem] p-7 sm:p-9 flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--wusha-gold)]/4 via-transparent to-transparent rounded-[2rem] pointer-events-none" />

                        {/* Category Badge */}
                        {artwork.category && (
                            <span className="inline-flex w-fit items-center gap-1.5 text-xs bg-[var(--wusha-gold)]/10 border border-[var(--wusha-gold)]/20 text-[var(--wusha-gold)] px-3 py-1.5 rounded-full mb-5 font-medium">
                                <Sparkles className="w-3 h-3" />
                                {artwork.category.name_ar}
                            </span>
                        )}

                        <h1 className="text-3xl md:text-4xl font-bold mb-5 leading-tight" style={{ color: 'var(--wusha-text)' }}>
                            {artwork.title}
                        </h1>

                        {/* Artist */}
                        <Link
                            href={`/artists/${artwork.artist?.username}`}
                            className="group mb-7 flex items-center gap-3.5 p-4 rounded-2xl border border-transparent hover:border-[var(--wusha-gold)]/20 hover:bg-[var(--wusha-gold)]/5 transition-all duration-300"
                        >
                            <div className="h-12 w-12 overflow-hidden rounded-full border-2 flex-shrink-0" style={{ borderColor: 'rgba(201,168,106,0.25)' }}>
                                {artwork.artist?.avatar_url ? (
                                    <Image src={artwork.artist.avatar_url} alt="" width={48} height={48} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="w-full h-full bg-[var(--wusha-gold)]/20 flex items-center justify-center text-[var(--wusha-gold)] font-bold text-lg">
                                        {artwork.artist?.display_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <span className="font-bold text-sm group-hover:text-[var(--wusha-gold)] transition-colors flex items-center gap-1.5" style={{ color: 'var(--wusha-text)' }}>
                                    {artwork.artist?.display_name}
                                    {artwork.artist?.is_verified && <span className="text-[var(--wusha-gold)] text-xs">✦</span>}
                                </span>
                                <span className="text-xs" style={{ color: 'color-mix(in srgb, var(--wusha-text) 40%, transparent)' }}>
                                    @{artwork.artist?.username}
                                </span>
                            </div>
                            <ChevronLeft className="w-4 h-4 mr-auto opacity-30 group-hover:opacity-60 group-hover:text-[var(--wusha-gold)] transition-all" />
                        </Link>

                        {/* Description */}
                        {artwork.description && (
                            <p className="text-sm leading-relaxed mb-7" style={{ color: 'color-mix(in srgb, var(--wusha-text) 65%, transparent)' }}>
                                {artwork.description}
                            </p>
                        )}

                        {/* Details Grid */}
                        {(artwork.medium || artwork.dimensions || artwork.year) && (
                            <div className="mb-7 grid grid-cols-2 gap-3">
                                {artwork.medium && (
                                    <div className="rounded-xl p-3.5 border" style={{ background: 'color-mix(in srgb, var(--wusha-gold) 4%, transparent)', borderColor: 'rgba(201,168,106,0.12)' }}>
                                        <span className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 70%, transparent)' }}>الخامة</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--wusha-text)' }}>{artwork.medium}</span>
                                    </div>
                                )}
                                {artwork.dimensions && (
                                    <div className="rounded-xl p-3.5 border" style={{ background: 'color-mix(in srgb, var(--wusha-gold) 4%, transparent)', borderColor: 'rgba(201,168,106,0.12)' }}>
                                        <span className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 70%, transparent)' }}>الأبعاد</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--wusha-text)' }}>{artwork.dimensions}</span>
                                    </div>
                                )}
                                {artwork.year && (
                                    <div className="rounded-xl p-3.5 border" style={{ background: 'color-mix(in srgb, var(--wusha-gold) 4%, transparent)', borderColor: 'rgba(201,168,106,0.12)' }}>
                                        <span className="text-[10px] font-medium uppercase tracking-wider block mb-1" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 70%, transparent)' }}>السنة</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--wusha-text)' }}>{artwork.year}</span>
                                    </div>
                                )}
                                <div className="rounded-xl p-3.5 border flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--wusha-gold) 4%, transparent)', borderColor: 'rgba(201,168,106,0.12)' }}>
                                    <Eye className="w-3.5 h-3.5 shrink-0" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 70%, transparent)' }} />
                                    <div>
                                        <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 70%, transparent)' }}>مشاهدات</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--wusha-text)' }}>{(artwork.views_count || 0).toLocaleString('ar-SA')}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Price */}
                        {artwork.price && (
                            <div className="mb-6 flex items-baseline gap-2">
                                <span className="text-3xl font-bold" style={{ color: 'var(--wusha-gold)' }}>
                                    {Number(artwork.price).toLocaleString('ar-SA')}
                                </span>
                                <span className="text-sm font-medium" style={{ color: 'color-mix(in srgb, var(--wusha-gold) 60%, transparent)' }}>ر.س</span>
                            </div>
                        )}

                        {/* Client Actions */}
                        <ArtworkActions artwork={artwork} />

                        {/* Tags */}
                        {artwork.tags && artwork.tags.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-2">
                                {artwork.tags.map((tag: string) => (
                                    <Link
                                        key={tag}
                                        href={`/search?q=${tag}`}
                                        className="text-[10px] border text-xs px-3 py-1.5 rounded-full transition-all duration-300"
                                        style={{
                                            borderColor: 'rgba(201,168,106,0.15)',
                                            color: 'color-mix(in srgb, var(--wusha-text) 50%, transparent)',
                                            background: 'color-mix(in srgb, var(--wusha-gold) 3%, transparent)'
                                        }}
                                        onMouseEnter={() => { }}
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
                        {/* Section header */}
                        <div className="flex items-center gap-4 mb-8">
                            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--wusha-gold)]/20" />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--wusha-text)' }}>أعمال قد تعجبك</h2>
                            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--wusha-gold)]/20" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
                            {similarArtworks.map((item: any) => (
                                <Link
                                    key={item.id}
                                    href={`/artworks/${item.id}`}
                                    className="group block"
                                >
                                    <div className="rounded-[1.65rem] overflow-hidden border transition-all duration-500 hover:-translate-y-1 hover:border-[var(--wusha-gold)]/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
                                        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'var(--wusha-surface)' }}>
                                        <div className="aspect-square relative overflow-hidden">
                                            <Image
                                                src={item.image_url}
                                                alt={item.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        </div>
                                        <div className="p-4">
                                            <h3 className="text-sm font-semibold truncate group-hover:text-[var(--wusha-gold)] transition-colors" style={{ color: 'var(--wusha-text)' }}>
                                                {item.title}
                                            </h3>
                                            <p className="text-xs mt-1" style={{ color: 'color-mix(in srgb, var(--wusha-text) 45%, transparent)' }}>
                                                {item.artist?.display_name}
                                            </p>
                                        </div>
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
