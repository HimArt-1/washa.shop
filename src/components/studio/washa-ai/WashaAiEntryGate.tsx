"use client";

import { WashaAiCinematicIntro } from "./WashaAiCinematicIntro";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const INTRO_STORAGE_KEY = "washa-ai:intro-seen:v2";

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
    const [showIntro, setShowIntro] = useState(false);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(INTRO_STORAGE_KEY) === "true") {
                router.replace(redirectUrl);
                return;
            }
        } catch {
            // Storage may be unavailable in private or restricted browser modes.
        }

        setShowIntro(true);
    }, [redirectUrl, router]);

    const handleIntroComplete = useCallback(() => {
        try {
            window.localStorage.setItem(INTRO_STORAGE_KEY, "true");
        } catch {
            // The intro still works when storage is unavailable.
        }
        router.replace(redirectUrl);
    }, [redirectUrl, router]);

    if (!showIntro) {
        return <div className="fixed inset-0 bg-[#060504]" aria-label="جاري فتح استوديو WASHA AI" aria-busy="true" />;
    }

    return <WashaAiCinematicIntro onComplete={handleIntroComplete} />;
}
