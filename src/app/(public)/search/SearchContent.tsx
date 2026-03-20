"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Palette, ShoppingBag, Users, SlidersHorizontal, X, Loader2, ArrowRight, Home, Compass } from "lucide-react";
import { globalSearch, getCategories, type SearchTab, type SearchFilters, type SearchResult } from "@/app/actions/search";
import { useCartStore } from "@/stores/cartStore";
import Image from "next/image";
import Link from "next/link";

// ─── Tab Config ─────────────────────────────────────────────
const tabs: { id: SearchTab; label: string; icon: any }[] = [
    { id: "artworks", label: "أعمال فنية", icon: Palette },
    { id: "products", label: "منتجات", icon: ShoppingBag },
    { id: "artists", label: "فنانون", icon: Users },
];

const sortOptions = [
    { value: "newest", label: "الأحدث" },
    { value: "oldest", label: "الأقدم" },
    { value: "price_asc", label: "السعر: الأقل" },
    { value: "price_desc", label: "السعر: الأعلى" },
    { value: "popular", label: "الأكثر شعبية" },
];

// ─── Skeleton ───────────────────────────────────────────────
function CardSkeleton() {
    return (
        <div className="theme-surface-panel rounded-[1.65rem] overflow-hidden animate-pulse">
            <div className="aspect-square bg-theme-subtle" />
            <div className="p-4 space-y-3">
                <div className="h-4 bg-theme-soft rounded-full w-3/4" />
                <div className="h-3 bg-theme-subtle rounded-full w-1/2" />
            </div>
        </div>
    );
}

// ─── Artwork Card ───────────────────────────────────────────
function ArtworkCard({ artwork }: { artwork: any }) {
    const addItem = useCartStore((s) => s.addItem);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group theme-surface-panel rounded-[1.65rem] overflow-hidden hover:border-gold/30 transition-all duration-500"
        >
            <Link href={`/artworks/${artwork.id}`} className="block">
                <div className="aspect-square relative overflow-hidden">
                    <Image
                        src={artwork.image_url}
                        alt={artwork.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {artwork.category && (
                        <span className="absolute top-3 right-3 text-[10px] bg-[color:rgba(15,15,15,0.42)] backdrop-blur-md text-on-dark px-2.5 py-1 rounded-full">
                            {artwork.category.name_ar}
                        </span>
                    )}
                </div>
            </Link>
            <div className="p-4">
                <Link href={`/artworks/${artwork.id}`}>
                    <h3 className="font-bold text-theme text-sm truncate group-hover:text-gold transition-colors">
                        {artwork.title}
                    </h3>
                </Link>
                <div className="flex items-center justify-between mt-2">
                    <Link href={`/artists/${artwork.artist?.username}`} className="flex items-center gap-2 hover:opacity-80">
                        {artwork.artist?.avatar_url ? (
                            <Image src={artwork.artist.avatar_url} alt="" width={20} height={20} className="rounded-full" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gold/20" />
                        )}
                        <span className="text-xs text-theme-subtle">{artwork.artist?.display_name}</span>
                        {artwork.artist?.is_verified && <span className="text-gold text-[10px]">✦</span>}
                    </Link>
                    {artwork.price && (
                        <span className="text-xs font-bold text-gold">{Number(artwork.price).toLocaleString()} ر.س</span>
                    )}
                </div>
                {artwork.price && (
                    <button
                        onClick={() => addItem({
                            id: artwork.id,
                            title: artwork.title,
                            price: Number(artwork.price),
                            image_url: artwork.image_url,
                            artist_name: artwork.artist?.display_name || "فنان وشّى",
                            type: "artwork",
                        })}
                        className="mt-3 w-full py-2.5 text-xs font-bold bg-gold/10 text-gold rounded-xl border border-gold/15 hover:bg-gold/20 transition-colors"
                    >
                        أضف للسلة
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Product Card ───────────────────────────────────────────
function ProductCard({ product }: { product: any }) {
    const addItem = useCartStore((s) => s.addItem);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group theme-surface-panel rounded-[1.65rem] overflow-hidden hover:border-gold/30 transition-all duration-500"
        >
            <Link href={`/products/${product.id}`} className="block">
                <div className="aspect-square relative overflow-hidden">
                    <Image
                        src={product.image_url}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <span className="absolute top-3 right-3 text-[10px] bg-[color:rgba(15,15,15,0.42)] backdrop-blur-md text-on-dark px-2.5 py-1 rounded-full">
                        {product.type}
                    </span>
                </div>
            </Link>
            <div className="p-4">
                <Link href={`/products/${product.id}`}>
                    <h3 className="font-bold text-theme text-sm truncate group-hover:text-gold transition-colors">
                        {product.title}
                    </h3>
                </Link>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-theme-subtle">{product.artist?.display_name}</span>
                    <span className="text-sm font-bold text-gold">{Number(product.price).toLocaleString()} ر.س</span>
                </div>
                <button
                    onClick={() => addItem({
                        id: product.id,
                        title: product.title,
                        price: Number(product.price),
                        image_url: product.image_url,
                        artist_name: product.artist?.display_name || "فنان وشّى",
                        type: "product",
                    })}
                    className="mt-3 w-full py-2.5 text-xs font-bold bg-gold/10 text-gold rounded-xl border border-gold/15 hover:bg-gold/20 transition-colors"
                >
                    أضف للسلة
                </button>
            </div>
        </motion.div>
    );
}

// ─── Artist Card ────────────────────────────────────────────
function ArtistCard({ artist }: { artist: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Link
                href={`/artists/${artist.username}`}
                className="group block theme-surface-panel rounded-[1.65rem] overflow-hidden hover:border-gold/30 transition-all duration-500"
            >
                {/* Cover */}
                <div className="h-24 relative bg-gradient-to-br from-gold/20 via-purple-500/10 to-emerald-500/10">
                    {artist.cover_url && (
                        <Image src={artist.cover_url} alt="" fill className="object-cover opacity-60" />
                    )}
                </div>
                {/* Avatar + Info */}
                <div className="px-4 pb-4 -mt-8 relative">
                    <div className="w-16 h-16 rounded-full border-4 border-theme-subtle bg-theme-subtle overflow-hidden mb-3">
                        {artist.avatar_url ? (
                            <Image src={artist.avatar_url} alt={artist.display_name} width={64} height={64} className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gold/20 flex items-center justify-center text-gold font-bold text-lg">
                                {artist.display_name?.[0]}
                            </div>
                        )}
                    </div>
                    <h3 className="font-bold text-theme text-sm flex items-center gap-1.5">
                        {artist.display_name}
                        {artist.is_verified && <span className="text-gold text-xs">✦</span>}
                    </h3>
                    <p className="text-xs text-theme-faint mt-0.5">@{artist.username}</p>
                    {artist.bio && (
                        <p className="text-xs text-theme-subtle mt-2 line-clamp-2">{artist.bio}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-theme-faint">
                        <span>{artist.total_artworks || 0} عمل</span>
                        <span>{artist.total_sales || 0} مبيعات</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════
//  MAIN SEARCH PAGE
// ═══════════════════════════════════════════════════════════

export default function SearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";
    const initialTab = (searchParams.get("tab") as SearchTab) || "artworks";

    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
    const [results, setResults] = useState<SearchResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showFilters, setShowFilters] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [filters, setFilters] = useState<SearchFilters>({
        sortBy: "newest",
        category: "all",
        productType: "all",
    });
    const [page, setPage] = useState(1);

    const handleLeaveSearch = useCallback(() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }

        router.push("/");
    }, [router]);

    // Load categories
    useEffect(() => {
        getCategories().then(setCategories);
    }, []);

    // Debounced search
    const doSearch = useCallback(
        (q: string, tab: SearchTab, p: number, f: SearchFilters) => {
            startTransition(async () => {
                const data = await globalSearch(q, tab, p, f);
                setResults(data);
            });
        },
        []
    );

    // Trigger search on changes
    useEffect(() => {
        doSearch(query, activeTab, page, filters);
        // Update URL
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (activeTab !== "artworks") params.set("tab", activeTab);
        router.replace(`/search?${params.toString()}`, { scroll: false });
    }, [query, activeTab, page, filters, doSearch, router]);

    // Current tab data
    const currentData = results?.[activeTab];
    const totalPages = currentData ? Math.ceil(currentData.count / 12) : 0;

    return (
        <div className="min-h-[60vh] bg-bg pt-6 sm:pt-8 pb-12 sm:pb-16" dir="rtl">
            {/* ─── Hero Search ─── */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] via-transparent to-transparent" />
                <div className="max-w-4xl mx-auto px-6 py-12 relative">
                    <div className="theme-surface-panel rounded-[2rem] px-6 py-10 sm:px-10">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-[11px] font-bold tracking-[0.22em] text-theme-subtle">
                                <Compass className="h-3.5 w-3.5 text-gold" />
                                DISCOVER
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleLeaveSearch}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-4 py-2.5 text-sm font-semibold text-theme transition-colors hover:border-gold/25 hover:bg-theme-subtle"
                                >
                                    <ArrowRight className="h-4 w-4 text-gold" />
                                    رجوع
                                </button>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-4 py-2.5 text-sm font-semibold text-theme transition-colors hover:border-gold/25 hover:bg-theme-subtle"
                                >
                                    <Home className="h-4 w-4 text-gold" />
                                    الرئيسية
                                </Link>
                            </div>
                        </div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl md:text-5xl font-bold text-theme text-center mb-2"
                        >
                            اكتشف الفن
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-theme-faint text-center mb-8"
                        >
                            ابحث في الأعمال الفنية، المنتجات، والفنانين عبر واجهة أوضح وأكثر اتزانًا.
                        </motion.p>

                        {/* Search Input */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative"
                        >
                            <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-faint" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="ابحث... مثلاً: خط عربي، تيشيرت، فنان"
                                className="input-dark w-full h-14 rounded-2xl pr-14 pl-14 text-sm"
                                autoFocus
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery("")}
                                    className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-faint hover:text-theme-subtle transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                            {isPending && (
                                <Loader2 className="absolute left-12 top-1/2 -translate-y-1/2 w-4 h-4 text-gold animate-spin" />
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.28 }}
                            className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs"
                        >
                            <Link href="/gallery" className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-theme-soft transition-colors hover:border-gold/25 hover:text-gold">
                                المعرض
                            </Link>
                            <Link href="/store" className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-theme-soft transition-colors hover:border-gold/25 hover:text-gold">
                                المتجر
                            </Link>
                            <Link href="/design" className="rounded-full border border-theme-subtle bg-theme-faint px-3 py-1.5 text-theme-soft transition-colors hover:border-gold/25 hover:text-gold">
                                صمّم قطعتك
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                {/* ─── Tabs + Filter Toggle ─── */}
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === tab.id
                                    ? "theme-surface-panel text-gold border-gold/30"
                                    : "text-theme-faint hover:text-theme-soft hover:bg-theme-subtle border border-transparent"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {results && (
                                    <span className="text-[10px] bg-theme-soft px-1.5 py-0.5 rounded-full">
                                        {results[tab.id].count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center justify-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm transition-all lg:self-auto ${showFilters ? "theme-surface-panel text-gold border-gold/30" : "text-theme-faint hover:bg-theme-subtle"
                            }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        فلاتر
                    </button>
                </div>

                {/* ─── Filters Panel ─── */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mb-8"
                        >
                            <div className="theme-surface-panel grid grid-cols-1 gap-4 rounded-[1.75rem] p-6 sm:grid-cols-2 xl:grid-cols-4">
                                {/* Sort */}
                                <div>
                                    <label className="text-xs text-theme-faint mb-2 block">الترتيب</label>
                                    <select
                                        value={filters.sortBy}
                                        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                                        className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                    >
                                        {sortOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category (artworks only) */}
                                {activeTab === "artworks" && (
                                    <div>
                                        <label className="text-xs text-theme-faint mb-2 block">التصنيف</label>
                                        <select
                                            value={filters.category}
                                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                            className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                        >
                                            <option value="all">الكل</option>
                                            {categories.map((cat) => (
                                                <option key={cat.slug} value={cat.slug}>{cat.name_ar}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Product Type (products only) */}
                                {activeTab === "products" && (
                                    <div>
                                        <label className="text-xs text-theme-faint mb-2 block">نوع المنتج</label>
                                        <select
                                            value={filters.productType}
                                            onChange={(e) => setFilters({ ...filters, productType: e.target.value })}
                                            className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                        >
                                            <option value="all">الكل</option>
                                            <option value="t-shirt">تيشيرت</option>
                                            <option value="hoodie">هودي</option>
                                            <option value="mug">كوب</option>
                                            <option value="poster">بوستر</option>
                                            <option value="tote-bag">حقيبة</option>
                                        </select>
                                    </div>
                                )}

                                {/* Min Price */}
                                <div>
                                    <label className="text-xs text-theme-faint mb-2 block">أقل سعر</label>
                                    <input
                                        type="number"
                                        value={filters.minPrice || ""}
                                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
                                        placeholder="0"
                                        className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                    />
                                </div>

                                {/* Max Price */}
                                <div>
                                    <label className="text-xs text-theme-faint mb-2 block">أعلى سعر</label>
                                    <input
                                        type="number"
                                        value={filters.maxPrice || ""}
                                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                                        placeholder="∞"
                                        className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Results Grid ─── */}
                {isPending ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                ) : currentData && currentData.data.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {activeTab === "artworks" && currentData.data.map((item: any) => (
                                <ArtworkCard key={item.id} artwork={item} />
                            ))}
                            {activeTab === "products" && currentData.data.map((item: any) => (
                                <ProductCard key={item.id} product={item} />
                            ))}
                            {activeTab === "artists" && currentData.data.map((item: any) => (
                                <ArtistCard key={item.id} artist={item} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                                        className={`w-11 h-11 rounded-2xl text-sm font-medium transition-all ${page === i + 1
                                            ? "bg-gold text-[var(--wusha-bg)] shadow-[0_18px_45px_rgba(154,123,61,0.22)]"
                                            : "theme-surface-panel text-theme-faint hover:border-gold/25"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="theme-surface-panel rounded-[2rem] text-center py-24 px-6">
                        <Search className="w-16 h-16 text-fg/10 mx-auto mb-6" />
                        <h3 className="text-xl font-bold text-theme-faint mb-2">
                            {query ? "لا توجد نتائج" : "ابدأ البحث"}
                        </h3>
                        <p className="text-theme-faint text-sm">
                            {query ? `لم نجد نتائج لـ "${query}" في ${tabs.find(t => t.id === activeTab)?.label}` : "اكتب ما تبحث عنه في الأعلى"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
