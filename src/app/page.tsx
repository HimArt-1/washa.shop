import { Hero } from "@/components/sections/Hero";
import { AISection } from "@/components/sections/AISection";
import { Store } from "@/components/sections/Store";
import { getSiteSettings } from "@/app/actions/settings";
import { PublicPageWrapper } from "@/components/layout/PublicPageWrapper";
import { isWashaAiRouteAvailable } from "@/lib/design-piece-runtime";

export default async function Home() {
    const settings = await getSiteSettings();
    const v = settings.visibility;
    const showWashaAiButton = (v.hero_washa_ai_button ?? true) && isWashaAiRouteAvailable(v);

    return (
        <PublicPageWrapper>
            <div className="relative">
                <Hero
                    showAuthButtons={settings.visibility.hero_auth_buttons}
                    showWashaAiButton={showWashaAiButton}
                />
                {v.store ? <Store /> : null}
                {settings.visibility.ai_section !== false && (
                    <AISection config={settings.ai_simulation} />
                )}
            </div>
        </PublicPageWrapper>
    );
}
