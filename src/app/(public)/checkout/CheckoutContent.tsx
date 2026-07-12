"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTrackEvent } from "@/components/ops/EventTracker";
import { pixelInitiateCheckout } from "@/lib/meta-pixel";
import { useCartStore } from "@/stores/cartStore";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Mail, MapPin, Phone, User, CreditCard, Smartphone } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createOrder } from "@/app/actions/orders";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { validateDiscountCoupon } from "@/app/actions/discount-coupons";
import { Lock } from "lucide-react";
import { cartItemsSignature, sanitizeCartItems } from "@/lib/commerce-safety";

function normalizeSaudiPhone(value: string) {
    const compact = value.replace(/[\s\-()]/g, "");
    if (compact.startsWith("00966")) return `+966${compact.slice(5)}`;
    if (compact.startsWith("966")) return `+${compact}`;
    return compact;
}

// Schema
const addressSchema = z.object({
    name: z.string().trim().min(3, "الاسم مطلوب"),
    phone: z.string()
        .trim()
        .transform(normalizeSaudiPhone)
        .refine((value) => /^(?:05\d{8}|\+9665\d{8})$/.test(value), "أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx أو +9665xxxxxxxx"),
    line1: z.string().trim().min(5, "العنوان مطلوب"),
    line2: z.string().optional(),
    city: z.string().trim().min(2, "المدينة مطلوبة"),
    postal_code: z.string().trim().regex(/^\d{5}$/, "الرمز البريدي السعودي يتكون من 5 أرقام"),
    country: z.string().min(2, "الدولة مطلوبة"),
});

type AddressFormValues = z.infer<typeof addressSchema>;
type PaymentMethod = "cod" | "tap" | "pos_cash" | "pos_card";

export interface ShippingConfig {
    flat_rate: number;
    free_above: number;
    tax_rate: number;
    shipping_enabled: boolean;
    tax_enabled: boolean;
}

async function verifyTapPayment(params: {
    orderId: string;
    chargeId: string;
}) {
    try {
        const response = await fetch("/api/tap/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
        });

        const json = await response.json();
        if (!response.ok || !json.success) {
            return {
                success: false as const,
                error: json.error || "تعذر التحقق من الدفع",
            };
        }

        return {
            success: true as const,
            orderNumber: typeof json.orderNumber === "string" ? json.orderNumber : "",
        };
    } catch {
        return {
            success: false as const,
            error: "تعذر الاتصال بالخادم للتحقق من الدفع",
        };
    }
}

// ─── Main Client Component ───────────────────────────────

export function CheckoutContent({ shippingConfig, userRole, isLoggedIn }: { shippingConfig: ShippingConfig; userRole?: string; isLoggedIn?: boolean }) {
    const { items: rawItems, clearCart, getSubtotal, getDiscountAmount, coupon, applyCoupon, removeCoupon } = useCartStore();
    const { user } = useUser();
    const items = useMemo(() => sanitizeCartItems(rawItems), [rawItems]);
    const rawItemsSignature = useMemo(() => cartItemsSignature(rawItems), [rawItems]);
    const cleanItemsSignature = useMemo(() => cartItemsSignature(items), [items]);
    const cartWasCleaned = rawItemsSignature !== cleanItemsSignature;
    const searchParams = useSearchParams();
    const verifiedPaymentKeyRef = useRef<string | null>(null);
    const trackEvent = useTrackEvent();
    const [isClient, setIsClient] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tap");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState("");
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    const accountEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";

    useEffect(() => {
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        trackEvent("checkout_start", { metadata: { itemCount: items.length } });
        pixelInitiateCheckout({ numItems: items.length, value: subtotal });
    }, []);

    // Auto-verify on return from Tap. The server retrieves the charge before confirming payment.
    useEffect(() => {
        const orderNum = searchParams.get("order");
        const orderId = searchParams.get("order_id");
        const chargeId = searchParams.get("tap_id");

        if (searchParams.get("tap_return") !== "1" || !orderNum || !orderId || !chargeId) {
            return;
        }

        const verificationKey = `${orderId}:${chargeId}:${orderNum}`;
        if (verifiedPaymentKeyRef.current === verificationKey) {
            return;
        }
        verifiedPaymentKeyRef.current = verificationKey;

        setIsVerifyingPayment(true);
        setError(null);

        void (async () => {
            const result = await verifyTapPayment({ orderId, chargeId });

            if (!result.success) {
                setError(result.error);
                setIsVerifyingPayment(false);
                return;
            }

            clearCart();
            setSuccess(result.orderNumber);
            setIsVerifyingPayment(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
        })();
    }, [searchParams, clearCart]);

    const form = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            name: "",
            phone: "",
            line1: "",
            line2: "",
            city: "",
            postal_code: "",
            country: "المملكة العربية السعودية",
        },
    });

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (!isClient || !cartWasCleaned) return;
        useCartStore.setState({ items });
    }, [cartWasCleaned, isClient, items]);

    if (!isClient) return null;

    // ─── AUTH GATE ───────────────────────────────
    if (!isLoggedIn && !success) {
        return (
            <div className="container-wusha flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="theme-surface-panel max-w-xl rounded-[2.5rem] p-10 sm:p-14 border border-gold/20 shadow-2xl relative overflow-hidden"
                 >
                    {/* Background glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold/10 blur-[100px] rounded-full" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gold/5 blur-[80px] rounded-full" />
                    
                    <div className="relative z-10 space-y-8">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-gold/10 rounded-[1.8rem] flex items-center justify-center border border-gold/20">
                                <Lock className="w-10 h-10 text-gold" />
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <h2 className="text-3xl font-bold tracking-tight">بقي خطوة واحدة فقط</h2>
                            <p className="text-theme-subtle text-lg leading-relaxed">
                                لإكمال طلبك وحفظ تصاميمك الفريدة في خزانتك، يرجى تسجيل الدخول أو إنشاء حساب جديد.
                            </p>
                        </div>
                        
                        <div className="grid gap-4 pt-4">
                            <Link 
                                href={`/sign-up?redirect_url=${encodeURIComponent('/checkout')}`}
                                className="btn-gold py-4 rounded-2xl text-lg font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                إنشاء حساب جديد
                            </Link>
                            <Link 
                                href={`/sign-in?redirect_url=${encodeURIComponent('/checkout')}`}
                                className="border border-gold/40 text-gold hover:bg-gold/10 py-4 rounded-2xl text-lg font-medium transition-all"
                            >
                                لدي حساب بالفعل .. تسجيل الدخول
                            </Link>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2 pt-4">
                            <p className="text-[10px] text-theme-faint uppercase tracking-[0.3em]">
                                WASHA PREMIUM EXPERIENCE
                            </p>
                            <div className="h-px w-12 bg-gold/20" />
                        </div>
                    </div>
                 </motion.div>
            </div>
        );
    }

    const isReturningFromTap =
        searchParams.get("tap_return") === "1" && Boolean(searchParams.get("order"));

    if ((isVerifyingPayment || (isReturningFromTap && !error)) && !success) {
        return (
            <div className="container-wusha flex min-h-screen flex-col items-center justify-center gap-4 pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
                <Loader2 className="h-10 w-10 animate-spin text-gold" />
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">جاري التحقق من الدفع</h1>
                    <p className="text-sm text-theme-subtle">
                        نتحقق من Tap ونؤكد الطلب داخل النظام.
                    </p>
                </div>
            </div>
        );
    }

    if (isReturningFromTap && error && !success) {
        return (
            <div className="container-wusha flex min-h-screen flex-col items-center justify-center pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
                <div className="theme-surface-panel max-w-2xl rounded-[2rem] px-6 py-10 sm:px-8 sm:py-12">
                    <h1 className="mb-4 text-2xl font-bold">تعذر تأكيد الدفع تلقائياً</h1>
                    <p className="mb-8 text-theme-subtle">{error}</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link href="/account/orders" className="btn-gold px-8 py-3 rounded-xl">
                            متابعة الطلبات
                        </Link>
                        <Link href="/checkout" className="px-8 py-3 rounded-xl border border-gold/40 text-gold hover:bg-gold/10 transition-colors">
                            العودة للدفع
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (items.length === 0 && !success) {
        return (
            <div className="container-wusha flex min-h-screen flex-col items-center justify-center pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
                <div className="theme-surface-panel max-w-2xl rounded-[2rem] px-6 py-10 sm:px-8 sm:py-12">
                    <div className="w-20 h-20 bg-theme-subtle rounded-full flex items-center justify-center mb-6 mx-auto">
                        <ShoppingBagIcon className="w-10 h-10 text-theme-faint" />
                    </div>
                    <h1 className="text-2xl font-bold mb-4">سلة المشتريات فارغة</h1>
                    <p className="text-theme-subtle mb-8 max-w-md mx-auto">
                        لم تقم بإضافة أي منتجات للسلة بعد. تصفح المتجر واكتشف منتجاتنا الحصرية.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link href="/store" className="btn-gold px-8 py-3 rounded-xl">
                            تصفح المتجر
                        </Link>
                        <Link href="/design" className="px-8 py-3 rounded-xl border border-gold/40 text-gold hover:bg-gold/10 transition-colors">
                            صمّم قطعتك
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Calculations (from server-fetched shippingConfig) ───
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const taxableAmount = Math.max(0, subtotal - discount);

    const shippingCost = (() => {
        if (shippingConfig.shipping_enabled !== true) return 0;
        if (taxableAmount >= shippingConfig.free_above) return 0;
        return shippingConfig.flat_rate;
    })();
    const taxAmount = (shippingConfig.tax_enabled === true)
        ? taxableAmount * (shippingConfig.tax_rate / 100)
        : 0;
    const total = taxableAmount + shippingCost + taxAmount;

    async function onSubmit(data: AddressFormValues) {
        setIsSubmitting(true);
        setError(null);

        const orderItems = items.map((item) => {
            if (item.type === "custom_design") {
                return {
                    product_id: null,
                    quantity: item.quantity,
                    size: item.size || null,
                    unit_price: item.price,
                    custom_design_url: item.customDesignUrl ?? undefined,
                    custom_design_order_id: item.customDesignOrderId ?? undefined,
                    custom_design_tracker_token: item.customDesignTrackerToken ?? undefined,
                    custom_garment: item.customGarment ?? undefined,
                    custom_title: item.title,
                    custom_position: item.customPosition ?? undefined,
                };
            }
            return {
                product_id: item.id,
                quantity: item.quantity,
                size: item.size || null,
                color_code: item.colorCode || null,
                unit_price: item.price,
            };
        });

        const address = { ...data, state: "" };
        
        let finalPaymentMethod: PaymentMethod = "cod";
        if (paymentMethod === "tap") finalPaymentMethod = "tap";
        if (paymentMethod === "pos_cash" && userRole === "booth") finalPaymentMethod = "pos_cash";
        if (paymentMethod === "pos_card" && userRole === "booth") finalPaymentMethod = "pos_card";

        const result = await createOrder(orderItems, address, {
            paymentMethod: finalPaymentMethod,
            couponId: coupon?.id,
            discountAmount: discount,
        });

        if (!result.success) {
            setError(result.error || "حدث خطأ أثناء إنشاء الطلب");
            setIsSubmitting(false);
            return;
        }

        if (paymentMethod === "tap" && result.order_id && result.order_number && result.total) {
            try {
                const response = await fetch("/api/tap/create-charge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: result.order_id,
                        clientName: data.name,
                        clientMobile: data.phone,
                        clientEmail: accountEmail || undefined,
                    }),
                });

                const json = await response.json();

                if (!response.ok || !json.url) {
                    setError(json.error || "فشل في إنشاء رابط الدفع");
                    setIsSubmitting(false);
                    return;
                }

                window.location.href = json.url;
                return;
            } catch {
                setError("خطأ في الاتصال — تحقق من الإنترنت وأعد المحاولة");
                setIsSubmitting(false);
                return;
            }
        } else {
            setSuccess(result.order_number || "#ORDER");
            clearCart();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        setIsSubmitting(false);
    }

    async function handleApplyCoupon(e: React.FormEvent) {
        e.preventDefault();
        if (!couponCode.trim()) return;
        setIsApplyingCoupon(true);
        setCouponError(null);

        const result = await validateDiscountCoupon(couponCode.trim());
        if (!result.success || !result.data) {
            setCouponError(result.error || "كود غير صالح");
            setIsApplyingCoupon(false);
            return;
        }

        applyCoupon(result.data);
        setCouponCode("");
        setIsApplyingCoupon(false);
    }

    if (success) {
        return (
            <div className="container-wusha flex min-h-screen flex-col items-center justify-center pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="theme-surface-panel max-w-2xl rounded-[2rem] px-6 py-10 sm:px-8 sm:py-12 relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-green-500/10 blur-3xl rounded-full" />
                    
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 20, 
                            delay: 0.2 
                        }}
                        className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/20 mx-auto relative z-10"
                    >
                        <motion.div
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <Check className="w-12 h-12" />
                        </motion.div>
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold mb-2 relative z-10"
                    >
                        تم استلام طلبك بنجاح!
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-theme-soft mb-2 relative z-10"
                    >
                        رقم الطلب: <span className="font-mono text-gold font-bold bg-gold/10 px-2 py-0.5 rounded-md">{success}</span>
                    </motion.p>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-theme-subtle mb-8 max-w-md mx-auto relative z-10"
                    >
                        شكراً لتسوقك معنا. سيتم إرسال تفاصيل الطلب إلى بريدك الإلكتروني قريباً.
                    </motion.p>
                    
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="relative z-10"
                    >
                        <Link href="/" className="btn-gold px-8 py-3 rounded-xl inline-flex hover:scale-105 transition-transform active:scale-95">
                            العودة للرئيسية
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-theme pb-20 pt-28 sm:pt-32"
        >
            <div className="container-wusha">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mb-6 theme-surface-panel rounded-[2rem] px-5 py-5 sm:mb-8 sm:px-8 sm:py-7"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">CHECKOUT</p>
                            <h1 className="mt-2 text-3xl font-bold md:text-4xl">إتمام الطلب</h1>
                        </div>
                        <p className="max-w-xl text-sm text-theme-subtle">
                            راجع عناصر السلة، أكمل عنوان الشحن، ثم اختر طريقة الدفع الأنسب قبل تثبيت الطلب.
                        </p>
                    </div>
                </motion.div>

                <div className="grid gap-6 lg:grid-cols-12 lg:gap-10 xl:gap-12">
                    {/* Form Section */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                        className="space-y-6 lg:col-span-7 sm:space-y-8"
                    >
                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <MapPin className="text-gold w-5 h-5" />
                                عنوان الشحن
                            </h2>

                            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label htmlFor="checkout-name" className="text-sm text-theme-soft">الاسم الكامل</label>
                                        <div className="relative">
                                            <input
                                                id="checkout-name"
                                                {...form.register("name")}
                                                autoComplete="name"
                                                className="input-dark w-full rounded-xl px-4 py-3 pl-10"
                                                placeholder="الاسم الثلاثي"
                                            />
                                            <User className="absolute left-3 top-3.5 w-4 h-4 text-theme-faint" />
                                        </div>
                                        {form.formState.errors.name && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.name.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="checkout-phone" className="text-sm text-theme-soft">رقم الهاتف</label>
                                        <div className="relative">
                                            <input
                                                id="checkout-phone"
                                                {...form.register("phone")}
                                                type="tel"
                                                inputMode="tel"
                                                autoComplete="tel"
                                                className="input-dark w-full rounded-xl px-4 py-3 pl-10 dir-ltr text-right"
                                                placeholder="05xxxxxxxx"
                                            />
                                            <Phone className="absolute left-3 top-3.5 w-4 h-4 text-theme-faint" />
                                        </div>
                                        {form.formState.errors.phone && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.phone.message}</p>
                                        )}
                                    </div>
                                </div>

                                {accountEmail ? (
                                    <div className="space-y-2">
                                        <label htmlFor="checkout-email" className="text-sm text-theme-soft">البريد المعتمد للدفع والإشعارات</label>
                                        <div className="relative">
                                            <input
                                                id="checkout-email"
                                                value={accountEmail}
                                                disabled
                                                autoComplete="email"
                                                className="input-dark w-full rounded-xl px-4 py-3 pl-10 dir-ltr text-right text-theme-subtle cursor-not-allowed opacity-80"
                                            />
                                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-theme-faint" />
                                        </div>
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <label htmlFor="checkout-line1" className="text-sm text-theme-soft">العنوان</label>
                                    <input
                                        id="checkout-line1"
                                        {...form.register("line1")}
                                        autoComplete="street-address"
                                        className="input-dark w-full rounded-xl px-4 py-3"
                                        placeholder="اسم الشارع، رقم المبنى"
                                    />
                                    {form.formState.errors.line1 && (
                                        <p className="text-red-400 text-xs">{form.formState.errors.line1.message}</p>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <label htmlFor="checkout-city" className="text-sm text-theme-soft">المدينة</label>
                                        <input
                                            id="checkout-city"
                                            {...form.register("city")}
                                            autoComplete="address-level2"
                                            className="input-dark w-full rounded-xl px-4 py-3"
                                        />
                                        {form.formState.errors.city && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.city.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="checkout-postal-code" className="text-sm text-theme-soft">الرمز البريدي</label>
                                        <input
                                            id="checkout-postal-code"
                                            {...form.register("postal_code")}
                                            inputMode="numeric"
                                            autoComplete="postal-code"
                                            pattern="[0-9]{5}"
                                            className="input-dark w-full rounded-xl px-4 py-3"
                                        />
                                        {form.formState.errors.postal_code && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.postal_code.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="checkout-country" className="text-sm text-theme-soft">الدولة</label>
                                        <input
                                            id="checkout-country"
                                            {...form.register("country")}
                                            disabled
                                            autoComplete="country-name"
                                            className="input-dark w-full rounded-xl px-4 py-3 text-theme-subtle cursor-not-allowed opacity-70"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Payment Method */}
                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CreditCard className="text-gold w-5 h-5" />
                                طريقة الدفع
                            </h2>

                            <div className="space-y-3">
                                {/* Tap hosted checkout */}
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    type="button"
                                    onClick={() => setPaymentMethod("tap")}
                                    className={`w-full rounded-xl border p-4 text-right transition-colors ${paymentMethod === "tap"
                                        ? "border-gold/40 bg-gold/10"
                                        : "border-theme-soft bg-theme-faint hover:border-gold/20 hover:bg-theme-subtle"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${paymentMethod === "tap" ? "border-gold bg-gold" : "border-theme-soft"}`}>
                                                <AnimatePresence>
                                                    {paymentMethod === "tap" && (
                                                        <motion.div 
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            exit={{ scale: 0 }}
                                                            className="w-1.5 h-1.5 rounded-full bg-[var(--wusha-bg)]" 
                                                        />
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div>
                                                <span className="font-bold">الدفع الإلكتروني الآمن</span>
                                                <p className="mt-1 text-xs text-theme-subtle">
                                                    دفع مشفّر عبر وسائل الدفع المفعلة في حساب Tap.
                                                </p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-[10px] text-theme-subtle">
                                            <Lock className="w-3 h-3 text-gold" />
                                            مشفّر 100%
                                        </span>
                                    </div>
                                    <div className="mt-3 mr-7 flex flex-wrap gap-2">
                                        {/* Mock visual logos for cards */}
                                        <div className="rounded border border-theme-soft bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-theme-faint">mada</div>
                                        <div className="rounded border border-theme-soft bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-theme-faint">VISA/MC</div>
                                        <div className="rounded border border-theme-soft bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-theme-faint">Tap</div>
                                    </div>
                                </motion.button>
                                
                                {/* Booth POS Options */}
                                {userRole === "booth" && (
                                    <div className="pt-4 border-t border-theme-soft mt-2 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">صلاحيات الموظف (نقطة بيع)</span>
                                            <div className="flex-1 h-px bg-theme-soft"></div>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            type="button"
                                            onClick={() => setPaymentMethod("pos_cash")}
                                            className={`w-full rounded-xl border p-4 text-right transition-colors ${paymentMethod === "pos_cash"
                                                ? "border-emerald-500/40 bg-emerald-500/10"
                                                : "border-theme-soft bg-theme-faint hover:border-emerald-500/20 hover:bg-emerald-500/5"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${paymentMethod === "pos_cash" ? "border-emerald-500 bg-emerald-500" : "border-theme-soft"}`}>
                                                    <AnimatePresence>
                                                        {paymentMethod === "pos_cash" && (
                                                            <motion.div 
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                exit={{ scale: 0 }}
                                                                className="w-1.5 h-1.5 rounded-full bg-[var(--wusha-bg)]" 
                                                            />
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <div>
                                                    <span className="font-bold">الدفع الآن (كاش)</span>
                                                    <p className="mt-1 text-xs text-theme-subtle">استلام المبلغ نقداً من العميل مباشرة</p>
                                                </div>
                                            </div>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            type="button"
                                            onClick={() => setPaymentMethod("pos_card")}
                                            className={`w-full rounded-xl border p-4 text-right transition-colors ${paymentMethod === "pos_card"
                                                ? "border-emerald-500/40 bg-emerald-500/10"
                                                : "border-theme-soft bg-theme-faint hover:border-emerald-500/20 hover:bg-emerald-500/5"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${paymentMethod === "pos_card" ? "border-emerald-500 bg-emerald-500" : "border-theme-soft"}`}>
                                                    <AnimatePresence>
                                                        {paymentMethod === "pos_card" && (
                                                            <motion.div 
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                exit={{ scale: 0 }}
                                                                className="w-1.5 h-1.5 rounded-full bg-[var(--wusha-bg)]" 
                                                            />
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <div>
                                                    <span className="font-bold">الدفع الآن (شبكة / POS)</span>
                                                    <p className="mt-1 text-xs text-theme-subtle">استلام المبلغ عبر جهاز الشبكة المتوفر في البوث</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Order Summary */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                        className="lg:col-span-5"
                    >
                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8 lg:sticky lg:top-28">
                            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">ملخص الطلب</h2>
                                    <p className="mt-1 text-sm text-theme-subtle">{items.length} عنصر في السلة</p>
                                </div>
                                <span className="inline-flex w-fit rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs text-theme-subtle">
                                    {paymentMethod === "tap" ? "دفع إلكتروني — Tap" : paymentMethod === "pos_cash" ? "الدفع الآن (كاش)" : paymentMethod === "pos_card" ? "الدفع الآن (شبكة)" : "دفع عند الاستلام"}
                                </span>
                            </div>

                            {cartWasCleaned && (
                                <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                                    تم تحديث السلة وإزالة بيانات قديمة غير صالحة. راجع العناصر قبل إتمام الطلب.
                                </div>
                            )}

                            <div className="mb-6 space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar sm:max-h-[320px]">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.size || "default"}-${item.colorCode || "default"}`} className="flex gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-3 sm:gap-4">
                                        <div className="relative w-16 h-16 bg-theme-subtle rounded-lg overflow-hidden shrink-0">
                                            <Image
                                                src={item.image_url}
                                                alt={item.title}
                                                fill
                                                className="object-cover"
                                            />
                                            <span className="absolute bottom-0 right-0 bg-gold text-[var(--wusha-bg)] text-[10px] font-bold px-1.5 rounded-tl-lg">
                                                x{item.quantity}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="line-clamp-2 text-sm font-medium">{item.title}</h4>
                                            <p className="text-theme-subtle text-xs">{item.artist_name}</p>
                                            {item.size && <p className="text-theme-subtle text-xs mt-0.5">الحجم: {item.size}</p>}
                                            {item.colorCode && (
                                                <p className="mt-0.5 inline-flex items-center gap-1.5 text-theme-subtle text-xs">
                                                    اللون:
                                                    <span
                                                        className="h-3 w-3 rounded-full border border-theme-soft"
                                                        style={{ backgroundColor: item.colorCode }}
                                                        aria-hidden
                                                    />
                                                    <span dir="ltr">{item.colorCode}</span>
                                                </p>
                                            )}
                                            <p className="text-gold text-sm font-bold mt-1">{(item.price * item.quantity).toLocaleString()} ر.س</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 border-t border-theme-soft pt-6">
                                <div className="flex justify-between text-theme-soft text-sm">
                                    <span>المجموع الفرعي</span>
                                    <span>{subtotal.toLocaleString()} ر.س</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between items-center text-green-400 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span>الخصم</span>
                                            {coupon && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs opacity-80 border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 rounded">
                                                        {coupon.code} ({coupon.discount_type === "percentage"
                                                            ? `${coupon.discount_value}%`
                                                            : `${coupon.discount_value} ر.س`})
                                                    </span>
                                                    <button 
                                                        onClick={() => removeCoupon()}
                                                        className="text-xs text-theme-faint hover:text-red-400 transition-colors"
                                                        type="button"
                                                    >
                                                        إزالة
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold">- {discount.toLocaleString()} ر.س</span>
                                    </div>
                                )}
                                {!coupon && (
                                    <div className="pt-2 pb-1">
                                        <form onSubmit={handleApplyCoupon} className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                placeholder="أدخل كود الخصم" 
                                                className="input-dark w-full rounded-xl px-3 py-2 text-sm"
                                            />
                                            <button 
                                                type="submit" 
                                                disabled={isApplyingCoupon || !couponCode.trim()}
                                                className="shrink-0 bg-theme-subtle text-theme hover:bg-gold/20 hover:text-gold transition-colors rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
                                            >
                                                {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "تطبيق"}
                                            </button>
                                        </form>
                                        {couponError && <p className="text-red-400 text-[11px] mt-1.5 px-1">{couponError}</p>}
                                    </div>
                                )}
                                <div className="flex justify-between text-theme-soft text-sm">
                                    <span>الشحن</span>
                                    <span>
                                        {!shippingConfig.shipping_enabled
                                            ? <span className="text-green-400 text-xs">مجاني 🎁</span>
                                            : taxableAmount >= shippingConfig.free_above
                                                ? <span className="text-green-400 text-xs">شحن مجاني 🎉</span>
                                                : `${shippingCost.toLocaleString()} ر.س`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-theme-soft text-sm">
                                    <span>الضريبة ({shippingConfig.tax_rate}%)</span>
                                    <span>
                                        {!shippingConfig.tax_enabled
                                            ? <span className="text-theme-faint text-xs">غير مطبّقة</span>
                                            : `${taxAmount.toLocaleString()} ر.س`}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold text-lg pt-4 border-t border-theme-soft mt-4">
                                    <span>الإجمالي</span>
                                    <span className="text-gold">{total.toLocaleString()} ر.س</span>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl mt-6">
                                    {error}
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={isSubmitting || items.length === 0}
                                form="checkout-form"
                                className="mt-8 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold btn-gold disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>
                                            {paymentMethod === "tap" ? "الانتقال للدفع" : "تأكيد الطلب"}
                                        </span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>

                            <p className="text-center text-theme-faint text-xs mt-4">
                                بإتمام الطلب، أنت توافق على شروط الاستخدام وسياسة الخصوصية.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

function ShoppingBagIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
    );
}
