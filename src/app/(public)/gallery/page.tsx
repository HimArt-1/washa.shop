import { getArtworks } from "@/app/actions/artworks";
import { getCategories } from "@/app/actions/search";
import Image from "next/image";
import Link from "next/link";
import { GalleryFilters } from "./GalleryFilters";
import { getPublicVisibility } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
        <div className="min-h-[60vh] bg-theme pt-6 sm:pt-8 pb-12 sm:pb-16" dir="rtl">
            <div className="max-w-7xl mx-auto px-6">
                {/* ─── Header ─── */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: "var(--wusha-text)" }}>
                        المعرض
                    </h1>
                    <p className="text-theme-subtle text-sm">
                        اكتشف {count || 0} عمل فني من أفضل فناني وشّى
                    </p>
                </div>

                {/* ─── Filters (Client Component) ─── */}
                <GalleryFilters
                    categories={categories}
                    currentCategory={category}
                    currentSearch={search}
                />

                {/* ─── Grid ─── */}
                {artworks && artworks.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {artworks.map((artwork: any) => (
                                <Link
                                    key={artwork.id}
                                    href={`/artworks/${artwork.id}`}
                                    className="group rounded-2xl border border-theme-soft overflow-hidden hover:border-gold/30 transition-all duration-500"
                                >
                                    <div className="aspect-square relative overflow-hidden">
                                        <Image
                                            src={artwork.image_url}
                                            alt={artwork.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-bold truncate group-hover:text-gold transition-colors" style={{ color: "var(--wusha-text)" }}>
                                            {artwork.title}
                                        </h3>
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-1.5">
                                                {artwork.artist?.avatar_url ? (
                                                    <Image src={artwork.artist.avatar_url} alt="" width={16} height={16} className="rounded-full" />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full bg-gold/20" />
                                                )}
                                                <span className="text-[10px] text-theme-subtle">{artwork.artist?.display_name}</span>
                                            </div>
                                            {artwork.price && (
                                                <span className="text-[10px] font-bold text-gold">{Number(artwork.price).toLocaleString()} ر.س</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                                {[...Array(totalPages)].map((_, i) => {
                                    const params = new URLSearchParams();
                                    if (category !== "all") params.set("category", category);
                                    if (search) params.set("search", search);
                                    params.set("page", String(i + 1));

                                    return (
                                        <Link
                                            key={i}
                                            href={`/gallery?${params.toString()}`}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${page === i + 1
                                                    ? "bg-gold text-[#0a0a0a]"
                                                    : "text-theme-subtle hover:bg-theme-subtle"
                                                }`}
                                        >
                                            {i + 1}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-24">
                        <p className="text-theme-muted">لا توجد أعمال فنية</p>
                    </div>
                )}
            </div>
        </div>
    );
}
