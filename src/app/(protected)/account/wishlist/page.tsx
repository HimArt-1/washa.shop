import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensure-profile";
import { getWishlistProducts } from "@/app/actions/social";
import Image from "next/image";
import Link from "next/link";
import { Heart, ArrowLeft, ShoppingBag, Sparkles } from "lucide-react";
import { WishlistActions } from "./WishlistActions";

export const metadata = {
    title: "محفوظاتي — وشّى",
    description: "المنتجات المحفوظة في قائمتك",
};

export default async function WishlistPage() {
    const profile = await ensureProfile();
    if (!profile) redirect("/sign-in");

    const { data: products } = await getWishlistProducts();

    return (
        <div className="pb-16 pt-6 sm:pt-8">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="theme-surface-panel mb-8 rounded-[2rem] px-5 py-5 sm:px-8 sm:py-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">ACCOUNT WISHLIST</p>
                            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-theme sm:text-3xl">
                                <Heart className="h-6 w-6 text-red-400 fill-red-400/20" />
                                محفوظاتي
                            </h1>
                            <p className="mt-2 text-sm text-theme-faint">
                                {products.length} منتج محفوظ للرجوع السريع ومراجعة القطع التي لفتت انتباهك.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/account"
                                className="inline-flex items-center gap-2 rounded-2xl border border-theme-soft bg-theme-faint px-4 py-2.5 text-xs text-theme-faint transition-colors hover:border-gold/25 hover:text-gold"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                حسابي
                            </Link>
                            <Link
                                href="/store"
                                className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2.5 text-xs font-bold text-[var(--wusha-bg)] transition-colors hover:bg-gold-light"
                            >
                                <ShoppingBag className="h-4 w-4" />
                                تصفح المتجر
                            </Link>
                        </div>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="theme-surface-panel rounded-[2rem] py-20 text-center sm:py-24">
                        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-theme-subtle border border-theme-subtle">
                            <Heart className="h-10 w-10 text-fg/10" />
                        </div>
                        <p className="mb-2 text-theme-subtle">لا توجد منتجات محفوظة</p>
                        <p className="mb-6 text-sm text-theme-faint">أضف منتجات للمحفوظات أثناء تصفح المتجر</p>
                        <Link href="/store" className="btn-gold inline-flex items-center gap-2 py-3 px-6">
                            <ShoppingBag className="w-4 h-4" />
                            تصفح المتجر
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {products.map((product: any) => (
                            <div
                                key={product.id}
                                className="theme-surface-panel group overflow-hidden rounded-[1.75rem] p-3 transition-all hover:border-gold/20 sm:p-4"
                            >
                                <Link href={`/products/${product.id}`} className="relative block aspect-[4/3] overflow-hidden rounded-[1.25rem]">
                                    <Image
                                        src={product.image_url}
                                        alt={product.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                    />
                                </Link>
                                <div className="p-1 pt-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${product.in_stock ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                            {product.in_stock ? "متوفر" : "غير متوفر"}
                                        </span>
                                        {product.artist?.display_name && (
                                            <span className="inline-flex items-center gap-1 text-[11px] text-theme-faint">
                                                <Sparkles className="h-3 w-3 text-gold" />
                                                {product.artist.display_name}
                                            </span>
                                        )}
                                    </div>
                                    <Link href={`/products/${product.id}`}>
                                        <h3 className="line-clamp-2 text-sm font-bold text-theme transition-colors group-hover:text-gold sm:text-base sm:line-clamp-1">
                                            {product.title}
                                        </h3>
                                    </Link>
                                    <p className="mt-1 text-xs text-gold sm:text-sm">
                                        {Number(product.price).toLocaleString()} ر.س
                                    </p>
                                    <WishlistActions productId={product.id} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
