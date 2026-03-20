"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCheckoutSession } from "@/app/actions/stripe";
import { useState } from "react";
import { validateDiscountCoupon } from "@/app/actions/discount-coupons";

export function CartDrawer() {
  const { items, isOpen, toggleCart, updateQuantity, removeItem, getCartTotal, getSubtotal, coupon, applyCoupon, removeCoupon, getDiscountAmount } = useCartStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        toggleCart(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggleCart]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        toggleCart(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, toggleCart]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setIsApplyingPromo(true);
    setPromoError("");

    try {
        const result = await validateDiscountCoupon(promoCode.trim());
        if (result.error) {
            setPromoError(result.error);
        } else if (result.success && result.data) {
            applyCoupon(result.data);
            setPromoCode("");
            setPromoError("");
        }
    } catch (err: any) {
        setPromoError("حدث خطأ أثناء التحقق من الكود");
    } finally {
        setIsApplyingPromo(false);
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    
    // Map CartItems to CheckoutItems
    const checkoutItems = items.map(item => ({
      id: item.id,
      name: item.title,
      price: item.price,
      quantity: item.quantity,
      image: item.image_url,
      custom_design_url: item.customDesignUrl,
      custom_garment: item.customGarment,
    }));

    const result = await createCheckoutSession(checkoutItems, "/checkout/success", "/cart", coupon?.id);
    
    setIsCheckingOut(false);

    if (result.success && result.url) {
      window.location.href = result.url; // Redirect to Stripe
    } else {
      console.error("Checkout failed:", result.error);
      alert(result.error || "حدث خطأ أثناء الانتقال للدفع");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[500px] shadow-2xl z-[210] flex flex-col border-l border-theme-soft theme-surface-panel"
            dir="rtl"
            style={{ backgroundColor: "var(--wusha-surface)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-theme-subtle bg-theme-faint/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-theme-subtle flex items-center justify-center border border-theme-subtle">
                  <ShoppingBag className="w-5 h-5 text-theme" />
                </div>
                <h2 className="text-xl font-bold text-theme">سلة التسوق</h2>
                <span className="bg-gold/10 text-gold text-xs font-bold px-2.5 py-1 rounded-full border border-gold/20">
                  {items.length} قطع
                </span>
              </div>
              <button
                onClick={() => toggleCart(false)}
                className="p-2.5 rounded-full hover:bg-theme-subtle text-theme-subtle hover:text-theme transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-wusha">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-theme-subtle flex items-center justify-center mb-2 border border-theme-subtle">
                    <ShoppingBag className="w-10 h-10 text-theme-faint" />
                  </div>
                  <h3 className="text-xl font-bold text-theme">سلتك فارغة الألوان!</h3>
                  <p className="text-theme-subtle max-w-[250px]">
                    يبدو أنك لم تختر أي تحفة فنية بعد. استكشف تصاميم وشّى واضف لمستك.
                  </p>
                  <button
                    onClick={() => {
                        toggleCart(false);
                        router.push("/gallery");
                    }}
                    className="mt-4 btn-gold px-8 py-3 rounded-full flex items-center gap-2 font-bold"
                  >
                    استكشاف المعرض
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={`${item.id}-${item.size || "default"}`}
                      className="flex gap-4 p-4 rounded-2xl theme-surface-panel group"
                    >
                      {/* Image */}
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-theme-surface flex-shrink-0 border border-theme-subtle">
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-theme-strong line-clamp-1">{item.title}</h3>
                            <button
                              onClick={() => removeItem(item.id, item.size)}
                              className="text-theme-faint hover:text-red-500 transition-colors p-1"
                              aria-label="إزالة العنصر"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-sm text-theme-subtle font-medium">{item.artist_name}</span>
                            {item.size && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-theme-faint" />
                                <span className="text-xs bg-theme-subtle border border-theme-subtle text-theme px-2 py-0.5 rounded-md font-mono font-bold">
                                  {item.size}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-end justify-between mt-3">
                          <span className="font-bold text-lg text-theme">
                            {item.price} <span className="text-xs font-normal text-theme-subtle">ر.س</span>
                          </span>

                          {/* Quantity Controls */}
                          <div className="flex items-center bg-theme-faint border border-theme-subtle rounded-full overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                              className="w-8 h-8 flex items-center justify-center text-theme-subtle hover:text-theme hover:bg-theme-subtle transition-colors disabled:opacity-30"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 flex justify-center text-sm font-bold text-theme">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                              className="w-8 h-8 flex items-center justify-center text-theme-subtle hover:text-theme hover:bg-theme-subtle transition-colors disabled:opacity-30"
                              disabled={item.quantity >= (item.maxQuantity || 99)}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            {items.length > 0 && (
              <div className="p-6 border-t border-theme-subtle bg-theme-faint/40 backdrop-blur-md">
                
                {/* Promo Code Input */}
                <div className="mb-6">
                    {coupon ? (
                        <div className="theme-surface-panel flex items-center justify-between p-3 rounded-xl border-gold/20 bg-gold/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                                    <ShoppingBag className="w-4 h-4 text-gold" />
                                </div>
                                <div>
                                    <p className="text-gold font-bold text-sm uppercase">{coupon.code}</p>
                                    <p className="text-gold/70 text-xs">تم تفعيل كود الخصم</p>
                                </div>
                            </div>
                            <button 
                                onClick={removeCoupon}
                                className="text-theme-subtle hover:text-red-400 p-2 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="لديك كود خصم؟"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                                    className="input-dark flex-1 rounded-xl px-4 text-sm uppercase"
                                />
                                <button
                                    onClick={handleApplyPromo}
                                    disabled={!promoCode.trim() || isApplyingPromo}
                                    className="px-4 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl text-sm font-bold hover:bg-gold/20 transition-colors disabled:opacity-50 min-w-[80px]"
                                >
                                    {isApplyingPromo ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تطبيق"}
                                </button>
                            </div>
                            {promoError && (
                                <p className="text-red-400 text-xs font-medium px-1">{promoError}</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-theme-subtle text-sm">
                    <span>المجموع الفرعي</span>
                    <span className="font-mono">{getSubtotal()} ر.س</span>
                  </div>
                  
                  {coupon && (
                      <div className="flex justify-between text-gold text-sm font-bold">
                        <span>الخصم ({coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value} ر.س`})</span>
                        <span className="font-mono">- {getDiscountAmount()} ر.س</span>
                      </div>
                  )}

                  <div className="flex justify-between text-theme font-bold text-lg pt-3 border-t border-theme-subtle">
                    <span>الإجمالي</span>
                    <div className="text-left">
                        {coupon && (
                            <span className="block text-xs text-theme-subtle line-through mb-1">{getSubtotal()} ر.س</span>
                        )}
                        <span className="text-gold font-black">{getCartTotal()} ر.س</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => toggleCart(false)}
                        className="btn-outline py-4 w-full rounded-xl text-sm font-bold border-theme-strong/20 hover:border-theme-strong"
                    >
                        متابعة التسوق
                    </button>
                    <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="btn-gold py-4 w-full rounded-xl text-sm font-bold flex items-center justify-center gap-2 group shadow-[0_10px_30px_-10px_rgba(202,160,82,0.4)] disabled:opacity-50"
                    >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري التحويل...
                          </>
                        ) : (
                          <>
                            إتمام الطلب
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                          </>
                        )}
                    </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
