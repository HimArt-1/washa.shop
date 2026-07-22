import { Hero } from "@/components/sections/Hero";
import { AISection } from "@/components/sections/AISection";
import { Store, type ProductWithArtist } from "@/components/sections/Store";
import { HomeNeuralField } from "@/components/sections/HomeNeuralField";
import { getSiteSettings } from "@/app/actions/settings";
import { getProducts } from "@/app/actions/products";
import { PublicPageWrapper } from "@/components/layout/PublicPageWrapper";
import { isWashaAiRouteAvailable } from "@/lib/design-piece-runtime";
import { getWashaDtfGenerationReadiness } from "@/lib/washa-dtf-generation-readiness";
import { getPromptNativeReadiness } from "@/lib/washa-prompt-native/readiness";

export default async function Home() {
    const settings = await getSiteSettings();
    const v = settings.visibility;
    const generationReadiness = getWashaDtfGenerationReadiness();
    const showWashaAiButton = (v.hero_washa_ai_button ?? true)
        && isWashaAiRouteAvailable(v)
        && generationReadiness.enabled;
    const promptNativeReadiness = getPromptNativeReadiness();
    const showWashaAiV3Button = (v.hero_washa_ai_v3_button ?? false)
        && v.washa_ai_dev_v3_access === "link"
        && isWashaAiRouteAvailable(v)
        && promptNativeReadiness.ready;
    const heroBackgroundMode = process.env.HERO_BACKGROUND_MODE === "video" ? "video" : "shader";
    const showStore = Boolean(v.store);
    const showAiSection = settings.visibility.ai_section !== false;
    const showFlowStack = showStore || showAiSection;
    const storeProducts = showStore ? (await getProducts(1, "all")).data || [] : [];

    return (
        <PublicPageWrapper visibility={v} footer="home">
            <div className="relative">
                <Hero
                    backgroundMode={heroBackgroundMode}
                    showAuthButtons={settings.visibility.hero_auth_buttons}
                    showWashaAiButton={showWashaAiButton}
                    showWashaAiV3Button={showWashaAiV3Button}
                    showJoinArtistButton={settings.visibility.hero_join_artist_button}
                />
                {showFlowStack ? (
                    <div className="home-flow-stack">
                        <HomeNeuralField />
                        <div className="home-section-smoke home-flow-stack-smoke" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>
                        {showStore ? (
                            <Store
                                initialProducts={storeProducts as unknown as ProductWithArtist[]}
                                initialProductsLoaded
                            />
                        ) : null}
                        {showAiSection ? (
                            <AISection config={settings.ai_simulation} />
                        ) : null}
                    </div>
                ) : null}
            </div>
        </PublicPageWrapper>
    );
}
