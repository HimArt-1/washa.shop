// Server Component — يجلب إعدادات الشحن ويمررها للـ Client Component
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getSiteSettings } from "@/app/actions/settings";
import { getProfile } from "@/app/actions/profile";
import { CheckoutContent } from "./CheckoutContent";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic"; // لا cache — دائماً حديث

export default async function CheckoutPage() {
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
            <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
        }>
            <CheckoutContent 
                shippingConfig={shippingConfig} 
                userRole={profile?.role as any} 
                isLoggedIn={Boolean(session.userId)}
            />
        </Suspense>
    );
}
