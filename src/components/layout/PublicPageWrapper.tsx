import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartSheet } from "@/components/store/CartSheet";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPublicVisibility } from "@/app/actions/settings";

/**
 * Wrapper for pages that need the public layout (Header, Footer, CartSheet).
 * Used by app/page.tsx (root) to avoid the route-group client-reference-manifest bug.
 */
export async function PublicPageWrapper({ children }: { children: React.ReactNode }) {
    await ensureProfile();
    const visibility = await getPublicVisibility();
    
    return (
        <>
            <Header visibility={visibility} />
            <CartSheet />
            <div className="relative bg-theme min-h-screen">
                <div className="absolute inset-0 pointer-events-none cyber-grid opacity-[0.15]" aria-hidden />
                <div className="relative z-10">
                    {children}
                </div>
            </div>
            <Footer visibility={visibility} />
        </>
    );
}
