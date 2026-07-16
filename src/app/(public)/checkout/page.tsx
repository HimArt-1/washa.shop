// Server Component — يجلب إعدادات الشحن ويمررها للـ Client Component
import { Suspense } from "react";
import { getSiteSettings } from "@/app/actions/settings";
import { getProfile } from "@/app/actions/profile";
import { CheckoutContent } from "./CheckoutContent";
import { auth } from "@clerk/nextjs/server";
import { getPaymentReadiness } from "@/lib/payment-readiness";

export const dynamic = "force-dynamic"; // لا cache — دائماً حديث

export default async function CheckoutPage() {
    const paymentReadiness = getPaymentReadiness();
    const [settings, profile, session] = await Promise.all([
        getSiteSettings(),
        getProfile(),
        auth(),
    ]);

    const shippingConfig = {
        flat_rate: settings.shipping.flat_rate ?? 30,
        free_above: settings.shipping.free_above ?? 500,
        tax_rate: settings.shipping.tax_rate ?? 15,
        shipping_enabled: settings.shipping.shipping_enabled ?? true,
        tax_enabled: settings.shipping.tax_enabled ?? true,
    };

    return (
        <Suspense fallback={
            <div className="container-wusha min-h-screen pb-20 pt-28" aria-label="جاري تحميل صفحة الدفع">
                <div className="mb-6 h-32 animate-pulse rounded-[1.5rem] bg-theme-subtle" />
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="h-[34rem] animate-pulse rounded-[1.5rem] bg-theme-subtle" />
                    <div className="h-[28rem] animate-pulse rounded-[1.5rem] bg-theme-subtle" />
                </div>
            </div>
        }>
            <CheckoutContent 
                shippingConfig={shippingConfig} 
                userRole={profile?.role as any} 
                isLoggedIn={Boolean(session.userId)}
                paymentReadiness={paymentReadiness}
                bankTransferConfig={{
                    bankName: process.env.BANK_TRANSFER_BANK_NAME?.trim() || null,
                    accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME?.trim() || null,
                    iban: process.env.BANK_TRANSFER_IBAN?.trim() || null,
                }}
            />
        </Suspense>
    );
}
