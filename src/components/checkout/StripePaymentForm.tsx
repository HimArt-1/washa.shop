"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Stripe Embedded Payment Form
//  نموذج الدفع المدمج داخل الموقع — ui_mode: 'custom'
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ─── مظهر يتناسب مع ثيم وشّى الداكن ───────────────────────
const appearance: import("@stripe/stripe-js").Appearance = {
    theme: "night",
    variables: {
        colorPrimary: "#c9a96e",
        colorBackground: "#111111",
        colorText: "#ffffff",
        colorTextSecondary: "rgba(255,255,255,0.5)",
        colorIcon: "#c9a96e",
        colorIconHover: "#d4b87a",
        borderRadius: "12px",
        fontFamily: "inherit",
        spacingUnit: "4px",
    },
    rules: {
        ".Input": {
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "12px 16px",
        },
        ".Input:focus": {
            border: "1px solid rgba(201,169,110,0.5)",
            boxShadow: "none",
            outline: "none",
        },
        ".Label": {
            color: "rgba(255,255,255,0.6)",
            fontSize: "13px",
            marginBottom: "6px",
        },
        ".Tab": {
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.02)",
        },
        ".Tab:hover": {
            backgroundColor: "rgba(255,255,255,0.05)",
        },
        ".Tab--selected": {
            border: "1px solid rgba(201,169,110,0.4)",
            backgroundColor: "rgba(201,169,110,0.08)",
        },
        ".Error": {
            color: "#f87171",
        },
    },
};

// ─── نموذج الدفع الداخلي ────────────────────────────────────
function PaymentForm({
    orderNumber,
    onSuccess,
    onError,
}: {
    orderNumber: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: {
                return_url: `${window.location.origin}/checkout?success=1&order=${encodeURIComponent(orderNumber)}`,
            },
        });

        if (error) {
            onError(error.message || "فشل في معالجة الدفع");
            setIsProcessing(false);
        } else if (paymentIntent?.status === "succeeded") {
            onSuccess();
        } else {
            setIsProcessing(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement options={{ layout: "tabs" }} />

            <button
                type="submit"
                disabled={!stripe || !elements || isProcessing}
                className="w-full btn-gold py-4 text-base font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري المعالجة...</span>
                    </>
                ) : (
                    <>
                        <Lock className="w-4 h-4" />
                        <span>ادفع الآن</span>
                    </>
                )}
            </button>

            <p className="text-center text-theme-faint text-xs flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                الدفع محمي بتشفير SSL · Stripe
            </p>
        </form>
    );
}

// ─── المكوّن الرئيسي ────────────────────────────────────────
export function StripePaymentForm({
    clientSecret,
    orderNumber,
    onSuccess,
}: {
    clientSecret: string;
    orderNumber: string;
    onSuccess: () => void;
}) {
    const [paymentError, setPaymentError] = useState<string | null>(null);

    return (
        <div className="bg-surface border border-white/5 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Lock className="text-gold w-5 h-5" />
                تفاصيل الدفع
            </h2>

            {paymentError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl mb-6">
                    {paymentError}
                </div>
            )}

            <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance }}
            >
                <PaymentForm
                    orderNumber={orderNumber}
                    onSuccess={onSuccess}
                    onError={setPaymentError}
                />
            </Elements>
        </div>
    );
}
