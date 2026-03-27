import { getArtworks } from "@/app/actions/artworks";
import { getCategories } from "@/app/actions/search";
import Image from "next/image";
import Link from "next/link";
import { GalleryFilters } from "./GalleryFilters";
import { getPublicVisibility } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

export const metadata = {
    title: "المعرض | WUSHA",
    description: "استكشف معرض WUSHA للأعمال الفنية المتنوعة.",
};

export default async function GalleryPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string; page?: string; search?: string }>;
}) {
    const params = await searchParams;
    const category = params.category || "all";
    const page = parseInt(params.page || "1");
    const search = params.search || "";

    const visibility = await getPublicVisibility();
    if (!visibility.gallery) {
        redirect("/");
    }

    const [{ data: artworks, count, totalPages }, categories] = await Promise.all([
        getArtworks(page, category, search),
        getCategories(),
    ]);

    return (
        <div className="min-h-[60vh] bg-theme pt-6 sm:pt-10 pb-16 sm:pb-24" dir="rtl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">

                {/* ─── Hero Header ─── */}
                <div className="relative overflow-hidden rounded-[2.5rem] mb-14">
                    {/* Background layers */}
                    <div className="absolute inset-0 premium-card rounded-[2.5rem]" />
                    <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[var(--wusha-gold)]/5 via-transparent to-[var(--wusha-gold)]/3" />

                    {/* Ambient orbs */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-[var(--wusha-gold)]/8 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-10 w-40 h-32 rounded-full bg-[var(--wusha-gold)]/5 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-10 w-32 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />

                    {/* Subtle grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03] rounded-[2.5rem]"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg,var(--wusha-gold) 0,var(--wusha-gold) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,var(--wusha-gold) 0,var(--wusha-gold) 1px,transparent 1px,transparent 60px)' }} />

                    <div className="relative px-8 py-14 sm:py-20 text-center">
                        {/* Eyebrow */}
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <span className="h-px w-12 bg-gradient-to-l from-[var(--wusha-gold)]/60 to-transparent" />
                            <span className="flex items-center gap-1.5 text-[11px] tracking-[0.35em] font-medium uppercase" style={{ color: 'var(--wusha-gold)' }}>
                                <Sparkles className="w-3 h-3" />
                                WUSHA Gallery
                            </span>
                            <span className="h-px w-12 bg-gradient-to-r from-[var(--wusha-gold)]/60 to-transparent" />
                        </div>

                        {/* Title */}
                        <h1 className="font-display italic text-5xl md:text-6xl lg:text-7xl mb-4 leading-tight"
                            style={{ background: 'linear-gradient(135deg, var(--wusha-gold-light) 0%, var(--wusha-gold) 50%, var(--wusha-gold-light) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            المعرض
                        </h1>

                        {/* Subtitle */}
                        <p className="text-theme-subtle text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                            {count
                                ? <>اكتشف <span className="text-glow-gold font-bold">{count.toLocaleString('ar-SA')}</span> عملًا فنيًا من أبرز فناني وشّى</>
                                : 'اكتشف مجموعة من الأعمال الفنية المميزة'
                            }
                        </p>
                    </div>
                </div>

                {/* ─── Filters ─── */}
                <GalleryFilters
                    categories={categories}
                    currentCategory={category}
                    currentSearch={search}
                />

                {/* ─── Grid ─── */}
                {artworks && artworks.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                            {artworks.map((artwork: any, idx: number) => (
                                <Link
                                    key={artwork.id}
                                    href={`/artworks/${artwork.id}`}
                                    className="group block"
                                    style={{ animationDelay: `${idx * 40}ms` }}
                                >
                                    <div className="relative rounded-[1.75rem] overflow-hidden border border-[var(--wusha-border,rgba(255,255,255,0.08))] bg-[var(--wusha-surface)] transition-all duration-500 hover:border-[var(--wusha-gold)]/30 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(201,168,106,0.12)] hover:-translate-y-1.5">

                                        {/* Image */}
                                        <div className="aspect-square relative overflow-hidden">
                                            <Image
                                                src={artwork.image_url}
                                                alt={artwork.title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-108"
                                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            />

                                            {/* Hover overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                                            {/* Hover info reveal */}
                                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                                <p className="text-white/90 text-xs font-medium line-clamp-2 leading-relaxed">{artwork.title}</p>
                                                {artwork.price && (
                                                    <p className="text-[var(--wusha-gold)] text-sm font-bold mt-1">
                                                        {Number(artwork.price).toLocaleString('ar-SA')} ر.س
                                                    </p>
                                                )}
                                            </div>

                                            {/* Top badge */}
                                            {artwork.price && (
                                                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                                    <span className="bg-[var(--wusha-gold)]/90 text-[var(--wusha-bg)] text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                                                        للبيع
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer */}
                                        <div className="p-4 pb-5">
                                            <h3 className="text-sm font-semibold truncate group-hover:text-[var(--wusha-gold)] transition-colors duration-300"
                                                style={{ color: 'var(--wusha-text)' }}>
                                                {artwork.title}
                                            </h3>
                                            <div className="flex items-center justify-between mt-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {artwork.artist?.avatar_url ? (
                                                        <Image
                                                            src={artwork.artist.avatar_url}
                                                            alt=""
                                                            width={18}
                                                            height={18}
                                                            className="rounded-full ring-1 ring-[var(--wusha-gold)]/20 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-[18px] h-[18px] rounded-full bg-[var(--wusha-gold)]/15 ring-1 ring-[var(--wusha-gold)]/20 shrink-0" />
                                                    )}
                                                    <span className="text-[11px] truncate" style={{ color: 'color-mix(in srgb, var(--wusha-text) 50%, transparent)' }}>
                                                        {artwork.artist?.display_name}
                                                    </span>
                                                </div>
                                                {artwork.price && (
                                                    <span className="text-[11px] font-bold text-[var(--wusha-gold)] shrink-0 mr-2">
                                                        {Number(artwork.price).toLocaleString('ar-SA')} ر.س
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* ─── Pagination ─── */}
                        {totalPages > 1 && (
                            <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
                                {/* Prev arrow */}
                                {page > 1 && (() => {
                                    const p = new URLSearchParams();
                                    if (category !== "all") p.set("category", category);
                                    if (search) p.set("search", search);
                                    p.set("page", String(page - 1));
                                    return (
                                        <Link href={`/gallery?${p.toString()}`}
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm transition-all border theme-surface-panel text-theme-subtle hover:border-[var(--wusha-gold)]/30 hover:text-[var(--wusha-gold)]">
                                            ›
                                        </Link>
                                    );
                                })()}

                                {[...Array(totalPages)].map((_, i) => {
                                    const p = new URLSearchParams();
                                    if (category !== "all") p.set("category", category);
                                    if (search) p.set("search", search);
                                    p.set("page", String(i + 1));
                                    const isActive = page === i + 1;

                                    // Show limited pages around current
                                    const show = i === 0 || i === totalPages - 1 || Math.abs(i + 1 - page) <= 1;
                                    const showEllipsis = !show && (i === 1 || i === totalPages - 2);

                                    if (showEllipsis) return (
                                        <span key={i} className="w-8 text-center text-theme-faint text-sm">…</span>
                                    );
                                    if (!show) return null;

                                    return (
                                        <Link
                                            key={i}
                                            href={`/gallery?${p.toString()}`}
                                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-medium transition-all duration-300 ${isActive
                                                ? "bg-[var(--wusha-gold)] text-[var(--wusha-bg)] shadow-[0_8px_24px_rgba(201,168,106,0.3)]"
                                                : "theme-surface-panel text-theme-subtle hover:border-[var(--wusha-gold)]/25 hover:text-[var(--wusha-gold)]"
                                                }`}
                                        >
                                            {i + 1}
                                        </Link>
                                    );
                                })}

                                {/* Next arrow */}
                                {page < totalPages && (() => {
                                    const p = new URLSearchParams();
                                    if (category !== "all") p.set("category", category);
                                    if (search) p.set("search", search);
                                    p.set("page", String(page + 1));
                                    return (
                                        <Link href={`/gallery?${p.toString()}`}
                                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm transition-all border theme-surface-panel text-theme-subtle hover:border-[var(--wusha-gold)]/30 hover:text-[var(--wusha-gold)]">
                                            ‹
                                        </Link>
                                    );
                                })()}
                            </div>
                        )}
                    </>
                ) : (
                    /* ─── Empty State ─── */
                    <div className="relative overflow-hidden rounded-[2rem] py-28 px-8 text-center premium-card">
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--wusha-gold)]/5 via-transparent to-transparent rounded-[2rem]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[var(--wusha-gold)]/5 blur-3xl pointer-events-none" />
                        <div className="relative">
                            <div className="w-20 h-20 rounded-3xl bg-[var(--wusha-gold)]/10 border border-[var(--wusha-gold)]/15 flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-9 h-9 text-[var(--wusha-gold)]/60" />
                            </div>
                            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--wusha-text)' }}>
                                {search ? `لا نتائج لـ "${search}"` : 'لا توجد أعمال في هذا القسم'}
                            </p>
                            <p className="text-theme-subtle text-sm">حاول تغيير البحث أو اختر تصنيفًا مختلفًا</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
