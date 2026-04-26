import { getSupabaseServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { Globe, ExternalLink } from "lucide-react";
import { FollowArtistButton } from "@/components/artist/FollowArtistButton";
import { getArtistFollowersCount } from "@/app/actions/social";
import { buildPersonSchema, buildBreadcrumbSchema, JsonLd } from "@/lib/seo";

// ─── Fetch Artist by Username ───────────────────────────────

async function getArtistByUsername(username: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("role", "wushsha")
        .single();

    if (error) return null;
    return data;
}

async function getArtistArtworksPublic(artistId: string) {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
        .from("artworks")
        .select(`*, category:categories(name_ar, slug)`)
        .eq("artist_id", artistId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20);

    return data || [];
}

// ─── Dynamic Metadata ───────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
    const { username } = await params;
    const artist = await getArtistByUsername(username);
    if (!artist) return { title: "غير موجود — وشّى" };

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://washa.shop";
    const canonical = `${siteUrl}/artists/${username}`;
    const desc = artist.bio || `اكتشف أعمال الفنان ${artist.display_name} في منصة وشّى`;
    const ogImage = artist.avatar_url || `${siteUrl}/og-default.jpg`;

    return {
        title: `${artist.display_name} — وشّى`,
        description: desc,
        alternates: { canonical },
        openGraph: {
            title: `${artist.display_name} | وشّى`,
            description: desc,
            url: canonical,
            type: "profile",
            siteName: "وشّى | WASHA",
            images: [{ url: ogImage, width: 400, height: 400, alt: artist.display_name }],
        },
        twitter: {
            card: "summary",
            title: `${artist.display_name} | وشّى`,
            description: desc,
            images: [ogImage],
        },
    };
}

// ─── Social Icons Map ───────────────────────────────────────
const socialLabels: Record<string, string> = {
    instagram: "Instagram",
    twitter: "X / Twitter",
    youtube: "YouTube",
    behance: "Behance",
    dribbble: "Dribbble",
};

// ─── Page ───────────────────────────────────────────────────

export default async function ArtistProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    const artist = await getArtistByUsername(username);
    if (!artist) notFound();

    const [artworks, followersCount] = await Promise.all([
        getArtistArtworksPublic(artist.id),
        getArtistFollowersCount(artist.id),
    ]);

    const socialLinks = artist.social_links || {};
    const activeSocials = Object.entries(socialLinks).filter(([, url]) => url);

    return (
        <div className="min-h-screen bg-bg" dir="rtl">
            {/* JSON-LD Structured Data */}
            <JsonLd schema={buildPersonSchema({
                username: artist.username,
                display_name: artist.display_name,
                bio: artist.bio,
                avatar_url: artist.avatar_url,
                total_artworks: artworks.length,
                total_sales: artist.total_sales || 0,
                social_links: artist.social_links as any,
            })} />
            <JsonLd schema={buildBreadcrumbSchema([
                { name: "الرئيسية", href: "/" },
                { name: "الفنانون", href: "/artists" },
                { name: artist.display_name, href: `/artists/${artist.username}` },
            ])} />
            {/* ─── Hero / Cover ─── */}
            <div className="relative h-52 sm:h-64 md:h-80 bg-gradient-to-b from-gold/[0.05] to-transparent">
                {artist.cover_url && (
                    <Image
                        src={artist.cover_url}
                        alt=""
                        fill
                        className="object-cover opacity-40"
                        priority
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
            </div>

            <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-4 sm:-mt-20 sm:px-6">
                {/* ─── Profile Card ─── */}
                <div className="theme-surface-panel rounded-[2rem] p-6 sm:p-8 mb-10">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                        {/* Avatar */}
                        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-3xl border-4 border-theme-subtle bg-theme-surface shadow-2xl sm:h-32 sm:w-32">
                            {artist.avatar_url ? (
                                <Image src={artist.avatar_url} alt={artist.display_name} width={128} height={128} className="object-cover w-full h-full" />
                            ) : (
                                <div className="w-full h-full bg-gold/20 flex items-center justify-center text-gold text-4xl font-bold">
                                    {artist.display_name?.[0]}
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-[0.35em] text-theme-faint mb-3">Artist Profile</p>
                            <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold text-theme md:text-4xl">
                                {artist.display_name}
                                {artist.is_verified && <span className="text-gold text-lg">✦</span>}
                            </h1>
                            <p className="text-theme-faint text-sm mt-1">@{artist.username}</p>
                            {artist.bio && (
                                <p className="text-theme-subtle text-sm mt-3 max-w-xl leading-relaxed">{artist.bio}</p>
                            )}
                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                <FollowArtistButton
                                    artistId={artist.id}
                                    artistUsername={artist.username}
                                    followersCount={followersCount}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[210px]">
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-4 text-center sm:px-5">
                                <span className="text-2xl font-bold text-theme">{artworks.length}</span>
                                <span className="block text-[10px] text-theme-faint mt-0.5">عمل فني</span>
                            </div>
                            <div className="rounded-2xl border border-theme-subtle bg-theme-faint px-4 py-4 text-center sm:px-5">
                                <span className="text-2xl font-bold text-theme">{artist.total_sales || 0}</span>
                                <span className="block text-[10px] text-theme-faint mt-0.5">مبيعات</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Links ─── */}
                {(artist.website || activeSocials.length > 0) && (
                    <div className="mb-12 flex flex-wrap gap-3">
                        {artist.website && (
                            <a
                                href={artist.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="theme-surface-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs text-theme-subtle transition-all hover:border-gold/30 hover:text-gold"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                الموقع الشخصي
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                        {activeSocials.map(([platform, url]) => (
                            <a
                                key={platform}
                                href={url as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="theme-surface-panel inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs text-theme-subtle transition-all hover:border-gold/30 hover:text-gold"
                            >
                                {socialLabels[platform] || platform}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        ))}
                    </div>
                )}

                {/* ─── Artworks Grid ─── */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-theme mb-6">الأعمال الفنية</h2>
                </div>

                {artworks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 pb-20 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                        {artworks.map((artwork: any) => (
                            <Link
                                key={artwork.id}
                                href={`/artworks/${artwork.id}`}
                                className="group theme-surface-panel rounded-[1.65rem] overflow-hidden hover:border-gold/30 transition-all duration-500"
                            >
                                <div className="aspect-square relative overflow-hidden">
                                    <Image
                                        src={artwork.image_url}
                                        alt={artwork.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    />
                                    {artwork.category && (
                                        <span className="absolute top-2 right-2 text-[9px] bg-[color:rgba(15,15,15,0.42)] backdrop-blur-md text-on-dark px-2 py-0.5 rounded-full">
                                            {artwork.category.name_ar}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-bold text-theme truncate group-hover:text-gold transition-colors">
                                        {artwork.title}
                                    </h3>
                                    {artwork.price && (
                                        <span className="text-xs text-gold mt-1 block">{Number(artwork.price).toLocaleString()} ر.س</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="theme-surface-panel rounded-[2rem] text-center py-20 px-6">
                        <p className="text-theme-faint">لا توجد أعمال منشورة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
}
