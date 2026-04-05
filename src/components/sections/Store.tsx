"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Star, ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { getProducts } from "@/app/actions/products";
import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

type ProductWithArtist = Product & {
  artist: {
    display_name: string;
    avatar_url: string | null;
  };
};

export function Store() {
  const addToCart = useCartStore((state) => state.addItem);
  const [products, setProducts] = useState<ProductWithArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await getProducts(1, "all");
      setProducts((data as unknown as ProductWithArtist[]) || []);
      setLoading(false);
    }
    fetchProducts();
  }, []);

  return (
    <section id="store" className="py-16 sm:py-24 relative">
      {/* Section Divider */}
      <div className="section-divider mb-16 sm:mb-24" />

      <div className="container-wusha">
        <div className="text-center mb-10 sm:mb-16">
          <motion.span
            className="text-gold/60 text-sm tracking-[0.3em] uppercase block mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            منتجات حصرية
          </motion.span>
          <motion.h2
            className="text-4xl md:text-6xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-gradient">المتجر</span>
          </motion.h2>
          <motion.p
            className="prose-readable text-theme-subtle mx-auto max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            منتجات فنية حصرية بجودة عالية — تختارها الفريق وتُحدَّث أسبوعيًا.
          </motion.p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
                <div className="relative aspect-square bg-theme-faint/50 border-b border-theme-subtle"></div>
                <div className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-16 bg-theme-faint rounded-full"></div>
                    <div className="h-4 w-8 bg-theme-faint rounded-md"></div>
                  </div>
                  <div className="h-4 sm:h-5 w-3/4 bg-theme-faint rounded-md mb-2 sm:mb-3"></div>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="h-6 w-16 bg-theme-faint rounded-md"></div>
                    <div className="h-9 w-9 bg-theme-faint rounded-xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4">
            {products.map((product, index) => {
              const featured = products.length >= 3 && index === 0;
              return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "glass-card rounded-2xl overflow-hidden group",
                  featured && "col-span-2 md:col-span-2 ring-1 ring-gold/15",
                )}
              >
                <div className={cn("relative overflow-hidden", featured ? "aspect-[5/4]" : "aspect-square")}>
                  <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {product.badge && (
                    <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ background: "linear-gradient(to right, var(--wusha-gold), var(--wusha-gold-light))", color: "var(--wusha-bg)" }}>
                      {product.badge}
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-theme-subtle bg-theme-subtle px-3 py-1 rounded-full border border-theme-soft">
                      {product.type === 'print' ? 'طباعة' : product.type === 'apparel' ? 'ملابس' : product.type}
                    </span>
                    <div className="flex items-center gap-1 text-gold text-sm">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-xs">{product.rating}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base mb-2 sm:mb-3 text-theme-strong truncate">{product.title}</h3>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm sm:text-lg font-bold text-gold">
                      {product.price} {product.currency}
                    </span>
                    <motion.button
                      onClick={() =>
                        addToCart({
                          id: product.id,
                          title: product.title,
                          price: Number(product.price),
                          image_url: product.image_url,
                          artist_name: product.artist?.display_name || "Wusha Artist",
                          size: null,
                          type: "product"
                        })
                      }
                      className="p-2.5 rounded-xl transition-all duration-300 border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--wusha-gold) 10%, transparent)",
                        color: "var(--wusha-gold)",
                        borderColor: "color-mix(in srgb, var(--wusha-gold) 20%, transparent)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--wusha-gold)";
                        e.currentTarget.style.color = "var(--wusha-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--wusha-gold) 10%, transparent)";
                        e.currentTarget.style.color = "var(--wusha-gold)";
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
            })}
          </div>
        )}

        {!loading && products.length > 0 ? (
          <motion.div
            className="mt-12 flex justify-center"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link
              href="/store"
              className="group inline-flex items-center gap-2 rounded-2xl border border-gold/25 bg-theme-faint px-6 py-3 text-sm font-bold text-theme transition-colors hover:border-gold/40 hover:bg-theme-subtle"
            >
              تصفح المتجر بالكامل
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            </Link>
          </motion.div>
        ) : null}

        {!loading && products.length === 0 && (
          <div className="text-center text-theme-subtle">لا توجد منتجات حالياً.</div>
        )}
      </div>
    </section>
  );
}
