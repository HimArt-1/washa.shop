import { Hero } from "@/components/sections/Hero";
import { JoinSection } from "@/components/sections/JoinSection";
import { AISection } from "@/components/sections/AISection";
import { getPublicVisibility } from "@/app/actions/settings";

export default async function Home() {
    const visibility = await getPublicVisibility();
    return (
        <main className="relative">
            <Hero showAuthButtons={visibility.hero_auth_buttons} />
            <AISection />
            <JoinSection />
        </main>
    );
}
