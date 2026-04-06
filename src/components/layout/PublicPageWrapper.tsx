import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getPublicVisibility } from "@/app/actions/settings";

/**
 * Wrapper for pages that need the public layout (Header, Footer, CartSheet).
 * Used by app/page.tsx (root) to avoid the route-group client-reference-manifest bug.
 */
export async function PublicPageWrapper({ children }: { children: React.ReactNode }) {
    const visibility = await getPublicVisibility();
    
    return (
        <>
            <Header visibility={visibility} />
            <div className="public-shell">
                <div className="public-orb public-orb-primary" aria-hidden />
                <div className="public-orb public-orb-secondary" aria-hidden />
                <div className="public-orb public-orb-tertiary" aria-hidden />
                <div className="absolute inset-0 pointer-events-none cyber-grid opacity-[0.08]" aria-hidden />
                <div className="public-stage">
                    {children}
                </div>
            </div>
            <Footer visibility={visibility} />
        </>
    );
}
