"use client";

// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Stripe Embedded Payment Form
//  نموذج الدفع المدمج داخل الموقع — ui_mode: 'custom'
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
    CheckoutProvider,
    PaymentElement,
    useCheckout,
} from "@stripe/react-stripe-js/checkout";
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

type PaymentConfirmationResult = {
    success: boolean;
    error?: string;
};

// ─── نموذج الدفع الداخلي ────────────────────────────────────
function PaymentForm({
    orderId,
    orderNumber,
    sessionId,
    onSuccess,
    onError,
}: {
    orderId: string;
    orderNumber: string;
    sessionId: string;
    onSuccess: (params: {
        orderId: string;
        orderNumber: string;
        sessionId: string;
    }) => Promise<PaymentConfirmationResult>;
    onError: (msg: string) => void;
}) {
    const checkoutState = useCheckout();
    const [isProcessing, setIsProcessing] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (checkoutState.type !== "success") {
            onError(
                checkoutState.type === "error"
                    ? checkoutState.error.message
                    : "جاري تحميل بوابة الدفع، أعد المحاولة بعد لحظات"
            );
            return;
        }

        setIsProcessing(true);

        const returnUrl = new URL("/checkout", window.location.origin);
        returnUrl.searchParams.set("success", "1");
        returnUrl.searchParams.set("order", orderNumber);
        returnUrl.searchParams.set("order_id", orderId);
        returnUrl.searchParams.set("session_id", sessionId);

        const result = await checkoutState.checkout.confirm({
            redirect: "if_required",
            returnUrl: returnUrl.toString(),
        });

        if (result.type === "error") {
            onError(result.error.message || "فشل في معالجة الدفع");
            setIsProcessing(false);
            return;
        }

        if (
            result.session.status.type === "complete" &&
            result.session.status.paymentStatus === "paid"
        ) {
            const confirmation = await onSuccess({
                orderId,
                orderNumber,
                sessionId: result.session.id,
            });

            if (!confirmation.success) {
                onError(confirmation.error || "تم الدفع لكن تعذر تأكيد الطلب");
                setIsProcessing(false);
            }
            return;
        }

        onError(result.session.lastPaymentError?.message || "عملية الدفع لم تكتمل بعد");
        setIsProcessing(false);
    }

    if (checkoutState.type === "error") {
        return (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {checkoutState.error.message}
            </div>
        );
    }

    const canConfirm =
        checkoutState.type === "success" && checkoutState.checkout.canConfirm;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement options={{ layout: "tabs" }} />

            <button
                type="submit"
                disabled={!canConfirm || isProcessing}
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
    orderId,
    orderNumber,
    sessionId,
    onSuccess,
}: {
    clientSecret: string;
    orderId: string;
    orderNumber: string;
    sessionId: string;
    onSuccess: (params: {
        orderId: string;
        orderNumber: string;
        sessionId: string;
    }) => Promise<PaymentConfirmationResult>;
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

            <CheckoutProvider
                stripe={stripePromise}
                options={{
                    clientSecret,
                    elementsOptions: { appearance },
                }}
            >
                <PaymentForm
                    orderId={orderId}
                    orderNumber={orderNumber}
                    sessionId={sessionId}
                    onSuccess={onSuccess}
                    onError={setPaymentError}
                />
            </CheckoutProvider>
        </div>
    );
}
