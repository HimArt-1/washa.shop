"use client";

import { useState, useEffect, useRef } from "react";
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
type PaymentMethod = "cod" | "paylink";

export interface ShippingConfig {
    flat_rate: number;
    free_above: number;
    tax_rate: number;
    shipping_enabled: boolean;
    tax_enabled: boolean;
}

async function verifyPaylinkPayment(params: {
    orderId?: string;
    orderNumber: string;
    transactionNo?: string;
}) {
    try {
        const response = await fetch("/api/paylink/verify", {
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
            orderNumber: typeof json.orderNumber === "string" ? json.orderNumber : params.orderNumber,
        };
    } catch {
        return {
            success: false as const,
            error: "تعذر الاتصال بالخادم للتحقق من الدفع",
        };
    }
}

// ─── Main Client Component ───────────────────────────────

export function CheckoutContent({ shippingConfig }: { shippingConfig: ShippingConfig }) {
    const { items, clearCart, getSubtotal, getDiscountAmount, coupon } = useCartStore();
    const searchParams = useSearchParams();
    const verifiedPaymentKeyRef = useRef<string | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Auto-verify on return from Paylink
    useEffect(() => {
        const orderNum = searchParams.get("order");
        const orderId = searchParams.get("order_id");
        const transactionNo = searchParams.get("transactionNo") || searchParams.get("transaction_no");

        if (searchParams.get("success") !== "1" || !orderNum) {
            return;
        }

        const verificationKey = `${orderId || "unknown"}:${transactionNo || "unknown"}:${orderNum}`;
        if (verifiedPaymentKeyRef.current === verificationKey) {
            return;
        }
        verifiedPaymentKeyRef.current = verificationKey;

        setIsVerifyingPayment(true);
        setError(null);

        void (async () => {
            const result = await verifyPaylinkPayment({
                orderId: orderId || undefined,
                orderNumber: orderNum,
                transactionNo: transactionNo || undefined,
            });

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

    if (!isClient) return null;

    const isReturningFromPaylink =
        searchParams.get("success") === "1" && Boolean(searchParams.get("order"));

    if ((isVerifyingPayment || (isReturningFromPaylink && !error)) && !success) {
        return (
            <div className="container-wusha flex min-h-screen flex-col items-center justify-center gap-4 pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
                <Loader2 className="h-10 w-10 animate-spin text-gold" />
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">جاري التحقق من الدفع</h1>
                    <p className="text-sm text-theme-subtle">
                        نتحقق من Paylink ونؤكد الطلب داخل النظام.
                    </p>
                </div>
            </div>
        );
    }

    if (isReturningFromPaylink && error && !success) {
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
        if (!shippingConfig.shipping_enabled) return 0;
        if (taxableAmount >= shippingConfig.free_above) return 0;
        return shippingConfig.flat_rate;
    })();
    const taxAmount = shippingConfig.tax_enabled
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
            paymentMethod: paymentMethod === "paylink" ? "paylink" : "cod",
            couponId: coupon?.id,
            discountAmount: discount,
        });

        if (!result.success) {
            setError(result.error || "حدث خطأ أثناء إنشاء الطلب");
            setIsSubmitting(false);
            return;
        }

        if (paymentMethod === "paylink" && result.order_id && result.order_number && result.total) {
            try {
                const products = items.map((item) => ({
                    title: item.title,
                    price: item.price,
                    qty: item.quantity,
                }));

                if (shippingCost > 0) {
                    products.push({ title: "تكلفة الشحن", price: shippingCost, qty: 1 });
                }

                const response = await fetch("/api/paylink/create-invoice", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId: result.order_id,
                        orderNumber: result.order_number,
                        total: result.total,
                        clientName: data.name,
                        clientMobile: data.phone,
                        products,
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
                    <Link href="/" className="btn-gold px-8 py-3 rounded-xl">
                        العودة للرئيسية
                    </Link>
                </div>
            </div>
        );
    }

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

                        {/* Payment Method */}
                        <div className="theme-surface-panel rounded-[2rem] p-5 sm:p-6 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CreditCard className="text-gold w-5 h-5" />
                                طريقة الدفع
                            </h2>

                            <div className="space-y-3">
                                {/* COD */}
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
                                            <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${paymentMethod === "cod" ? "border-gold bg-gold" : "border-theme-soft"}`}>
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

                                {/* Paylink */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("paylink")}
                                    className={`w-full rounded-xl border p-4 text-right transition-all ${paymentMethod === "paylink"
                                        ? "border-gold/40 bg-gold/10"
                                        : "border-theme-soft bg-theme-faint hover:border-gold/20 hover:bg-theme-subtle"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${paymentMethod === "paylink" ? "border-gold bg-gold" : "border-theme-soft"}`}>
                                                {paymentMethod === "paylink" && <div className="w-1.5 h-1.5 rounded-full bg-[var(--wusha-bg)]" />}
                                            </div>
                                            <div>
                                                <span className="font-bold">الدفع الإلكتروني</span>
                                                <p className="mt-1 text-xs text-theme-subtle">
                                                    ادفع بـ Mada، Visa، Apple Pay، STC Pay، Tabby، أو Tamara.
                                                </p>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-xs text-theme-subtle">
                                            <Smartphone className="w-3.5 h-3.5" />
                                            Mada · Visa · STC Pay
                                        </span>
                                    </div>
                                </button>
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
                                    {paymentMethod === "paylink" ? "دفع إلكتروني — Paylink" : "دفع عند الاستلام"}
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
                                            {paymentMethod === "paylink" ? "متابعة للدفع عبر Paylink" : "تأكيد الطلب"}
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
