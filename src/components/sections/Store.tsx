"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Sparkles } from "lucide-react";
import { getProducts } from "@/app/actions/products";
import { useState, useEffect } from "react";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/store/ProductCard";

type ProductWithArtist = Product & {
  artist: {
    display_name: string;
    avatar_url: string | null;
  };
};

const storeSignals = [
  { value: "01", label: "اختيار فني", detail: "قطع مختارة بعناية" },
  { value: "02", label: "هوية واحدة", detail: "ألوان وخامات متناسقة" },
  { value: "03", label: "جاهزة للارتداء", detail: "منتجات تصل كقطعة نهائية" },
];

export function Store() {
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
    <section id="store" className="home-flow-section home-flow-section--store">
      <div className="home-section-smoke" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="container-wusha relative z-10">
        <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.35fr] lg:gap-10 xl:gap-14">
          <motion.aside
            className="home-panel home-panel--intro"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="home-panel-inner">
              <div className="home-section-kicker">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                منتجات حصرية
              </div>
              <h2 className="home-section-title">
                متجر وشّى
              </h2>
              <p className="home-section-copy">
                امتداد مباشر لعالم الهيرو: قطع فنية بملمس هادئ، ألوان محسوبة، وتفاصيل تصل كجزء من هوية واحدة لا كمنتجات متفرقة.
              </p>

              <div className="mt-8 space-y-3">
                {storeSignals.map((item) => (
                  <div key={item.value} className="home-detail-row">
                    <span>{item.value}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/store" className="home-cta-pill group mt-8">
                <span className="home-cta-icon">
                  <ShoppingBag className="h-4 w-4" aria-hidden />
                </span>
                تصفح المتجر بالكامل
                <ArrowLeft className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
              </Link>
            </div>
          </motion.aside>

          <motion.div
            className="home-product-deck"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={cn("home-loading-card", i === 1 && "col-span-2")}>
                    <div className={cn("bg-theme-faint/60", i === 1 ? "aspect-[5/4]" : "aspect-square")} />
                    <div className="space-y-3 p-4">
                      <div className="h-3 w-20 rounded-full bg-theme-faint" />
                      <div className="h-4 w-3/4 rounded-full bg-theme-faint" />
                      <div className="flex items-center justify-between pt-2">
                        <div className="h-4 w-14 rounded-full bg-theme-faint" />
                        <div className="h-9 w-9 rounded-2xl bg-theme-faint" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {products.map((product, index) => {
                  const featured = products.length >= 3 && index === 0;
                  return (
                    <div key={product.id} className={cn(featured && "col-span-2")}>
                      <motion.div
                        initial={{ opacity: 0, y: 34 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.65, delay: Math.min(index * 0.08, 0.32), ease: [0.16, 1, 0.3, 1] }}
                        className="h-full"
                      >
                        <ProductCard product={product} featured={featured} />
                      </motion.div>
                    </div>
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
