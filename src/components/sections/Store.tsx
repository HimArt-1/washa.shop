"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, Sparkles, Star } from "lucide-react";
import { getProducts } from "@/app/actions/products";
import { useMemo, useState, useEffect } from "react";
import type { Product } from "@/types/database";
import { sanitizeCommerceImageUrl } from "@/lib/commerce-safety";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  apparel: "ملابس",
  print: "طباعة",
  digital: "رقمي",
  original: "عمل أصلي",
  nft: "NFT",
};

function productTypeLabel(type: string) {
  return PRODUCT_TYPE_LABELS[type] ?? type;
}

export type ProductWithArtist = Product & {
  artist: {
    display_name: string;
    avatar_url: string | null;
  };
};

export function Store({
  initialProducts = [],
  initialProductsLoaded = false,
}: {
  initialProducts?: ProductWithArtist[];
  initialProductsLoaded?: boolean;
}) {
  const [products, setProducts] = useState<ProductWithArtist[]>(initialProducts);
  const [loading, setLoading] = useState(!initialProductsLoaded);
  const selectedProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const featuredDelta = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
        if (featuredDelta !== 0) return featuredDelta;
        return Number(b.rating || 0) - Number(a.rating || 0);
      })
      .slice(0, 5);
  }, [products]);

  useEffect(() => {
    if (initialProductsLoaded) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchProducts() {
      const { data } = await getProducts(1, "all");
      if (!cancelled) {
        setProducts((data as unknown as ProductWithArtist[]) || []);
        setLoading(false);
      }
    }

    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [initialProducts, initialProductsLoaded]);

  return (
    <section id="store" className="home-flow-section home-flow-section--store">
      <div className="home-section-smoke" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="container-wusha relative z-10">
        <div className="home-store-stack">
          <motion.div
            className="home-store-head"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <h2 className="home-section-title">متجر وشّى</h2>
            </div>
            <Link href="/store" className="home-store-view-link">
              عرض كل المنتجات
              <ArrowUpLeft className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>

          <div className="home-product-deck home-product-deck--full">
            {loading ? (
              <div className="home-store-grid home-store-grid--loading">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="home-loading-card home-store-card-skeleton">
                    <div className="home-store-card-skeleton-media bg-theme-faint/60" />
                    <div className="home-store-card-skeleton-copy">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedProducts.length > 0 ? (
              <div className="home-store-grid" aria-label="منتجات مختارة من متجر وشّى">
                {selectedProducts.map((product) => {
                  const price = Number(product.price || 0);
                  const originalPrice = Number(product.original_price || 0);
                  const hasDiscount = originalPrice > price && price > 0;
                  const rating = Number(product.rating || 0);
                  const productImage = product.thumbnail_url || product.image_url;
                  return (
                    <Link key={product.id} href={`/products/${product.id}`} className="home-store-card group">
                      <div className="home-store-card-media relative">
                        <Image
                          src={sanitizeCommerceImageUrl(productImage)}
                          alt={product.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 767px) 82vw, (max-width: 1023px) 42vw, 20vw"
                        />
                        <div className="home-store-card-glaze" aria-hidden />
                        <span className="home-store-card-badge">{product.badge || productTypeLabel(product.type)}</span>
                      </div>
                      <div className="home-store-card-copy">
                        <h3>{product.title}</h3>
                        <div className="home-store-card-meta">
                          <strong>{price.toLocaleString()} ر.س</strong>
                          {hasDiscount ? <span>{originalPrice.toLocaleString()} ر.س</span> : null}
                        </div>
                        <small
                          className={rating > 0 ? "home-store-card-rating" : "home-store-card-rating home-store-card-rating--empty"}
                          aria-hidden={rating <= 0}
                        >
                          {rating > 0 ? (
                            <>
                            <Star className="h-3 w-3" aria-hidden />
                            {rating.toFixed(1)}
                            </>
                          ) : (
                            <span aria-hidden="true">&nbsp;</span>
                          )}
                        </small>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="home-empty-state">
                <Sparkles className="h-6 w-6" aria-hidden />
                <h3>المتجر قيد التنسيق</h3>
                <p>ستظهر المنتجات المختارة هنا بمجرد تفعيلها من لوحة التحكم.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
