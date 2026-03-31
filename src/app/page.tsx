import { Hero } from "@/components/sections/Hero";
import { AISection } from "@/components/sections/AISection";
import { getSiteSettings } from "@/app/actions/settings";
import { PublicPageWrapper } from "@/components/layout/PublicPageWrapper";

export default async function Home() {
    const settings = await getSiteSettings();
    return (
        <PublicPageWrapper>
            <main className="relative">
                <Hero
                    showAuthButtons={settings.visibility.hero_auth_buttons}
                    showWashaAiButton={settings.visibility.hero_washa_ai_button}
                />
                {settings.visibility.ai_section !== false && (
                    <AISection config={settings.ai_simulation} />
                )}
            </main>
        </PublicPageWrapper>
    );
}
