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
            <div className="min-h-screen pt-32 pb-20 container-wusha flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-theme-subtle rounded-full flex items-center justify-center mb-6">
                    <ShoppingBagIcon className="w-10 h-10 text-theme-faint" />
                </div>
                <h1 className="text-2xl font-bold mb-4">سلة المشتريات فارغة</h1>
                <p className="text-theme-subtle mb-8 max-w-md">
                    لم تقم بإضافة أي منتجات للسلة بعد. تصفح المتجر واكتشف منتجاتنا الحصرية.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <Link href="/store" className="btn-gold px-8 py-3 rounded-xl">
                        تصفح المتجر
                    </Link>
                    <Link href="/design" className="px-8 py-3 rounded-xl border border-gold/40 text-gold hover:bg-gold/10 transition-colors">
                        صمّم قطعتك
                    </Link>
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
            <div className="min-h-screen pt-32 pb-20 container-wusha flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-500/30"
                >
                    <Check className="w-12 h-12" />
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">تم استلام طلبك بنجاح!</h1>
                <p className="text-theme-soft mb-2">
                    رقم الطلب: <span className="font-mono text-gold font-bold">{success}</span>
                </p>
                <p className="text-theme-subtle mb-8 max-w-md">
                    شكراً لتسوقك معنا. سيتم إرسال تفاصيل الطلب إلى بريدك الإلكتروني قريباً.
                </p>
                <Link
                    href="/"
                    className="btn-gold px-8 py-3 rounded-xl"
                >
                    العودة للرئيسية
                </Link>
            </div>
        );
    }

    // ─── خطوة الدفع المدمج ────────────────────────────────────
    if (checkoutStep === "paying" && stripeClientSecret && pendingOrderNumber) {
        return (
            <div className="min-h-screen pt-32 pb-20 bg-[#080808]">
                <div className="container-wusha max-w-2xl">
                    <button
                        onClick={() => { setCheckoutStep("address"); setError(null); }}
                        className="flex items-center gap-2 text-theme-subtle hover:text-theme text-sm mb-8 transition-colors"
                    >
                        <ArrowRight className="w-4 h-4 rotate-180" />
                        العودة للطلب
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold mb-8">إتمام الدفع</h1>

                    <div className="mb-6 p-4 bg-theme-faint border border-white/5 rounded-xl flex justify-between text-sm">
                        <span className="text-theme-subtle">رقم الطلب</span>
                        <span className="font-mono font-bold text-gold">{pendingOrderNumber}</span>
                    </div>

                    <StripePaymentForm
                        clientSecret={stripeClientSecret}
                        orderNumber={pendingOrderNumber}
                        onSuccess={handlePaymentSuccess}
                    />

                    <div className="mt-4 p-4 bg-theme-faint border border-white/5 rounded-xl flex justify-between text-sm">
                        <span className="text-theme-subtle">الإجمالي</span>
                        <span className="font-bold text-gold">{total.toLocaleString()} ر.س</span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── خطوة العنوان وطريقة الدفع ───────────────────────────
    return (
        <div className="min-h-screen pt-32 pb-20 bg-[#080808]">
            <div className="container-wusha">
                <h1 className="text-3xl md:text-4xl font-bold mb-8">إتمام الطلب</h1>

                <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                    {/* Form Section */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-surface border border-white/5 rounded-2xl p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <MapPin className="text-gold w-5 h-5" />
                                عنوان الشحن
                            </h2>

                            <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">الاسم الكامل</label>
                                        <div className="relative">
                                            <input
                                                {...form.register("name")}
                                                className="w-full bg-theme-subtle border border-theme-soft rounded-xl px-4 py-3 text-theme focus:border-gold focus:outline-none transition-colors pl-10"
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
                                                className="w-full bg-theme-subtle border border-theme-soft rounded-xl px-4 py-3 text-theme focus:border-gold focus:outline-none transition-colors pl-10 dir-ltr text-right"
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
                                        className="w-full bg-theme-subtle border border-theme-soft rounded-xl px-4 py-3 text-theme focus:border-gold focus:outline-none transition-colors"
                                        placeholder="اسم الشارع، رقم المبنى"
                                    />
                                    {form.formState.errors.line1 && (
                                        <p className="text-red-400 text-xs">{form.formState.errors.line1.message}</p>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">المدينة</label>
                                        <input
                                            {...form.register("city")}
                                            className="w-full bg-theme-subtle border border-theme-soft rounded-xl px-4 py-3 text-theme focus:border-gold focus:outline-none transition-colors"
                                        />
                                        {form.formState.errors.city && (
                                            <p className="text-red-400 text-xs">{form.formState.errors.city.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-theme-soft">الرمز البريدي</label>
                                        <input
                                            {...form.register("postal_code")}
                                            className="w-full bg-theme-subtle border border-theme-soft rounded-xl px-4 py-3 text-theme focus:border-gold focus:outline-none transition-colors"
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
                                            className="w-full bg-theme-subtle border border-theme-soft rounded-xl px-4 py-3 text-theme-subtle cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="bg-surface border border-white/5 rounded-2xl p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CreditCard className="text-gold w-5 h-5" />
                                طريقة الدفع
                            </h2>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("cod")}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all text-right ${paymentMethod === "cod"
                                        ? "border-gold/40 bg-gold/10"
                                        : "border-theme-soft bg-theme-faint hover:border-white/20"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === "cod" ? "border-gold bg-gold" : "border-white/30"
                                            }`}>
                                            {paymentMethod === "cod" && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                        </div>
                                        <span className="font-bold">الدفع عند الاستلام</span>
                                    </div>
                                    <span className="text-xs bg-gold/20 text-gold px-2 py-1 rounded">متاح</span>
                                </button>

                                {process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("stripe")}
                                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all text-right ${paymentMethod === "stripe"
                                            ? "border-gold/40 bg-gold/10"
                                            : "border-theme-soft bg-theme-faint hover:border-white/20"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === "stripe" ? "border-gold bg-gold" : "border-white/30"
                                                }`}>
                                                {paymentMethod === "stripe" && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                            </div>
                                            <span className="font-bold">الدفع الإلكتروني</span>
                                        </div>
                                        <span className="text-xs text-theme-subtle flex items-center gap-1">
                                            <Smartphone className="w-3.5 h-3.5" />
                                            Visa · Mada · Apple Pay
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-5">
                        <div className="bg-surface border border-white/5 rounded-2xl p-6 md:p-8 sticky top-32">
                            <h2 className="text-xl font-bold mb-6">ملخص الطلب</h2>

                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.size}`} className="flex gap-4">
                                        <div className="relative w-16 h-16 bg-theme-subtle rounded-lg overflow-hidden shrink-0">
                                            <Image
                                                src={item.image_url}
                                                alt={item.title}
                                                fill
                                                className="object-cover"
                                            />
                                            <span className="absolute bottom-0 right-0 bg-gold text-black text-[10px] font-bold px-1.5 rounded-tl-lg">
                                                x{item.quantity}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
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
                                className="w-full btn-gold py-4 text-base font-bold rounded-xl mt-8 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
