"use client";

import { WashaAiCinematicIntro } from "./WashaAiCinematicIntro";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * WashaAiEntryGate
 * ────────────────
 * Shows the cinematic intro, then opens the studio.
 * Authentication is requested later when the customer generates or submits.
 */
export function WashaAiEntryGate({
    redirectUrl,
}: {
    redirectUrl: string;
}) {
    const router = useRouter();

    const handleIntroComplete = useCallback(() => {
        router.push(redirectUrl);
    }, [redirectUrl, router]);

    return <WashaAiCinematicIntro onComplete={handleIntroComplete} />;
}
