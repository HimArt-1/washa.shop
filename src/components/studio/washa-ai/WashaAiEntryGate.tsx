"use client";

import { WashaAiCinematicIntro } from "./WashaAiCinematicIntro";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * WashaAiEntryGate
 * ────────────────
 * Shows ONLY the cinematic intro, then auto-navigates:
 *   • Authenticated (showWizard) → /design/washa-ai/app
 *   • Not authenticated → sign-up page with redirect back
 */
export function WashaAiEntryGate({
    redirectUrl,
    showWizard = false,
}: {
    redirectUrl: string;
    showWizard?: boolean;
}) {
    const router = useRouter();

    const handleIntroComplete = useCallback(() => {
        if (showWizard) {
            // Authenticated → go straight to the studio
            router.push(redirectUrl);
        } else {
            // Not authenticated → send to sign-up, then redirect back
            router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`);
        }
    }, [showWizard, redirectUrl, router]);

    return <WashaAiCinematicIntro onComplete={handleIntroComplete} />;
}
