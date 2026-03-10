import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/ensure-profile";
import { getWishlistProducts } from "@/app/actions/social";
import Image from "next/image";
import Link from "next/link";
import { Heart, ArrowLeft, ShoppingBag } from "lucide-react";
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
        <div className="pt-8 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
                        <Heart className="w-6 h-6 text-red-400 fill-red-400/30" />
                        محفوظاتي
                    </h1>
                    <Link
                        href="/store"
                        className="text-sm text-theme-subtle hover:text-gold flex items-center gap-1"
                    >
                        تصفح المتجر
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border border-theme-subtle bg-surface/30">
                        <Heart className="w-16 h-16 text-fg/10 mx-auto mb-4" />
                        <p className="text-theme-subtle mb-2">لا توجد منتجات محفوظة</p>
                        <p className="text-theme-faint text-sm mb-6">أضف منتجات للمحفوظات أثناء تصفح المتجر</p>
                        <Link href="/store" className="btn-gold inline-flex items-center gap-2 py-3 px-6">
                            <ShoppingBag className="w-4 h-4" />
                            تصفح المتجر
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {products.map((product: any) => (
                            <div
                                key={product.id}
                                className="group rounded-2xl border border-theme-subtle overflow-hidden hover:border-gold/20 transition-all bg-surface/30"
                            >
                                <Link href={`/products/${product.id}`} className="block aspect-square relative">
                                    <Image
                                        src={product.image_url}
                                        alt={product.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                    />
                                </Link>
                                <div className="p-3">
                                    <Link href={`/products/${product.id}`}>
                                        <h3 className="text-sm font-bold text-theme truncate group-hover:text-gold transition-colors">
                                            {product.title}
                                        </h3>
                                    </Link>
                                    <p className="text-xs text-gold mt-0.5">
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
