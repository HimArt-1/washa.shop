"use client";

import { Suspense, useState, useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, MapPin, Phone, User, CreditCard, Smartphone } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createOrder } from "@/app/actions/orders";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";

// Schema
const addressSchema = z.object({
    name: z.string().min(3, "الاسم مطلوب"),
    phone: z.string().min(10, "رقم الهاتف مطلوب"),
    line1: z.string().min(5, "العنوان مطلوب"),
    line2: z.string().optional(),
    city: z.string().min(2, "المدينة مطلوبة"),
    postal_code: z.string().min(4, "الرمز البريدي مطلوب"),
    country: z.string().min(2, "الدولة مطلوبة"),
});

type AddressFormValues = z.infer<typeof addressSchema>;
type PaymentMethod = "cod" | "stripe";
type CheckoutStep = "address" | "paying";

function CheckoutContent() {
    const { items, getCartTotal, clearCart, getSubtotal, getDiscountAmount, coupon } = useCartStore();
    const searchParams = useSearchParams();
    const [isClient, setIsClient] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // حالة الدفع المدمج
    const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("address");
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
    const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);

    useEffect(() => {
        const orderNum = searchParams.get("order");
        if (searchParams.get("success") === "1" && orderNum) {
            setSuccess(orderNum);
            clearCart();
        }
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

    if (!isClient) return null;

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

    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const taxableAmount = Math.max(0, subtotal - discount);
    const shipping = 30;
    const tax = taxableAmount * 0.15;
    const total = getCartTotal() + shipping + tax;

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
                    custom_garment: item.customGarment ?? undefined,
                    custom_title: item.title,
                };
            }
            return {
                product_id: item.id,
                quantity: item.quantity,
                size: item.size || null,
                unit_price: item.price,
            };
        });

        const address = { ...data, state: "" };
        const result = await createOrder(orderItems, address, {
            paymentMethod: paymentMethod === "stripe" ? "stripe" : "cod",
            couponId: coupon?.id,
            discountAmount: discount
        });

        if (!result.success) {
            setError(result.error || "حدث خطأ أثناء إنشاء الطلب");
            setIsSubmitting(false);
            return;
        }

        if (paymentMethod === "stripe" && result.order_id && result.order_number && result.total) {
            // إنشاء جلسة Checkout مدمجة (ui_mode: 'custom')
            let json: { clientSecret?: string; error?: string } = {};
            try {
                const response = await fetch("/api/stripe/checkout-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: result.order_id,
                        orderNumber: result.order_number,
                        total: result.total,
                    }),
                });
                json = await response.json();
                if (!response.ok || !json.clientSecret) {
                    setError(json.error || "فشل في إنشاء جلسة الدفع");
                    setIsSubmitting(false);
                    return;
                }
            } catch {
                setError("خطأ في الاتصال — تحقق من الإنترنت وأعد المحاولة");
                setIsSubmitting(false);
                return;
            }

            setStripeClientSecret(json.clientSecret!);
            setPendingOrderNumber(result.order_number);
            setCheckoutStep("paying");
        } else {
            // الدفع عند الاستلام
            setSuccess(result.order_number || "#ORDER");
            clearCart();
            window.scrollTo({ top: 0, behavior: "smooth" });
        }

        setIsSubmitting(false);
    }

    function handlePaymentSuccess() {
        clearCart();
        setSuccess(pendingOrderNumber || "#ORDER");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (success) {
        return (
            <div className="container-wusha flex min-h-screen flex-col items-center justify-center pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
                <div className="theme-surface-panel max-w-2xl rounded-[2rem] px-6 py-10 sm:px-8 sm:py-12">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/30 mx-auto"
                    >
                        <Check className="w-12 h-12" />
                    </motion.div>
                    <h1 className="text-3xl font-bold mb-2">تم استلام طلبك بنجاح!</h1>
                    <p className="text-theme-soft mb-2">
                        رقم الطلب: <span className="font-mono text-gold font-bold">{success}</span>
                    </p>
                    <p className="text-theme-subtle mb-8 max-w-md mx-auto">
                        شكراً لتسوقك معنا. سيتم إرسال تفاصيل الطلب إلى بريدك الإلكتروني قريباً.
                    </p>
                    <Link
                        href="/"
                        className="btn-gold px-8 py-3 rounded-xl"
                    >
                        العودة للرئيسية
                    </Link>
                </div>
            </div>
        );
    }

    // ─── خطوة الدفع المدمج ────────────────────────────────────
    if (checkoutStep === "paying" && stripeClientSecret && pendingOrderNumber) {
        return (
            <div className="min-h-screen bg-theme pt-28 pb-16 sm:pt-32 sm:pb-20">
                <div className="container-wusha max-w-2xl">
                    <button
                        onClick={() => { setCheckoutStep("address"); setError(null); }}
                        className="mb-8 flex items-center gap-2 text-sm text-theme-subtle transition-colors hover:text-theme"
                    >
                        <ArrowRight className="h-4 w-4" />
                        العودة للطلب
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold mb-8">إتمام الدفع</h1>

                    <div className="mb-6 p-4 theme-surface-panel rounded-2xl flex justify-between text-sm">
                        <span className="text-theme-subtle">رقم الطلب</span>
                        <span className="font-mono font-bold text-gold">{pendingOrderNumber}</span>
                    </div>

                    <StripePaymentForm
                        clientSecret={stripeClientSecret}
                        orderNumber={pendingOrderNumber}
                        onSuccess={handlePaymentSuccess}
                    />

                    <div className="mt-4 p-4 theme-surface-panel rounded-2xl flex justify-between text-sm">
                        <span className="text-theme-subtle">الإجمالي</span>
                        <span className="font-bold text-gold">{total.toLocaleString()} ر.س</span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── خطوة العنوان وطريقة الدفع ───────────────────────────
    return (
        <div className="min-h-screen bg-theme pb-20 pt-28 sm:pt-32">
            <div className="container-wusha">
                <div className="mb-6 theme-surface-panel rounded-[2rem] px-5 py-5 sm:mb-8 sm:px-8 sm:py-7">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold tracking-[0.22em] text-theme-faint">CHECKOUT</p>
                            <h1 className="mt-2 text-3xl font-bold md:text-4xl">إتمام الطلب</h1>
                        </div>
                        <p className="max-w-xl text-sm text-theme-subtle">
                            راجع عناصر السلة، أكمل عنوان الشحن، ثم اختر طريقة الدفع الأنسب قبل تثبيت الطلب.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-12 lg:gap-10 xl:gap-12">
                    {/* Form Section */}
                    <div className="space-y-6 lg:col-span-7 sm:space-y-8">
                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <MapPin className="text-gold w-5 h-5" />
                                عنوان الشحن
                            </h2>

                            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">الاسم الكامل</label>
                                        <div className="relative">
                                            <input
                                                {...form.register("name")}
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
                                        <label className="text-sm text-theme-soft">رقم الهاتف</label>
                                        <div className="relative">
                                            <input
                                                {...form.register("phone")}
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

                                <div className="space-y-2">
                                    <label className="text-sm text-theme-soft">العنوان</label>
                                    <input
                                        {...form.register("line1")}
                                        className="input-dark w-full rounded-xl px-4 py-3"
                                        placeholder="اسم الشارع، رقم المبنى"
                                    />
                                    {form.formState.errors.line1 && (
                                        <p className="text-red-400 text-xs">{form.formState.errors.line1.message}</p>
                                    )}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">المدينة</label>
                                        <input
                                            {...form.register("city")}
                                            className="input-dark w-full rounded-xl px-4 py-3"
                                        />
                                        {form.formState.errors.city && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.city.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">الرمز البريدي</label>
                                        <input
                                            {...form.register("postal_code")}
                                            className="input-dark w-full rounded-xl px-4 py-3"
                                        />
                                        {form.formState.errors.postal_code && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.postal_code.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">الدولة</label>
                                        <input
                                            {...form.register("country")}
                                            disabled
                                            className="input-dark w-full rounded-xl px-4 py-3 text-theme-subtle cursor-not-allowed opacity-70"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CreditCard className="text-gold w-5 h-5" />
                                طريقة الدفع
                            </h2>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("cod")}
                                        className={`w-full rounded-xl border p-4 text-right transition-all ${paymentMethod === "cod"
                                        ? "border-gold/40 bg-gold/10"
                                        : "border-theme-soft bg-theme-faint hover:border-gold/20 hover:bg-theme-subtle"
                                        }`}
                                    >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${paymentMethod === "cod" ? "border-gold bg-gold" : "border-theme-soft"
                                                }`}>
                                                {paymentMethod === "cod" && <div className="w-1.5 h-1.5 rounded-full bg-[var(--wusha-bg)]" />}
                                            </div>
                                            <div>
                                                <span className="font-bold">الدفع عند الاستلام</span>
                                                <p className="mt-1 text-xs text-theme-subtle">ادفع عند استلام الطلب داخل المملكة.</p>
                                            </div>
                                        </div>
                                        <span className="inline-flex w-fit rounded px-2 py-1 text-xs text-gold bg-gold/20">متاح</span>
                                    </div>
                                </button>

                                {process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("stripe")}
                                        className={`w-full rounded-xl border p-4 text-right transition-all ${paymentMethod === "stripe"
                                            ? "border-gold/40 bg-gold/10"
                                            : "border-theme-soft bg-theme-faint hover:border-gold/20 hover:bg-theme-subtle"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${paymentMethod === "stripe" ? "border-gold bg-gold" : "border-theme-soft"
                                                }`}>
                                                    {paymentMethod === "stripe" && <div className="w-1.5 h-1.5 rounded-full bg-[var(--wusha-bg)]" />}
                                                </div>
                                                <div>
                                                    <span className="font-bold">الدفع الإلكتروني</span>
                                                    <p className="mt-1 text-xs text-theme-subtle">ادفع مباشرة ببطاقاتك أو Apple Pay وMada.</p>
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-xs text-theme-subtle">
                                                <Smartphone className="w-3.5 h-3.5" />
                                                Visa · Mada · Apple Pay
                                            </span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-5">
                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8 lg:sticky lg:top-28">
                            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">ملخص الطلب</h2>
                                    <p className="mt-1 text-sm text-theme-subtle">{items.length} عنصر في السلة</p>
                                </div>
                                <span className="inline-flex w-fit rounded-full border border-theme-subtle bg-theme-faint px-3 py-1 text-xs text-theme-subtle">
                                    {paymentMethod === "stripe" ? "دفع إلكتروني" : "دفع عند الاستلام"}
                                </span>
                            </div>

                            <div className="mb-6 space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar sm:max-h-[320px]">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.size}`} className="flex gap-3 rounded-2xl border border-theme-subtle bg-theme-faint p-3 sm:gap-4">
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
                                    <div className="flex justify-between text-green-400 text-sm">
                                        <span>
                                            الخصم
                                            {coupon && (
                                                <span className="font-mono text-xs opacity-70 mr-1">
                                                    ({coupon.discount_type === "percentage"
                                                        ? `${coupon.discount_value}%`
                                                        : `${coupon.discount_value} ر.س`})
                                                </span>
                                            )}
                                        </span>
                                        <span>- {discount.toLocaleString()} ر.س</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-theme-soft text-sm">
                                    <span>الشحن</span>
                                    <span>{shipping.toLocaleString()} ر.س</span>
                                </div>
                                <div className="flex justify-between text-theme-soft text-sm">
                                    <span>الضريبة (15%)</span>
                                    <span>{tax.toLocaleString()} ر.س</span>
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

                            <button
                                type="submit"
                                form="checkout-form"
                                disabled={isSubmitting}
                                className="mt-8 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold btn-gold disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>
                                            {paymentMethod === "stripe" ? "متابعة للدفع" : "تأكيد الطلب"}
                                        </span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-theme-faint text-xs mt-4">
                                بإتمام الطلب، أنت توافق على شروط الاستخدام وسياسة الخصوصية.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
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
